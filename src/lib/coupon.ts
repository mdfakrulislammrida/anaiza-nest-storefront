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

export function readCouponCode(): string | null {
  try {
    return window.sessionStorage.getItem(KEY) || window.localStorage.getItem(KEY) || null;
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
