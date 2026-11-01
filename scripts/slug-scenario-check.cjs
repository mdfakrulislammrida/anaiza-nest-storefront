/* eslint-disable @typescript-eslint/no-require-imports -- a plain node script, like audit-html.cjs it has no build step. */
// A changed address, end to end, against a MOCK of the API (nothing is sent to the real shop, nothing is written to it).
//
//   node scripts/slug-scenario-check.cjs            builds the shop against the mock, then checks the result in files and in headless Chrome
//   node scripts/slug-scenario-check.cjs --no-build checks the out/ that is already there (it must have been built against this mock)
//
// The mock passes every request through to the real API (read-only GETs) and then changes the answers the way the admin would after the owner
// renames the category "tea-sets" to "tea-sets-renamed" (the old address is remembered): the lists, the category itself (with the API's `redirect`
// hint when asked for the old slug), the products' category, the homepage "Shop by occasion" tile, and the sitemap data.
//
// Checks: the built files carry the new address everywhere (menu, tile, canonical, breadcrumb, sitemap) and the old address only as a stand-in page that
// names the new one; in Chrome the old address leads to the new page, a slug made after the build (the shell) also reaches it, and an unknown slug shows
// the calm not-found state. Exit code 1 when a check fails.
const http = require("node:http");
const https = require("node:https");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawn } = require("node:child_process");

const ROOT = path.join(__dirname, "..");
const OUT = path.join(ROOT, "out");
const REAL = "https://api.anaizanest.com";
const MOCK_PORT = 8799;
const SITE_PORT = 8798;
const OLD = "tea-sets";
const NEW = "tea-sets-renamed";
const AFTER_BUILD = "tea-sets-made-later"; // a slug the build never saw: its page is the shell, and the API answers it with a hint to the new address
const NO_BUILD = process.argv.includes("--no-build");

const CHROME = [process.env.CHROME_PATH, "C:/Program Files/Google/Chrome/Application/chrome.exe", "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe", "/usr/bin/google-chrome", "/usr/bin/chromium"].find((c) => c && fs.existsSync(c));

const problems = [];
const check = (ok, message) => {
  console.log(`${ok ? "  ok  " : "  FAIL"} ${message}`);
  if (!ok) problems.push(message);
};

// ---- the mock

function fetchReal(pathAndQuery) {
  return new Promise((resolve, reject) => {
    https
      .get(`${REAL}${pathAndQuery}`, { headers: { Accept: "application/json" } }, (res) => {
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => resolve({ status: res.statusCode, type: res.headers["content-type"] || "application/json", body: Buffer.concat(chunks) }));
      })
      .on("error", reject);
  });
}

const rename = (category) => (category && category.slug === OLD ? { ...category, slug: NEW, path: `/category/${NEW}` } : category);

function transform(url, json) {
  const clean = url.split("?")[0].replace(/^\/api/, "");

  if (clean === "/categories") return { ...json, data: json.data.map(rename) };

  if (clean === `/categories/${OLD}` || clean === `/categories/${AFTER_BUILD}`) {
    return { ...json, data: { ...rename(json.data), slug: NEW, path: `/category/${NEW}`, previous_slugs: [OLD] }, redirect: { from: `/category/${clean.split("/").pop()}`, to: `/category/${NEW}`, status: 301 } };
  }

  if (clean === `/categories/${NEW}`) return { data: { ...rename({ ...json.data }), slug: NEW, path: `/category/${NEW}`, previous_slugs: [OLD] } };

  if (clean === "/sitemap") {
    return { ...json, categories: json.categories.map(rename), redirects: [...(json.redirects || []), { type: "category", from: `/category/${OLD}`, to: `/category/${NEW}` }] };
  }

  // The first "Shop by occasion" tile is linked to the category in the admin; its address follows the rename, as the API's does.
  if (clean === "/homepage-sections") {
    return {
      ...json,
      data: json.data.map((section) =>
        section.type === "occasions" && section.tiles
          ? { ...section, tiles: section.tiles.map((t, i) => (i === 0 ? { ...t, kind: "category", slug: NEW, path: `/category/${NEW}`, href: `/category/${NEW}` } : t)) }
          : section,
      ),
    };
  }

  // The menus carry addresses already turned into today's (a renamed slug never breaks them): the API does this itself.
  if (clean === "/site-settings") {
    return { ...json, data: { ...json.data, nav_links: JSON.parse(JSON.stringify(json.data.nav_links).split(`/category/${OLD}"`).join(`/category/${NEW}"`)) } };
  }

  // Products carry their category (a summary).
  const walk = (value) => {
    if (Array.isArray(value)) return value.map(walk);
    if (value && typeof value === "object") {
      const next = {};
      for (const [k, v] of Object.entries(value)) next[k] = k === "category" ? rename(walk(v)) : walk(v);
      return next;
    }
    return value;
  };

  return clean.startsWith("/products") ? walk(json) : json;
}

function startMock() {
  return new Promise((resolve) => {
    const server = http.createServer(async (req, res) => {
      try {
        if (req.method !== "GET") {
          res.writeHead(405).end();
          return;
        }

        // The real API has never heard of the renamed slug or of the one made after the build: both are asked of it as the old slug.
        const real = await fetchReal(req.url.replace(AFTER_BUILD, OLD).replace(NEW, OLD));

        if (real.status !== 200 || !/json/.test(real.type)) {
          res.writeHead(real.status, { "Content-Type": real.type, "Access-Control-Allow-Origin": "*" }).end(real.body);
          return;
        }

        const body = transform(req.url, JSON.parse(real.body.toString("utf8")));
        res.writeHead(200, { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }).end(JSON.stringify(body));
      } catch (error) {
        res.writeHead(502, { "Access-Control-Allow-Origin": "*" }).end(String(error));
      }
    });
    server.listen(MOCK_PORT, "127.0.0.1", () => resolve(server));
  });
}

// ---- the built site, served the way public/.htaccess does (a file, then .html, then the shells)

const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".txt": "text/plain; charset=utf-8", ".svg": "image/svg+xml", ".png": "image/png", ".webp": "image/webp", ".woff2": "font/woff2", ".ico": "image/x-icon", ".xml": "application/xml" };

function startSite() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      const pathname = decodeURIComponent(req.url.split("?")[0]);
      const rel = pathname.replace(/^\/+/, "");
      const candidates = [rel, `${rel}.html`, rel.replace(/\/$/, "") + ".html", path.join(rel, "index.html")];
      if (/^category\/.+/.test(rel)) candidates.push("category.html");
      if (/^pages\/.+/.test(rel)) candidates.push("pages.html");
      if (rel === "") candidates.unshift("index.html");

      const file = candidates.map((c) => path.join(OUT, c)).find((c) => fs.existsSync(c) && fs.statSync(c).isFile());
      if (!file) {
        res.writeHead(404, { "Content-Type": "text/html" }).end(fs.existsSync(path.join(OUT, "404.html")) ? fs.readFileSync(path.join(OUT, "404.html")) : "not found");
        return;
      }
      res.writeHead(200, { "Content-Type": TYPES[path.extname(file)] || "application/octet-stream" }).end(fs.readFileSync(file));
    });
    server.listen(SITE_PORT, "127.0.0.1", () => resolve(server));
  });
}

// Asynchronous, because the servers Chrome asks for the page live in this process.
async function dom(url) {
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), "slug-check-"));
  const html = await new Promise((resolve) => {
    const child = spawn(CHROME, ["--headless=new", "--disable-gpu", `--user-data-dir=${profile}`, "--window-size=1280,900", "--virtual-time-budget=12000", "--dump-dom", url]);
    let out = "";
    const timer = setTimeout(() => child.kill(), 90_000);
    child.stdout.on("data", (chunk) => (out += chunk));
    child.on("close", () => {
      clearTimeout(timer);
      resolve(out);
    });
  });
  fs.rmSync(profile, { recursive: true, force: true });
  return html;
}

// What is on the screen: the page without its scripts (the data a page carries for itself holds every message the shop can show).
const visible = (html) => html.replace(/<script[\s\S]*?<\/script>/g, "");
const NOT_FOUND = /We couldn(&#39;|')t find that category/;

const read = (file) => (fs.existsSync(path.join(OUT, file)) ? fs.readFileSync(path.join(OUT, file), "utf8") : null);

async function main() {
  const mock = await startMock();

  try {
    if (!NO_BUILD) {
      console.log("Building the shop against the mock API (this takes a few minutes)...");
      // Asynchronous: the mock API runs in this very process and must keep answering while the build asks it.
      const build = await new Promise((resolve) => {
        const child = spawn(process.platform === "win32" ? "npm.cmd" : "npm", ["run", "build"], {
          cwd: ROOT,
          env: { ...process.env, NEXT_PUBLIC_API_URL: `http://127.0.0.1:${MOCK_PORT}/api` },
          shell: process.platform === "win32",
        });
        let log = "";
        child.stdout.on("data", (chunk) => (log += chunk));
        child.stderr.on("data", (chunk) => (log += chunk));
        child.on("close", (status) => resolve({ status, log }));
      });
      if (build.status !== 0) {
        console.error(build.log.slice(-2500));
        throw new Error(`The build against the mock failed (exit ${build.status}).`);
      }
    }

    console.log("\nThe built files");
    const renamed = read(`category/${NEW}.html`);
    const stale = read(`category/${OLD}.html`);
    const home = read("index.html") || "";
    const sitemap = read("sitemap.xml") || "";

    check(renamed !== null, `a page exists at /category/${NEW}`);
    check(renamed !== null && renamed.includes(`<link rel="canonical" href="https://new.anaizanest.com/category/${NEW}"`), "its canonical is the new address");
    const crumb = renamed === null ? null : (renamed.match(/<script type="application\/ld\+json"[^>]*>([^<]*BreadcrumbList[^<]*)<\/script>/) || [])[1];
    const crumbItems = crumb ? JSON.parse(crumb).itemListElement.map((entry) => entry.item) : [];
    check(crumbItems.length === 2 && crumbItems[1].endsWith(`/category/${NEW}`), "its breadcrumb (JSON-LD) names the new address");
    check(stale !== null, `a stand-in page exists at the old address /category/${OLD}`);
    check(stale !== null && stale.includes("This page has moved") && stale.includes(`href="/category/${NEW}"`), "the stand-in says the page moved and links to the new address");
    check(stale !== null && stale.includes(`<link rel="canonical" href="https://new.anaizanest.com/category/${NEW}"`), "the stand-in's canonical is the new address (what a search engine follows)");
    // The menu and the "Shop by occasion" tiles are what the API controls. (A link a person typed inside a product's own text is not rewritten: it reaches
    // the new page through the stand-in above.)
    const anchors = [...home.matchAll(/<a [^>]*>/g)].map((m) => m[0]).filter((tag) => /whitespace-nowrap|aspect-\[4\/5\]/.test(tag));
    check(anchors.some((tag) => tag.includes(`href="/category/${NEW}"`) && tag.includes("aspect-")), 'the "Shop by occasion" tile links to the new address');
    check(anchors.some((tag) => tag.includes(`href="/category/${NEW}"`) && tag.includes("whitespace-nowrap")), "the menu links to the new address");
    check(!anchors.some((tag) => tag.includes(`href="/category/${OLD}"`)), "neither the menu nor a tile links to the old address");
    check(sitemap.includes(`/category/${NEW}<`) && !sitemap.includes(`/category/${OLD}<`), "the sitemap lists the new address and not the old");

    console.log("\nIn the browser");
    if (!CHROME) {
      check(false, "Chrome or Edge is needed for the browser checks (set CHROME_PATH)");
    } else {
      const site = await startSite();

      try {
        const fromOld = await dom(`http://127.0.0.1:${SITE_PORT}/category/${OLD}`);
        if (process.env.SLUG_DEBUG) fs.writeFileSync(path.join(ROOT, ".tmp-icons", "dom-old.html"), fromOld);
        check(/<h1[^>]*>[^<]*Tea sets[^<]*<\/h1>/i.test(fromOld) && !fromOld.includes("This page has moved"), "the old address leads on to the renamed category page (its heading is on screen)");
        check(!NOT_FOUND.test(visible(fromOld)), "...and not to a not-found page");

        const fromLater = await dom(`http://127.0.0.1:${SITE_PORT}/category/${AFTER_BUILD}`);
        check(/<h1[^>]*>[^<]*Tea sets[^<]*<\/h1>/i.test(fromLater) && !NOT_FOUND.test(visible(fromLater)), "a slug made after the build (the shell) is answered by the API's hint and reaches the renamed category");

        const unknown = await dom(`http://127.0.0.1:${SITE_PORT}/category/no-such-category-anywhere`);
        check(NOT_FOUND.test(visible(unknown)), "an unknown slug shows the calm not-found state");
        check(!/(undefined|\[object Object\]|NaN)/.test(visible(unknown)), "...with no raw error text");
      } finally {
        site.close();
      }
    }
  } finally {
    mock.close();
  }

  if (problems.length) {
    console.error(`\n${problems.length} check(s) failed.`);
    process.exit(1);
  }
  console.log("\nAll checks passed.");
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});

