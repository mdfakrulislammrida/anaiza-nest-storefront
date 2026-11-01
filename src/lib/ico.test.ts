import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildIco, readIco } from "./ico.ts";

// The smallest valid PNG signature is all the reader looks at.
const png = (extra: number) => new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, ...new Array(extra).fill(7)]);

describe("favicon.ico", () => {
  it("holds each picture whole, in order, with its size", () => {
    const ico = buildIco([
      { size: 16, png: png(10) },
      { size: 32, png: png(20) },
      { size: 48, png: png(30) },
    ]);

    assert.deepEqual(readIco(ico), [
      { size: 16, bytes: 18, isPng: true },
      { size: 32, bytes: 28, isPng: true },
      { size: 48, bytes: 38, isPng: true },
    ]);
    assert.equal(ico.length, 6 + 3 * 16 + 18 + 28 + 38);
  });

  it("writes 256 as zero, as the format says", () => {
    const ico = buildIco([{ size: 256, png: png(1) }]);

    assert.equal(ico[6], 0);
    assert.deepEqual(readIco(ico), [{ size: 256, bytes: 9, isPng: true }]);
  });

  it("refuses nothing to hold and sizes it cannot hold", () => {
    assert.throws(() => buildIco([]));
    assert.throws(() => buildIco([{ size: 0, png: png(1) }]));
    assert.throws(() => buildIco([{ size: 300, png: png(1) }]));
  });

  it("does not read a file that is not an .ico", () => {
    assert.throws(() => readIco(new Uint8Array([1, 2, 3])));
    assert.throws(() => readIco(png(10)));
  });
});
