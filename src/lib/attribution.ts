import { marketingAllowed } from "./consent.ts";
import { keepFbcFromClick } from "./identity.ts";

const STORAGE_KEY = "anaiza-utm-attribution";
const EXPIRY_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"] as const;
type UtmKey = (typeof UTM_KEYS)[number];
type UtmValues = Partial<Record<UtmKey, string>>;

interface StoredAttribution extends UtmValues {
  capturedAt: number;
}

// Last-touch, not first-touch: whichever campaign a customer clicked most
// recently before buying is what should get credit for that sale, so a new
// UTM-tagged visit always overwrites whatever was stored from an earlier
// one. First-touch would keep crediting a months-old ad indefinitely even
// after a completely different, current campaign is what actually brought
// the customer back to buy.
export function captureUtmParams(search: string): void {
  if (typeof window === "undefined" || !search) return;
  // In opt-in cookie mode nothing is stored until the visitor allows marketing.
  if (!marketingAllowed()) return;

  captureClickIds(search);

  const params = new URLSearchParams(search);
  const values: UtmValues = {};

  for (const key of UTM_KEYS) {
    const value = params.get(key);
    if (value) values[key] = value;
  }

  if (Object.keys(values).length === 0) return;

  try {
    const record: StoredAttribution = { ...values, capturedAt: Date.now() };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(record));
  } catch {
    // Storage unavailable (private browsing, quota) -- attribution is a
    // nice-to-have, never worth failing anything over.
  }
}

// What a stored record is worth: nothing, unless it is an object with a real capture time inside the window. Values must
// be short strings (they are sent with an order), so a record from anywhere else cannot put anything odd into a request.
function isFreshRecord(record: unknown, now: number): record is Record<string, unknown> {
  if (typeof record !== "object" || record === null || Array.isArray(record)) return false;

  const { capturedAt } = record as { capturedAt?: unknown };
  return typeof capturedAt === "number" && Number.isFinite(capturedAt) && capturedAt <= now + 60_000 && now - capturedAt <= EXPIRY_MS;
}

export function utmFromRecord(record: unknown, now: number): UtmValues {
  if (!isFreshRecord(record, now)) return {};

  const values: UtmValues = {};
  for (const key of UTM_KEYS) {
    const value = record[key];
    if (typeof value === "string" && value.trim() !== "" && value.length <= 255) values[key] = value;
  }
  return values;
}

export function clickIdsFromRecord(record: unknown, now: number): ClickIds {
  if (!isFreshRecord(record, now)) return {};

  const found: ClickIds = {};
  for (const key of CLICK_KEYS) {
    const value = record[key];
    if (typeof value === "string" && value.length <= MAX_CLICK_ID_LENGTH && /^[\w.\-~%=+]+$/.test(value)) found[key] = value;
  }
  return found;
}

// Returns only the UTM keys that are actually present and not expired --
// never an empty-string value, so callers can spread the result straight
// into a request body without sending blank fields for missing ones.
export function getStoredUtmParams(): UtmValues {
  if (typeof window === "undefined") return {};

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};

    return utmFromRecord(JSON.parse(raw), Date.now());
  } catch {
    return {};
  }
}

// ---- Ad click ids. Kept like the UTM parameters (same consent rule, same 30 days, last click wins) and sent with the
// order, so the shop's server-side Meta and TikTok events can be matched to the ad click that brought the visitor.

const CLICK_STORAGE_KEY = "anaiza-click-ids";
const CLICK_KEYS = ["fbclid", "gclid", "ttclid"] as const;
type ClickKey = (typeof CLICK_KEYS)[number];
export type ClickIds = Partial<Record<ClickKey, string>>;

// Long enough for any real click id, short enough that nobody can use the field to store anything else.
const MAX_CLICK_ID_LENGTH = 255;

/** The click ids in a query string (?fbclid=...), only well-formed ones. */
export function clickIdsFromSearch(search: string): ClickIds {
  const params = new URLSearchParams(search);
  const found: ClickIds = {};

  for (const key of CLICK_KEYS) {
    const value = params.get(key)?.trim();
    if (value && value.length <= MAX_CLICK_ID_LENGTH && /^[\w.\-~%=+]+$/.test(value)) found[key] = value;
  }

  return found;
}

function captureClickIds(search: string): void {
  const found = clickIdsFromSearch(search);
  if (Object.keys(found).length === 0) return;

  try {
    window.localStorage.setItem(CLICK_STORAGE_KEY, JSON.stringify({ ...found, capturedAt: Date.now() }));
    // The order may be placed long after the visitor landed: keep the click in Meta's cookie format too (identity.ts), unless Meta's own cookie is there.
    if (found.fbclid) keepFbcFromClick(found.fbclid);
  } catch {
    // Storage unavailable: attribution is a nice-to-have.
  }
}

export function getStoredClickIds(): ClickIds {
  if (typeof window === "undefined") return {};

  try {
    const raw = window.localStorage.getItem(CLICK_STORAGE_KEY);
    if (!raw) return {};

    return clickIdsFromRecord(JSON.parse(raw), Date.now());
  } catch {
    return {};
  }
}
