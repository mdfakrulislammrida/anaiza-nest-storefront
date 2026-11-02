import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { BD_DISTRICTS_BY_DIVISION, BD_UPAZILAS_BY_DISTRICT, DHAKA_CITY_THANAS, DHAKA_OUTSIDE_UPAZILAS } from "./bangladesh-geography.ts";
import { areasFor, isDhakaCity, LOCAL_DHAKA_CITY, resolveDhakaCity } from "./dhakaCity.ts";

const rule = LOCAL_DHAKA_CITY;

describe("what counts as Dhaka city", () => {
  it("has the 50 city thanas and the 5 outside upazilas, with nothing in both", () => {
    assert.equal(DHAKA_CITY_THANAS.length, 50);
    assert.deepEqual([...DHAKA_OUTSIDE_UPAZILAS], ["Dhamrai", "Dohar", "Keraniganj", "Nawabganj", "Savar"]);
    assert.equal(DHAKA_CITY_THANAS.filter((name) => DHAKA_OUTSIDE_UPAZILAS.includes(name)).length, 0);
  });

  it("covers the whole Dhaka district list: every name is in exactly one of the two lists", () => {
    const dhaka = BD_UPAZILAS_BY_DISTRICT.Dhaka;

    assert.equal(dhaka.length, DHAKA_CITY_THANAS.length + DHAKA_OUTSIDE_UPAZILAS.length);
    for (const name of dhaka) assert.ok(DHAKA_CITY_THANAS.includes(name) !== DHAKA_OUTSIDE_UPAZILAS.includes(name), name);
  });

  it("is Dhaka division + Dhaka district + a city thana", () => {
    for (const thana of ["Banani", "Gulshan", "Mirpur", "Uttara East", "Tejgaon Industrial Area", "Wari"]) {
      assert.equal(isDhakaCity(rule, "Dhaka", "Dhaka", thana), true, thana);
    }
  });

  it("is outside for Savar, Keraniganj, Dhamrai, Dohar and Nawabganj", () => {
    for (const thana of DHAKA_OUTSIDE_UPAZILAS) assert.equal(isDhakaCity(rule, "Dhaka", "Dhaka", thana), false, thana);
  });

  it("is outside for Gazipur, Narayanganj and every other district of the Dhaka division", () => {
    for (const district of BD_DISTRICTS_BY_DIVISION.Dhaka.filter((name) => name !== "Dhaka")) {
      for (const thana of BD_UPAZILAS_BY_DISTRICT[district]) assert.equal(isDhakaCity(rule, "Dhaka", district, thana), false, `${district} / ${thana}`);
    }
  });

  it("is outside for another division, even with a Dhaka city thana name", () => {
    assert.equal(isDhakaCity(rule, "Sylhet", "Dhaka", "Banani"), false);
    assert.equal(isDhakaCity(rule, "Chattogram", "Chattogram", "Anwara"), false);
  });

  it("is outside without a thana, or with a thana it does not know (as on the server)", () => {
    assert.equal(isDhakaCity(rule, "Dhaka", "Dhaka", ""), false);
    assert.equal(isDhakaCity(rule, "Dhaka", "Dhaka", "Somewhere New"), false);
    assert.equal(isDhakaCity(rule, "", "", ""), false);
  });

  it("ignores case and extra spaces but never changes a name", () => {
    assert.equal(isDhakaCity(rule, " dhaka ", "DHAKA", "  new   market "), true);
    assert.equal(isDhakaCity(rule, "Dhaka", "Dhaka", "Newmarket"), false);
  });
});

describe("the rule from the API", () => {
  const fromApi = { division: "Dhaka", district: "Dhaka", thanas: ["Banani"], outside_upazilas: ["Savar"] };

  it("is used when it is complete", () => {
    const resolved = resolveDhakaCity(fromApi);

    assert.equal(isDhakaCity(resolved, "Dhaka", "Dhaka", "Banani"), true);
    assert.equal(isDhakaCity(resolved, "Dhaka", "Dhaka", "Gulshan"), false, "the server's list wins over the local one");
  });

  it("falls back to the local lists when it is missing or incomplete", () => {
    for (const bad of [undefined, null, {}, { ...fromApi, thanas: [] }, { ...fromApi, thanas: "Banani" }, { ...fromApi, division: "" }, { ...fromApi, outside_upazilas: undefined }]) {
      assert.equal(resolveDhakaCity(bad as never), LOCAL_DHAKA_CITY);
    }
  });
});

describe("the areas offered", () => {
  it("offers only the city thanas inside Dhaka", () => {
    assert.deepEqual(areasFor(rule, "inside", "Dhaka", "Dhaka").sort(), [...DHAKA_CITY_THANAS].sort());
  });

  it("offers only the upazilas outside the city when the parcel goes outside but to Dhaka district", () => {
    assert.deepEqual(areasFor(rule, "outside", "Dhaka", "Dhaka"), [...DHAKA_OUTSIDE_UPAZILAS].sort());
  });

  it("offers a district's whole list everywhere else", () => {
    assert.deepEqual(areasFor(rule, "outside", "Dhaka", "Gazipur"), BD_UPAZILAS_BY_DISTRICT.Gazipur);
    assert.deepEqual(areasFor(rule, "outside", "Sylhet", "Sylhet"), BD_UPAZILAS_BY_DISTRICT.Sylhet);
  });

  it("never offers a thana whose fee would differ from the zone the visitor chose", () => {
    for (const thana of areasFor(rule, "inside", "Dhaka", "Dhaka")) assert.equal(isDhakaCity(rule, "Dhaka", "Dhaka", thana), true, thana);
    for (const thana of areasFor(rule, "outside", "Dhaka", "Dhaka")) assert.equal(isDhakaCity(rule, "Dhaka", "Dhaka", thana), false, thana);
  });
});
