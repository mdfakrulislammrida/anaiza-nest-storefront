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
// A very small GTM, made from the real container file (docs/gtm-container-anaizanest-v4.json): it reads the data layer in order, as GTM does when its
// script arrives late (the queue is replayed from the start), keeps the data layer model, and for each event runs the custom HTML tags whose trigger is that
// event, with the container's variables. Enough to see whether a tag that needs the pixel (ViewContent) finds it. It does not model consent, GA4 or the network.
function miniGtmSource() {
  const container = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "docs", "gtm-container-anaizanest-v4.json"), "utf8")).containerVersion;
  const param = (item, key) => (item.parameter.find((p) => p.key === key) || {}).value;
  const constants = {};
  const layerVariables = {};
  for (const variable of container.variable) {
    if (variable.type === "c") constants[variable.name] = param(variable, "value");
    if (variable.type === "v") layerVariables[variable.name] = param(variable, "name");
  }
  const eventOf = {};
  for (const trigger of container.trigger) eventOf[trigger.triggerId] = trigger.customEventFilter[0].parameter[1].value;
  const tags = container.tag
    .filter((tag) => tag.type === "html")
    .map((tag) => ({
      name: tag.name,
      events: tag.firingTriggerId.map((id) => eventOf[id]).filter(Boolean),
      code: param(tag, "html").replace(/^<script>\n?/, "").replace(/\n?<\/script>$/, "").replace(/\{\{([^}]+)\}\}/g, (_, name) => `__mg(${JSON.stringify(name)})`),
    }));

  return `(function () {
  var TAGS = ${JSON.stringify(tags)}, CONSTANTS = ${JSON.stringify(constants)}, VARIABLES = ${JSON.stringify(layerVariables)};
  var model = {}; window.__mgErrors = []; window.__mgFired = [];
  function get(p) { var o = model, a = p.split("."); for (var i = 0; i < a.length; i++) { if (o == null) return undefined; o = o[a[i]]; } return o; }
  window.__mg = function (name) { if (name in CONSTANTS) return CONSTANTS[name]; if (name in VARIABLES) return get(VARIABLES[name]); return undefined; };
  function handle(o) {
    if (!o || typeof o !== "object" || Array.isArray(o) || Object.prototype.toString.call(o) === "[object Arguments]") return;
    for (var k in o) { if (o[k] === null) delete model[k]; else model[k] = o[k]; }
    if (!o.event) return;
    TAGS.forEach(function (tag) {
      if (tag.events.indexOf(o.event) === -1) return;
      window.__mgFired.push(tag.name + " <- " + o.event);
      try { (0, eval)(tag.code); } catch (e) { window.__mgErrors.push(tag.name + ": " + e.message); }
    });
  }
  var layer = window.dataLayer, queued = layer.slice(), push = layer.push;
  layer.push = function () { for (var i = 0; i < arguments.length; i++) { push.call(layer, arguments[i]); handle(arguments[i]); } return layer.length; };
  queued.forEach(handle);
})();`;
}

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

  // A copy of the shop's product list, for the list pages (see below). Without internet those pages are simply not checked.
  let productsFixture = null;
  if (!REAL) {
    try {
      const response = await fetch("https://api.anaizanest.com/api/products?per_page=24", { headers: { Accept: "application/json" } });
      if (response.ok) productsFixture = await response.text();
    } catch {
      // offline
    }
    if (!productsFixture) console.log("NOTE: the shop's API could not be reached, so the list pages (shop, category, special prices) are not checked.");
  }

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
        cdp.send("Fetch.fulfillRequest", { requestId, responseCode: 200, responseHeaders: [{ name: "content-type", value: "text/javascript" }], body: Buffer.from(miniGtmSource()).toString("base64") }).catch(() => {});
      } else if (!REAL && productsFixture && /api\.anaizanest\.com\/api\/products\?/.test(request.url)) {
        // The list pages ask the shop's API for their products. A page served from this computer is not on the API's list of allowed sites, so the answer is
        // a copy of the real one (read once at the start), with the permission added. Everything else about the page is the real build.
        const cors = [{ name: "access-control-allow-origin", value: "*" }, { name: "access-control-allow-headers", value: "*" }, { name: "access-control-allow-methods", value: "GET, OPTIONS" }];
        if (request.method === "OPTIONS") cdp.send("Fetch.fulfillRequest", { requestId, responseCode: 204, responseHeaders: cors }).catch(() => {});
        else cdp.send("Fetch.fulfillRequest", { requestId, responseCode: 200, responseHeaders: [{ name: "content-type", value: "application/json" }, ...cors], body: Buffer.from(productsFixture).toString("base64") }).catch(() => {});
      } else if (!REAL && /connect\.facebook\.net/.test(request.url)) {
        cdp.send("Fetch.fulfillRequest", { requestId, responseCode: 200, responseHeaders: [{ name: "content-type", value: "text/javascript" }], body: Buffer.from("/* stub fbevents */").toString("base64") }).catch(() => {});
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

    // ---- Landing straight on a page (an ad click): the page's own event must come AFTER its page_view. GTM is the small stand-in above (stub mode only), so
    // ---- this also shows whether the Meta ViewContent tag finds the pixel that the page_view tag creates. Not modelled: consent, GA4, the real GTM script.
    const cartLine = { key: "7:base", productId: 7, slug: "mug", name: "Mug", price: 600, image: null, variantId: null, variantLabel: null, sku: "MUG-RED", category: "Mugs", quantity: 2, stock: 5 };
    const PAGE_EVENTS = ["page_view", "view_item", "view_item_list", "view_cart", "begin_checkout"];

    async function landOn(label, urlPath, expected, withCart) {
      await run(withCart ? `localStorage.setItem("anaiza-cart", JSON.stringify([${JSON.stringify(cartLine)}]))` : 'localStorage.removeItem("anaiza-cart")');
      pushes.length = 0;
      await cdp.send("Page.navigate", { url: `${base}${urlPath}` });
      await sleep(2500);
      await touch();
      await sleep(2000);
      const names = pushes.map((push) => push.event).filter((name) => PAGE_EVENTS.includes(name));
      const fired = await run("window.__mgFired || []");
      const queue = await run("window.fbq && window.fbq.queue ? Array.prototype.map.call(window.fbq.queue, function (a) { return Array.prototype.slice.call(a); }) : null");
      console.log(`\nLanding on ${urlPath} (${label}):`);
      console.log("  data layer:", names.join(" -> "));
      console.log("  tags fired:", fired.join(" | ") || "(none)");
      check(names[0] === "page_view", `${label}: page_view is the first page event (${names[0]})`);
      check(names.filter((name) => name === "page_view").length === 1, `${label}: exactly one page_view`);
      check(names.indexOf(expected) > names.indexOf("page_view") && names.includes(expected), `${label}: ${expected} comes after page_view`);

      return { queue, pushes: pushes.slice() };
    }

    async function landings() {
    const landing = await landOn("a product", product, "view_item", false);
    const viewItem = landing.pushes.find((push) => push.event === "view_item");
    const calls = (landing.queue || []).map((call) => call.slice(0, 2).join(" "));
    const initAt = calls.findIndex((call) => call.startsWith("init "));
    const viewContentAt = (landing.queue || []).findIndex((call) => call[0] === "track" && call[1] === "ViewContent");
    check(initAt !== -1 && viewContentAt > initAt, `a product: the Meta pixel is started, then ViewContent is called (fbq calls: ${calls.join(", ") || "none"})`);
    check(viewContentAt !== -1 && Boolean(viewItem) && JSON.stringify(landing.queue[viewContentAt][3]) === JSON.stringify({ eventID: viewItem.event_id }), "a product: ViewContent's eventID is the view_item event_id");

    if (productsFixture) {
      await landOn("the shop", "/shop", "view_item_list", false);
      await landOn("a category", "/category/gifts", "view_item_list", false);
      await landOn("special prices", "/special-prices", "view_item_list", false);
    }
    await landOn("the cart", "/cart", "view_cart", true);
    await landOn("the checkout", "/checkout", "begin_checkout", true);
    await run('localStorage.removeItem("anaiza-cart")');

    // ---- Microsoft Clarity records what is on screen. Every place that shows or takes a customer's name, phone, address or email must sit inside an element with
    // ---- data-clarity-mask="true". Each needle is a piece of text (or an input) of that kind; its nearest masked ancestor must exist.
    const order = {
      id: 1004, status: "pending", payment_method: "cod", payment_status: "cod", subtotal: 1850, delivery_fee: 80, total: 1930, gift_note: null, created_at: "2026-10-06T00:00:00Z",
      customer: { id: 1, name: "Maskcheck Person", email: "maskcheck.person@example.test", phone: "01711223344", address: "House 9, Road 9", division: "Dhaka", district: "Dhaka", thana: "Banani" },
      items: [{ id: 1, product_id: 7, product_name: "Mug", quantity: 1, price: 1850, variant_name: null, variant_value: null, sku: "M-1", category: "Mugs" }],
    };

    async function maskCheck(label, urlPath, { texts = [], inputs = [], setup, title }) {
      if (setup) await run(setup);
      await cdp.send("Page.navigate", { url: `${base}${urlPath}` });
      await sleep(3000);
      const result = await run(`(function () {
        var out = { texts: {}, inputs: {} };
        var texts = ${JSON.stringify(texts)}, inputs = ${JSON.stringify(inputs)};
        texts.forEach(function (needle) {
          var walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT), node, found = 0, masked = 0;
          while ((node = walker.nextNode())) {
            if (node.nodeValue.indexOf(needle) === -1) continue;
            found++;
            if (node.parentElement && node.parentElement.closest('[data-clarity-mask="true"]')) masked++;
          }
          out.texts[needle] = found === 0 ? "not on the page" : masked === found ? "masked" : "NOT MASKED (" + masked + " of " + found + ")";
        });
        inputs.forEach(function (name) {
          var el = document.querySelector('[name="' + name + '"]');
          out.inputs[name] = !el ? "not on the page" : el.closest('[data-clarity-mask="true"]') ? "masked" : "NOT MASKED";
        });
        return out;
      })()`);
      if (title) {
        const page = await run("({ title: document.title, robots: (document.querySelector('meta[name=robots]') || {}).content || '' })");
        check(page.title === title, `${label}: the title is "${page.title}" (wanted "${title}")`);
        check(/noindex/.test(page.robots), `${label}: still noindex (${page.robots})`);
      }
      for (const [needle, state] of Object.entries(result.texts)) check(state === "masked", `${label}: the text "${needle.slice(0, 24)}" is ${state}`);
      for (const [name, state] of Object.entries(result.inputs)) check(state === "masked", `${label}: the field ${name} is ${state}`);
    }

    await maskCheck("order confirmation", "/order-confirmation", {
      setup: `sessionStorage.setItem("anaiza-last-order", JSON.stringify(${JSON.stringify(order)}))`,
      texts: ["Maskcheck Person", "House 9, Road 9", "maskcheck.person@example.test", "01711223344"],
      title: "Order confirmation | Anaiza Nest",
    });
    await run('sessionStorage.removeItem("anaiza-last-order"); sessionStorage.removeItem("anaiza-tracked-orders")');
    await maskCheck("track order", "/track-order", { inputs: ["order_id", "phone"], title: "Track your order | Anaiza Nest" });
    await maskCheck("account (signed out)", "/account", { inputs: ["email", "password"], title: "Account | Anaiza Nest" });
    await maskCheck("checkout", "/checkout", {
      setup: `localStorage.setItem("anaiza-cart", JSON.stringify([${JSON.stringify(cartLine)}]))`,
      inputs: ["customer_name", "customer_phone", "customer_email"],
      title: "Checkout | Anaiza Nest",
    });
    await maskCheck("cart", "/cart", { title: "Your cart | Anaiza Nest" });

    // ---- How often begin_checkout is pushed (an investigation, S5 of the audit): the checkout page, a reload, leaving and coming back inside the app, and back/forward.
    // ---- Reported as numbers; the one thing asserted is that a single visit never pushes it twice.
    async function checkoutVisits() {
      await run(`localStorage.setItem("anaiza-cart", JSON.stringify([${JSON.stringify(cartLine)}]))`);
      const count = () => pushes.filter((push) => push.event === "begin_checkout").length;
      const steps = [];
      const step = async (label, action, wait = 2500) => {
        const before = count();
        await action();
        await sleep(wait);
        steps.push({ step: label, "begin_checkout pushed by this step": count() - before, "total so far": count() });
      };

      pushes.length = 0;
      await step("open /checkout (full page load)", () => cdp.send("Page.navigate", { url: `${base}/checkout` }), 3500);
      await step("stay on the page 3 s, scroll, click inside the form", () => run("window.scrollTo(0, 400); document.querySelector('input[name=customer_name]').focus(); document.querySelector('input[name=customer_name]').blur(); true"), 3000);
      await step("reload the page", () => cdp.send("Page.reload"), 3500);
      await step("go to /cart inside the app, then back to /checkout inside the app", async () => {
        await run("window.next.router.push('/cart')");
        await sleep(1800);
        await run("window.next.router.push('/checkout')");
      }, 2500);
      await step("browser Back (to /cart) and Forward (to /checkout)", async () => {
        await run("history.back()");
        await sleep(1800);
        await run("history.forward()");
      }, 2500);
      await step("open /checkout from the cart page with a link click", async () => {
        await run("window.next.router.push('/cart')");
        await sleep(1500);
        await run("(document.querySelector('a[href=\"/checkout\"]') || {click(){}}).click()");
      }, 2500);
      console.log("\nbegin_checkout pushes (an investigation, no behaviour changed):");
      console.table(steps);
      check(steps[0]["begin_checkout pushed by this step"] === 1 && steps[1]["begin_checkout pushed by this step"] === 0, "one visit to the checkout pushes begin_checkout once, and staying on it pushes nothing more");
      await run('localStorage.removeItem("anaiza-cart")');
    }
    await checkoutVisits();
    await run('localStorage.removeItem("anaiza-cart")');
    }
    check(pageViews.length === 3, `exactly 3 page_view pushes for 3 pages (found ${pageViews.length})`);
    check(pageViews.every((push) => /^page_view\.[0-9a-f]{16}$/.test(push.event_id || "")), "every page_view has an event_id (page_view.<16 characters>)");
    check(new Set(pageViews.map((push) => push.event_id)).size === pageViews.length, "all event_ids are different");
    check(pageViews.map((push) => push.page_path).join(" ") === ["/", product.replace(/\/$/, ""), "/cart"].map((p) => p.replace(/\/$/, "") || "/").join(" ") || pageViews.map((push) => push.page_path.replace(/\/$/, "") || "/").join(" ") === ["/", product, "/cart"].map((p) => p.replace(/\/$/, "") || "/").join(" "), "one page_view per page, in the order visited");
    // The visitor's id (identity.ts): made once marketing is allowed (the shop's default cookie mode allows it), hashed on every event, the same on every page.
    const eid = await run("(document.cookie.match(/(?:^|; )an_eid=([^;]*)/) || [])[1] || null");
    const hashes = pageViews.map((push) => push.user_data && push.user_data.external_id);
    check(Boolean(eid) && /^[0-9a-f-]{36}$/.test(eid), "the visitor's id cookie an_eid exists (a UUID)");
    check(hashes.every((hash) => typeof hash === "string" && /^[0-9a-f]{64}$/.test(hash)) && new Set(hashes).size === 1, "every page_view carries user_data.external_id (64 hex), the same on every page");
    check(!JSON.stringify(pushes).includes(eid || "no-id"), "the raw id is never in the data layer");

    if (REAL && args.includes("--probe")) {
      console.log("\nOutside hosts contacted (count):", JSON.stringify(seenHosts));
      console.log("Analytics requests in order:", seenUrls.join(" | "));
      console.log("navigator.webdriver:", await run("navigator.webdriver"));
      console.log("Meta pixel object:", JSON.stringify(await run("window.fbq ? { loaded: !!fbq.loaded, version: fbq.version, queued: (fbq.queue || []).length, ownInit: window._anMetaInit === true, pixelIds: fbq.getState ? fbq.getState().pixels.map(function (p) { return p.id; }) : null } : 'no fbq'")));
      console.log("Consent now:", JSON.stringify(await run("window.anaizaConsent && { cfg: { mode: anaizaConsent.config.mode, enabled: anaizaConsent.config.enabled, defer: anaizaConsent.config.defer }, effective: anaizaConsent.effective(), saved: anaizaConsent.get() }")));
    }
    if (REAL) console.log("\nLandings are checked in stub mode only (they need the stand-in for GTM).");
    else await landings();

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
