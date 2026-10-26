// Writes the files Tajin imports (or builds by hand) from src/lib/gtmContainer.ts:
//   docs/gtm-container-anaizanest.json   the whole container
//   docs/gtm/01-variables.json ... 05-tags-tiktok.json   the same, in parts, to find a failing part quickly
//   docs/gtm-manual-build.md             every variable, trigger and tag as copy-paste tables
// The header (account id, container id, the container block) is copied from docs/gtm-export-empty.json when that real export is there.
//   npm run gtm:build
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { buildContainer, buildParts, manualBuildMarkdown, type ExportFile } from "../src/lib/gtmContainer.ts";

const docs = fileURLToPath(new URL("../docs/", import.meta.url));
const referencePath = `${docs}gtm-export-empty.json`;
const reference: ExportFile | null = existsSync(referencePath) ? (JSON.parse(readFileSync(referencePath, "utf8")) as ExportFile) : null;

const write = (path: string, data: unknown) => writeFileSync(path, `${JSON.stringify(data, null, 2)}\n`);

mkdirSync(`${docs}gtm`, { recursive: true });
write(`${docs}gtm-container-anaizanest.json`, buildContainer(reference));
for (const part of buildParts(reference)) write(`${docs}gtm/${part.file}`, part.content);
writeFileSync(`${docs}gtm-manual-build.md`, `${manualBuildMarkdown()}\n`);

console.log(
  reference
    ? "Header taken from docs/gtm-export-empty.json (the real export of the empty container)."
    : "WARNING: docs/gtm-export-empty.json is not there, so the account and container ids are the placeholder 0 and the container block is a best-known default. Put the real export there and run this again.",
);
console.log("Written: docs/gtm-container-anaizanest.json, docs/gtm/01..05, docs/gtm-manual-build.md");
