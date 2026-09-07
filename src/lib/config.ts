export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8787/api";

// The Laravel API accepts a client-supplied delivery_fee on order creation
// (routes/api.php -> OrderController::store / StoreOrderRequest). There is no
// server-side shipping calculation, so the storefront owns this rule.
export const FLAT_DELIVERY_FEE = 60;

export const CURRENCY_SYMBOL = "৳"; // Bangladeshi Taka sign
