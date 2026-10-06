"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useCart } from "@/context/CartContext";
import { useWishlist } from "@/context/WishlistContext";
import { useSiteSettings } from "@/context/SiteSettingsContext";
import SearchBar from "./SearchBar";
import Logo from "./Logo";
import { resolveTagline } from "@/lib/brand";
import { getCategories } from "@/lib/api";
import type { CategorySummary } from "@/lib/types";

const FALLBACK_NAV_LINKS = [
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
  const [categoriesOpen, setCategoriesOpen] = useState(false);
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
  const navRef = useRef<HTMLDivElement>(null);

  // Admin-controlled: a site-wide switch, plus a per-category "show in menu" flag. Hidden entirely
  // when nothing is left to list, so an empty menu never appears.
  const menuCategories =
    siteSettings?.show_categories_menu === false ? [] : categories.filter((category) => category.show_in_menu !== false);

  useEffect(() => {
    if (!categoriesOpen) return;

    function handlePointerDown(event: PointerEvent) {
      if (!navRef.current?.contains(event.target as Node)) setCategoriesOpen(false);
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setCategoriesOpen(false);
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [categoriesOpen]);

  const categoriesButton = menuCategories.length > 0 && (
    <button
      key="categories-menu"
      type="button"
      onClick={() => setCategoriesOpen((open) => !open)}
      aria-expanded={categoriesOpen}
      aria-controls="categories-menu-panel"
      className="flex items-center gap-1 whitespace-nowrap py-1 transition-colors hover:text-navy"
    >
      Categories
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        className={`h-3.5 w-3.5 transition-transform ${categoriesOpen ? "rotate-180" : ""}`}
      >
        <path d="m6 9 6 6 6-6" />
      </svg>
    </button>
  );

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

      <div ref={navRef}>
        <nav className="border-b border-t border-linen bg-ivory">
          <div className="mx-auto flex max-w-7xl items-center gap-6 overflow-x-auto px-4 py-2 text-body font-medium text-charcoal sm:px-6">
            {navLinks.map((link) => (
              <Fragment key={link.url}>
                {/* A plain <a>, not next/link: these URLs are admin-editable
                    (site-settings) rather than known at build time, and may be
                    relative paths or full external URLs. */}
                <a href={link.url} className="whitespace-nowrap py-1 transition-colors hover:text-navy">
                  {link.label}
                </a>
                {/* Right after Shop, so it is on screen on a phone rather than at the end of the scrolling row. */}
                {link.url === "/shop" && categoriesButton}
              </Fragment>
            ))}
            {/* No Shop link in the admin's menu: put it last instead. */}
            {!navLinks.some((link) => link.url === "/shop") && categoriesButton}
          </div>
        </nav>

        {/* Always rendered, merely hidden while closed, so the category links are in the static HTML
            that crawlers read -- not only after someone opens the menu. */}
        {menuCategories.length > 0 && (
          <div id="categories-menu-panel" hidden={!categoriesOpen} className="border-b border-linen bg-ivory">
            <ul className="mx-auto grid max-w-7xl grid-cols-2 gap-x-4 px-4 py-2 sm:grid-cols-3 sm:px-6 lg:grid-cols-4">
              {menuCategories.map((category) => (
                <li key={category.id}>
                  {/* Plain <a>: category pages are static files, so a real navigation. */}
                  <a
                    href={`/category/${category.slug}`}
                    className="flex min-h-11 items-center text-body text-charcoal transition-colors hover:text-navy"
                  >
                    {category.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </>
  );
}
