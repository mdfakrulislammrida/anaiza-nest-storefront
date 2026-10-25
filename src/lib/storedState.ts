// What the shop keeps in the browser (the cart, the wishlist, the sign-in, the last order, a coupon code, the products
// viewed) and how it is read back.
//
// A returning visitor's browser may hold anything under these keys: a value saved by an older version of this shop, by
// the old site (which kept its cart as {"state":{"lines":[...]},"version":0} under the same key), by another script, or a
// half-written string. Nothing read from storage is used until it has been checked against the shape this code writes.
// What does not match is dropped, and a value that is wholly unusable is removed so it cannot cause trouble again. Old
// carts are not converted: they are ignored.
//
// Pure functions over a storage-like object, so they run the same in the browser and in the tests.

import type { CartItem } from "../context/CartContext";
import type { WishlistItem } from "../context/WishlistContext";
import type { AuthCustomer, Order } from "./types";

export type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export const CART_KEY = "anaiza-cart";
export const WISHLIST_KEY = "anaiza-wishlist";
export const AUTH_KEY = "anaiza-auth";
export const LAST_ORDER_KEY = "anaiza-last-order";

type Json = { ok: true; value: unknown } | { ok: false };

function parseJson(raw: string): Json {
  try {
    return { ok: true, value: JSON.parse(raw) };
  } catch {
    return { ok: false };
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isText(value: unknown): value is string {
  return typeof value === "string" && value.trim() !== "";
}

function isCount(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 1;
}

function isAmount(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

function isTextOrNull(value: unknown): value is string | null {
  return value === null || typeof value === "string";
}

/** Reads a key without ever throwing (storage can be blocked, full or absent). */
export function readItem(storage: StorageLike, key: string): string | null {
  try {
    return storage.getItem(key);
  } catch {
    return null;
  }
}

/** Forgets a key without ever throwing. */
export function removeItem(storage: StorageLike, key: string): void {
  try {
    storage.removeItem(key);
  } catch {
    // Nothing to forget, or nowhere to forget it from.
  }
}

/** Reads a key as JSON. null when it is missing or is not JSON (and in that case the key is removed). */
function readJson(storage: StorageLike, key: string): { value: unknown } | null {
  const raw = readItem(storage, key);
  if (raw === null) return null;

  const parsed = parseJson(raw);
  if (!parsed.ok) {
    removeItem(storage, key);
    return null;
  }

  return { value: parsed.value };
}

// ---- The cart

/** One saved cart line in the current shape, or null. Only the known fields are copied across. */
export function cartLine(value: unknown): CartItem | null {
  if (!isRecord(value)) return null;

  const { key, productId, slug, name, price, regularPrice, image, variantId, variantLabel, sku, quantity, stock } = value;

  if (!isText(key) || !isCount(productId) || !isText(slug) || !isText(name)) return null;
  if (!isAmount(price) || !isCount(quantity) || !isAmount(stock)) return null;
  if (!isTextOrNull(image) || !isTextOrNull(variantLabel)) return null;
  if (!(variantId === null || isCount(variantId))) return null;
  if (!(sku === undefined || isTextOrNull(sku))) return null;

  const line: CartItem = { key, productId, slug, name, price, image, variantId, variantLabel, quantity, stock };
  if (sku !== undefined) line.sku = sku;
  // Only a real, higher regular price is kept; anything else is just not a sale line.
  if (isAmount(regularPrice) && regularPrice > price) line.regularPrice = regularPrice;

  return line;
}

/** The valid lines of a saved cart (one line per key), or null when the value is not a list at all. */
export function cartLines(value: unknown): CartItem[] | null {
  if (!Array.isArray(value)) return null;

  const seen = new Set<string>();
  const lines: CartItem[] = [];

  for (const entry of value) {
    const line = cartLine(entry);
    if (line === null || seen.has(line.key)) continue;
    seen.add(line.key);
    lines.push(line);
  }

  return lines;
}

/** The saved cart, always a clean list. A value in any other shape is ignored and removed. */
export function loadCart(storage: StorageLike): CartItem[] {
  const stored = readJson(storage, CART_KEY);
  if (stored === null) return [];

  const lines = cartLines(stored.value);
  if (lines === null) {
    removeItem(storage, CART_KEY);
    return [];
  }

  return lines;
}

// ---- The wishlist

export function wishlistItem(value: unknown): WishlistItem | null {
  if (!isRecord(value)) return null;

  const { productId, slug, name, image, price, sku } = value;

  if (!isCount(productId) || !isText(slug) || !isText(name) || !isTextOrNull(image) || !isAmount(price)) return null;
  if (!(sku === undefined || isTextOrNull(sku))) return null;

  const item: WishlistItem = { productId, slug, name, image, price };
  if (sku !== undefined) item.sku = sku;

  return item;
}

export function wishlistItems(value: unknown): WishlistItem[] | null {
  if (!Array.isArray(value)) return null;

  const seen = new Set<number>();
  const items: WishlistItem[] = [];

  for (const entry of value) {
    const item = wishlistItem(entry);
    if (item === null || seen.has(item.productId)) continue;
    seen.add(item.productId);
    items.push(item);
  }

  return items;
}

export function loadWishlist(storage: StorageLike): WishlistItem[] {
  const stored = readJson(storage, WISHLIST_KEY);
  if (stored === null) return [];

  const items = wishlistItems(stored.value);
  if (items === null) {
    removeItem(storage, WISHLIST_KEY);
    return [];
  }

  return items;
}

// ---- The sign-in

export interface StoredAuth {
  customer: AuthCustomer;
  token: string;
}

export function storedAuth(value: unknown): StoredAuth | null {
  if (!isRecord(value) || !isText(value.token) || !isRecord(value.customer)) return null;

  const { id, name, email, phone } = value.customer;
  if (typeof id !== "number" || !Number.isInteger(id) || !isText(name)) return null;
  if (!(email === undefined || isTextOrNull(email)) || !(phone === undefined || isTextOrNull(phone))) return null;

  return { token: value.token, customer: { id, name, email: email ?? "", phone: phone ?? "" } };
}

/** The saved sign-in, or null. Anything that is not a customer with a token is ignored and removed. */
export function loadAuth(storage: StorageLike): StoredAuth | null {
  const stored = readJson(storage, AUTH_KEY);
  if (stored === null) return null;

  const auth = storedAuth(stored.value);
  if (auth === null) removeItem(storage, AUTH_KEY);

  return auth;
}

/** Just the bearer token, for a request. Never removes anything. */
export function readAuthToken(storage: StorageLike): string | null {
  const raw = readItem(storage, AUTH_KEY);
  if (raw === null) return null;

  const parsed = parseJson(raw);
  return parsed.ok && isRecord(parsed.value) && isText(parsed.value.token) ? parsed.value.token : null;
}

// ---- The order shown on the confirmation page

export function storedOrder(value: unknown): Order | null {
  if (!isRecord(value)) return null;

  const { id, payment_method, subtotal, delivery_fee, total, customer, items } = value;

  if (typeof id !== "number" || !Number.isInteger(id) || id < 1) return null;
  if (!isText(payment_method) || !isAmount(subtotal) || !isAmount(delivery_fee) || !isAmount(total)) return null;
  if (!isRecord(customer) || !Array.isArray(items) || !items.every(isRecord)) return null;

  return value as unknown as Order;
}

/** The last order, or null (and a value in any other shape is removed). */
export function loadLastOrder(storage: StorageLike): Order | null {
  const stored = readJson(storage, LAST_ORDER_KEY);
  if (stored === null) return null;

  const order = storedOrder(stored.value);
  if (order === null) removeItem(storage, LAST_ORDER_KEY);

  return order;
}

// ---- Small lists

/** Whole numbers only, the last five (the products viewed). */
export function parseViewedIds(raw: string | null): number[] {
  if (raw === null) return [];

  const parsed = parseJson(raw);
  if (!parsed.ok || !Array.isArray(parsed.value)) return [];

  return parsed.value.filter((id): id is number => typeof id === "number" && Number.isInteger(id) && id > 0).slice(-5);
}

/** A list of strings (the checkout stages already counted). Anything else is an empty list. */
export function parseStringList(raw: string | null): string[] {
  if (raw === null) return [];

  const parsed = parseJson(raw);
  if (!parsed.ok || !Array.isArray(parsed.value)) return [];

  return parsed.value.filter((entry): entry is string => typeof entry === "string");
}

/** A list of order ids already tracked. */
export function parseNumberList(raw: string | null): number[] {
  if (raw === null) return [];

  const parsed = parseJson(raw);
  if (!parsed.ok || !Array.isArray(parsed.value)) return [];

  return parsed.value.filter((entry): entry is number => typeof entry === "number" && Number.isFinite(entry));
}

/** The checkout session token this code makes: 48 hex characters. Anything else is not one of ours. */
export function isSessionToken(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{48}$/.test(value);
}

/** The contact details a reminder's link left for the checkout form: text fields only. */
export function parseRecoveredContact(raw: string | null): { name?: string; email?: string; phone?: string } {
  if (raw === null) return {};

  const parsed = parseJson(raw);
  if (!parsed.ok || !isRecord(parsed.value)) return {};

  const contact: { name?: string; email?: string; phone?: string } = {};
  for (const field of ["name", "email", "phone"] as const) {
    const value = parsed.value[field];
    if (typeof value === "string" && value.trim() !== "" && value.length <= 255) contact[field] = value;
  }

  return contact;
}
