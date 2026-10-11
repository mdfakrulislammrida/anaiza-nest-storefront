// What the storefront tells the shop about a left cart, and when. Pure rules (no browser, no network), so they can be tested.
//
// A visitor with no valid email or phone number is never described to the server: only a per-stage count goes up, once.
// Someone who can be contacted is described only when the cookie mode allows it (notice mode always; opt-in mode only
// once marketing is allowed).

import type { CartItem } from "@/context/CartContext";

export type CheckoutStage = "cart" | "checkout_started" | "contact_filled";

export interface Contact {
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  whatsappOptIn?: boolean;
}

export interface SessionPayload {
  session_token?: string;
  stage: CheckoutStage;
  count_only?: boolean;
  name?: string;
  email?: string;
  phone?: string;
  marketing_consent?: boolean;
  whatsapp_optin?: boolean;
  items?: ReturnType<typeof cartLines>;
  viewed_products?: number[];
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** A usable email address, lower-cased; null when it is not one yet (so a half-typed address is never sent). */
export function validEmail(value: string | null | undefined): string | null {
  const email = (value ?? "").trim().toLowerCase();

  return EMAIL.test(email) ? email : null;
}

/** A Bangladeshi mobile number as 01XXXXXXXXX; null until it is a complete valid one. */
export function validPhone(value: string | null | undefined): string | null {
  const phone = (value ?? "").replace(/[\s\-().]/g, "").replace(/^\+?88(?=01)/, "");

  return /^01[3-9]\d{8}$/.test(phone) ? phone : null;
}

/** Whether a contact can be reached, and so may be described to the server at all. */
export function isIdentified(contact: Contact): boolean {
  return validEmail(contact.email) !== null || validPhone(contact.phone) !== null;
}

/** Opt-in cookie mode needs marketing consent before an identified cart is kept; notice mode does not. */
export function mayStoreIdentified(optIn: boolean, marketingAllowed: boolean): boolean {
  return !optIn || marketingAllowed;
}

export function cartLines(items: Pick<CartItem, "productId" | "variantId" | "sku" | "name" | "variantLabel" | "price" | "quantity" | "image" | "slug">[]) {
  return items.slice(0, 30).map((item) => ({
    product_id: item.productId,
    variant_id: item.variantId,
    sku: item.sku ?? null,
    name: item.name,
    variant: item.variantLabel,
    price: item.price,
    quantity: item.quantity,
    image: item.image,
    slug: item.slug,
  }));
}

/** Keeps the last five products viewed, newest last, without repeats. */
export function pushViewed(list: number[], productId: number, max = 5): number[] {
  return [...list.filter((id) => id !== productId), productId].slice(-max);
}

/** The furthest stage reached, given what is known. */
export function stageFor(base: CheckoutStage, contact: Contact): CheckoutStage {
  if (isIdentified(contact)) return "contact_filled";

  return base;
}

/**
 * The report to send, or null when nothing should be sent.
 *
 * - No items and no contact: nothing.
 * - Not identified: a count-only report (flagged once per stage by the caller), with no cart and no token in it.
 * - Identified but not allowed to be stored: nothing at all (not even a count).
 * - Identified and allowed: the full report.
 */
export function buildReport(input: {
  stage: CheckoutStage;
  contact: Contact;
  items: Parameters<typeof cartLines>[0];
  viewed: number[];
  token: string | null;
  optIn: boolean;
  marketingAllowed: boolean;
  countOnceOnly: boolean;
  utm?: Partial<Record<"utm_source" | "utm_medium" | "utm_campaign" | "utm_content" | "utm_term", string>>;
}): SessionPayload | null {
  const identified = isIdentified(input.contact);

  if (!identified) {
    return input.countOnceOnly ? { stage: input.stage, count_only: true } : null;
  }

  if (!mayStoreIdentified(input.optIn, input.marketingAllowed) || input.token === null) {
    return null;
  }

  const email = validEmail(input.contact.email);
  const phone = validPhone(input.contact.phone);
  const name = input.contact.name?.trim();

  return {
    session_token: input.token,
    stage: stageFor(input.stage, input.contact),
    ...(name ? { name } : {}),
    ...(email ? { email } : {}),
    ...(phone ? { phone } : {}),
    marketing_consent: input.marketingAllowed,
    whatsapp_optin: input.contact.whatsappOptIn === true,
    items: cartLines(input.items),
    viewed_products: input.viewed,
    ...(input.utm ?? {}),
  };
}
