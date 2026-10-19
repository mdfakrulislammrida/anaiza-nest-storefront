"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSiteSettings } from "@/context/SiteSettingsContext";
import { isCheckoutPath } from "@/lib/checkout";
import Logo from "./Logo";

// The checkout has its own, much smaller frame: no promo bar, no menu, no search, no cart drawer, no big footer. Anything
// that could take the visitor away from paying is left out. The root layout draws the full frame everywhere else.

/** Draws its children everywhere except on the checkout page. */
export function HideOnCheckout({ children }: { children: ReactNode }) {
  return isCheckoutPath(usePathname()) ? null : <>{children}</>;
}

/** Draws its children on the checkout page only. */
export function OnlyOnCheckout({ children }: { children: ReactNode }) {
  return isCheckoutPath(usePathname()) ? <>{children}</> : null;
}

// Logo, the way back to the cart, and a reminder that this is the secure part. Not sticky: nothing is fixed to the top.
export function CheckoutHeader() {
  const { siteSettings } = useSiteSettings();
  const siteName = siteSettings?.site_name ?? "Anaiza Nest";

  return (
    <header className="border-b border-linen bg-ivory">
      <div className="mx-auto flex min-h-14 max-w-6xl items-center justify-between gap-2 px-4 sm:px-6">
        <Link href="/cart" className="-ml-2 flex min-h-11 shrink-0 items-center gap-1 px-2 text-body text-stone hover:text-navy">
          <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-4 w-4">
            <path d="m15 6-6 6 6 6" />
          </svg>
          Cart
        </Link>
        <Link href="/" aria-label={`${siteName} home`} className="flex min-w-0 shrink justify-center">
          <Logo variant="navy" />
        </Link>
        <p className="flex shrink-0 items-center gap-1 text-caption text-stone">
          <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-4 w-4 text-navy">
            <path d="M6 11V8a6 6 0 1 1 12 0v3M5 11h14v10H5z" />
          </svg>
          Secure checkout
        </p>
      </div>
    </header>
  );
}

// A few plain links and the name. On a phone it leaves room for the bar fixed to the bottom of the screen.
export function CheckoutFooter() {
  const { siteSettings } = useSiteSettings();
  const siteName = siteSettings?.site_name ?? "Anaiza Nest";

  return (
    <footer className="border-t border-linen bg-ivory pb-[calc(4.5rem+env(safe-area-inset-bottom))] sm:pb-0">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-6 px-4 py-4 text-caption text-stone sm:px-6">
        <span>{siteName}</span>
        <Link href="/pages/terms" className="flex min-h-11 items-center underline hover:text-navy">
          Terms
        </Link>
        <Link href="/pages/returns" className="flex min-h-11 items-center underline hover:text-navy">
          Return policy
        </Link>
        <Link href="/contact" className="flex min-h-11 items-center underline hover:text-navy">
          Contact us
        </Link>
      </div>
    </footer>
  );
}
