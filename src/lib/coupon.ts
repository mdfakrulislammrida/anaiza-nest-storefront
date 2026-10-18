// The coupon a visitor has applied. Only the code is kept in the browser; whether it works, and what it takes off, is
// decided by the server every time (when it is shown, and again when the order is placed).

const KEY = "anaiza-coupon";
const RECOVERY_KEY = "anaiza-recovery";

export interface AppliedCoupon {
  code: string;
  value_label: string;
  discount: number;
  valid_until_text: string | null;
}

/** A coupon code as the shop writes them: letters, digits, dash and underscore, up to 64. Anything else is not one. */
export function cleanCouponCode(value: unknown): string | null {
  if (typeof value !== "string") return null;

  const code = value.trim();
  return /^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/.test(code) ? code : null;
}

export function readCouponCode(): string | null {
  try {
    const code = cleanCouponCode(window.sessionStorage.getItem(KEY)) ?? cleanCouponCode(window.localStorage.getItem(KEY));

    // A value that is not a code (from an older version or another site) is forgotten, not carried.
    if (code === null && (window.sessionStorage.getItem(KEY) || window.localStorage.getItem(KEY))) clearCouponCode();

    return code;
  } catch {
    return null;
  }
}

export function saveCouponCode(code: string): void {
  try {
    window.localStorage.setItem(KEY, code);
  } catch {
    // Storage unavailable: the code simply is not remembered between pages.
  }
}

export function clearCouponCode(): void {
  try {
    window.localStorage.removeItem(KEY);
    window.sessionStorage.removeItem(KEY);
  } catch {
    // Nothing to clear.
  }
}

/** The token from a reminder's link, kept for the visit so the order can say where it came from. */
export function saveRecoveryToken(token: string): void {
  try {
    window.sessionStorage.setItem(RECOVERY_KEY, token);
  } catch {
    // Not remembered; the order simply has no recovery source.
  }
}

export function readRecoveryToken(): string | null {
  try {
    return window.sessionStorage.getItem(RECOVERY_KEY);
  } catch {
    return null;
  }
}

export function clearRecoveryToken(): void {
  try {
    window.sessionStorage.removeItem(RECOVERY_KEY);
  } catch {
    // Nothing to clear.
  }
}
