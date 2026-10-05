import { CURRENCY_SYMBOL } from "./config";

export function formatPrice(amount: number): string {
  // Whole takas with a thousands comma and no decimals: ৳1,450.
  return `${CURRENCY_SYMBOL}${Math.round(amount).toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}
