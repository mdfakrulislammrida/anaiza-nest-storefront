// Makes the browser icons from the Monogram uploaded in the admin (Site settings > Brand). Runs before every `npm run build` (the "prebuild" script).
//
//   src/app/favicon.ico    16, 32 and 48 px (the tab, bookmarks, and search results, which want a multiple of 48)
//   src/app/icon.png       512 px (a PNG for any place that wants a large one)
//   src/app/apple-icon.png 180 px (a phone's home screen)
//
// The site has no web manifest, so there is no 192 px icon. Next reads these three files from src/app and puts the <link> tags, with a
// version in each address, into the <head> of every page, so a changed icon is never held back by a browser's cache.
//
// The Monogram is only resized, never redrawn or recoloured. The files in src/app are committed: a build that cannot reach the API, or
// whose Monogram is missing or unusable, keeps them and never fails because of the icon. It also never falls back to the default Next.js icon.
//
//   node --no-warnings scripts/generate-icons.ts            read the Monogram from the API and rewrite the files when it changed
//   node --no-warnings scripts/generate-icons.ts --force    rewrite them even if it did not change
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildIco } from "../src/lib/ico.ts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const APP = join(ROOT, "src", "app");
const RECORD = join(ROOT, "scripts", "brand-icon-source.json");
const FORCE = process.argv.includes("--force");

const OUTPUTS = ["favicon.ico", "icon.png", "apple-icon.png"].map((name) => join(APP, name));

function say(message: string): void {
  process.stdout.write(`[icons] ${message}\n`);
}

type LoadEnv = (dir: string, dev?: boolean, log?: { info: () => void; error: () => void }) => unknown;

/** Next's env files are not loaded by plain node; this reads them the way `next build` does, and a variable already set wins. */
async function apiBase(): Promise<string | null> {
  try {
    const env = (await import("@next/env")) as { loadEnvConfig?: LoadEnv; default?: { loadEnvConfig?: LoadEnv } };
    (env.loadEnvConfig ?? env.default?.loadEnvConfig)?.(ROOT, false, { info: () => {}, error: () => {} });
  } catch {
    // The variable may still be set in the shell.
  }

  return process.env.NEXT_PUBLIC_API_URL?.replace(/\/+$/, "") ?? null;
}

async function getBytes(url: string, accept: string, ms: number): Promise<{ bytes: Uint8Array; type: string }> {
  const response = await fetch(url, { headers: { Accept: accept }, signal: AbortSignal.timeout(ms) });

  if (!response.ok) throw new Error(`${url} answered ${response.status}`);

  return { bytes: new Uint8Array(await response.arrayBuffer()), type: response.headers.get("content-type") ?? "" };
}

async function main(): Promise<void> {
  const base = await apiBase();

  if (!base) return say("No API address is set, so the committed icons are kept.");

  const settings = JSON.parse(new TextDecoder().decode((await getBytes(`${base}/site-settings`, "application/json", 20_000)).bytes)) as { data?: { monogram?: string | null } };
  const monogram = settings.data?.monogram;

  if (!monogram || !/^https:\/\//.test(monogram)) {
    return say(`No Monogram is uploaded (the API sent ${monogram === null || monogram === undefined ? "nothing" : "an address that is not https"}), so the committed icons are kept.`);
  }

  const source = await getBytes(monogram, "image/*", 30_000);
  const hash = createHash("sha256").update(source.bytes).digest("hex");
  const previous = existsSync(RECORD) ? (JSON.parse(readFileSync(RECORD, "utf8")) as { sha256?: string }).sha256 : null;

  if (!FORCE && previous === hash && OUTPUTS.every((file) => existsSync(file))) return say("The Monogram has not changed; the icons are as they were.");

  const { default: sharp } = await import("sharp");
  const image = sharp(Buffer.from(source.bytes), { limitInputPixels: 40_000_000 });
  const meta = await image.metadata();

  if (!meta.width || !meta.height || meta.width < 180 || meta.height < 180) {
    return say(`The Monogram is ${meta.width ?? "?"} by ${meta.height ?? "?"} pixels; it needs at least 180 by 180. The committed icons are kept.`);
  }

  // A square mark is only resized. Anything else is centred on a transparent square, never stretched.
  const square = async (size: number): Promise<Buffer> =>
    sharp(Buffer.from(source.bytes))
      .resize(size, size, { fit: meta.width === meta.height ? "fill" : "contain", background: { r: 0, g: 0, b: 0, alpha: 0 }, kernel: "lanczos3" })
      // Every size is saved with an alpha channel (RGBA): the .ico decoder in the build refuses a plain RGB picture.
      .ensureAlpha()
      .png({ compressionLevel: 9 })
      .toBuffer();

  const small = await Promise.all([16, 32, 48].map(async (size) => ({ size, png: new Uint8Array(await square(size)) })));

  mkdirSync(APP, { recursive: true });
  writeFileSync(join(APP, "favicon.ico"), buildIco(small));
  writeFileSync(join(APP, "icon.png"), await square(512));
  writeFileSync(join(APP, "apple-icon.png"), await square(180));
  writeFileSync(RECORD, `${JSON.stringify({ source: monogram, sha256: hash, width: meta.width, height: meta.height }, null, 2)}\n`);

  say(`Made favicon.ico (16, 32, 48), icon.png (512) and apple-icon.png (180) from the Monogram ${meta.width} by ${meta.height}.`);
}

try {
  await main();
} catch (error) {
  // Whatever went wrong, the build goes on with the committed icons.
  say(`Could not make new icons (${error instanceof Error ? error.message : String(error)}). The committed icons are kept.`);
}
