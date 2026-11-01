/* eslint-disable @typescript-eslint/no-require-imports -- a plain node script, like audit-html.cjs it has no build step. */
// Makes the default share image (1200 by 630) in the brand style, from the navy logo uploaded in the admin (Site settings > Brand) and the line
// "Gifted, beautifully.": ivory background, the logo, a thin antique gold rule, the line in Fraunces. No shadows, no gradients.
//
//   node scripts/make-share-image.cjs        writes public/brand/share-default.png (needs Chrome or Edge, and internet for the logo and the font)
//
// It is a one-off: the result is committed. It is used only while the admin has no "Default share image" of its own; once one is uploaded the
// build uses that instead (src/lib/shareImage.ts). Run it again only to change the design or after a new logo.
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const ROOT = path.join(__dirname, "..");
const OUT = path.join(ROOT, "public", "brand", "share-default.png");
const API = (process.env.NEXT_PUBLIC_API_URL || "https://api.anaizanest.com/api").replace(/\/+$/, "");
const CHROME = [
  process.env.CHROME_PATH,
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
].find((candidate) => candidate && fs.existsSync(candidate));

async function main() {
  if (!CHROME) throw new Error("No Chrome or Edge found (set CHROME_PATH).");

  const settings = await (await fetch(`${API}/site-settings`)).json();
  const logo = settings.data.logo_navy;
  const tagline = settings.data.tagline || "Gifted, beautifully.";

  if (!logo) throw new Error("No navy logo is uploaded.");

  // The logo is fetched here and embedded, so the page needs no network for it.
  const response = await fetch(logo);
  const type = response.headers.get("content-type") || "image/svg+xml";
  const data = `data:${type.split(";")[0]};base64,${Buffer.from(await response.arrayBuffer()).toString("base64")}`;

  const html = `<!doctype html><html><head><meta charset="utf-8">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400&display=block" rel="stylesheet">
<style>
  html,body{margin:0;width:1200px;height:630px;background:#F6F1E7;overflow:hidden}
  .frame{box-sizing:border-box;width:1200px;height:630px;display:flex;flex-direction:column;align-items:center;justify-content:center}
  img{width:720px;height:auto;display:block}
  .rule{width:64px;height:2px;background:#AD8A50;margin:58px 0 40px}
  p{margin:0;font-family:"Fraunces",Georgia,serif;font-weight:400;font-size:46px;letter-spacing:.01em;color:#1B2A41}
</style></head><body><div class="frame"><img src="${data}" alt=""><div class="rule"></div><p>${tagline.replace(/</g, "&lt;")}</p></div></body></html>`;

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "share-image-"));
  const file = path.join(dir, "share.html");
  fs.writeFileSync(file, html);
  fs.mkdirSync(path.dirname(OUT), { recursive: true });

  const run = spawnSync(
    CHROME,
    ["--headless=new", "--disable-gpu", "--hide-scrollbars", "--force-device-scale-factor=1", "--window-size=1200,630", "--virtual-time-budget=15000", `--screenshot=${OUT}`, `file:///${file.replace(/\\/g, "/")}`],
    { encoding: "utf8", timeout: 90_000 },
  );

  fs.rmSync(dir, { recursive: true, force: true });

  if (!fs.existsSync(OUT)) throw new Error(`Chrome made no picture. ${run.stderr?.slice(0, 200) ?? ""}`);

  console.log(`Wrote ${path.relative(ROOT, OUT)} (${fs.statSync(OUT).size} bytes).`);
}

main().catch((error) => {
  console.error(`[share image] ${error.message}`);
  process.exit(1);
});
