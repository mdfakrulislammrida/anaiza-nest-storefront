// Who the visitor is, for the platforms that match events to a person (Meta's external_id).
//
// One identity, one rule:
//   - a signed-in customer is their customer id;
//   - everybody else is a random id kept in a first-party cookie, `an_eid` (a UUID, 400 days, SameSite=Lax, Secure on https). It is made only when the
//     visitor allows marketing, and never before. A guest who signs in or buys keeps the cookie; while signed in the customer id wins.
// Neither a phone number nor an email address is ever the id. What leaves the browser is the SHA-256 of the id (lower-case hex), never the id itself,
// and nothing at all when marketing is not allowed. If marketing is later refused, the cookie is removed.

import { marketingAllowed } from "./consent.ts";
import { loadAuth } from "./storedState.ts";
import { sha256Hex } from "./userData.ts";

export const EXTERNAL_ID_COOKIE = "an_eid";
export const EXTERNAL_ID_MAX_AGE_SECONDS = 400 * 24 * 60 * 60;

/** The _fbc value built from an ad click when Meta's own cookie is missing: kept for 90 days, as Meta keeps its own. */
export const FBC_COOKIE = "an_fbc";
export const FBC_MAX_AGE_SECONDS = 90 * 24 * 60 * 60;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

// ---- cookies (first-party, plain document.cookie; every function is a no-op without a document)

export function readCookie(name: string): string | null {
  if (typeof document === "undefined" || typeof document.cookie !== "string") return null;

  for (const part of document.cookie.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) {
      try {
        return decodeURIComponent(rest.join("="));
      } catch {
        return null;
      }
    }
  }

  return null;
}

export function writeCookie(name: string, value: string, maxAgeSeconds: number): void {
  if (typeof document === "undefined") return;

  const secure = typeof window !== "undefined" && window.location?.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${name}=${encodeURIComponent(value)}; Max-Age=${maxAgeSeconds}; Path=/; SameSite=Lax${secure}`;
}

// ---- the id

export function newUuid(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();

  const bytes = new Uint8Array(16);
  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") crypto.getRandomValues(bytes);
  else for (let i = 0; i < 16; i++) bytes[i] = Math.floor(Math.random() * 256);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");

  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/** The id of the customer who is signed in on this browser, or null (a guest). */
export function signedInCustomerId(): number | null {
  try {
    return loadAuth(window.localStorage)?.customer.id ?? null;
  } catch {
    return null;
  }
}

/**
 * The text the external_id is made from, or null: when marketing is not allowed (nothing is read, made or kept), or when there is no document to keep a
 * cookie in and nobody is signed in. The customer id when signed in; else the cookie, made now if it is not there yet.
 */
export function externalIdSource(): string | null {
  if (!marketingAllowed()) return null;

  const customerId = signedInCustomerId();
  if (customerId !== null && Number.isInteger(customerId) && customerId > 0) return String(customerId);

  const existing = readCookie(EXTERNAL_ID_COOKIE);
  if (existing !== null && UUID.test(existing)) return existing;
  if (typeof document === "undefined") return null;

  const made = newUuid();
  writeCookie(EXTERNAL_ID_COOKIE, made, EXTERNAL_ID_MAX_AGE_SECONDS);

  // A browser that refuses cookies gives a new id every time, which would only add noise: no cookie, no id.
  return readCookie(EXTERNAL_ID_COOKIE) === made ? made : null;
}

/** Marketing has been refused (again): the visitor's id is forgotten. */
export function forgetExternalId(): void {
  if (typeof document === "undefined") return;
  writeCookie(EXTERNAL_ID_COOKIE, "", 0);
}

const hashes = new Map<string, string>();

/** The hash of an id if it has been worked out already (so a push can be made at once), else undefined. */
export function knownHash(source: string): string | undefined {
  return hashes.get(source);
}

/** SHA-256 of the id as lower-case hex, or null when the browser cannot hash. */
export async function hashOf(source: string): Promise<string | null> {
  const known = hashes.get(source);
  if (known) return known;
  if (typeof crypto === "undefined" || !crypto.subtle) return null;

  try {
    const hash = await sha256Hex(source);
    hashes.set(source, hash);

    return hash;
  } catch {
    return null;
  }
}

/** The hashed external_id for what the visitor is doing now, or null (no consent, no id). */
export async function externalIdHash(): Promise<string | null> {
  const source = externalIdSource();

  return source === null ? null : hashOf(source);
}

// ---- the ad click as Meta writes it

const FBP = /^fb\.[0-2]\.\d{10,13}\.\d{1,20}$/;
const FBC = /^fb\.[0-2]\.\d{10,13}\.[A-Za-z0-9_-]{1,200}$/;

/** Meta's _fbp cookie, when it has the shape the shop's server accepts. */
export function readFbp(): string | null {
  const value = readCookie("_fbp");

  return value !== null && FBP.test(value) ? value : null;
}

/** Meta's _fbc cookie, else the one kept here from the ad click (`fb.1.<ms>.<fbclid>`), when it has the shape the shop's server accepts. */
export function readFbc(): string | null {
  for (const name of ["_fbc", FBC_COOKIE]) {
    const value = readCookie(name);
    if (value !== null && FBC.test(value)) return value;
  }

  return null;
}

/** Keeps the ad click in Meta's format for later, because the order may be placed long after the visitor landed. Meta's own cookie is left alone. */
export function keepFbcFromClick(fbclid: string, now = Date.now()): void {
  if (readCookie("_fbc") !== null) return;

  const value = `fb.1.${now}.${fbclid}`;
  if (FBC.test(value)) writeCookie(FBC_COOKIE, value, FBC_MAX_AGE_SECONDS);
}

/**
 * What an order carries so the shop's server can match its Purchase to the same person as the browser's: fbp, fbc and the hashed external_id.
 * Nothing at all when marketing is not allowed; a missing piece is simply left out.
 */
export async function orderMatchData(): Promise<{ fbp?: string; fbc?: string; external_id?: string }> {
  if (!marketingAllowed()) return {};

  const [fbp, fbc, externalId] = [readFbp(), readFbc(), await externalIdHash()];

  return {
    ...(fbp ? { fbp } : {}),
    ...(fbc ? { fbc } : {}),
    ...(externalId ? { external_id: externalId } : {}),
  };
}
