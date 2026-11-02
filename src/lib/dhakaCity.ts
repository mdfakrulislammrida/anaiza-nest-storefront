// "Inside Dhaka" means Dhaka CITY: the division Dhaka, the district Dhaka and a thana in the city list. Gazipur, Narayanganj, Savar,
// Keraniganj and every other district are outside. This is the one place the storefront decides it; the lists come from the API
// (policy.dhaka_city, the same ones the server charges by) and fall back to the lists in the geography file when the API does not
// send them. Names are compared as stored: only case and extra spaces are ignored, nothing is renamed.
import { BD_UPAZILAS_BY_DISTRICT, DHAKA_CITY_THANAS, DHAKA_OUTSIDE_UPAZILAS } from "./bangladesh-geography.ts";

export interface DhakaCityRule {
  division: string;
  district: string;
  /** The city thanas: inside Dhaka. */
  thanas: readonly string[];
  /** Upazilas of Dhaka district that are not the city: outside Dhaka. */
  outside_upazilas: readonly string[];
}

/** What the geography file says, used when the API does not send the rule. */
export const LOCAL_DHAKA_CITY: DhakaCityRule = {
  division: "Dhaka",
  district: "Dhaka",
  thanas: DHAKA_CITY_THANAS,
  outside_upazilas: DHAKA_OUTSIDE_UPAZILAS,
};

const isNames = (value: unknown): value is string[] =>
  Array.isArray(value) && value.length > 0 && value.every((name) => typeof name === "string" && name.trim() !== "");

const isText = (value: unknown): value is string => typeof value === "string" && value.trim() !== "";

/** The API's rule when it is complete, otherwise the local one (an older API, or a failed request, never breaks the checkout). */
export function resolveDhakaCity(fromApi: Partial<DhakaCityRule> | null | undefined): DhakaCityRule {
  if (fromApi && isText(fromApi.division) && isText(fromApi.district) && isNames(fromApi.thanas) && Array.isArray(fromApi.outside_upazilas)) {
    return { division: fromApi.division, district: fromApi.district, thanas: fromApi.thanas, outside_upazilas: fromApi.outside_upazilas };
  }

  return LOCAL_DHAKA_CITY;
}

const norm = (value: string) => value.replace(/\s+/g, " ").trim().toLowerCase();

/** True only for division Dhaka + district Dhaka + a thana of the city list. A missing or unknown thana is outside, as on the server. */
export function isDhakaCity(rule: DhakaCityRule, division: string, district: string, thana: string): boolean {
  if (norm(division) !== norm(rule.division) || norm(district) !== norm(rule.district)) return false;

  const wanted = norm(thana);

  return wanted !== "" && rule.thanas.some((name) => norm(name) === wanted);
}

/**
 * The areas (thanas) to offer for a district. Dhaka district is split so that the choice and the fee can never disagree: "Inside
 * Dhaka" offers the city thanas, "Outside Dhaka" with Dhaka district offers the rest of the district (Savar, Keraniganj...). Every
 * other district offers its whole list.
 */
export function areasFor(rule: DhakaCityRule, zone: "inside" | "outside" | null, division: string, district: string): string[] {
  const all = BD_UPAZILAS_BY_DISTRICT[district] ?? [];

  if (norm(division) !== norm(rule.division) || norm(district) !== norm(rule.district)) return all;

  return all.filter((thana) => isDhakaCity(rule, division, district, thana) === (zone === "inside"));
}
