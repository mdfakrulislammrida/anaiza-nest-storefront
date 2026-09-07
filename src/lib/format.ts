import { CURRENCY_SYMBOL } from "./config";

export function formatPrice(amount: number): string {
  return `${CURRENCY_SYMBOL}${amount.toLocaleString("en-US")}`;
}
