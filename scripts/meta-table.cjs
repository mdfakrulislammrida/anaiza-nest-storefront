/* eslint-disable @typescript-eslint/no-require-imports -- a plain node script, like audit-html.cjs it has no build step. */
// What the BUILT pages (out/) say about themselves to a link preview, a search engine and a browser tab: og:title, og:description, og:image,
// twitter:card, canonical, robots, the icons and the kinds of JSON-LD, for one example of each page type.
//
//   node scripts/meta-table.cjs            a table
//   node scripts/meta-table.cjs --json     the same as JSON
//   node scripts/meta-table.cjs --check    also asserts the rules below (exit code 1 when one fails)
//
// The rules (--check): every page has the brand icons and no default Next.js icon; every og:image and twitter:image is an absolute https address;
// every page has an og:image; the cart, checkout, order confirmation, account and track-order pages stay noindex (this build's robots are not touched).
const fs = require("node:fs");
const path = require("node:path");

const OUT = path.join(__dirname, "..", "out");
const args = process.argv.slice(2);

const decode = (s) => s.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#x27;/g, "'").replace(/&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">");

function read(file) {
  const full = path.join(OUT, file);
  return fs.existsSync(full) ? fs.readFileSync(full, "utf8") : null;
}

function firstFile(dir, skip = []) {
  const full = path.join(OUT, dir);
  if (!fs.existsSync(full)) return null;
  const hit = fs.readdirSync(full).filter((name) => name.endsWith(".html") && !skip.includes(name)).sort()[0];
  return hit ? `${dir}/${hit}` : null;
}

function tags(html) {
  const meta = (attr, name) => {
    const m = html.match(new RegExp(`<meta ${attr}="${name}" content="([^"]*)"`));
    return m ? decode(m[1]) : null;
  };
  const link = (rel) => [...html.matchAll(new RegExp(`<link rel="${rel}"([^>]*)>`, "g"))].map((m) => decode((m[1].match(/href="([^"]*)"/) || [])[1] || ""));
  const title = (html.match(/<title>([^<]*)<\/title>/) || [])[1];
  const ld = [...html.matchAll(/<script type="application\/ld\+json"[^>]*>([^<]*)<\/script>/g)].map((m) => {
    try {
      const data = JSON.parse(decode(m[1]));
      return [].concat(data).map((d) => d["@type"]).join("+");
    } catch {
      return "?";
    }
  });

  return {
    title: title ? decode(title) : null,
    ogTitle: meta("property", "og:title"),
    ogDescription: meta("property", "og:description"),
    ogImage: [...html.matchAll(/<meta property="og:image" content="([^"]*)"/g)].map((m) => decode(m[1])),
    twitterCard: meta("name", "twitter:card"),
    twitterImage: [...html.matchAll(/<meta name="twitter:image" content="([^"]*)"/g)].map((m) => decode(m[1])),
    canonical: link("canonical")[0] ?? null,
    robots: meta("name", "robots"),
    icons: link("icon"),
    appleIcons: link("apple-touch-icon"),
    jsonLd: ld,
  };
}

const first = (dir, skip) => firstFile(dir, skip);
const PAGES = [
  ["home", "index.html"],
  ["shop", "shop.html"],
  ["category", first("category", ["category.html"])],
  ["product", first("product")],
  ["page (about, privacy…)", first("pages")],
  ["blog list", "blog.html"],
  ["blog article", first("blog")],
  ["landing page", first("lp")],
  ["special prices", "special-prices.html"],
  ["gift finder", "gift-finder.html"],
  ["cart", "cart.html"],
  ["checkout", "checkout.html"],
  ["order confirmation", "order-confirmation.html"],
  ["track order", "track-order.html"],
  ["account", "account.html"],
  ["404", "404.html"],
  ["category shell (new slug)", "category.html"],
  ["product shell (new slug)", "product.html"],
];

const rows = PAGES.map(([label, file]) => {
  const html = file ? read(file) : null;
  return { label, file, ...(html ? tags(html) : { missing: true }) };
});

if (args.includes("--json")) {
  console.log(JSON.stringify(rows, null, 2));
} else {
  for (const row of rows) {
    if (row.missing) {
      console.log(`## ${row.label}: no file${row.file ? ` (${row.file})` : ""}\n`);
      continue;
    }
    console.log(`## ${row.label}  (${row.file})`);
    console.log(`  title        ${row.title}`);
    console.log(`  og:title     ${row.ogTitle}`);
    console.log(`  og:desc      ${(row.ogDescription || "").slice(0, 90)}${(row.ogDescription || "").length > 90 ? "…" : ""}`);
    console.log(`  og:image     ${row.ogImage.join(" | ") || "(none)"}`);
    console.log(`  twitter      ${row.twitterCard} ${row.twitterImage.join(" | ")}`);
    console.log(`  canonical    ${row.canonical}`);
    console.log(`  robots       ${row.robots ?? "(none: indexable)"}`);
    console.log(`  icons        ${row.icons.join(" | ")} ; apple ${row.appleIcons.join(" | ")}`);
    console.log(`  json-ld      ${row.jsonLd.join(", ") || "(none)"}\n`);
  }
}

if (args.includes("--check")) {
  const problems = [];
  const PRIVATE = ["cart", "checkout", "order confirmation", "track order", "account"];

  for (const row of rows) {
    if (row.missing) {
      if (!["landing page"].includes(row.label)) problems.push(`${row.label}: no built file`);
      continue;
    }
    if (row.icons.length === 0 || row.appleIcons.length === 0) problems.push(`${row.label}: icon or apple-touch-icon link missing`);
    if (row.icons.some((href) => /next\.svg|vercel/.test(href))) problems.push(`${row.label}: a default Next.js icon is linked`);
    if (row.ogImage.length === 0) problems.push(`${row.label}: no og:image`);
    for (const image of [...row.ogImage, ...row.twitterImage]) if (!/^https:\/\//.test(image)) problems.push(`${row.label}: image is not an absolute https address (${image})`);
    if (PRIVATE.includes(row.label) && !/noindex/.test(row.robots ?? "")) problems.push(`${row.label}: not noindex`);
  }

  if (problems.length) {
    console.error(`\nFAIL\n- ${problems.join("\n- ")}`);
    process.exit(1);
  }
  console.log("OK: every built page has the brand icons, an absolute https share image, and the private pages are noindex.");
}
