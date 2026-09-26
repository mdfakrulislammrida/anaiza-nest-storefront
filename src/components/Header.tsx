"use client";

import { useState } from "react";
import Link from "next/link";
import { useCart } from "@/context/CartContext";
import { useWishlist } from "@/context/WishlistContext";
import { useSiteSettings } from "@/context/SiteSettingsContext";
import SearchBar from "./SearchBar";
import ThemeToggle from "./ThemeToggle";

const FALLBACK_NAV_LINKS = [
  { label: "Home", url: "/" },
  { label: "Shop", url: "/shop" },
  { label: "Hot Deals", url: "/hot-deals" },
  { label: "Gift Finder", url: "/gift-finder" },
  { label: "Contact", url: "/contact" },
];

const ICON_BUTTON_CLASS =
  "flex h-11 w-11 items-center justify-center rounded-full text-ink transition-colors hover:bg-pill";

export default function Header() {
  const { itemCount, openDrawer } = useCart();
  const { items: wishlistItems } = useWishlist();
  const { siteSettings } = useSiteSettings();
  const siteName = siteSettings?.site_name ?? "Anaiza Nest";
  const navLinks = siteSettings?.nav_links?.length ? siteSettings.nav_links : FALLBACK_NAV_LINKS;
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);

  return (
    <>
      {/* <header> and <nav> are top-level siblings here (not nested) so that
          only the logo/search/icon bar is sticky -- its containing block is
          the full page, so it stays pinned for the whole scroll, while the
          category nav below is a plain sibling that scrolls away normally
          instead of permanently eating vertical space on a short mobile
          viewport. */}
      <header className="sticky top-0 z-40 border-b border-line bg-ivory/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center gap-2 px-4 py-3 sm:gap-4 sm:py-4 sm:px-6">
          <Link
            href="/"
            className="flex shrink-0 items-center gap-2 font-serif text-xl text-ink"
            aria-label={`${siteName} home`}
          >
            {siteSettings?.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element -- admin-supplied URL
              <img src={siteSettings.logo_url} alt={siteName} className="h-8 w-auto" />
            ) : (
              siteName
            )}
          </Link>

          <SearchBar className="hidden sm:block max-w-xl" />

          <div className="ml-auto flex items-center gap-0.5 sm:gap-2">
            <button
              type="button"
              onClick={() => setMobileSearchOpen((open) => !open)}
              aria-label={mobileSearchOpen ? "Close search" : "Search"}
              aria-expanded={mobileSearchOpen}
              className={`${ICON_BUTTON_CLASS} sm:hidden`}
            >
              {mobileSearchOpen ? (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-5 w-5">
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-5 w-5">
                  <circle cx="11" cy="11" r="7" />
                  <path d="m21 21-4.3-4.3" />
                </svg>
              )}
            </button>
            <ThemeToggle />
            <Link href="/account" aria-label="Account" className={ICON_BUTTON_CLASS}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-4 w-4">
                <circle cx="12" cy="8" r="4" />
                <path d="M4 20c1.5-4 5-6 8-6s6.5 2 8 6" />
              </svg>
            </Link>
            <Link
              href="/wishlist"
              aria-label={`Wishlist, ${wishlistItems.length} item${wishlistItems.length === 1 ? "" : "s"}`}
              className={`relative ${ICON_BUTTON_CLASS}`}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-4 w-4">
                <path d="M12 21s-7.5-4.6-10-9.3C.5 8.4 2.4 5 6 5c2 0 3.5 1 6 3 2.5-2 4-3 6-3 3.6 0 5.5 3.4 4 6.7-2.5 4.7-10 9.3-10 9.3Z" />
              </svg>
              {wishlistItems.length > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-navy text-[10px] font-semibold text-white">
                  {wishlistItems.length}
                </span>
              )}
            </Link>
            <button
              type="button"
              onClick={openDrawer}
              aria-label={`Cart, ${itemCount} item${itemCount === 1 ? "" : "s"}`}
              className={`relative ${ICON_BUTTON_CLASS}`}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-4 w-4">
                <path d="M3 3h2l2.4 12.4a2 2 0 0 0 2 1.6h8.2a2 2 0 0 0 2-1.6L21 8H6" />
                <circle cx="9" cy="21" r="1" />
                <circle cx="18" cy="21" r="1" />
              </svg>
              {itemCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-navy text-[10px] font-semibold text-white">
                  {itemCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {mobileSearchOpen && (
          <div className="border-t border-line px-4 py-3 sm:hidden">
            <SearchBar autoFocus onSubmitted={() => setMobileSearchOpen(false)} />
          </div>
        )}
      </header>

      <nav className="border-b border-t border-line bg-ivory">
        <div className="mx-auto flex max-w-7xl items-center gap-6 overflow-x-auto px-4 py-2.5 text-sm font-medium text-ink sm:px-6">
          {navLinks.map((link) => (
            // A plain <a>, not next/link: these URLs are admin-editable
            // (site-settings) rather than known at build time, and may be
            // relative paths or full external URLs.
            <a key={link.url} href={link.url} className="whitespace-nowrap py-1 transition-colors hover:text-navy">
              {link.label}
            </a>
          ))}
        </div>
      </nav>
    </>
  );
}
