// Checks the division, district and thana (upazila) data the checkout offers (src/lib/bangladesh-geography.ts). It only READS and reports; it never changes the data,
// because the backend (shipping zone and fee, the courier booking) and old orders may depend on the exact names.
//
//   node --no-warnings scripts/geo-check.ts          the counts and every problem
//   node --no-warnings scripts/geo-check.ts --json   the same as JSON
import { BD_DISTRICTS_BY_DIVISION, BD_DIVISIONS, BD_UPAZILAS_BY_DISTRICT } from "../src/lib/bangladesh-geography.ts";

type Problem = { where: string; value: string; problem: string };
const problems: Problem[] = [];
const add = (where: string, value: string, problem: string) => problems.push({ where, value, problem });

const OFFICIAL_DISTRICTS = 64;
const allDistricts: string[] = [];

// ---- shape of the lists
if (BD_DIVISIONS.length !== 8) add("divisions", String(BD_DIVISIONS.length), "expected 8 divisions");
if (JSON.stringify([...BD_DIVISIONS]) === JSON.stringify([...BD_DIVISIONS].sort())) {
  // sorted alphabetically is not required of the divisions (Dhaka first is the usual order); nothing to report
}

for (const division of BD_DIVISIONS) {
  const districts = BD_DISTRICTS_BY_DIVISION[division] ?? [];
  if (districts.length === 0) add("districts", division, "a division with no districts");

  const sorted = [...districts].sort((a, b) => a.localeCompare(b));
  if (JSON.stringify(sorted) !== JSON.stringify(districts)) add("districts", division, `districts are not in alphabetical order (e.g. ${districts.find((d, i) => d !== sorted[i])} where ${sorted.find((d, i) => d !== districts[i])} belongs)`);

  for (const district of districts) allDistricts.push(district);
}

if (allDistricts.length !== OFFICIAL_DISTRICTS) add("districts", String(allDistricts.length), `expected ${OFFICIAL_DISTRICTS} districts`);

const seenDistrict = new Map<string, number>();
for (const district of allDistricts) seenDistrict.set(district, (seenDistrict.get(district) ?? 0) + 1);
for (const [district, count] of seenDistrict) if (count > 1) add("districts", district, `appears ${count} times`);

// ---- thanas
let thanaCount = 0;
const suspicious = /(sddin|charfesson|louhajanj|senbug|kishorganj|syedpur|doulatkhan|dewangonj|mohongonj|faridgonj|monohargonj|nondigram|shajahanpur|^bogra |^jessore |^barisal |^comilla |^coxsbazar |jhalakathi |zajira)/i;

for (const district of allDistricts) {
  const list = BD_UPAZILAS_BY_DISTRICT[district];
  if (!list || list.length === 0) {
    add("thanas", district, "a district with no thana or upazila");
    continue;
  }
  thanaCount += list.length;

  const seen = new Set<string>();
  for (const name of list) {
    if (name.trim() === "") add(`thanas of ${district}`, JSON.stringify(name), "empty entry");
    if (name !== name.trim() || /\s{2,}/.test(name)) add(`thanas of ${district}`, JSON.stringify(name), "extra spaces");
    if (name !== name.charAt(0).toUpperCase() + name.slice(1)) add(`thanas of ${district}`, name, "does not start with a capital");
    if (seen.has(name.toLowerCase())) add(`thanas of ${district}`, name, "duplicate within the district");
    seen.add(name.toLowerCase());
    if (suspicious.test(name)) add(`thanas of ${district}`, name, "an older or irregular spelling (see the report)");
  }

  const sorted = [...list].sort((a, b) => a.localeCompare(b));
  if (JSON.stringify(sorted) !== JSON.stringify(list)) add(`thanas of ${district}`, "(list)", "not in alphabetical order");
}

// Keys of the thana table that are not a district (a typo in a key means that district shows no list).
for (const key of Object.keys(BD_UPAZILAS_BY_DISTRICT)) if (!seenDistrict.has(key)) add("thanas", key, "a key that is not one of the districts");

// ---- Dhaka city
const dhaka = BD_UPAZILAS_BY_DISTRICT["Dhaka"] ?? [];
for (const must of ["Banani", "Gulshan", "Dhanmondi", "Mirpur", "Uttara East", "Uttara West", "Mohammadpur", "Motijheel", "Badda", "Tejgaon", "Savar", "Keraniganj"]) {
  if (!dhaka.includes(must)) add("Dhaka", must, "a well-known Dhaka thana is missing");
}

const summary = {
  divisions: BD_DIVISIONS.length,
  districts: allDistricts.length,
  thanas: thanaCount,
  dhakaThanas: dhaka.length,
  perDivision: Object.fromEntries(BD_DIVISIONS.map((d) => [d, BD_DISTRICTS_BY_DIVISION[d].length])),
  smallestDistricts: allDistricts.map((d) => [d, (BD_UPAZILAS_BY_DISTRICT[d] ?? []).length] as const).sort((a, b) => a[1] - b[1]).slice(0, 5),
};

if (process.argv.includes("--json")) {
  console.log(JSON.stringify({ summary, problems }, null, 2));
} else {
  console.log(JSON.stringify(summary, null, 2));
  console.log(`\n${problems.length} problem(s)`);
  for (const p of problems) console.log(`- [${p.where}] ${p.value}: ${p.problem}`);
}
