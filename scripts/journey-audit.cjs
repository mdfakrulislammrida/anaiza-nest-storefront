/* eslint-disable @typescript-eslint/no-require-imports -- a plain node script, like audit-html.cjs it has no build step. */
// Looks at the built shop (out/) the way a phone does, page by page, in headless Chrome, and measures:
//   overflow (page scrollWidth against the screen), controls under 44 px, text fields under 16 px, text with too little contrast (WCAG AA), images without width and
//   height or much larger than shown or not WebP/AVIF, the words the brand does not use, colours that are not in the brand kit, corners that are not 2 px, shadows and
//   gradients, fonts other than Fraunces and Inter, fixed pieces (WhatsApp button, bars) that overlap one another, console errors, LCP, layout shift and bytes.
//
//   npm run build                                             (this reads out/)
//   node scripts/journey-audit.cjs                            every page at 390 x 844, a table, and JSON in docs/cro-screenshots/audit-<width>.json
//   node scripts/journey-audit.cjs --width 360                another phone width (also 430, 768, 1280)
//   node scripts/journey-audit.cjs --only home,product        some pages
//   node scripts/journey-audit.cjs --perf                     also LCP, layout shift and bytes with a slow phone (4x slower CPU, slow 4G), for the key pages
//   node scripts/journey-audit.cjs --shots                    a screenshot of each page in docs/cro-screenshots/ (not committed)
//
// Nothing is ordered or sent: the shop's API is read (copied through with permission added) and every other site is refused.
const http = require("node:http");
const https = require("node:https");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawn } = require("node:child_process");

const args = process.argv.slice(2);
const option = (name) => (args.includes(name) ? args[args.indexOf(name) + 1] : null);
const WIDTH = Number(option("--width")) || 390;
const HEIGHT = WIDTH >= 1280 ? 900 : WIDTH >= 768 ? 1024 : 844;
const ONLY = option("--only") ? option("--only").split(",") : null;
const PERF = args.includes("--perf");
const SHOTS = args.includes("--shots");
const ROOT = path.join(__dirname, "..");
const OUT = path.join(ROOT, "out");
const SHOT_DIR = path.join(ROOT, "docs", "cro-screenshots");
const CHROME = [process.env.CHROME_PATH, "C:/Program Files/Google/Chrome/Application/chrome.exe", "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe", "/usr/bin/google-chrome", "/usr/bin/chromium"].find((c) => c && fs.existsSync(c));
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".txt": "text/plain; charset=utf-8", ".svg": "image/svg+xml", ".png": "image/png", ".webp": "image/webp", ".woff2": "font/woff2", ".ico": "image/x-icon", ".xml": "application/xml" };
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const first = (dir, skip = []) => {
  const full = path.join(OUT, dir);
  const hit = fs.existsSync(full) ? fs.readdirSync(full).filter((n) => n.endsWith(".html") && !skip.includes(n) && !n.startsWith("__")).sort()[0] : null;
  return hit ? `/${dir}/${hit.replace(/\.html$/, "")}` : null;
};

const CART_LINE = { key: "audit-1", productId: 1, slug: "audit", name: "A gift for the audit", price: 1450, image: null, variantId: null, variantLabel: null, quantity: 1, stock: 20 };
// [name, path, seeds a cart]
const PAGES = [
  ["home", "/"],
  ["shop", "/shop"],
  ["category", first("category", ["category.html"])],
  ["special-prices", "/special-prices"],
  ["product", first("product")],
  ["cart", "/cart", true],
  ["checkout", "/checkout", true],
  ["order-confirmation", "/order-confirmation"],
  ["track-order", "/track-order"],
  ["account", "/account"],
  ["gift-finder", "/gift-finder"],
  ["corporate-gifting", "/corporate-gifting"],
  ["about", "/pages/about"],
  ["contact", "/contact"],
  ["faq", "/faq"],
  ["blog", "/blog"],
  ["blog-article", first("blog")],
  ["policy-returns", "/pages/returns"],
  ["policy-privacy", "/pages/privacy"],
  ["404", "/this-page-does-not-exist"],
].filter(([name, route]) => route && (!ONLY || ONLY.includes(name)));

// The brand kit.
const KIT = { ivory: "F6F1E7", navy: "1B2A41", gold: "AD8A50", burgundy: "661E29", linen: "EDE4D3", deepink: "141F30", champagne: "D4B786", charcoal: "2A2622", stone: "6F675C", white: "FFFFFF" };

// ---- what runs in the page
const MEASURE = `(() => {
  const KIT = ${JSON.stringify(KIT)};
  const toRgb = (c) => { const m = c.match(/rgba?\\(([^)]+)\\)/); if (!m) return null; const p = m[1].split(/[ ,\\/]+/).filter(Boolean).map(Number); return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; };
  const hex = (c) => [c.r, c.g, c.b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('').toUpperCase();
  const lum = (c) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b); };
  const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  const blend = (top, under) => ({ r: top.r * top.a + under.r * (1 - top.a), g: top.g * top.a + under.g * (1 - top.a), b: top.b * top.a + under.b * (1 - top.a), a: 1 });
  const bgOf = (el) => { const layers = []; for (let n = el; n; n = n.parentElement) { const c = toRgb(getComputedStyle(n).backgroundColor); if (c && c.a > 0) { layers.push(c); if (c.a >= 1) break; } } let out = { r: 246, g: 241, b: 231, a: 1 }; for (const l of layers.reverse()) out = blend(l, out); return out; };
  const visible = (el) => { const r = el.getBoundingClientRect(); const s = getComputedStyle(el); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none' && Number(s.opacity) > 0; };
  const label = (el) => (el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + '.' + String(el.className && el.className.baseVal !== undefined ? el.className.baseVal : el.className).trim().split(/\\s+/).slice(0, 2).join('.')).slice(0, 70) + ' "' + (el.innerText || el.getAttribute('aria-label') || el.value || el.alt || '').trim().replace(/\\s+/g, ' ').slice(0, 24) + '"';
  const vw = window.innerWidth;
  const out = { vw, overflow: document.documentElement.scrollWidth - vw };

  // controls under 44 px (a control is what a thumb has to hit); links in running text are not counted
  const controls = [...document.querySelectorAll('button, input:not([type=hidden]), select, textarea, summary, [role=button], [role=radio], [role=tab], nav a, header a, footer a, a[class*=btn], a[class*=rounded], a[class*=min-h], a:has(svg), a:has(img)')].filter(visible);
  out.smallControls = controls.map((el) => { const r = el.getBoundingClientRect(); return { el: label(el), w: Math.round(r.width), h: Math.round(r.height) }; }).filter((x) => (x.h < 44 || x.w < 44) && !/checkbox|radio/.test(x.el)).slice(0, 40);
  out.controlCount = controls.length;

  // text fields under 16 px
  out.smallInputs = [...document.querySelectorAll('input:not([type=hidden]):not([type=checkbox]):not([type=radio]), select, textarea')].filter(visible).map((el) => ({ el: label(el), px: parseFloat(getComputedStyle(el).fontSize) })).filter((x) => x.px < 16);

  // contrast of text (each distinct pair counted once, with how many elements use it)
  const pairs = new Map();
  for (const el of document.body.querySelectorAll('*')) {
    if (!visible(el)) continue;
    const own = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim().length > 0);
    if (!own) continue;
    const s = getComputedStyle(el);
    const fg = toRgb(s.color); if (!fg) continue;
    const bg = bgOf(el);
    const text = blend(fg, bg);
    const size = parseFloat(s.fontSize); const bold = Number(s.fontWeight) >= 700;
    const large = size >= 24 || (size >= 18.66 && bold);
    const need = large ? 3 : 4.5;
    const r = ratio(text, bg);
    if (r < need) { const k = hex(text) + ' on ' + hex(bg) + ' (' + r.toFixed(2) + ':1, needs ' + need + ')'; const p = pairs.get(k) || { n: 0, example: label(el) }; p.n++; pairs.set(k, p); }
  }
  out.lowContrast = [...pairs.entries()].map(([pair, v]) => ({ pair, count: v.n, example: v.example })).sort((a, b) => b.count - a.count).slice(0, 12);

  // images
  out.images = [...document.images].filter(visible).map((img) => { const r = img.getBoundingClientRect(); const src = img.currentSrc || img.src; return { src: src.slice(-60), noSize: !(img.getAttribute('width') && img.getAttribute('height')), shownW: Math.round(r.width), naturalW: img.naturalWidth, ratio: r.width ? +(img.naturalWidth / r.width).toFixed(1) : 0, format: (src.split('?')[0].match(/\\.(\\w+)$/) || [])[1] || '?', lazy: img.loading === 'lazy', top: Math.round(r.top + scrollY) }; });

  // words the brand does not use, on the page as it shows
  const text = document.body.innerText;
  out.bannedWords = [...new Set((text.match(/\\b(luxury|luxurious|premium|exclusive|cheap|best quality|hurry|hot deals?)\\b/gi) || []).map((w) => w.toLowerCase()))];
  out.shouting = (text.match(/!{2,}/g) || []).length + [...text.matchAll(/\\b[A-Z]{5,}\\b/g)].filter((m) => !/^(WHATSAPP|BKASH|NAGAD|ROCKET|HTTPS|FAQ)$/.test(m[0])).length;
  out.pricesWrong = [...new Set((text.match(/(?:BDT|Tk\\.?|TK|Rs\\.?|taka)\\s?[\\d,]+|\\d[\\d,]*\\s?(?:BDT|Tk\\b|taka)/gi) || []))].slice(0, 5);

  // colours, corners, shadows, gradients, fonts
  const colours = new Map(); const radii = new Map(); const fonts = new Map(); let shadows = []; let gradients = [];
  for (const el of document.body.querySelectorAll('*')) {
    if (!visible(el)) continue;
    const s = getComputedStyle(el);
    for (const prop of ['color', 'backgroundColor', 'borderTopColor']) {
      const c = toRgb(s[prop]); if (!c || c.a === 0) continue; if (prop === 'borderTopColor' && parseFloat(s.borderTopWidth) === 0) continue;
      const h = hex(c); const k = h + (c.a < 1 ? '~' : ''); const v = colours.get(k) || { n: 0, example: label(el), prop }; v.n++; colours.set(k, v);
    }
    const rad = s.borderTopLeftRadius; if (rad && rad !== '0px') { const r = el.getBoundingClientRect(); const circle = parseFloat(rad) >= Math.min(r.width, r.height) / 2 - 0.5; if (!circle && parseFloat(rad) !== 2) { const v = radii.get(rad) || { n: 0, example: label(el) }; v.n++; radii.set(rad, v); } }
    if (s.boxShadow && s.boxShadow !== 'none' && !/rgba\\(0, 0, 0, 0\\)/.test(s.boxShadow) && !/^0px 0px 0px/.test(s.boxShadow)) shadows.push(label(el) + ' ' + s.boxShadow.slice(0, 40));
    if (/gradient/.test(s.backgroundImage)) gradients.push(label(el));
    const f = s.fontFamily.split(',')[0].replace(/["']/g, '').trim(); const fv = fonts.get(f) || { n: 0, example: label(el) }; fv.n++; fonts.set(f, fv);
  }
  const near = (h) => Object.entries(KIT).find(([, k]) => { const a = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)); const b = [0, 2, 4].map((i) => parseInt(k.slice(i, i + 2), 16)); return Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2]) <= 9; });
  out.offKitColours = [...colours.entries()].filter(([k]) => !near(k.replace('~', ''))).map(([k, v]) => ({ colour: '#' + k, count: v.n, as: v.prop, example: v.example })).sort((a, b) => b.count - a.count).slice(0, 10);
  out.offCorners = [...radii.entries()].map(([r, v]) => ({ radius: r, count: v.n, example: v.example })).sort((a, b) => b.count - a.count).slice(0, 8);
  out.shadows = [...new Set(shadows)].slice(0, 6);
  out.gradients = [...new Set(gradients)].slice(0, 6);
  out.fonts = [...fonts.entries()].map(([f, v]) => ({ font: f, count: v.n })).sort((a, b) => b.count - a.count);
  out.bodyFont = parseFloat(getComputedStyle(document.body).fontSize);

  // fixed pieces and whether they overlap each other
  const fixed = [...document.body.querySelectorAll('*')].filter((el) => visible(el) && getComputedStyle(el).position === 'fixed').map((el) => { const r = el.getBoundingClientRect(); return { el: label(el), l: Math.round(r.left), t: Math.round(r.top), r: Math.round(r.right), b: Math.round(r.bottom) }; }).filter((f) => f.r - f.l > 8 && f.b - f.t > 8 && !/dialog|overlay/.test(f.el));
  out.fixed = fixed;
  out.fixedOverlaps = [];
  for (let i = 0; i < fixed.length; i++) for (let j = i + 1; j < fixed.length; j++) { const a = fixed[i], b = fixed[j]; if (a.l < b.r && b.l < a.r && a.t < b.b && b.t < a.b) out.fixedOverlaps.push(a.el + '  x  ' + b.el); }

  // headings
  out.h1 = document.querySelectorAll('h1').length;
  out.headingOrder = [...document.querySelectorAll('h1,h2,h3,h4')].filter(visible).map((h) => Number(h.tagName[1])).filter((v, i, a) => i > 0 && v - a[i - 1] > 1).length;
  out.noAlt = [...document.images].filter((i) => !i.hasAttribute('alt')).length;
  out.unlabelled = [...document.querySelectorAll('input:not([type=hidden]), select, textarea')].filter((el) => visible(el) && !el.labels?.length && !el.getAttribute('aria-label') && !el.getAttribute('aria-labelledby')).map(label).slice(0, 6);
  return out;
})()`;

const PERF_INJECT = `(() => { window.__lcp = null; window.__cls = 0; new PerformanceObserver((l) => { const e = l.getEntries().pop(); window.__lcp = { t: Math.round(e.startTime), tag: e.element ? e.element.tagName + ' ' + (e.element.currentSrc || e.element.className || '').toString().slice(-70) : '?', size: e.size }; }).observe({ type: 'largest-contentful-paint', buffered: true }); new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__cls += e.value; }).observe({ type: 'layout-shift', buffered: true }); window.__tbt = 0; new PerformanceObserver((l) => { for (const e of l.getEntries()) if (e.duration > 50) window.__tbt += e.duration - 50; }).observe({ type: 'longtask', buffered: true }); })()`;

const apiCache = new Map();
function liveApi(url) {
  if (!apiCache.has(url)) apiCache.set(url, new Promise((resolve) => { https.get(url, { headers: { Accept: "application/json" } }, (res) => { const c = []; res.on("data", (d) => c.push(d)); res.on("end", () => resolve({ status: res.statusCode, body: Buffer.concat(c) })); }).on("error", () => resolve({ status: 502, body: Buffer.from("{}") })); }));
  return apiCache.get(url);
}
function startSite() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      const rel = decodeURIComponent(req.url.split("?")[0]).replace(/^\/+/, "");
      const candidates = [rel, `${rel}.html`, path.join(rel, "index.html")];
      if (rel === "") candidates.unshift("index.html");
      const file = candidates.map((c) => path.join(OUT, c)).find((c) => fs.existsSync(c) && fs.statSync(c).isFile());
      if (!file) return void res.writeHead(404, { "Content-Type": "text/html" }).end(fs.readFileSync(path.join(OUT, "404.html")));
      res.writeHead(200, { "Content-Type": TYPES[path.extname(file)] || "application/octet-stream" }).end(fs.readFileSync(file));
    });
    server.listen(0, "127.0.0.1", () => resolve(server));
  });
}

async function main() {
  if (!CHROME) throw new Error("No Chrome or Edge found (set CHROME_PATH).");
  const site = await startSite();
  const base = `http://127.0.0.1:${site.address().port}`;
  const port = 9600 + Math.floor(Math.random() * 300);
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), "journey-"));
  const chrome = spawn(CHROME, ["--headless=new", "--disable-gpu", "--no-first-run", `--user-data-dir=${profile}`, `--remote-debugging-port=${port}`, "about:blank"], { stdio: "ignore" });
  const results = [];

  try {
    let version;
    for (let i = 0; i < 60 && !version; i++) { try { version = await (await fetch(`http://127.0.0.1:${port}/json/version`)).json(); } catch { await sleep(500); } }
    const socket = new WebSocket(version.webSocketDebuggerUrl);
    await new Promise((resolve) => (socket.onopen = resolve));
    let next = 1; const waiting = new Map(); const listeners = [];
    socket.onmessage = (event) => { const m = JSON.parse(event.data); if (m.id && waiting.has(m.id)) { const { resolve, reject } = waiting.get(m.id); waiting.delete(m.id); if (m.error) reject(new Error(m.error.message)); else resolve(m.result); } else if (m.method) listeners.forEach((l) => l(m)); };
    const send = (method, params = {}, sessionId) => { const id = next++; socket.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) })); return new Promise((resolve, reject) => waiting.set(id, { resolve, reject })); };
    const { targetId } = await send("Target.createTarget", { url: "about:blank" });
    const { sessionId } = await send("Target.attachToTarget", { targetId, flatten: true });
    const cdp = (m, p) => send(m, p, sessionId);
    const run = async (expression) => { const { result, exceptionDetails } = await cdp("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true }); if (exceptionDetails) throw new Error(exceptionDetails.exception?.description || exceptionDetails.text); return result.value; };

    let consoleLines = []; let bytes = { script: 0, image: 0, stylesheet: 0, font: 0, document: 0, other: 0, scriptCount: 0 }; const types = new Map();
    listeners.push((m) => {
      if (m.sessionId !== sessionId) return;
      if (m.method === "Fetch.requestPaused") {
        const { requestId, request } = m.params;
        const local = request.url.startsWith(base) || request.url.startsWith("data:");
        if (local) return void cdp("Fetch.continueRequest", { requestId }).catch(() => {});
        if (/^https:\/\/api\.anaizanest\.com\//.test(request.url)) {
          const cors = [{ name: "access-control-allow-origin", value: "*" }, { name: "access-control-allow-headers", value: "*" }, { name: "access-control-allow-methods", value: "GET, OPTIONS" }];
          if (request.method === "OPTIONS") return void cdp("Fetch.fulfillRequest", { requestId, responseCode: 204, responseHeaders: cors }).catch(() => {});
          if (request.method !== "GET") return void cdp("Fetch.failRequest", { requestId, errorReason: "BlockedByClient" }).catch(() => {});
          if (/\/storage\//.test(request.url)) return void cdp("Fetch.continueRequest", { requestId }).catch(() => {});
          return void liveApi(request.url).then((live) => cdp("Fetch.fulfillRequest", { requestId, responseCode: live.status, responseHeaders: [{ name: "content-type", value: "application/json" }, ...cors], body: live.body.toString("base64") })).catch(() => {});
        }
        if (/fonts\.(googleapis|gstatic)\.com/.test(request.url)) return void cdp("Fetch.continueRequest", { requestId }).catch(() => {});
        return void cdp("Fetch.failRequest", { requestId, errorReason: "BlockedByClient" }).catch(() => {});
      }
      if (m.method === "Network.responseReceived") types.set(m.params.requestId, m.params.type);
      if (m.method === "Network.loadingFinished") { const t = (types.get(m.params.requestId) || "other").toLowerCase(); const key = ["script", "image", "stylesheet", "font", "document"].includes(t) ? t : "other"; bytes[key] += m.params.encodedDataLength; if (key === "script") bytes.scriptCount++; }
      if (m.method === "Runtime.exceptionThrown") consoleLines.push("exception: " + (m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text).split("\n")[0].slice(0, 160));
      if (m.method === "Log.entryAdded" && m.params.entry.level === "error") consoleLines.push(`${m.params.entry.source}: ${m.params.entry.text} ${m.params.entry.url || ""}`.slice(0, 200));
    });
    await cdp("Page.enable"); await cdp("Runtime.enable"); await cdp("Network.enable"); await cdp("Log.enable");
    await cdp("Fetch.enable", { patterns: [{ urlPattern: "*" }] });
    await cdp("Emulation.setDeviceMetricsOverride", { width: WIDTH, height: HEIGHT, deviceScaleFactor: WIDTH < 768 ? 2 : 1, mobile: WIDTH < 768 });
    if (WIDTH < 768) await cdp("Emulation.setTouchEmulationEnabled", { enabled: true });
    // --perf: a mid-range phone on a slow connection (4x slower CPU; slow 4G: 1.6 Mbit/s down, 150 ms round trip). The pages come from this computer, the
    // pictures from the live API, so the numbers are for comparing before and after, not Lighthouse's.
    if (PERF) {
      await cdp("Emulation.setCPUThrottlingRate", { rate: 4 });
      await cdp("Network.emulateNetworkConditions", { offline: false, latency: 150, downloadThroughput: (1.6 * 1024 * 1024) / 8, uploadThroughput: (750 * 1024) / 8 });
    }

    for (const [name, route, seedCart] of PAGES) {
      consoleLines = []; bytes = { script: 0, image: 0, stylesheet: 0, font: 0, document: 0, other: 0, scriptCount: 0 }; types.clear();
      const seed = await cdp("Page.addScriptToEvaluateOnNewDocument", { source: `try { ${seedCart ? `localStorage.setItem('anaiza-cart', JSON.stringify([${JSON.stringify(CART_LINE)}]));` : "localStorage.removeItem('anaiza-cart');"} } catch (e) {} ${PERF_INJECT}` });
      const loaded = new Promise((resolve) => { const l = (m) => { if (m.method === "Page.loadEventFired" && m.sessionId === sessionId) { listeners.splice(listeners.indexOf(l), 1); resolve(); } }; listeners.push(l); setTimeout(resolve, 25000); });
      await cdp("Page.navigate", { url: `${base}${route}` });
      await loaded;
      await sleep(PERF ? 3500 : 2500);
      const measured = await run(MEASURE);
      const lcp = await run("({ lcp: window.__lcp, cls: window.__cls, tbt: Math.round(window.__tbt) })");
      results.push({ page: name, route, width: WIDTH, ...measured, ...lcp, bytes: { ...bytes }, console: [...new Set(consoleLines)].slice(0, 6) });
      if (SHOTS) { fs.mkdirSync(SHOT_DIR, { recursive: true }); const { data } = await cdp("Page.captureScreenshot", { format: "png", captureBeyondViewport: false }); fs.writeFileSync(path.join(SHOT_DIR, `${name}-${WIDTH}.png`), Buffer.from(data, "base64")); }
      await cdp("Page.removeScriptToEvaluateOnNewDocument", { identifier: seed.identifier });
    }
    socket.close();
  } finally {
    chrome.kill(); site.close();
    try { fs.rmSync(profile, { recursive: true, force: true, maxRetries: 3 }); } catch { /* harmless */ }
  }

  fs.mkdirSync(SHOT_DIR, { recursive: true });
  fs.writeFileSync(path.join(SHOT_DIR, `audit-${WIDTH}${PERF ? "-perf" : ""}.json`), JSON.stringify(results, null, 2));

  console.log(`page`.padEnd(20), "overflow", "small controls", "small inputs", "low contrast", "images (no size / >2x)", "off-kit colours", "off corners", "shadows", "gradients", "banned", "LCP ms", "CLS", "JS KB", "img KB");
  for (const r of results) {
    const noSize = r.images.filter((i) => i.noSize).length; const big = r.images.filter((i) => i.ratio > 2).length;
    console.log(r.page.padEnd(20), String(r.overflow).padEnd(8), String(r.smallControls.length).padEnd(14), String(r.smallInputs.length).padEnd(12), String(r.lowContrast.reduce((s, x) => s + x.count, 0)).padEnd(12), `${noSize}/${big}`.padEnd(22), String(r.offKitColours.length).padEnd(15), String(r.offCorners.length).padEnd(11), String(r.shadows.length).padEnd(7), String(r.gradients.length).padEnd(9), String(r.bannedWords.length).padEnd(6), String(r.lcp ? r.lcp.t : "-").padEnd(6), String(+(r.cls || 0).toFixed(3)).padEnd(5), String(Math.round(r.bytes.script / 1024)).padEnd(5), String(Math.round(r.bytes.image / 1024)));
  }
}

main().catch((error) => { console.error(error.message); process.exit(1); });
