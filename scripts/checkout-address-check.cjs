/* eslint-disable @typescript-eslint/no-require-imports -- a plain node script, like audit-html.cjs it has no build step. */
// Walks every division and every district through the REAL address dropdowns of the built checkout (out/) in headless Chrome at a phone size, and checks:
//   - choosing a division clears the district and the thana, and the district list is that division's;
//   - choosing a district clears the thana, and the thana list is that district's (the number of choices is counted);
//   - the delivery charge in the order summary follows the rule at once (Dhaka division: the Dhaka fee, free only over the threshold; everywhere else the outside fee);
//   - a thana chosen, then the district changed, never leaves the old thana behind;
//   - the dropdown buttons are at least 44 px tall and no page scrolls sideways.
//
//   npm run build                                       (this reads out/)
//   node scripts/checkout-address-check.cjs             all 8 divisions and 64 districts at 390 x 844
//   node scripts/checkout-address-check.cjs --quick     one district per division (fast)
//   node scripts/checkout-address-check.cjs --width 360 another phone width
//
// Nothing is ordered and nothing is sent: only reads of the shop's API (copied through with permission added), every other site is refused. Exit code 1 on a failure.
const http = require("node:http");
const https = require("node:https");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawn } = require("node:child_process");

const args = process.argv.slice(2);
const QUICK = args.includes("--quick");
const WIDTH = Number(args[args.indexOf("--width") + 1]) || 390;
const OUT = path.join(__dirname, "..", "out");
const CHROME = [process.env.CHROME_PATH, "C:/Program Files/Google/Chrome/Application/chrome.exe", "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe", "/usr/bin/google-chrome", "/usr/bin/chromium"].find((c) => c && fs.existsSync(c));
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".txt": "text/plain; charset=utf-8", ".svg": "image/svg+xml", ".png": "image/png", ".webp": "image/webp", ".woff2": "font/woff2", ".ico": "image/x-icon" };

const failures = [];
const check = (ok, message) => {
  if (!ok) failures.push(message);
  return ok;
};
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function startSite() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      const rel = decodeURIComponent(req.url.split("?")[0]).replace(/^\/+/, "");
      const candidates = [rel, `${rel}.html`, path.join(rel, "index.html")];
      if (rel === "") candidates.unshift("index.html");
      const file = candidates.map((c) => path.join(OUT, c)).find((c) => fs.existsSync(c) && fs.statSync(c).isFile());
      if (!file) return void res.writeHead(404).end("not found");
      res.writeHead(200, { "Content-Type": TYPES[path.extname(file)] || "application/octet-stream" }).end(fs.readFileSync(file));
    });
    server.listen(0, "127.0.0.1", () => resolve(server));
  });
}

const apiCache = new Map();
function liveApi(url) {
  if (!apiCache.has(url)) {
    apiCache.set(
      url,
      new Promise((resolve) => {
        https.get(url, { headers: { Accept: "application/json" } }, (res) => {
          const chunks = [];
          res.on("data", (c) => chunks.push(c));
          res.on("end", () => resolve({ status: res.statusCode, body: Buffer.concat(chunks) }));
        }).on("error", () => resolve({ status: 502, body: Buffer.from("{}") }));
      }),
    );
  }
  return apiCache.get(url);
}

async function main() {
  if (!CHROME) throw new Error("No Chrome or Edge found (set CHROME_PATH).");

  // What the shop's data says, to compare the page against.
  const geo = await import("../src/lib/bangladesh-geography.ts");
  const divisions = [...geo.BD_DIVISIONS];
  const settings = JSON.parse((await liveApi("https://api.anaizanest.com/api/site-settings")).body.toString("utf8")).data;
  const rules = settings.policy;
  const feeOutside = rules.delivery_fee_outside_dhaka;
  const feeDhaka = rules.delivery_fee_dhaka;
  const threshold = rules.free_delivery_threshold;

  const site = await startSite();
  const base = `http://127.0.0.1:${site.address().port}`;
  const port = 9100 + Math.floor(Math.random() * 500);
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), "checkout-check-"));
  const chrome = spawn(CHROME, ["--headless=new", "--disable-gpu", "--no-first-run", `--user-data-dir=${profile}`, `--remote-debugging-port=${port}`, "about:blank"], { stdio: "ignore" });

  try {
    let version;
    for (let attempt = 0; attempt < 60 && !version; attempt++) {
      try {
        version = await (await fetch(`http://127.0.0.1:${port}/json/version`)).json();
      } catch {
        await sleep(500);
      }
    }
    const socket = new WebSocket(version.webSocketDebuggerUrl);
    await new Promise((resolve) => (socket.onopen = resolve));
    let next = 1;
    const waiting = new Map();
    const listeners = [];
    socket.onmessage = (event) => {
      const message = JSON.parse(event.data);
      if (message.id && waiting.has(message.id)) {
        const { resolve, reject } = waiting.get(message.id);
        waiting.delete(message.id);
        if (message.error) reject(new Error(message.error.message));
        else resolve(message.result);
      } else if (message.method) listeners.forEach((l) => l(message));
    };
    const send = (method, params = {}, sessionId) => {
      const id = next++;
      socket.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
      return new Promise((resolve, reject) => waiting.set(id, { resolve, reject }));
    };
    const { targetId } = await send("Target.createTarget", { url: "about:blank" });
    const { sessionId } = await send("Target.attachToTarget", { targetId, flatten: true });
    const cdp = (method, params) => send(method, params, sessionId);
    const run = async (expression) => {
      const { result, exceptionDetails } = await cdp("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
      if (exceptionDetails) throw new Error(exceptionDetails.exception?.description || exceptionDetails.text);
      return result.value;
    };

    listeners.push((message) => {
      if (message.method !== "Fetch.requestPaused" || message.sessionId !== sessionId) return;
      const { requestId, request } = message.params;
      const local = request.url.startsWith(base) || request.url.startsWith("data:");
      if (local) return void cdp("Fetch.continueRequest", { requestId }).catch(() => {});
      if (/^https:\/\/api\.anaizanest\.com\/api\//.test(request.url)) {
        const cors = [{ name: "access-control-allow-origin", value: "*" }, { name: "access-control-allow-headers", value: "*" }, { name: "access-control-allow-methods", value: "GET, POST, OPTIONS" }];
        if (request.method === "OPTIONS") return void cdp("Fetch.fulfillRequest", { requestId, responseCode: 204, responseHeaders: cors }).catch(() => {});
        if (request.method !== "GET") return void cdp("Fetch.failRequest", { requestId, errorReason: "BlockedByClient" }).catch(() => {});
        return void liveApi(request.url).then((live) => cdp("Fetch.fulfillRequest", { requestId, responseCode: live.status, responseHeaders: [{ name: "content-type", value: "application/json" }, ...cors], body: live.body.toString("base64") })).catch(() => {});
      }
      // Fonts and pictures are not needed to look at the address; everything else on another site is refused.
      cdp("Fetch.failRequest", { requestId, errorReason: "BlockedByClient" }).catch(() => {});
    });

    await cdp("Page.enable");
    await cdp("Runtime.enable");
    await cdp("Fetch.enable", { patterns: [{ urlPattern: "*" }] });
    await cdp("Emulation.setDeviceMetricsOverride", { width: WIDTH, height: 844, deviceScaleFactor: 1, mobile: true });
    await cdp("Emulation.setTouchEmulationEnabled", { enabled: true });

    const line = (price, quantity) => ({ key: `p1-${price}`, productId: 1, slug: "walk-test", name: "A gift for the walk", price, image: null, variantId: null, variantLabel: null, quantity, stock: 50 });

    async function openCheckout(subtotalLine) {
      await cdp("Page.addScriptToEvaluateOnNewDocument", { source: `try { localStorage.setItem('anaiza-cart', JSON.stringify([${JSON.stringify(subtotalLine)}])); localStorage.setItem('anaiza-consent', JSON.stringify({ choice: 'notice' })); } catch (e) {}` });
      const loaded = new Promise((resolve) => {
        const l = (m) => { if (m.method === "Page.loadEventFired" && m.sessionId === sessionId) { listeners.splice(listeners.indexOf(l), 1); resolve(); } };
        listeners.push(l);
        setTimeout(resolve, 20000);
      });
      await cdp("Page.navigate", { url: `${base}/checkout` });
      await loaded;
      await sleep(2500);
    }

    // helpers that run in the page
    const triggerFor = (label) => `(() => { const l = [...document.querySelectorAll('label')].find((x) => x.textContent.trim() === ${JSON.stringify(label)}); return l ? document.getElementById(l.htmlFor) : null; })()`;
    const readTrigger = (label) => run(`(() => { const b = ${triggerFor(label)}; if (!b) return null; const r = b.getBoundingClientRect(); return { text: (b.innerText || b.placeholder || b.value || '').trim(), disabled: b.disabled, height: Math.round(r.height) }; })()`);
    async function choose(label, option) {
      await run(`${triggerFor(label)}.click()`);
      await sleep(250);
      const count = await run(`document.querySelectorAll('[role=dialog] ul li button').length`);
      const clicked = await run(`(() => { const b = [...document.querySelectorAll('[role=dialog] ul li button')].find((x) => x.innerText.trim() === ${JSON.stringify(option)}); if (!b) return false; b.click(); return true; })()`);
      await sleep(250);
      return { count, clicked };
    }
    // The delivery row of the order summary: the label "Delivery" and the value beside it (the summary exists twice, folded on a phone; both say the same).
    const summary = () => run(`(() => { const label = [...document.querySelectorAll('span')].find((x) => x.textContent.trim() === 'Delivery' && x.nextElementSibling); return { delivery: label ? label.nextElementSibling.textContent.trim() : null }; })()`);
    const overflow = () => run(`document.documentElement.scrollWidth - window.innerWidth`);
    const money = (text) => (text === null ? null : /free/i.test(text) ? 0 : Number(String(text).replace(/[^\d]/g, "")));

    // ---- walk 1: an ordinary order, below the free-delivery threshold
    await openCheckout(line(1450, 1));
    await run(`[...document.querySelectorAll('button[role=radio]')].find((b) => b.innerText.trim() === 'Outside Dhaka').click()`);
    await sleep(400);

    check((await readTrigger("Division"))?.text === "Select division", "the division starts as 'Select division'");
    const districtStart = await readTrigger("District");
    check(districtStart?.disabled === true && /Select division first/.test(districtStart.text), "the district is disabled and says 'Select division first'");
    const thanaStart = await readTrigger("Area (thana)");
    check(thanaStart?.disabled === true && /Select district first/.test(thanaStart.text), "the thana is disabled and says 'Select district first'");

    let walked = 0;
    for (const division of divisions) {
      const picked = await choose("Division", division);
      check(picked.clicked && picked.count === 8, `the division list has 8 choices and '${division}' can be chosen (got ${picked.count})`);
      check((await readTrigger("District"))?.text === "Select district", `${division}: choosing a division clears the district`);
      check((await readTrigger("Area (thana)"))?.disabled === true, `${division}: the thana is disabled until a district is chosen`);

      const districts = geo.BD_DISTRICTS_BY_DIVISION[division];
      for (const district of QUICK ? [districts[0]] : districts) {
        const d = await choose("District", district);
        check(d.clicked && d.count === districts.length, `${division} > ${district}: the district list is the division's ${districts.length} (got ${d.count})`);
        const area = await readTrigger("Area (thana)");
        check(area && area.disabled === false && /Select your area/.test(area.text), `${division} > ${district}: the thana is empty and ready`);

        const expected = geo.BD_UPAZILAS_BY_DISTRICT[district] ?? [];
        const t = await choose("Area (thana)", expected[0]);
        check(t.clicked && t.count === expected.length, `${district}: ${expected.length} thanas offered (got ${t.count})`);

        const fee = money((await summary()).delivery);
        const wanted = division === "Dhaka" ? feeDhaka : feeOutside;
        check(fee === wanted, `${division} > ${district}: delivery is ৳${wanted} (page says ${fee})`);
        walked++;
      }

      // Back and forth: a thana chosen, then another district, never keeps the old thana.
      if (districts.length > 1) {
        await choose("District", districts[1]);
        check((await readTrigger("Area (thana)"))?.text === "Select your area", `${division}: changing the district clears the thana`);
      }
    }

    for (const label of ["Division", "District", "Area (thana)"]) {
      const trigger = await readTrigger(label);
      check(trigger && trigger.height >= 44, `the ${label} button is at least 44 px tall (is ${trigger?.height})`);
    }
    check((await overflow()) <= 0, "the page does not scroll sideways");

    // ---- walk 2: inside Dhaka, below and above the free-delivery threshold
    await run(`[...document.querySelectorAll('button[role=radio]')].find((b) => b.innerText.trim() === 'Inside Dhaka').click()`);
    await sleep(400);
    check(money((await summary()).delivery) === feeDhaka, `inside Dhaka, a small order pays ৳${feeDhaka}`);
    check((await readTrigger("Area (thana)"))?.text === "Select your area", "switching to Inside Dhaka clears the thana");

    await openCheckout(line(threshold + 500, 1));
    await run(`[...document.querySelectorAll('button[role=radio]')].find((b) => b.innerText.trim() === 'Inside Dhaka').click()`);
    await sleep(400);
    check(money((await summary()).delivery) === 0, `inside Dhaka, an order over ৳${threshold} is delivered free`);
    await run(`[...document.querySelectorAll('button[role=radio]')].find((b) => b.innerText.trim() === 'Outside Dhaka').click()`);
    await sleep(400);
    await choose("Division", "Chattogram");
    await choose("District", "Cumilla");
    check(money((await summary()).delivery) === feeOutside, `outside Dhaka, an order over ৳${threshold} still pays ৳${feeOutside}`);

    console.log(`Walked ${walked} district(s) in ${divisions.length} divisions at ${WIDTH} px.`);
    socket.close();
  } finally {
    chrome.kill();
    site.close();
    try { fs.rmSync(profile, { recursive: true, force: true, maxRetries: 3 }); } catch { /* the temp folder is harmless */ }
  }
}

main()
  .then(() => {
    if (failures.length) {
      console.error(`\nFAIL (${failures.length})\n- ${failures.slice(0, 40).join("\n- ")}`);
      process.exit(1);
    }
    console.log("OK: the cascade, the fee and the size of the controls are right.");
  })
  .catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
