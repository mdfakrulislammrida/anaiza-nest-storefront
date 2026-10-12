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
