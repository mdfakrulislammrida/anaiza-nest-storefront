import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { consentBootstrapSource } from "./consentBootstrap.ts";

// public/.htaccess is what the host actually reads (it is copied into the build as it is). It cannot be run here, so
// what is checked is the file itself: the headers are there, and every place the shop's own scripts load from is named
// in the policy, so adding a pixel without allowing its address fails here instead of in a customer's console.
const htaccess = readFileSync(new URL("../../public/.htaccess", import.meta.url), "utf8");

function headerValue(name: string): string | null {
  const match = htaccess.match(new RegExp(`^\\s*Header always set ${name} "(.*)"\\s*$`, "m"));

  return match ? match[1] : null;
}

function directive(policy: string, name: string): string[] {
  const part = policy.split(";").map((item) => item.trim()).find((item) => item.startsWith(`${name} `));

  return part ? part.split(/\s+/).slice(1) : [];
}

describe("the security headers", () => {
  it("are set on every response", () => {
    assert.equal(headerValue("X-Content-Type-Options"), "nosniff");
    assert.equal(headerValue("Referrer-Policy"), "strict-origin-when-cross-origin");
    assert.equal(headerValue("X-Frame-Options"), "SAMEORIGIN");
    assert.match(headerValue("Permissions-Policy") ?? "", /camera=\(\)/);
    assert.match(htaccess, /Header always unset X-Powered-By/);
  });

  it("sit inside a module guard, so a host without mod_headers skips them instead of failing", () => {
    const at = htaccess.indexOf('Header always set X-Content-Type-Options');
    const before = htaccess.slice(0, at);
    assert.ok(before.lastIndexOf("<IfModule mod_headers.c>") > before.lastIndexOf("</IfModule>"));
  });

  it("keep HSTS off until it is turned on on purpose", () => {
    assert.equal(headerValue("Strict-Transport-Security"), null);
  });
});

describe("the content security policy", () => {
  const enforced = headerValue("Content-Security-Policy");
  const reportOnly = headerValue("Content-Security-Policy-Report-Only") ?? "";

  it("enforces only who may frame the shop, and merely reports everything else", () => {
    assert.equal(enforced, "frame-ancestors 'self'");
    assert.notEqual(reportOnly, "");
    assert.equal(htaccess.match(/Header always set Content-Security-Policy "/g)?.length, 1);
  });

  it("allows the places the marketing tags load from", () => {
    const scripts = directive(reportOnly, "script-src");
    const source = consentBootstrapSource({ enabled: true, mode: "opt_in", gtm: "GTM-AAAA", ga4: "G-AAAA", meta: "123", tiktok: "TT" });
    const origins = new Set([...source.matchAll(/https:\/\/[a-z0-9.-]+/gi)].map((match) => match[0]));

    assert.ok(origins.size >= 3, "the tags' addresses were found");

    for (const origin of origins) {
      assert.ok(scripts.includes(origin), `script-src names ${origin}`);
    }
  });

  it("allows the shop's own API for connections and nothing wider than https for pictures", () => {
    assert.ok(directive(reportOnly, "connect-src").includes("https://api.anaizanest.com"));
    assert.ok(directive(reportOnly, "img-src").includes("https:"));
  });

  it("allows the video players the product pages embed", () => {
    const frames = directive(reportOnly, "frame-src");
    assert.ok(frames.includes("https://www.youtube-nocookie.com"));
    assert.ok(frames.includes("https://player.vimeo.com"));
  });

  it("closes the doors that are never needed", () => {
    assert.deepEqual(directive(reportOnly, "object-src"), ["'none'"]);
    assert.deepEqual(directive(reportOnly, "base-uri"), ["'self'"]);
    assert.deepEqual(directive(reportOnly, "form-action"), ["'self'"]);
  });
});

describe("the rewrite rules", () => {
  it("send a landing page made after the last build to the /lp shell, after the clean-URL rules", () => {
    const rule = "RewriteRule ^lp/.+$ /lp.html [L]";

    assert.ok(htaccess.includes(rule));
    assert.ok(htaccess.indexOf(rule) > htaccess.indexOf("RewriteRule ^blog/.+$ /article.html [L]"), "next to the other shells");
    assert.ok(htaccess.indexOf(rule) > htaccess.indexOf("RewriteCond %{REQUEST_FILENAME}.html -f"), "a built page still wins");
  });
});

describe("the old Special prices address", () => {
  it("is redirected with a 301 to /special-prices, before any real-file rule can answer it", () => {
    const rule = htaccess.match(/^RewriteRule \^hot-deals\(\\\.html\)\?\/\?\$ \/special-prices \[R=301,L\]$/m);
    assert.ok(rule, "the redirect rule is there");
    const firstFileRule = htaccess.indexOf("RewriteCond %{REQUEST_FILENAME} -f");
    assert.ok(firstFileRule > 0 && (rule?.index ?? Infinity) < firstFileRule);
    assert.ok(htaccess.indexOf("RewriteEngine On") < (rule?.index ?? 0));
  });
});

describe("the navigation files Next asks for ahead of a tap", () => {
  // The rules are read out of the file itself and run here as JavaScript patterns (the syntax is the same for these).
  const rules = [...htaccess.matchAll(/^RewriteCond %\{DOCUMENT_ROOT\}\/(\S+) -f\nRewriteRule (\S+) (\S+) \[L\]$/gm)].map((match) => ({ target: match[1], pattern: new RegExp(match[2]), to: match[3] })).filter((rule) => rule.target.includes("__next"));

  // The files the build writes (names as on disk).
  const onDisk = new Set([
    "gift-finder/__next.gift-finder/__PAGE__.txt",
    "shop/__next.shop/__PAGE__.txt",
    "auth/callback/__next.auth/callback/__PAGE__.txt",
    "blog/how-to-choose/__next.blog/$d$slug/__PAGE__.txt",
    "__next.__PAGE__.txt",
    "gift-finder/__next._full.txt",
  ]);

  const rewritten = (path: string): string | null => {
    for (const rule of rules) {
      const found = path.match(rule.pattern);
      if (!found) continue;
      const fill = (text: string) => text.replace(/\$(\d)/g, (_all, n: string) => found[Number(n)] ?? "");
      if (onDisk.has(fill(rule.target))) return fill(rule.to);
    }

    return null;
  };

  it("has a rule for each depth of file name", () => {
    assert.equal(rules.length, 3);
  });

  it("points the dotted request at the nested file the build wrote", () => {
    assert.equal(rewritten("gift-finder/__next.gift-finder.__PAGE__.txt"), "gift-finder/__next.gift-finder/__PAGE__.txt");
    assert.equal(rewritten("shop/__next.shop.__PAGE__.txt"), "shop/__next.shop/__PAGE__.txt");
    assert.equal(rewritten("auth/callback/__next.auth.callback.__PAGE__.txt"), "auth/callback/__next.auth/callback/__PAGE__.txt");
    assert.equal(rewritten("blog/how-to-choose/__next.blog.$d$slug.__PAGE__.txt"), "blog/how-to-choose/__next.blog/$d$slug/__PAGE__.txt");
  });

  it("leaves a file that is already there, and a file that does not exist, alone", () => {
    assert.equal(rewritten("__next.__PAGE__.txt"), null);
    assert.equal(rewritten("gift-finder/__next._full.txt"), null);
    assert.equal(rewritten("nowhere/__next.nowhere.__PAGE__.txt"), null, "no such file: it stays a 404");
  });

  it("comes before the rule that passes real files through", () => {
    assert.ok(htaccess.indexOf("__next\.") < htaccess.indexOf("RewriteCond %{REQUEST_FILENAME} -f"));
  });
});

describe("the cache lifetimes", () => {
  it("keeps hashed build files for a year as immutable, images for a year, and always revalidates the pages", () => {
    assert.match(htaccess, /m#\^\/_next\/static\/#">\s*Header set Cache-Control "public, max-age=31536000, immutable"/);
    assert.match(htaccess, /\\.\(woff2\?\|ttf\|otf\|eot\|png\|jpe\?g\|gif\|webp\|avif\|svg\)\$">\s*Header set Cache-Control "public, max-age=31536000, immutable"/);
    assert.match(htaccess, /\\.\(html\|txt\|xml\)\$">\s*Header set Cache-Control "no-cache"/);
  });

  it("sets no HSTS and no enforced content security policy beyond framing", () => {
    assert.equal(headerValue("Strict-Transport-Security"), null);
    assert.equal(headerValue("Content-Security-Policy"), "frame-ancestors 'self'");
  });
});
