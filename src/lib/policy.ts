import { formatPrice } from "./format";
import type { DayRange, SiteSetting, StorePolicy } from "./types";

// What the store did before these became editable (free over ৳2,000, ৳80
// inside Dhaka, ৳130 outside, 1-3 / 3-5 days, 7-day returns). Used only until
// the real values arrive from the API, or when it can't be reached -- the
// backend ships the same numbers as its defaults, so the two always agree
// until an admin changes them.
export const DEFAULT_POLICY: StorePolicy = {
  free_delivery_threshold: 2000,
  delivery_fee_dhaka: 80,
  delivery_fee_outside_dhaka: 130,
  delivery_days_dhaka: { min: 1, max: 3 },
  delivery_days_outside_dhaka: { min: 3, max: 5 },
  return_window_days: 7,
};

export function resolvePolicy(siteSettings: SiteSetting | null | undefined): StorePolicy {
  return siteSettings?.policy ?? DEFAULT_POLICY;
}

// "1–3" or just "2" when both ends match.
export function formatDays(range: DayRange): string {
  return range.min === range.max ? String(range.min) : `${range.min}–${range.max}`;
}

// Mirrors the backend DeliveryFeeCalculator so the checkout summary can show a
// live estimate; the server always recomputes the fee it actually charges.
export function estimateDeliveryFee(policy: StorePolicy, division: string, subtotal: number): number {
  if (division !== "Dhaka") return policy.delivery_fee_outside_dhaka;
  return subtotal > policy.free_delivery_threshold ? 0 : policy.delivery_fee_dhaka;
}

export function freeDeliveryText(policy: StorePolicy): string {
  return `Free delivery inside Dhaka on orders over ${formatPrice(policy.free_delivery_threshold)}`;
}

export function deliveryTimeText(policy: StorePolicy): string {
  return `${formatDays(policy.delivery_days_dhaka)} days in Dhaka, ${formatDays(policy.delivery_days_outside_dhaka)} outside`;
}

export function returnWindowText(policy: StorePolicy): string {
  return policy.return_window_days > 0
    ? `${policy.return_window_days}-day return window`
    : "Please see our returns policy";
}
