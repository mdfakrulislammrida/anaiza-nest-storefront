// Finding a place in the checkout lists, and what happens when it is not there. Pure text rules (no browser), so they can be tested.
//
// The names in the lists are never changed here: the old spellings and the words people type ("sadar", "city") are only ever used to SEARCH, and a search
// shows the entries of the list as they are written.
import { BD_CITY_THANAS } from "./bangladesh-geography.ts";

/** The last entry of every thana list: a way on for a customer whose area is not in it. It is never sent: what they type is. */
export const OTHER_AREA = "Other / not listed";

/** The longest text the backend accepts for an area (`thana` is max 60 there). */
export const AREA_MAX_LENGTH = 60;

export const AREA_HELP = "Not sure? Pick the nearest thana and write your full address.";

export const AREA_MISSING_MESSAGE = "Please select your division, district and thana/area.";

export const AREA_OTHER_MISSING_MESSAGE = "Please write your area or thana.";

// Old and other spellings of a district, for the search only (the list shows the current spelling).
export const DISTRICT_ALIASES: Record<string, string[]> = {
  Chattogram: ["Chittagong", "Chittagonj"],
  Cumilla: ["Comilla"],
  Bogura: ["Bogra"],
  Barishal: ["Barisal"],
  Jashore: ["Jessore"],
  Jhalokati: ["Jhalakathi", "Jhalakati"],
  "Cox's Bazar": ["Coxsbazar", "Coxs Bazar", "Cox Bazar", "Coxbazar"],
  Chapainawabganj: ["Nawabganj", "Chapai Nawabganj", "Chapai"],
};

// Old and other spellings of a thana, for the search only.
export const THANA_ALIASES: Record<string, string[]> = {
  "Comilla Sadar": ["Cumilla Sadar"],
  "Bogra Sadar": ["Bogura Sadar"],
  "Jessore Sadar": ["Jashore Sadar"],
  "Jhalakathi Sadar": ["Jhalokati Sadar"],
  "Barisal Sadar": ["Barishal Sadar"],
  "Coxsbazar Sadar": ["Cox's Bazar Sadar", "Coxs Bazar Sadar", "Cox Bazar Sadar"],
  Kishorganj: ["Kishoreganj"],
  Syedpur: ["Saidpur"],
  "Borhan Sddin": ["Borhanuddin"],
  Charfesson: ["Char Fasson"],
  Doulatkhan: ["Daulatkhan"],
  Louhajanj: ["Lohajang"],
  Zajira: ["Zanjira"],
  Faridgonj: ["Faridganj"],
  Senbug: ["Senbagh"],
  Dewangonj: ["Dewanganj"],
  Mohongonj: ["Mohanganj"],
  Nondigram: ["Nandigram"],
  Shajahanpur: ["Shahjahanpur"],
  Monohargonj: ["Monoharganj"],
};

/** Case, punctuation and the words "thana" and "upazila" do not matter when searching. */
export function searchKey(text: string | null | undefined): string {
  return (text ?? "")
    .toLowerCase()
    .replace(/\b(thana|upazila|upazilla)\b/g, " ")
    .replace(/[^\p{L}\p{M}\p{N}]/gu, "");
}

/** Whether a district has city thanas (so "sadar" and "city" mean something there). */
export function hasCityThanas(district: string): boolean {
  return (BD_CITY_THANAS[district] ?? []).length > 0;
}

/** The names a district is known by when searching: the current one and the old spellings. */
function districtNames(district: string): string[] {
  return [district, ...(DISTRICT_ALIASES[district] ?? [])].map(searchKey).filter((key) => key !== "");
}

/** Districts matching what was typed: the current spelling or an old one, anywhere in the name. The list itself is returned as it is when nothing was typed. */
export function filterDistricts(options: string[], query: string): string[] {
  const wanted = searchKey(query);
  if (wanted === "") return options;

  return options.filter((option) => districtNames(option).some((name) => name.includes(wanted)));
}

/**
 * Thanas matching what was typed in the given district. The name or an old spelling of it, anywhere in the name; and, in a district that has city thanas, "sadar",
 * "city" and the district's name (old or new) alone or with those words ("chittagong sadar", "Chattogram city", "comilla") also list the city thanas.
 * Entries keep their order from the list.
 */
export function filterThanas(options: string[], query: string, district: string): string[] {
  const wanted = searchKey(query);
  if (wanted === "") return options;

  const byName = (option: string) => [option, ...(THANA_ALIASES[option] ?? [])].some((name) => searchKey(name).includes(wanted));

  const city = new Set(BD_CITY_THANAS[district] ?? []);
  let rest = wanted;
  for (const name of districtNames(district)) rest = rest.split(name).join("");
  const word = rest.replace(/sadar|city|metropolitan|metro/g, "");
  const asksForTheCity = city.size > 0 && word === "" && (rest !== wanted || /sadar|city|metro/.test(rest));

  return options.filter((option) => byName(option) || (asksForTheCity && city.has(option)));
}

/** Whether a list gets a search box: always for a thana or district list, and for any other list once it is long. */
export function showsSearch(optionCount: number, always = false): boolean {
  return always || optionCount > 10;
}

/** The area that is sent: the thana picked from the list, or what the customer wrote when they chose "Other / not listed". */
export function effectiveArea(choice: string, otherText: string): string {
  return choice === OTHER_AREA ? otherText.trim().slice(0, AREA_MAX_LENGTH) : choice;
}

/** What is wrong with the area, if anything, as a sentence for the customer (null when it is fine). */
export function areaProblem(choice: string, otherText: string): string | null {
  if (choice === "") return AREA_MISSING_MESSAGE;
  if (choice === OTHER_AREA && otherText.trim() === "") return AREA_OTHER_MISSING_MESSAGE;

  return null;
}
