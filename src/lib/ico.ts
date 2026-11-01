// A favicon.ico made of PNG pictures (the form every current browser reads). Kept free of Next and of any image library, so it is
// tested with `npm test`; the pictures themselves are made by scripts/generate-icons.ts.

export interface IcoEntry {
  /** The picture's width and height in pixels (a square), 1 to 256. */
  size: number;
  /** A PNG file. */
  png: Uint8Array;
}

export function buildIco(entries: IcoEntry[]): Uint8Array {
  if (entries.length === 0) throw new Error("An .ico needs at least one picture.");

  const headerSize = 6 + 16 * entries.length;
  const total = headerSize + entries.reduce((sum, entry) => sum + entry.png.length, 0);
  const out = new Uint8Array(total);
  const view = new DataView(out.buffer);

  view.setUint16(0, 0, true); // reserved
  view.setUint16(2, 1, true); // type: icon
  view.setUint16(4, entries.length, true);

  let offset = headerSize;

  entries.forEach((entry, index) => {
    if (!Number.isInteger(entry.size) || entry.size < 1 || entry.size > 256) throw new Error(`An .ico picture is 1 to 256 pixels, not ${entry.size}.`);

    const at = 6 + 16 * index;

    out[at] = entry.size === 256 ? 0 : entry.size; // width (0 means 256)
    out[at + 1] = entry.size === 256 ? 0 : entry.size; // height
    out[at + 2] = 0; // no palette
    out[at + 3] = 0;
    view.setUint16(at + 4, 1, true); // colour planes
    view.setUint16(at + 6, 32, true); // bits per pixel
    view.setUint32(at + 8, entry.png.length, true);
    view.setUint32(at + 12, offset, true);
    out.set(entry.png, offset);
    offset += entry.png.length;
  });

  return out;
}

/** The pictures listed in an .ico, for the tests and the built-output check. */
export function readIco(bytes: Uint8Array): { size: number; bytes: number; isPng: boolean }[] {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

  if (bytes.length < 6 || view.getUint16(0, true) !== 0 || view.getUint16(2, true) !== 1) throw new Error("Not an .ico file.");

  const count = view.getUint16(4, true);
  const found: { size: number; bytes: number; isPng: boolean }[] = [];

  for (let index = 0; index < count; index++) {
    const at = 6 + 16 * index;
    const length = view.getUint32(at + 8, true);
    const offset = view.getUint32(at + 12, true);

    found.push({
      size: bytes[at] === 0 ? 256 : bytes[at],
      bytes: length,
      isPng: bytes[offset] === 0x89 && bytes[offset + 1] === 0x50 && bytes[offset + 2] === 0x4e && bytes[offset + 3] === 0x47,
    });
  }

  return found;
}
