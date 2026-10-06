import { marketingAllowed } from "./consent";

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

// Returns only the UTM keys that are actually present and not expired --
// never an empty-string value, so callers can spread the result straight
// into a request body without sending blank fields for missing ones.
export function getStoredUtmParams(): UtmValues {
  if (typeof window === "undefined") return {};

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};

    const record = JSON.parse(raw) as StoredAttribution;
    if (Date.now() - record.capturedAt > EXPIRY_MS) return {};

    const values: UtmValues = {};
    for (const key of UTM_KEYS) {
      if (record[key]) values[key] = record[key];
    }
    return values;
  } catch {
    return {};
  }
}
