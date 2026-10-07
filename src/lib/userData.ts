// What the shop may tell Google Ads and Meta about the person who just bought, to match the sale to an ad click
// (Google Enhanced Conversions, Meta advanced matching).
//
// Everything is normalised the way each platform asks and then hashed with SHA-256 in the browser (crypto.subtle), so no
// raw email, phone number or name ever reaches the data layer or a pixel. Google asks for city, region, postal code and
// country to be sent as they are (normalised, not hashed), so those are; Meta wants everything hashed, so there they are.
// This is only ever used when the visitor's cookie choice allows marketing (see tracking.ts).

export interface BuyerDetails {
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  district?: string | null;
  division?: string | null;
  postal_code?: string | null;
}

export interface GoogleUserData {
  sha256_email_address?: string;
  sha256_phone_number?: string;
  address: {
    sha256_first_name?: string;
    sha256_last_name?: string;
    city?: string;
    region?: string;
    postal_code?: string;
    country: string;
  };
}

/** Meta's advanced matching keys, all hashed. */
export type MetaUserData = Partial<Record<"em" | "ph" | "fn" | "ln" | "ct" | "st" | "zp" | "country", string>>;

/** Lower case, letters only: no spaces, punctuation or digits. Bangla letters are kept. */
export function lettersOnly(value: string | null | undefined): string {
  return (value ?? "").toLowerCase().replace(/[^\p{L}\p{M}]/gu, "");
}

/** The first word of a full name, and everything after it. A one-word name has no last name. */
export function splitName(name: string | null | undefined): { first: string; last: string } {
  const [first = "", ...rest] = (name ?? "").trim().split(/\s+/);
  return { first: lettersOnly(first), last: lettersOnly(rest.join(" ")) };
}

/** Meta: lower case and trimmed. */
export function metaEmail(email: string | null | undefined): string {
  return (email ?? "").trim().toLowerCase();
}

/** Google: lower case and trimmed, and for gmail.com and googlemail.com the dots before the @ are removed. */
export function googleEmail(email: string | null | undefined): string {
  const clean = metaEmail(email);
  const at = clean.lastIndexOf("@");
  if (at < 1) return clean;

  const domain = clean.slice(at + 1);
  const local = clean.slice(0, at);

  return domain === "gmail.com" || domain === "googlemail.com" ? `${local.replace(/\./g, "")}@${domain}` : clean;
}

/** A Bangladeshi mobile number as +8801XXXXXXXXX (E.164), however it was typed. Null when it cannot be one. */
export function e164(phone: string | null | undefined): string | null {
  let digits = (phone ?? "").replace(/\D/g, "");
  if (digits === "") return null;

  if (digits.startsWith("880")) digits = digits.slice(3);
  else if (digits.startsWith("0")) digits = digits.slice(1);

  return /^1[3-9]\d{8}$/.test(digits) ? `+880${digits}` : null;
}

export async function sha256Hex(text: string): Promise<string> {
  const bytes = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-256", bytes);

  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

/**
 * The hashed details for both platforms, or null when there is nothing usable (or the browser cannot hash).
 */
export async function buildUserData(buyer: BuyerDetails): Promise<{ google: GoogleUserData; meta: MetaUserData } | null> {
  if (typeof crypto === "undefined" || !crypto.subtle) return null;

  const name = splitName(buyer.name);
  const phone = e164(buyer.phone);
  const city = lettersOnly(buyer.district);
  const region = lettersOnly(buyer.division);
  const postal = (buyer.postal_code ?? "").toLowerCase().replace(/[\s-]/g, "");
  const hash = async (value: string) => (value === "" ? undefined : sha256Hex(value));

  const [gEmail, gPhone, gFirst, gLast, mEmail, mPhone, mFirst, mLast, mCity, mRegion, mPostal, mCountry] = await Promise.all([
    hash(googleEmail(buyer.email)),
    hash(phone ?? ""),
    hash(name.first),
    hash(name.last),
    hash(metaEmail(buyer.email)),
    hash(phone ? phone.slice(1) : ""),
    hash(name.first),
    hash(name.last),
    hash(city),
    hash(region),
    hash(postal),
    hash("bd"),
  ]);

  const google: GoogleUserData = {
    ...(gEmail ? { sha256_email_address: gEmail } : {}),
    ...(gPhone ? { sha256_phone_number: gPhone } : {}),
    address: {
      ...(gFirst ? { sha256_first_name: gFirst } : {}),
      ...(gLast ? { sha256_last_name: gLast } : {}),
      ...(city ? { city } : {}),
      ...(region ? { region } : {}),
      ...(postal ? { postal_code: postal } : {}),
      country: "BD",
    },
  };

  const meta: MetaUserData = {
    ...(mEmail ? { em: mEmail } : {}),
    ...(mPhone ? { ph: mPhone } : {}),
    ...(mFirst ? { fn: mFirst } : {}),
    ...(mLast ? { ln: mLast } : {}),
    ...(mCity ? { ct: mCity } : {}),
    ...(mRegion ? { st: mRegion } : {}),
    ...(mPostal ? { zp: mPostal } : {}),
    ...(mCountry ? { country: mCountry } : {}),
  };

  return gEmail || gPhone || gFirst ? { google, meta } : null;
}
