// Run with `npm test` (Node's built-in test runner; no extra dependency).
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { describe, it } from "node:test";
import { buildUserData, e164, googleEmail, lettersOnly, metaEmail, sha256Hex, splitName } from "./userData.ts";

const sha = (text: string) => createHash("sha256").update(text).digest("hex");

describe("normalising for Google and Meta", () => {
  it("writes a Bangladeshi mobile number as E.164, however it was typed", () => {
    for (const typed of ["01712345678", "+8801712345678", "8801712345678", "01712-345 678", " 017 1234 5678 "]) {
      assert.equal(e164(typed), "+8801712345678", typed);
    }
  });

  it("refuses what cannot be a Bangladeshi mobile number", () => {
    for (const typed of ["", "0171", "02123456789", "01012345678", "abc", null, undefined]) {
      assert.equal(e164(typed as string), null, String(typed));
    }
  });

  it("lower-cases emails, and for Gmail also drops the dots (Google only)", () => {
    assert.equal(googleEmail("  Nusrat.Jahan@Gmail.com "), "nusratjahan@gmail.com");
    assert.equal(googleEmail("a.b@googlemail.com"), "ab@googlemail.com");
    assert.equal(googleEmail("Nusrat.Jahan@Example.com"), "nusrat.jahan@example.com");
    assert.equal(metaEmail("  Nusrat.Jahan@Gmail.com "), "nusrat.jahan@gmail.com");
  });

  it("reduces names and places to lower-case letters, keeping Bangla", () => {
    assert.equal(lettersOnly("Cox's Bazar"), "coxsbazar");
    assert.equal(lettersOnly("Dhaka 1212"), "dhaka");
    assert.equal(lettersOnly("ঢাকা"), "ঢাকা");
    assert.deepEqual(splitName("  Nusrat   Jahan Chowdhury "), { first: "nusrat", last: "jahanchowdhury" });
    assert.deepEqual(splitName("Madonna"), { first: "madonna", last: "" });
    assert.deepEqual(splitName("Abdur-Rahman Khan"), { first: "abdurrahman", last: "khan" });
  });

  it("hashes with SHA-256 as lower-case hex", async () => {
    assert.equal(await sha256Hex("abc"), sha("abc"));
  });
});

describe("buildUserData", () => {
  const buyer = {
    name: "Nusrat Jahan",
    email: "Nusrat.Jahan@Gmail.com",
    phone: "01712345678",
    district: "Dhaka",
    division: "Dhaka",
  };

  it("gives Google its own field names, hashed where Google wants hashing", async () => {
    const data = await buildUserData(buyer);

    assert.deepEqual(data?.google, {
      sha256_email_address: sha("nusratjahan@gmail.com"),
      sha256_phone_number: sha("+8801712345678"),
      address: { sha256_first_name: sha("nusrat"), sha256_last_name: sha("jahan"), city: "dhaka", region: "dhaka", country: "BD" },
    });
  });

  it("gives Meta everything hashed, in Meta's own form", async () => {
    const data = await buildUserData({ ...buyer, postal_code: "1212" });

    assert.deepEqual(data?.meta, {
      em: sha("nusrat.jahan@gmail.com"),
      ph: sha("8801712345678"),
      fn: sha("nusrat"),
      ln: sha("jahan"),
      ct: sha("dhaka"),
      st: sha("dhaka"),
      zp: sha("1212"),
      country: sha("bd"),
    });
    assert.equal(data?.google.address.postal_code, "1212");
  });

  it("leaves out what it does not have, and matches the server's hashes for names and places", async () => {
    const data = await buildUserData({ name: "Madonna", email: "", phone: "01712345678" });

    assert.equal(data?.google.sha256_email_address, undefined);
    assert.equal(data?.google.address.sha256_last_name, undefined);
    assert.equal(data?.meta.fn, sha("madonna"));
    assert.equal(data?.meta.ln, undefined);
    // The same vectors the PHP side checks (ConversionApiHasher), so both hash a name to the same value.
    assert.equal((await buildUserData({ name: "Nusrat Jahan", email: "a@b.co" }))?.meta.fn, sha("nusrat"));
    assert.equal((await buildUserData({ name: "x y", email: "a@b.co", district: "Cox's Bazar" }))?.meta.ct, sha("coxsbazar"));
  });

  it("returns nothing when there is nothing to send", async () => {
    assert.equal(await buildUserData({}), null);
  });

  it("puts no readable personal detail in anything it returns", async () => {
    const everything = JSON.stringify(await buildUserData(buyer));

    for (const raw of ["Nusrat", "nusrat", "Jahan", "gmail", "01712345678", "8801712345678"]) {
      assert.ok(!everything.includes(raw), `${raw} must not appear`);
    }
  });
});
