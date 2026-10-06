"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useCart } from "@/context/CartContext";
import { useWishlist } from "@/context/WishlistContext";
import { useSiteSettings } from "@/context/SiteSettingsContext";
import SearchBar from "./SearchBar";
import Logo from "./Logo";
import MainNav, { type MenuItem } from "./MainNav";
import { resolveTagline } from "@/lib/brand";
import { getCategories } from "@/lib/api";
import type { CategorySummary, NavLink } from "@/lib/types";

const FALLBACK_NAV_LINKS: NavLink[] = [
  { label: "Home", url: "/" },
  { label: "Shop", url: "/shop" },
  { label: "Special prices", url: "/hot-deals" },
  { label: "Gift finder", url: "/gift-finder" },
  { label: "Contact", url: "/contact" },
];

const ICON_BUTTON_CLASS =
  "flex h-11 w-11 items-center justify-center rounded-full text-navy transition-colors hover:bg-linen";

export default function Header({ categories: initialCategories = [] }: { categories?: CategorySummary[] }) {
  const { itemCount, openDrawer } = useCart();
  const { items: wishlistItems } = useWishlist();
  const { siteSettings } = useSiteSettings();
  const siteName = siteSettings?.site_name ?? "Anaiza Nest";
  const tagline = resolveTagline(siteSettings);
  const navLinks = siteSettings?.nav_links?.length ? siteSettings.nav_links : FALLBACK_NAV_LINKS;
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  // Seeded from the categories known at build time, so the menu is in the static HTML; then
  // refreshed once from the API so hiding, reordering or adding a category in the admin shows up
  // without a rebuild. (A category added since the build opens through the /category fallback
  // shell.) A failed refresh keeps what is already shown. The nav links themselves follow the
  // same rule through SiteSettingsProvider, which refetches site settings on load.
  const [categories, setCategories] = useState(initialCategories);

  useEffect(() => {
    let cancelled = false;

    getCategories()
      .then((fresh) => {
        if (!cancelled) setCategories(fresh);
      })
      .catch(() => {
        // Keep the build-time list.
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // Admin-controlled: a site-wide switch, plus a per-category "show in menu" flag. Hidden entirely
  // when nothing is left to list, so an empty menu never appears.
  const menuCategories =
    siteSettings?.show_categories_menu === false ? [] : categories.filter((category) => category.show_in_menu !== false);

  // The menu as one list: the admin's items (each with its sub-items), plus the built-in Categories dropdown right
  // after Shop -- unless "Auto-list all categories under Shop" is on, which puts them under Shop itself.
  const items: MenuItem[] = navLinks.map((link) => ({
    label: link.label,
    url: link.url,
    children: link.children?.map((child) => ({ label: child.label, url: child.url })),
  }));
  if (menuCategories.length > 0 && !siteSettings?.nav_auto_categories) {
    const categoriesItem: MenuItem = {
      label: "Categories",
      children: menuCategories.map((category) => ({ label: category.name, url: `/category/${category.slug}` })),
    };
    const shopIndex = items.findIndex((item) => item.url === "/shop");
    // No Shop link in the admin's menu: put it last instead.
    items.splice(shopIndex >= 0 ? shopIndex + 1 : items.length, 0, categoriesItem);
  }

  return (
    <>
      {/* <header> and <nav> are top-level siblings here (not nested) so that
          only the logo/search/icon bar is sticky -- its containing block is
          the full page, so it stays pinned for the whole scroll, while the
          category nav below is a plain sibling that scrolls away normally
          instead of permanently eating vertical space on a short mobile
          viewport. */}
      <header className="sticky top-0 z-40 border-b border-linen bg-ivory/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center gap-2 px-4 py-4 sm:gap-4 sm:py-4 sm:px-6">
          {/* Clear space around the logo is the header's own padding on top, bottom and left, plus
              the right margin here; the tagline sits under it on desktop only. */}
          <Link href="/" className="mr-4 flex shrink-0 flex-col justify-center" aria-label={`${siteName} home`}>
            <Logo variant="navy" />
            {tagline && <span className="mt-1 hidden text-caption text-stone sm:block">{tagline}</span>}
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
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-5 w-5">
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-5 w-5">
                  <circle cx="11" cy="11" r="7" />
                  <path d="m21 21-4.3-4.3" />
                </svg>
              )}
            </button>
            <Link href="/account" aria-label="Account" className={ICON_BUTTON_CLASS}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-4 w-4">
                <circle cx="12" cy="8" r="4" />
                <path d="M4 20c1.5-4 5-6 8-6s6.5 2 8 6" />
              </svg>
            </Link>
            <Link
              href="/wishlist"
              aria-label={`Wishlist, ${wishlistItems.length} item${wishlistItems.length === 1 ? "" : "s"}`}
              className={`relative ${ICON_BUTTON_CLASS}`}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-4 w-4">
                <path d="M12 21s-7.5-4.6-10-9.3C.5 8.4 2.4 5 6 5c2 0 3.5 1 6 3 2.5-2 4-3 6-3 3.6 0 5.5 3.4 4 6.7-2.5 4.7-10 9.3-10 9.3Z" />
              </svg>
              {wishlistItems.length > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-navy text-[10px] font-semibold text-ivory">
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
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-4 w-4">
                <path d="M3 3h2l2.4 12.4a2 2 0 0 0 2 1.6h8.2a2 2 0 0 0 2-1.6L21 8H6" />
                <circle cx="9" cy="21" r="1" />
                <circle cx="18" cy="21" r="1" />
              </svg>
              {itemCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-navy text-[10px] font-semibold text-ivory">
                  {itemCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {mobileSearchOpen && (
          <div className="border-t border-linen px-4 py-4 sm:hidden">
            <SearchBar autoFocus onSubmitted={() => setMobileSearchOpen(false)} />
          </div>
        )}
      </header>

      <MainNav items={items} />
    </>
  );
}
