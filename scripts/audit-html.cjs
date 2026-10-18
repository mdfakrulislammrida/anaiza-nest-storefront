/* eslint-disable @typescript-eslint/no-require-imports -- a plain node script, like signature-probe.cjs it has no build step. */
// What a crawler reads without JavaScript from a built page: its title, meta description, Open Graph tags, canonical
// address and JSON-LD blocks. Usage, after `npm run build`:
//   node scripts/audit-html.cjs out/product/<slug>.html out/product.html
const fs = require("node:fs");

function attributeOf(tag, name) {
  const found = tag.match(new RegExp(`\\s${name}="([^"]*)"`, "i"));
  return found ? found[1] : null;
}

for (const file of process.argv.slice(2)) {
  const html = fs.readFileSync(file, "utf8");
  const metas = html.match(/<meta\s[^>]*>/gi) ?? [];
  console.log(`=== ${file} (${html.length} bytes)`);
  console.log("title:", (html.match(/<title>(.*?)<\/title>/s) ?? [])[1] ?? "-");

  for (const [key, attribute] of [["description", "name"], ["og:title", "property"], ["og:description", "property"], ["og:image", "property"], ["og:url", "property"], ["robots", "name"]]) {
    const values = metas.filter((tag) => attributeOf(tag, attribute) === key).map((tag) => attributeOf(tag, "content") ?? "(no content)");
    console.log(`${key.padEnd(15)} ${values.length}x`, values.map((value) => value.slice(0, 90)));
  }
  console.log("canonical:", (html.match(/<link[^>]*rel="canonical"[^>]*>/gi) ?? []).length, "x");

  const types = {};
  for (const [, raw] of html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>(.*?)<\/script>/gs)) {
    const json = JSON.parse(raw);
    for (const node of json["@graph"] ?? [json]) {
      const type = [].concat(node["@type"] ?? "?").join("+");
      types[type] = (types[type] ?? 0) + 1;
      if (type === "Product") {
        const offer = [].concat(node.offers ?? {})[0];
        console.log(`  Product: sku=${node.sku} image=${node.image ? "yes" : "none"} price=${offer?.price} ${offer?.priceCurrency} ${offer?.availability}`);
      }
    }
  }
  console.log("json-ld types:", types);
  console.log("h1 in the HTML:", (html.match(/<h1[ >]/g) ?? []).length);
}
