// Tells the shop where a visitor has got to, so a cart that is left can be followed up. Everything the rules decide
// (who is described, when) is in recovery.ts; this is the browser side: the debounce, the token, the storage, the request.
//
// - A visitor with no valid email or phone is only counted: one request per stage, with nothing about them in it.
// - Someone who can be contacted is described only when the cookie mode allows it (see mayStoreIdentified).
// - Failures are silent. This must never get in the way of a cart or a checkout.

import { reportCheckoutSession } from "./api";
import { getStoredUtmParams } from "./attribution";
import { marketingAllowed } from "./consent";
import { buildReport, isIdentified, mayStoreIdentified, pushViewed, type CheckoutStage, type Contact } from "./recovery";
import { isSessionToken, parseStringList, parseViewedIds } from "./storedState";
import type { CartItem } from "../context/CartContext";

const TOKEN_KEY = "anaiza-checkout-session";
const VIEWED_KEY = "anaiza-viewed";
const COUNTED_KEY = "anaiza-counted-stages";
const DEBOUNCE_MS = 2000;
const STAGE_RANK: Record<CheckoutStage, number> = { cart: 1, checkout_started: 2, contact_filled: 3 };

let items: Pick<CartItem, "productId" | "variantId" | "sku" | "name" | "variantLabel" | "price" | "quantity" | "image" | "slug">[] = [];
let stage: CheckoutStage = "cart";
let contact: Contact = {};
let viewed: number[] | null = null;
let timer: ReturnType<typeof setTimeout> | null = null;
let listening = false;
const countedInMemory = new Set<CheckoutStage>();

function optIn(): boolean {
  return typeof window !== "undefined" && window.anaizaConsent?.optIn === true;
}

function randomToken(): string {
  const bytes = new Uint8Array(24);
  window.crypto.getRandomValues(bytes);

  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

/** The session token, made the first time it is needed, and only when the visitor may be described. */
function token(create: boolean): string | null {
  try {
    const existing = window.localStorage.getItem(TOKEN_KEY);
    if (isSessionToken(existing)) return existing;
    // Something that is not a token this code made (an old site's value, say) is not used, and is replaced when a new one is needed.
    if (!create) return null;

    const fresh = randomToken();
    window.localStorage.setItem(TOKEN_KEY, fresh);

    return fresh;
  } catch {
    return null;
  }
}

/** The token for the order, so it can be matched to this checkout (null when there is none). */
export function currentSessionToken(): string | null {
  if (typeof window === "undefined") return null;

  return token(false);
}

function viewedProducts(): number[] {
  if (viewed !== null) return viewed;

  try {
    viewed = parseViewedIds(window.localStorage.getItem(VIEWED_KEY));
  } catch {
    viewed = [];
  }

  return viewed;
}

/** A product page was opened. Kept on this device (only where storing is allowed) and sent with an identified cart. */
export function noteViewed(productId: number): void {
  if (typeof window === "undefined") return;

  viewed = pushViewed(viewedProducts(), productId);

  if (!mayStoreIdentified(optIn(), marketingAllowed())) return;

  try {
    window.localStorage.setItem(VIEWED_KEY, JSON.stringify(viewed));
  } catch {
    // Not remembered between visits; still sent with this one.
  }
}

function countedBefore(value: CheckoutStage): boolean {
  if (countedInMemory.has(value)) return true;
  if (optIn()) return false;

  try {
    return parseStringList(window.sessionStorage.getItem(COUNTED_KEY)).includes(value);
  } catch {
    return false;
  }
}

function rememberCounted(value: CheckoutStage): void {
  countedInMemory.add(value);
  if (optIn()) return;

  try {
    const done = parseStringList(window.sessionStorage.getItem(COUNTED_KEY));
    window.sessionStorage.setItem(COUNTED_KEY, JSON.stringify([...done, value]));
  } catch {
    // The in-memory set still prevents a repeat for this page load.
  }
}

function flush(): void {
  timer = null;
  if (typeof window === "undefined") return;

  const identified = isIdentified(contact);
  const allowed = marketingAllowed();
  const mayStore = mayStoreIdentified(optIn(), allowed);

  // Nothing to say about an empty cart that was never reported.
  if (items.length === 0 && !identified) return;
  if (items.length === 0 && token(false) === null) return;

  const payload = buildReport({
    stage,
    contact,
    items,
    viewed: viewedProducts(),
    token: identified && mayStore ? token(true) : null,
    optIn: optIn(),
    marketingAllowed: allowed,
    countOnceOnly: !countedBefore(stage) && items.length > 0,
    utm: allowed ? getStoredUtmParams() : undefined,
  });

  if (payload === null) return;
  if (payload.count_only) rememberCounted(payload.stage);

  void reportCheckoutSession(payload);
}

function schedule(): void {
  if (typeof window === "undefined") return;

  if (!listening) {
    listening = true;
    // A visitor leaving the page is exactly when the last report matters.
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden" && timer !== null) {
        clearTimeout(timer);
        flush();
      }
    });
  }

  if (timer !== null) clearTimeout(timer);
  timer = setTimeout(flush, DEBOUNCE_MS);
}

/** The cart changed (or was loaded). */
export function noteCart(next: typeof items): void {
  items = next;
  schedule();
}

/** The visitor reached a stage. Never goes backwards within a visit. */
export function noteStage(next: CheckoutStage): void {
  if (STAGE_RANK[next] > STAGE_RANK[stage]) {
    stage = next;
    schedule();
  }
}

/** The contact fields hold something (the checkout form calls this when a field is left). */
export function noteContact(next: Contact): void {
  contact = { ...contact, ...next };
  schedule();
}

/** An order was placed: the session ends, and the next cart starts a new one. */
export function endSession(): void {
  if (timer !== null) clearTimeout(timer);
  timer = null;
  items = [];
  stage = "cart";
  contact = {};
  countedInMemory.clear();

  try {
    window.localStorage.removeItem(TOKEN_KEY);
    window.sessionStorage.removeItem(COUNTED_KEY);
  } catch {
    // Nothing to clear.
  }
}
