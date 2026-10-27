/* eslint-disable @typescript-eslint/no-require-imports -- a plain node script, like audit-html.cjs it has no build step. */
// Does the Meta pixel listen to the browser history, and does it send a PageView of its own on a page change? Run with the pixel start of
// container v2 and of container v3 (the tag "AN - Meta Pixel - init + PageView"), on a blank page, with a made-up pixel id.
//   node scripts/meta-pixel-history-check.cjs        (needs internet: it loads Meta's fbevents.js, once per trial)
// Every request to facebook.com/tr is answered here and goes no further, so nothing is sent to Meta. Expected: v2 shows a second PageView with no eid
// (Meta's automatic one, the "ob3_..." rows in Test events); v3 shows only the shop's own PageView, with its eid.
const fs = require("fs"), os = require("os"), path = require("path"), { spawn } = require("child_process");
const CHROME = [process.env.CHROME_PATH, "C:/Program Files/Google/Chrome/Application/chrome.exe", "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe", "/usr/bin/google-chrome", "/usr/bin/chromium"].find((c) => c && fs.existsSync(c));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const html = (file) => { const tag = JSON.parse(fs.readFileSync(file, "utf8")).containerVersion.tag.find((t) => t.tagId === "9711"); return tag.parameter.find((p) => p.key === "html").value.replace(/<\/?script>/g, "").replace(/\{\{AN - Meta Pixel ID\}\}/g, "'1000000000000001'").replace(/\{\{AN - DLV event_id\}\}/g, "'page_view.test'"); };
async function trial(label, code) {
  const prof = fs.mkdtempSync(path.join(os.tmpdir(), "px-"));
  const port = 9100 + Math.floor(Math.random() * 400);
  const chrome = spawn(CHROME, ["--headless=new", "--no-first-run", "--user-data-dir=" + prof, "--remote-debugging-port=" + port, "about:blank"], { stdio: "ignore" });
  let list = []; for (let i = 0; i < 50 && !list.length; i++) { try { list = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).filter((t) => t.type === "page"); } catch { await sleep(200); } }
  const ws = new WebSocket(list[0].webSocketDebuggerUrl); await new Promise((r) => (ws.onopen = r));
  let id = 0; const w = new Map(); const sent = [];
  const send = (method, params = {}) => new Promise((r) => { w.set(++id, r); ws.send(JSON.stringify({ id, method, params })); });
  ws.onmessage = ({ data }) => { const m = JSON.parse(data); if (m.id && w.has(m.id)) { w.get(m.id)(m.result); w.delete(m.id); return; }
    if (m.method === "Fetch.requestPaused") { const { requestId, request } = m.params; const u = request.url;
      if (/facebook\.com\/tr/.test(u)) { sent.push(u); send("Fetch.fulfillRequest", { requestId, responseCode: 200, body: "" }); }
      else if (u.startsWith("https://example.com/")) send("Fetch.fulfillRequest", { requestId, responseCode: 200, responseHeaders: [{ name: "content-type", value: "text/html" }], body: Buffer.from("<!doctype html><title>t</title><p>x<script>0</script>").toString("base64") });
      else if (/connect\.facebook\.net/.test(u)) send("Fetch.continueRequest", { requestId });
      else send("Fetch.fulfillRequest", { requestId, responseCode: 204, body: "" }); } };
  await send("Page.enable"); await send("Runtime.enable"); await send("Fetch.enable", { patterns: [{ urlPattern: "*" }] });
  await send("Page.navigate", { url: "https://example.com/" }); await sleep(1200);
  await send("Runtime.evaluate", { expression: code });
  await sleep(3500);
  const own = (await send("Runtime.evaluate", { expression: "Object.getOwnPropertyNames(history).filter(function(n){return /State/.test(n)}).join(',')||'(none)'", returnByValue: true })).result.value;
  const flag = (await send("Runtime.evaluate", { expression: "String(fbq.disablePushState)", returnByValue: true })).result.value;
  // A client-side page change: does the pixel notice it?
  const before = sent.length;
  await send("Runtime.evaluate", { expression: "history.pushState({}, '', '/next-page')" });
  await sleep(2500);
  for (const u of sent) { const q = new URL(u).searchParams; console.log("   hit:", "ev=" + q.get("ev"), "eid=" + (q.get("eid") || "(none)").replace(/(.{40}).*/, "$1")); }
  console.log(`${label}: fbq.disablePushState=${flag} | history hooks on the page: ${own} | pixel hits caused by a page change: ${sent.length - before}`);
  ws.close(); chrome.kill(); await sleep(300); fs.rmSync(prof, { recursive: true, force: true });
}
(async () => {
  const docs = path.join(__dirname, "..", "docs");
  await trial("v2 tag (PageView snippet)", html(path.join(docs, "gtm-container-anaizanest-v2.json")));
  await trial("v3 tag (PageView snippet)", html(path.join(docs, "gtm-container-anaizanest-v3.json")));
  process.exit(0);
})();
