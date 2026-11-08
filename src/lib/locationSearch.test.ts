import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { BD_CITY_THANAS, BD_DISTRICTS_BY_DIVISION, BD_DIVISIONS, BD_UPAZILAS_BY_DISTRICT } from "./bangladesh-geography.ts";
import { deliveryChargeFor } from "./checkout.ts";
import {
  AREA_MISSING_MESSAGE,
  AREA_OTHER_MISSING_MESSAGE,
  OTHER_AREA,
  areaProblem,
  effectiveArea,
  filterDistricts,
  filterThanas,
  hasCityThanas,
  searchKey,
  showsSearch,
} from "./locationSearch.ts";

const list = (district: string) => BD_UPAZILAS_BY_DISTRICT[district];
const rules = { free_delivery_threshold: 10000, delivery_fee_dhaka: 80, delivery_fee_outside_dhaka: 150 };

describe("searching the thanas of a district", () => {
  it("'chittagong sadar' lists Chattogram's city thanas", () => {
    const found = filterThanas(list("Chattogram"), "chittagong sadar", "Chattogram");

    for (const name of ["Kotwali", "Panchlaish", "Khulshi", "Pahartali", "Double Mooring", "Chandgaon", "Bakalia", "Halishahar", "Bayazid Bostami", "Bandar", "Akbar Shah", "Patenga", "EPZ"]) {
      assert.ok(found.includes(name), name);
    }
    assert.ok(!found.includes("Hathazari"), "the upazilas are not the city");
  });

  it("'sadar' and 'city' list the city thanas in a district that has them", () => {
    assert.deepEqual(filterThanas(list("Chattogram"), "sadar", "Chattogram"), list("Chattogram").filter((name) => BD_CITY_THANAS.Chattogram.includes(name)));
    assert.deepEqual(filterThanas(list("Khulna"), "City", "Khulna"), list("Khulna").filter((name) => BD_CITY_THANAS.Khulna.includes(name)));
    assert.ok(filterThanas(list("Rajshahi"), "rajshahi city", "Rajshahi").includes("Boalia"));
    assert.ok(filterThanas(list("Gazipur"), "sadar", "Gazipur").includes("Tongi"));
  });

  it("the district's old and new names alone list the city thanas too", () => {
    assert.ok(filterThanas(list("Chattogram"), "Chattogram", "Chattogram").includes("Kotwali"));
    assert.ok(filterThanas(list("Chattogram"), "chittagong", "Chattogram").includes("Pahartali"));
  });

  it("'comilla' finds Cumilla's town under its old spelling, and the new spelling finds it too", () => {
    assert.deepEqual(filterThanas(list("Cumilla"), "comilla", "Cumilla"), ["Comilla Sadar"]);
    assert.ok(filterThanas(list("Cumilla"), "cumilla sadar", "Cumilla").includes("Comilla Sadar"));
    assert.ok(filterThanas(list("Barishal"), "barishal sadar", "Barishal").includes("Barisal Sadar"));
    assert.ok(filterThanas(list("Bogura"), "Bogura Sadar", "Bogura").includes("Bogra Sadar"));
  });

  it("'sadar' in a district with no city thanas finds its Sadar entries", () => {
    assert.ok(filterThanas(list("Cumilla"), "sadar", "Cumilla").includes("Comilla Sadar"));
    assert.ok(filterThanas(list("Faridpur"), "sadar", "Faridpur").includes("Faridpur Sadar"));
  });

  it("ignores case, punctuation and the words thana and upazila", () => {
    assert.deepEqual(filterThanas(list("Chattogram"), "  PANCHLAISH Thana ", "Chattogram"), ["Panchlaish"]);
    assert.deepEqual(filterThanas(list("Chattogram"), "hathazari upazila", "Chattogram"), ["Hathazari"]);
    assert.deepEqual(filterThanas(list("Chattogram"), "double-mooring", "Chattogram"), ["Double Mooring"]);
    assert.equal(searchKey("Cox's Bazar Thana"), "coxsbazar");
  });

  it("finds what is typed anywhere in a name, in the list's own order, and nothing for nonsense", () => {
    assert.deepEqual(filterThanas(list("Gazipur"), "tongi", "Gazipur"), ["Tongi", "Tongi East", "Tongi West"]);
    assert.deepEqual(filterThanas(list("Chattogram"), "zzzz", "Chattogram"), []);
    assert.deepEqual(filterThanas(list("Chattogram"), "", "Chattogram"), list("Chattogram"));
  });

  it("never changes the names it returns", () => {
    const found = filterThanas(list("Chattogram"), "chittagong sadar", "Chattogram");

    assert.ok(found.every((name) => list("Chattogram").includes(name)));
  });
});

describe("searching districts", () => {
  const districts = BD_DIVISIONS.flatMap((division) => BD_DISTRICTS_BY_DIVISION[division]);

  it("accepts the old spellings and shows the current one", () => {
    const pairs: [string, string][] = [
      ["Chittagong", "Chattogram"],
      ["Comilla", "Cumilla"],
      ["Bogra", "Bogura"],
      ["Barisal", "Barishal"],
      ["Jessore", "Jashore"],
      ["Jhalakathi", "Jhalokati"],
      ["Coxsbazar", "Cox's Bazar"],
    ];

    for (const [old, now] of pairs) assert.deepEqual(filterDistricts(districts, old), [now], old);
  });

  it("matches the current spelling and part of a name, and returns the list when nothing is typed", () => {
    assert.ok(filterDistricts(districts, "chattogram").includes("Chattogram"));
    assert.ok(filterDistricts(districts, "gaz").includes("Gazipur"));
    assert.deepEqual(filterDistricts(districts, ""), districts);
  });
});

describe("the search box and the way on", () => {
  it("is always there for a thana list, however short, and for any other list once it has more than 10", () => {
    assert.equal(showsSearch(3, true), true);
    assert.equal(showsSearch(5, true), true);
    assert.equal(showsSearch(8), false, "the eight divisions need none");
    assert.equal(showsSearch(10), false);
    assert.equal(showsSearch(11), true);
  });

  it("'Other / not listed' sends what the customer wrote, cut to the backend's 60 characters", () => {
    assert.equal(effectiveArea("Panchlaish", "ignored"), "Panchlaish");
    assert.equal(effectiveArea(OTHER_AREA, "  Near the old bridge  "), "Near the old bridge");
    assert.equal(effectiveArea(OTHER_AREA, "x".repeat(80)).length, 60);
    assert.equal(effectiveArea(OTHER_AREA, ""), "");
    assert.notEqual(effectiveArea(OTHER_AREA, "Near the bridge"), OTHER_AREA, "the label itself is never what is sent");
  });

  it("asks for the area, and for the text when 'Other' is chosen without any", () => {
    assert.equal(areaProblem("", ""), AREA_MISSING_MESSAGE);
    assert.equal(areaProblem(OTHER_AREA, "   "), AREA_OTHER_MISSING_MESSAGE);
    assert.equal(areaProblem(OTHER_AREA, "Near the bridge"), null);
    assert.equal(areaProblem("Kotwali", ""), null);
  });
});

describe("the city thanas and the lists", () => {
  it("every city thana is in its district's own list, and there are no duplicate names inside a district", () => {
    for (const [district, names] of Object.entries(BD_CITY_THANAS)) {
      assert.ok(hasCityThanas(district));
      for (const name of names) assert.ok(list(district).includes(name), `${district}: ${name}`);
    }

    for (const [district, names] of Object.entries(BD_UPAZILAS_BY_DISTRICT)) {
      const keys = names.map(searchKey);

      assert.equal(new Set(keys).size, keys.length, `${district} has no duplicate`);
    }
  });

  it("a Dhaka city thana still gets the Dhaka fee; 'Other' in Dhaka is charged as the server charges an area outside the city list", () => {
    assert.equal(deliveryChargeFor(rules, "Dhaka", "Dhaka", "Banani", 2800), 80);
    assert.equal(deliveryChargeFor(rules, "Dhaka", "Dhaka", "Banani", 10001), 0);
    // A written area (not in the city list) is not Dhaka city: the outside fee, never free (the server does the same and logs it).
    assert.equal(deliveryChargeFor(rules, "Dhaka", "Dhaka", effectiveArea(OTHER_AREA, "Banani Extension"), 2800), 150);
    assert.equal(deliveryChargeFor(rules, "Dhaka", "Dhaka", effectiveArea(OTHER_AREA, "Banani Extension"), 50000), 150);
    // Nothing written yet: no final fee.
    assert.equal(deliveryChargeFor(rules, "Dhaka", "Dhaka", effectiveArea(OTHER_AREA, ""), 2800), null);
    // Outside Dhaka: 'Other' is the outside fee as every area there is.
    assert.equal(deliveryChargeFor(rules, "Chattogram", "Chattogram", effectiveArea(OTHER_AREA, "Somewhere near Kotwali"), 2800), 150);
  });
});
