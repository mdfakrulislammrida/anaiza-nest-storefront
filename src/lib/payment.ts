import type { PaymentMethod } from "./types";

// How a payment method is written for customers (the API stores the short code).
export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cod: "Cash on Delivery",
  bkash: "bKash",
  nagad: "Nagad",
  rocket: "Rocket",
};

export function paymentMethodLabel(method: string): string {
  return PAYMENT_METHOD_LABELS[method as PaymentMethod] ?? method;
}
