// The numbers and words of the checkout page that are decided in one place, so they can be tested without a browser.
// Nothing here makes up a figure: every amount comes from the shop's own settings.

/** Where the parcel goes, as the visitor chose it: null until they have chosen. */
export type DeliveryZone = "inside" | "outside" | null;

export interface DeliveryRules {
  free_delivery_threshold: number;
  delivery_fee_dhaka: number;
  delivery_fee_outside_dhaka: number;
}

export function isCheckoutPath(pathname: string | null | undefined): boolean {
  return pathname === "/checkout" || pathname === "/checkout/";
}

/**
 * The delivery charge the order summary shows, or null while no zone is chosen (a charge is never shown before that).
 * It follows the shop's own rule, which the server applies by division: Dhaka division pays the Dhaka fee (free over the
 * threshold), every other division the outside fee. Before a division is picked under "Outside Dhaka" it is the outside fee.
 */
export function deliveryChargeFor(rules: DeliveryRules, zone: DeliveryZone, division: string, subtotal: number): number | null {
  if (zone === null) return null;

  if (zone === "outside" && division === "") return rules.delivery_fee_outside_dhaka;

  const dhaka = zone === "inside" || division === "Dhaka";

  return dhaka ? (subtotal > rules.free_delivery_threshold ? 0 : rules.delivery_fee_dhaka) : rules.delivery_fee_outside_dhaka;
}

/**
 * The line that nudges towards free delivery. Only when the shop has a threshold (read from its settings, never assumed),
 * the parcel goes inside Dhaka, and the order is not over it yet: free delivery needs MORE than the threshold, so the
 * amount still to add is one taka more than the gap. Null otherwise.
 */
export function freeDeliveryRemaining(threshold: number | null | undefined, zone: DeliveryZone, subtotal: number): number | null {
  if (zone !== "inside" || typeof threshold !== "number" || !Number.isFinite(threshold) || threshold <= 0) return null;
  if (subtotal > threshold) return null;

  return threshold - subtotal + 1;
}

/** The total in words: with no zone chosen it is the order alone and says delivery is still to come. */
export function totalCaption(deliveryCharge: number | null): string | null {
  return deliveryCharge === null ? "+ delivery" : null;
}

/** "1 item", "3 items": the quantities added up, not the number of lines. */
export function itemsLabel(quantity: number): string {
  return `${quantity} ${quantity === 1 ? "item" : "items"}`;
}

/**
 * Whether begin_checkout is due. The cart is read from the browser after the first render, so "the page opened" and "there is
 * something to check out" are not the same moment: it waits for the cart, and fires once.
 */
export function beginCheckoutDue(state: { embedded: boolean; cartReady: boolean; itemCount: number; alreadyFired: boolean }): boolean {
  return !state.embedded && state.cartReady && state.itemCount > 0 && !state.alreadyFired;
}
