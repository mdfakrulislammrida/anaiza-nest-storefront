// Checks the GTM files before anyone imports them: npm run gtm:validate
// Exit code 1 if anything is an error. Warnings are reported and do not fail the check.
//
// With docs/gtm-export-empty.json (the real export of the container) it also
//   - calibrates itself on that export (its own rules must accept what GTM really wrote), and
//   - compares the key set of every object of our files with the shapes in it.
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { validateExport, type Finding } from "../src/lib/gtmValidate.ts";

const docs = fileURLToPath(new URL("../docs/", import.meta.url));
const read = (path: string) => JSON.parse(readFileSync(path, "utf8"));
const referencePath = `${docs}gtm-export-empty.json`;
const reference = existsSync(referencePath) ? read(referencePath) : null;

const full = read(`${docs}gtm-container-anaizanest.json`);
const allVariables: string[] = full.containerVersion.variable.map((variable: { name: string }) => variable.name);

let errors = 0;
let warnings = 0;

function report(label: string, findings: Finding[], countErrors = true) {
  const bad = findings.filter((finding) => finding.level === "error");
  const unusual = findings.filter((finding) => finding.level === "warn");
  if (countErrors) errors += bad.length;
  warnings += countErrors ? unusual.length : 0;
  console.log(`${bad.length === 0 ? "OK   " : countErrors ? "FAIL " : "NOTE "} ${label}  (${bad.length} errors, ${unusual.length} warnings)`);
  // The same message in many places is printed once, with how many and the first place.
  const groups = new Map<string, Finding[]>();
  for (const finding of findings) groups.set(`${finding.level}|${finding.message.replace(/^its fields (.*?)/, "its fields")}`, [...(groups.get(`${finding.level}|${finding.message.replace(/^its fields (.*?)/, "its fields")}`) ?? []), finding]);
  for (const group of groups.values()) {
    const [first, ...rest] = group;
    console.log(`       ${first.level === "error" ? "ERROR" : "warn "} ${first.where}: ${first.message}${rest.length > 0 ? `  (+${rest.length} more like it)` : ""}`);
  }
}

if (reference) {
  console.log("Calibration: the validator's own rules, run on the real export (they must not reject what GTM wrote).");
  // The real export's own header obviously matches itself; what matters here is that the shape rules accept real GTM output.
  report("docs/gtm-export-empty.json (real export)", validateExport(reference, { allowForeignTypes: true }), false);
  console.log("");
} else {
  console.log("NOTE: docs/gtm-export-empty.json is not there, so there was no calibration and the header was not compared with a real export.\n");
}

report("docs/gtm-container-anaizanest.json", validateExport(full, { reference }));
report("docs/gtm-container-anaizanest-v2.json", validateExport(read(`${docs}gtm-container-anaizanest-v2.json`), { reference }));

const partsDir = `${docs}gtm/`;
if (existsSync(partsDir)) {
  for (const name of readdirSync(partsDir).filter((file) => file.endsWith(".json")).sort()) {
    report(`docs/gtm/${name}`, validateExport(read(`${partsDir}${name}`), { reference, externalVariables: allVariables }));
  }
}

console.log(`\n${errors === 0 ? "No errors" : `${errors} error(s)`}, ${warnings} warning(s).`);
process.exit(errors === 0 ? 0 : 1);
