// What the rest of the storefront needs to know about the visitor's cookie choice. The state itself lives in
// window.anaizaConsent, created by the inline script in <head> (see consentBootstrap.ts), so there is one
// source of truth that exists before React does.

export interface ConsentChoice {
  a: boolean; // analytics
  m: boolean; // marketing
}

export interface AnaizaConsent {
  optIn: boolean;
  /** The tag IDs the page was built with (the Meta pixel's, here, for advanced matching). */
  config?: { meta: string | null };
  /** The saved choice, or null if the visitor has not chosen yet. */
  get: () => ConsentChoice | null;
  /** What applies right now: the saved choice, or the default for the mode (everything in notice mode, nothing in opt-in). */
  effective: () => ConsentChoice;
  set: (analytics: boolean, marketing: boolean) => void;
}

declare global {
  interface Window {
    anaizaConsent?: AnaizaConsent;
  }
}

/** Whether marketing cookies, pixels and campaign attribution may be used. True when there is no consent script at all. */
export function marketingAllowed(): boolean {
  if (typeof window === "undefined") return false;
  return window.anaizaConsent ? window.anaizaConsent.effective().m : true;
}

/** Asks the banner to open (the footer's "Cookie settings" link). */
export function openCookieSettings(): void {
  window.dispatchEvent(new Event("anaiza:cookie-settings"));
}
