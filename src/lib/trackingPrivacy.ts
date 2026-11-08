// What must never reach an analytics or ad platform, decided in one place and kept free of the browser so it can be tested.

// Pages whose address is a key or a receipt: the query string and the hash say who the visitor is or open something for them.
const SENSITIVE_PATHS = ["/reset-password", "/recover", "/order-confirmation"];

// A query key that carries something personal or secret (matched inside the key's name, in any case: "reset_token", "Order_ID", "coupon_code").
const SENSITIVE_KEY_PARTS = ["token", "email", "phone", "key", "code", "reset", "order"];

// "/recover*" is a prefix on purpose (the recovery link is /recover/<token>); the others are written the same way, so a trailing slash or a sub-path is covered too.
function isSensitivePath(pathname: string): boolean {
  const path = pathname.toLowerCase();

  return SENSITIVE_PATHS.some((sensitive) => path.startsWith(sensitive));
}

function hasSensitiveKey(search: string): boolean {
  for (const key of new URLSearchParams(search).keys()) {
    const name = key.toLowerCase();

    if (SENSITIVE_KEY_PARTS.some((part) => name.includes(part))) return true;
  }

  return false;
}

/**
 * The address of a page (or of the page a visitor came from) as it may be pushed to the data layer. For the password-reset, cart-recovery and
 * order-confirmation pages, and for any address whose query has a key like token, email, phone, key, code, reset or order, the query string and the hash
 * are removed: only the page itself is kept, so a reset token never reaches GA4 or Meta. Every other address is returned exactly as it was, so UTM
 * tags and click ids still reach analytics.
 */
export function trackedUrl(href: string | null | undefined): string {
  const text = href ?? "";
  if (text === "") return "";

  let url: URL;

  try {
    url = new URL(text, "https://placeholder.invalid");
  } catch {
    return text;
  }

  if (!isSensitivePath(url.pathname) && !hasSensitiveKey(url.search)) return text;

  // Keep the address's own shape: an absolute one stays absolute, a relative one stays a path.
  return /^[a-z][a-z0-9+.-]*:\/\//i.test(text) ? `${url.origin}${url.pathname}` : url.pathname;
}

/**
 * Whether a search term may be sent as the event's search_term / Meta's search_string. A term that looks like an email address (it has an @) or a phone or
 * other number (eight or more digits once spaces and dashes are taken out) may be someone's own detail typed in the wrong box: it is never tracked. The
 * search itself is not affected; only the tracking value is skipped.
 */
export function isTrackableSearch(term: string | null | undefined): boolean {
  const clean = (term ?? "").trim();

  if (clean === "" || clean.includes("@")) return false;

  return !/\d{8,}/.test(clean.replace(/[\s-]/g, ""));
}
