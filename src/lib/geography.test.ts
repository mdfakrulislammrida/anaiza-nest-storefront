import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { BD_DISTRICTS_BY_DIVISION, BD_DIVISIONS, BD_UPAZILAS_BY_DISTRICT } from "./bangladesh-geography.ts";

const districts = BD_DIVISIONS.flatMap((division) => BD_DISTRICTS_BY_DIVISION[division]);
const alphabetical = (list: string[]) => [...list].sort((a, b) => a.localeCompare(b));

describe("the division, district and thana data", () => {
  it("has the 8 divisions and the 64 districts, each district once and under one division", () => {
    assert.equal(BD_DIVISIONS.length, 8);
    assert.equal(districts.length, 64);
    assert.equal(new Set(districts).size, 64);
    assert.deepEqual(Object.keys(BD_DISTRICTS_BY_DIVISION).sort(), [...BD_DIVISIONS].sort());
  });

  it("has the right number of districts in each division", () => {
    const counts = Object.fromEntries(BD_DIVISIONS.map((division) => [division, BD_DISTRICTS_BY_DIVISION[division].length]));
    assert.deepEqual(counts, { Dhaka: 13, Chattogram: 11, Rajshahi: 8, Khulna: 10, Barishal: 6, Sylhet: 4, Rangpur: 8, Mymensingh: 4 });
  });

  it("lists the districts of every division in alphabetical order", () => {
    for (const division of BD_DIVISIONS) assert.deepEqual(BD_DISTRICTS_BY_DIVISION[division], alphabetical(BD_DISTRICTS_BY_DIVISION[division]), division);
  });

  it("gives every district at least one thana, in alphabetical order, with no empty, padded or repeated entry", () => {
    for (const district of districts) {
      const list = BD_UPAZILAS_BY_DISTRICT[district];

      assert.ok(Array.isArray(list) && list.length > 0, `${district} has thanas`);
      assert.deepEqual(list, alphabetical(list), `${district} is in alphabetical order`);
      assert.equal(new Set(list.map((name) => name.toLowerCase())).size, list.length, `${district} has no repeat`);

      for (const name of list) {
        assert.equal(name, name.trim(), `${district}: ${name}`);
        assert.ok(name.length > 1 && !/\s{2,}/.test(name) && /^[A-Z]/.test(name), `${district}: ${name}`);
      }
    }
  });

  it("has no thana list for anything that is not a district (a mistyped key would hide a district's list)", () => {
    for (const key of Object.keys(BD_UPAZILAS_BY_DISTRICT)) assert.ok(districts.includes(key), key);
  });

  it("has Dhaka's city thanas and its rural upazilas", () => {
    const dhaka = BD_UPAZILAS_BY_DISTRICT.Dhaka;

    for (const name of ["Banani", "Gulshan", "Dhanmondi", "Mirpur", "Uttara East", "Uttara West", "Mohammadpur", "Motijheel", "Badda", "Tejgaon", "Savar", "Keraniganj", "Dhamrai", "Dohar", "Nawabganj"]) {
      assert.ok(dhaka.includes(name), name);
    }
  });

  it("has the counts it had when it was last checked", () => {
    assert.equal(Object.values(BD_UPAZILAS_BY_DISTRICT).reduce((sum, list) => sum + list.length, 0), 592, "544 as it was, plus the 48 city thanas added in Batch LOC2");
    assert.equal(BD_UPAZILAS_BY_DISTRICT.Dhaka.length, 55);
  });

  // The backend (the shipping zone and fee, the courier booking) and every saved order use these exact names. A change to a name, an addition or a removal must be
  // deliberate and agreed with the backend: this fails until its hash is updated, which is the moment to ask. (Order of the districts is part of the hash.)
  it("is the data the backend was told about: no name changes by accident", () => {
    const hash = createHash("sha256").update(JSON.stringify([BD_DIVISIONS, BD_DISTRICTS_BY_DIVISION, BD_UPAZILAS_BY_DISTRICT])).digest("hex");

    assert.equal(hash, "ffb701264c93c85db9db402e7042d4106103a51ffc4c5efa45b3934288f29c15");
  });
});

// Batch LOC2 only ADDED areas. The Dhaka-city fee matches exact names, the backend and every saved order use these strings: nothing in the list as it was before may
// be renamed or removed, and the 50 city thanas of Dhaka are as they were.
describe("the areas added in Batch LOC2", () => {
  const baseline = JSON.parse(readFileSync(new URL("./geography.baseline.json", import.meta.url), "utf8")) as Record<string, string[]>;

  const ADDED: Record<string, string[]> = {
    Chattogram: ["Akbar Shah", "Bakalia", "Bandar", "Bayazid Bostami", "Chandgaon", "Chawkbazar", "Double Mooring", "EPZ", "Halishahar", "Khulshi", "Kotwali", "Pahartali", "Panchlaish", "Patenga", "Sadarghat"],
    Rajshahi: ["Boalia", "Chandrima", "Motihar", "Rajpara", "Shah Makhdum"],
    Khulna: ["Aranghata", "Daulatpur", "Horintana", "Khalishpur", "Khan Jahan Ali", "Khulna Sadar", "Kotwali", "Labanchara", "Sonadanga"],
    Gazipur: ["Basan", "Gachha", "Joydebpur", "Konabari", "Pubail", "Tongi", "Tongi East", "Tongi West"],
    Narayanganj: ["Fatullah", "Siddhirganj"],
    Sylhet: ["Airport", "Jalalabad", "Kotwali", "Moglabazar", "Shah Poran"],
    Barishal: ["Airport", "Bandar", "Kawnia", "Kotwali"],
  };

  it("keeps every name that was there, in the district it was in", () => {
    for (const [district, names] of Object.entries(baseline)) {
      for (const name of names) assert.ok(BD_UPAZILAS_BY_DISTRICT[district].includes(name), `${district}: ${name} is still there`);
    }
  });

  it("adds exactly the listed names (and nothing else) and leaves every other district as it was", () => {
    for (const district of Object.keys(baseline)) {
      const added = BD_UPAZILAS_BY_DISTRICT[district].filter((name) => !baseline[district].includes(name));

      assert.deepEqual([...added].sort(), [...(ADDED[district] ?? [])].sort(), district);
    }

    assert.equal(Object.values(ADDED).flat().length, 48);
  });

  it("leaves Dhaka exactly as it was: its 55 names, the 50 city thanas included", () => {
    assert.deepEqual(BD_UPAZILAS_BY_DISTRICT.Dhaka, baseline.Dhaka);
    assert.equal(BD_UPAZILAS_BY_DISTRICT.Dhaka.length, 55);
  });

  it("has Chattogram's city thanas now, next to its upazilas", () => {
    for (const name of ["Kotwali", "Pahartali", "Panchlaish", "Khulshi", "Double Mooring", "Chandgaon", "Bakalia", "Halishahar", "Bayazid Bostami", "Bandar", "Akbar Shah", "Patenga", "EPZ", "Hathazari", "Raozan", "Karnafuli"]) {
      assert.ok(BD_UPAZILAS_BY_DISTRICT.Chattogram.includes(name), name);
    }
  });
});
