"use client";

import Link from "next/link";
import { useCart } from "@/context/CartContext";
import { useWishlist } from "@/context/WishlistContext";
import SearchBar from "./SearchBar";
import ThemeToggle from "./ThemeToggle";
import type { SiteSetting } from "@/lib/types";

const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/shop", label: "Shop" },
  { href: "/hot-deals", label: "Hot Deals" },
  { href: "/gift-finder", label: "Gift Finder" },
  { href: "/contact", label: "Contact" },
];

export default function Header({ siteSettings }: { siteSettings: SiteSetting | null }) {
  const { itemCount, openDrawer } = useCart();
  const { items: wishlistItems } = useWishlist();
  const siteName = siteSettings?.site_name ?? "Anaiza Nest";

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-ivory/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-4 sm:px-6">
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

        <SearchBar />

        <div className="ml-auto flex items-center gap-1 sm:gap-2">
          <ThemeToggle />
          <Link
            href="/account"
            aria-label="Account"
            className="flex h-9 w-9 items-center justify-center rounded-full text-ink transition-colors hover:bg-pill"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-4 w-4">
              <circle cx="12" cy="8" r="4" />
              <path d="M4 20c1.5-4 5-6 8-6s6.5 2 8 6" />
            </svg>
          </Link>
          <Link
            href="/wishlist"
            aria-label={`Wishlist, ${wishlistItems.length} item${wishlistItems.length === 1 ? "" : "s"}`}
            className="relative flex h-9 w-9 items-center justify-center rounded-full text-ink transition-colors hover:bg-pill"
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
            className="relative flex h-9 w-9 items-center justify-center rounded-full text-ink transition-colors hover:bg-pill"
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

      <nav className="border-t border-line">
        <div className="mx-auto flex max-w-7xl items-center gap-6 overflow-x-auto px-4 py-2.5 text-sm font-medium text-ink sm:px-6">
          {NAV_LINKS.map((link) => (
            <Link key={link.href} href={link.href} className="whitespace-nowrap transition-colors hover:text-navy">
              {link.label}
            </Link>
          ))}
        </div>
      </nav>
    </header>
  );
}
