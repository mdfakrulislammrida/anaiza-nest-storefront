import assert from "node:assert/strict";
import { createHash } from "node:crypto";
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
    assert.equal(Object.values(BD_UPAZILAS_BY_DISTRICT).reduce((sum, list) => sum + list.length, 0), 544);
    assert.equal(BD_UPAZILAS_BY_DISTRICT.Dhaka.length, 55);
  });

  // The backend (the shipping zone and fee, the courier booking) and every saved order use these exact names. A change to a name, an addition or a removal must be
  // deliberate and agreed with the backend: this fails until its hash is updated, which is the moment to ask. (Order of the districts is part of the hash.)
  it("is the data the backend was told about: no name changes by accident", () => {
    const hash = createHash("sha256").update(JSON.stringify([BD_DIVISIONS, BD_DISTRICTS_BY_DIVISION, BD_UPAZILAS_BY_DISTRICT])).digest("hex");

    assert.equal(hash, "5d0753871dee87706985a8aaa56c910c142d17507e97507d7f083af705b2a15e");
  });
});
