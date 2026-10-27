/* eslint-disable @typescript-eslint/no-require-imports -- a plain node script, like audit-html.cjs it has no build step. */
// A visit through the built shop (out/) in headless Chrome, to see what the tracking really does:
//   home -> a product (client-side navigation, as a visitor does it) -> the cart.
//
//   npm run build                              (the check reads out/)
//   node scripts/tracking-headless-check.cjs            stub mode: GTM's script is replaced by an empty one
//   node scripts/tracking-headless-check.cjs --real     the real published container loads (needs internet)
//   add --accept to click "Accept" on the cookie banner first (a new visit, as Tajin's test)
//
// Nothing is ever sent out: every request to Google Analytics, Meta and the like is recorded and answered with an empty picture by this script, and every
// POST to another site is refused too. The records are what WOULD have left the browser.
//
// Always: lists the `page_view` pushes into the data layer with their event_id and asserts one per page, each with an id, all different.
// With --real: lists each GA4 hit (/g/collect: event name and event_id) and each Meta pixel hit (/tr: event and event id), so a second page_view
// (from the Google tag's Enhanced Measurement, say) or a PageView without an id shows up as a row. The exit code is 1 if an assertion fails.
const http = require("node:http");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawn } = require("node:child_process");

const args = process.argv.slice(2);
const REAL = args.includes("--real");
const ACCEPT = args.includes("--accept");
// --as-live-host: Chrome calls the local copy anaizanest.com, so a pixel or tag that only accepts traffic from the shop's own domain still runs.
// Nothing reaches the real site (the name is mapped to this computer) and nothing is sent anywhere (see above).
const LIVE_HOST = args.includes("--as-live-host") ? "anaizanest.com" : null;
const OUT = path.join(__dirname, "..", "out");
const CHROME = [
  process.env.CHROME_PATH,
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
].find((candidate) => candidate && fs.existsSync(candidate));

const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".txt": "text/plain; charset=utf-8", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".webp": "image/webp", ".woff2": "font/woff2", ".ico": "image/x-icon", ".xml": "application/xml" };
const PIXEL_GIF = "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// ---- the built shop, served the way the host serves it (/cart is cart.html)
function serve() {
  const server = http.createServer((request, response) => {
    const url = decodeURIComponent(new URL(request.url, "http://x").pathname);
    const candidates = [url, `${url}.html`, path.join(url, "index.html")].map((p) => path.join(OUT, p));
    const file = candidates.find((candidate) => candidate.startsWith(OUT) && fs.existsSync(candidate) && fs.statSync(candidate).isFile());
    if (!file) {
      response.writeHead(404, { "content-type": "text/html" });
      response.end(fs.existsSync(path.join(OUT, "404.html")) ? fs.readFileSync(path.join(OUT, "404.html")) : "not found");
      return;
    }
    response.writeHead(200, { "content-type": TYPES[path.extname(file)] || "application/octet-stream" });
    fs.createReadStream(file).pipe(response);
  });

  return new Promise((resolve) => server.listen(0, "127.0.0.1", () => resolve(server)));
}

// ---- a very small Chrome DevTools client
async function connect(port) {
  let list = [];
  for (let attempt = 0; attempt < 50 && !list.length; attempt++) {
    try {
      list = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).filter((target) => target.type === "page");
    } catch {
      await sleep(200);
    }
  }
  if (!list.length) throw new Error("Chrome did not start");

  const socket = new WebSocket(list[0].webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    socket.onopen = resolve;
    socket.onerror = reject;
  });
  let id = 0;
  const waiting = new Map();
  const handlers = [];
  socket.onmessage = ({ data }) => {
    const message = JSON.parse(data);
    if (message.id && waiting.has(message.id)) {
      const { resolve, reject } = waiting.get(message.id);
      waiting.delete(message.id);
      if (message.error) reject(new Error(message.error.message));
      else resolve(message.result);
    } else if (message.method) {
      handlers.forEach((handler) => handler(message));
    }
  };

  return {
    send: (method, params = {}) => new Promise((resolve, reject) => {
      waiting.set(++id, { resolve, reject });
      socket.send(JSON.stringify({ id, method, params }));
    }),
    on: (handler) => handlers.push(handler),
    close: () => socket.close(),
  };
}

// Wraps dataLayer.push before any script of the page runs, and reports each push to this script (so a full page load cannot lose them).
const RECORD_DATA_LAYER = `(function () {
  var layer = window.dataLayer = window.dataLayer || [];
  var original = layer.push;
  layer.push = function () {
    for (var i = 0; i < arguments.length; i++) {
      var item = arguments[i];
      if (item && item.event) { try { window.__record(JSON.stringify(item)); } catch (e) {} }
    }
    return original.apply(layer, arguments);
  };
})();`;

const SENDS_TO_ANALYTICS = /\/g\/collect|\/j\/collect|\/ccm\/collect|google-analytics\.com|analytics\.google\.com|stats\.g\.doubleclick|doubleclick\.net|facebook\.com\/tr|googleadservices|\/pagead\//;

function describe(url, postData) {
  const parsed = new URL(url);
  const params = Object.fromEntries(parsed.searchParams);
  const lines = postData ? postData.split("\n").filter(Boolean).map((line) => Object.fromEntries(new URLSearchParams(line))) : [];
  const where = (value) => {
    try {
      return new URL(value).pathname;
    } catch {
      return value || "";
    }
  };

  // --raw: every parameter of the hit (they hold no secret; the Meta pixel id and the GA4 id are public in the page anyway).
  if (args.includes("--raw") && /\/g\/collect|facebook\.com\/tr/.test(url)) {
    console.log("RAW", parsed.hostname + parsed.pathname, JSON.stringify(params), postData ? `POST: ${postData.slice(0, 400)}` : "");
  }

  if (/\/g\/collect/.test(url)) {
    return [params, ...lines].filter((p) => p.en).map((p) => ({ kind: "GA4", event: p.en, event_id: p["ep.event_id"] || p.evnid || "(none)", page: where(p.dl || params.dl) }));
  }
  if (/facebook\.com\/tr/.test(url)) {
    return [{ kind: "Meta", event: params.ev, event_id: params.eid || "(none)", page: where(params.dl) }];
  }

  return [{ kind: "other", event: parsed.hostname + parsed.pathname.slice(0, 40), event_id: "", page: "" }];
}

async function main() {
  if (!fs.existsSync(path.join(OUT, "index.html"))) throw new Error("out/ is missing: run npm run build first");
  if (!CHROME) throw new Error("Chrome or Edge not found (set CHROME_PATH)");

  const server = await serve();
  const base = LIVE_HOST ? `http://${LIVE_HOST}:${server.address().port}` : `http://127.0.0.1:${server.address().port}`;
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), "an-track-"));
  const debugPort = 9300 + Math.floor(Math.random() * 500);
  const chrome = spawn(CHROME, ["--headless=new", "--disable-gpu", "--no-first-run", "--no-default-browser-check", "--disable-blink-features=AutomationControlled", ...(LIVE_HOST ? [`--host-resolver-rules=MAP ${LIVE_HOST} 127.0.0.1`] : []), `--user-data-dir=${profile}`, `--remote-debugging-port=${debugPort}`, "--window-size=1280,900", "about:blank"], { stdio: "ignore" });
  const hits = [];
  let failed = false;

  try {
    const cdp = await connect(debugPort);
    const pushes = [];
    const seenHosts = {};
    const consoleLines = [];
    const seenUrls = [];
    cdp.on((message) => {
      if (message.method === "Runtime.consoleAPICalled") consoleLines.push(message.params.args.map((a) => a.value ?? a.description ?? "").join(" ").slice(0, 300));
      if (message.method === "Runtime.bindingCalled" && message.params.name === "__record") pushes.push(JSON.parse(message.params.payload));
      if (message.method !== "Fetch.requestPaused") return;
      const { requestId, request } = message.params;
      const local = request.url.startsWith(base) || request.url.startsWith("data:");
      if (!local) { try { const host = new URL(request.url).hostname; seenHosts[host] = (seenHosts[host] || 0) + 1; if (/metrics|facebook|googletagmanager|google-analytics/.test(host)) seenUrls.push(`${request.method} ${host}${new URL(request.url).pathname.slice(0, 40)}`); } catch {} }

      if (SENDS_TO_ANALYTICS.test(request.url)) {
        hits.push(...describe(request.url, request.postData));
        // Answered with an empty picture, not refused: a refused hit is sent again by the Google tag by other means, which would count twice.
        cdp.send("Fetch.fulfillRequest", { requestId, responseCode: 200, responseHeaders: [{ name: "content-type", value: "image/gif" }, { name: "access-control-allow-origin", value: "*" }], body: PIXEL_GIF }).catch(() => {});
      } else if (!local && request.method !== "GET" && request.method !== "HEAD" && request.method !== "OPTIONS") {
        hits.push({ kind: "blocked POST", event: new URL(request.url).hostname, event_id: "", page: "" });
        cdp.send("Fetch.failRequest", { requestId, errorReason: "BlockedByClient" }).catch(() => {});
      } else if (!REAL && /googletagmanager\.com\/gtm\.js/.test(request.url)) {
        cdp.send("Fetch.fulfillRequest", { requestId, responseCode: 200, responseHeaders: [{ name: "content-type", value: "text/javascript" }], body: Buffer.from("/* stub GTM */").toString("base64") }).catch(() => {});
      } else {
        cdp.send("Fetch.continueRequest", { requestId }).catch(() => {});
      }
    });
    await cdp.send("Page.enable");
    await cdp.send("Runtime.enable");
    await cdp.send("Runtime.addBinding", { name: "__record" });
    await cdp.send("Fetch.enable", { patterns: [{ urlPattern: "*" }] });
    await cdp.send("Page.addScriptToEvaluateOnNewDocument", { source: RECORD_DATA_LAYER });

    const run = async (expression) => {
      const { result, exceptionDetails } = await cdp.send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
      if (exceptionDetails) throw new Error(exceptionDetails.text + " " + (exceptionDetails.exception?.description || ""));

      return result.value;
    };
    // --no-history-events (a diagnostic): the Google tag listens to the browser history by putting its own pushState/replaceState on `history`.
    // Removing them before a client-side navigation is the same as GA4's Enhanced measurement "page changes based on browser history events" being off.
    const dropHistoryHooks = () => (args.includes("--no-history-events") ? run("delete history.pushState; delete history.replaceState; true") : null);
    // The tags' files are fetched on the visitor's first touch (see consentBootstrap.ts): a scroll is one.
    const touch = () => run("window.dispatchEvent(new Event('scroll'))");

    await cdp.send("Page.navigate", { url: `${base}/` });
    await sleep(2500);
    await touch();
    await sleep(REAL ? 4000 : 1000);

    if (ACCEPT) {
      const clicked = await run(`(function(){var b=[].slice.call(document.querySelectorAll('button')).find(function(x){return /^(accept|allow)/i.test(x.textContent.trim());});if(b){b.click();return b.textContent.trim();}return null;})()`);
      console.log(clicked ? `Cookie banner: clicked "${clicked}"` : "Cookie banner: no Accept button on this page (nothing to click)");
      await sleep(REAL ? 3000 : 800);
    }

    // A product: first by the link a visitor taps. A page that is still the same document afterwards was a client-side navigation; a new
    // document means the link made a full page load (reported below, since a full load starts the tags again).
    await run("window.__sameDocument = true");
    const link = await run(`(function(){var a=document.querySelector('a[href^="/product/"]');if(!a)return null;var h=a.getAttribute('href');a.click();return h;})()`);
    if (!link) throw new Error("no product link on the home page");
    await sleep(REAL ? 6000 : 1500);
    const linkWasClientSide = await run("window.__sameDocument === true");
    console.log(`Clicking the first product link on the home page: ${linkWasClientSide ? "client-side navigation" : "FULL PAGE LOAD (the link is not handled by the Next router)"}`);
    if (!linkWasClientSide) {
      pushes.length = 0;
      hits.length = 0;
      // Start again from the home page and go to the product through the router, which is what a Next Link does.
      await cdp.send("Page.navigate", { url: `${base}/` });
      await sleep(2500);
      await touch();
      await sleep(REAL ? 4000 : 1000);
      await run("window.__sameDocument = true");
      await dropHistoryHooks();
      await run(`window.next.router.push(${JSON.stringify(link)})`);
      await sleep(REAL ? 6000 : 1500);
    }
    const product = link;

    // The cart is reached through Next's own router (the header's cart link only exists in the drawer once something is in the cart).
    await dropHistoryHooks();
    const cart = await run("(function(){var r=window.next&&window.next.router;if(!r)return null;r.push('/cart');return '/cart';})()");
    if (!cart) throw new Error("window.next.router is not there, so the cart could not be reached by client navigation");
    await sleep(REAL ? 6000 : 1500);

    const here = await run("location.pathname");
    const pageViews = pushes.filter((push) => push.event === "page_view");

    console.log(`\nMode: ${REAL ? "REAL published container (hits recorded, never sent)" : "stub GTM script (no tags run)"}${ACCEPT ? ", cookie banner accepted" : ""}`);
    console.log(`Visit: / -> ${product} -> ${cart} (now on ${here}; the page was not reloaded after the first load: ${await run("performance.getEntriesByType('navigation').length === 1")})\n`);
    console.log("page_view pushes into the data layer:");
    console.table(pageViews.map((push) => ({ page: push.page_path, event_id: push.event_id, referrer: (push.page_referrer || "").replace(/^https?:\/\/[^/]+/, "") })));

    const check = (ok, text) => {
      console.log(`${ok ? "PASS" : "FAIL"}  ${text}`);
      failed = failed || !ok;
    };
    check(pageViews.length === 3, `exactly 3 page_view pushes for 3 pages (found ${pageViews.length})`);
    check(pageViews.every((push) => /^page_view\.[0-9a-f]{16}$/.test(push.event_id || "")), "every page_view has an event_id (page_view.<16 characters>)");
    check(new Set(pageViews.map((push) => push.event_id)).size === pageViews.length, "all event_ids are different");
    check(pageViews.map((push) => push.page_path).join(" ") === ["/", product.replace(/\/$/, ""), "/cart"].map((p) => p.replace(/\/$/, "") || "/").join(" ") || pageViews.map((push) => push.page_path.replace(/\/$/, "") || "/").join(" ") === ["/", product, "/cart"].map((p) => p.replace(/\/$/, "") || "/").join(" "), "one page_view per page, in the order visited");

    if (REAL && args.includes("--probe")) {
      console.log("\nOutside hosts contacted (count):", JSON.stringify(seenHosts));
      console.log("Analytics requests in order:", seenUrls.join(" | "));
      console.log("navigator.webdriver:", await run("navigator.webdriver"));
      console.log("Meta pixel object:", JSON.stringify(await run("window.fbq ? { loaded: !!fbq.loaded, version: fbq.version, queued: (fbq.queue || []).length, ownInit: window._anMetaInit === true, pixelIds: fbq.getState ? fbq.getState().pixels.map(function (p) { return p.id; }) : null } : 'no fbq'")));
      console.log("Consent now:", JSON.stringify(await run("window.anaizaConsent && { cfg: { mode: anaizaConsent.config.mode, enabled: anaizaConsent.config.enabled, defer: anaizaConsent.config.defer }, effective: anaizaConsent.effective(), saved: anaizaConsent.get() }")));
    }
    if (REAL) {
      const useful = hits.filter((hit) => hit.kind !== "other");
      console.log("\nWhat would have left the browser (recorded, then refused):");
      console.table(useful.map((hit) => ({ to: hit.kind, event: hit.event, event_id: hit.event_id, page: hit.page })));
      const ga4 = useful.filter((hit) => hit.kind === "GA4" && hit.event === "page_view");
      const meta = useful.filter((hit) => hit.kind === "Meta" && hit.event === "PageView");
      check(ga4.every((hit) => hit.event_id !== "(none)"), `every GA4 page_view hit carries an event_id (${ga4.length} hits, ${ga4.filter((hit) => hit.event_id === "(none)").length} without)`);
      check(ga4.length === 3, `3 GA4 page_view hits for 3 pages (found ${ga4.length})`);
      check(meta.every((hit) => hit.event_id !== "(none)"), `every Meta PageView hit carries an event id (${meta.length} hits, ${meta.filter((hit) => hit.event_id === "(none)").length} without)`);
    } else {
      console.log("\nGA4 and Meta requests: none can be seen in stub mode (GTM's script is replaced). Run with --real to list them.");
    }
    cdp.close();
  } finally {
    chrome.kill();
    server.close();
    await sleep(300);
    fs.rmSync(profile, { recursive: true, force: true });
  }
  process.exit(failed ? 1 : 0);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
