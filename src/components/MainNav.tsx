"use client";

import { useEffect, useRef, useState } from "react";
import { useSiteSettings } from "@/context/SiteSettingsContext";

// One menu entry. A top-level entry may have one level of children. An entry with no url is only a heading
// for its children (the built-in Categories dropdown).
export interface MenuItem {
  label: string;
  url?: string;
  children?: { label: string; url: string }[];
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      aria-hidden="true"
      className={`h-3.5 w-3.5 shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

// The main menu. On a desktop it is a row with a dropdown under any entry that has children (opens on
// hover, on focus and on tap or click). On a phone it is a "Menu" bar that opens an accordion with rows at
// least 44px tall. Every link is in the server-rendered HTML (the desktop list is always in the markup, the
// phone accordion is added when opened), and the items follow the site settings, which refresh once on load.
export default function MainNav({ items }: { items: MenuItem[] }) {
  const [openDesktop, setOpenDesktop] = useState<number | null>(null);
  const desktopRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    if (openDesktop === null) return;

    function onPointerDown(event: PointerEvent) {
      if (!desktopRef.current?.contains(event.target as Node)) setOpenDesktop(null);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpenDesktop(null);
    }

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [openDesktop]);

  return (
    <>
      {/* Desktop and tablet */}
      <nav aria-label="Main" className="hidden border-b border-t border-linen bg-ivory md:block">
        <ul
          ref={desktopRef}
          className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-6 px-4 py-1 text-body font-medium text-charcoal sm:px-6"
        >
          {items.map((item, index) => {
            const children = item.children ?? [];

            if (children.length === 0) {
              return (
                <li key={`${item.label}-${index}`}>
                  {/* A plain <a>, not next/link: these URLs are admin-editable (site settings) rather than
                      known at build time, and may be relative paths or full external URLs. */}
                  <a href={item.url} className="flex min-h-9 items-center whitespace-nowrap transition-colors hover:text-navy">
                    {item.label}
                  </a>
                </li>
              );
            }

            const open = openDesktop === index;

            return (
              <li key={`${item.label}-${index}`} className="group relative">
                <div className="flex items-center gap-1">
                  {item.url ? (
                    <a href={item.url} className="flex min-h-9 items-center whitespace-nowrap transition-colors hover:text-navy">
                      {item.label}
                    </a>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setOpenDesktop(open ? null : index)}
                      aria-expanded={open}
                      className="flex min-h-9 items-center whitespace-nowrap transition-colors hover:text-navy"
                    >
                      {item.label}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setOpenDesktop(open ? null : index)}
                    aria-expanded={open}
                    aria-label={`${open ? "Hide" : "Show"} ${item.label} links`}
                    className="flex h-9 w-6 items-center justify-center transition-colors hover:text-navy"
                  >
                    <Chevron open={open} />
                  </button>
                </div>
                {/* Always in the markup (just not displayed), so crawlers read these links too. */}
                <div
                  className={`absolute left-0 top-full z-40 pt-1 group-focus-within:block group-hover:block ${open ? "block" : "hidden"}`}
                >
                  <ul className="min-w-48 rounded-btn border border-linen bg-ivory py-1">
                    {children.map((child) => (
                      <li key={child.url}>
                        <a
                          href={child.url}
                          className="flex min-h-11 items-center whitespace-nowrap px-4 text-body font-normal text-charcoal transition-colors hover:bg-linen hover:text-navy"
                        >
                          {child.label}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              </li>
            );
          })}
        </ul>
      </nav>

    </>
  );
}

// The phone menu: an accordion with rows at least 44px tall that opens under the header (the header's Menu button asks
// for it through the "anaiza:menu" event). It sits inside the sticky header, so it is where the visitor is looking
// wherever the page is scrolled to. Every link is in the HTML once it is opened; the desktop list above is always in it.
export function PhoneMenu({ items }: { items: MenuItem[] }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [expanded, setExpanded] = useState<number | null>(null);
  const phone = useSiteSettings().siteSettings?.contact_phone;

  useEffect(() => {
    function toggle() {
      setMenuOpen((open) => !open);
    }
    window.addEventListener("anaiza:menu", toggle);
    return () => window.removeEventListener("anaiza:menu", toggle);
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setMenuOpen(false);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [menuOpen]);

  if (!menuOpen) return null;

  return (
    <nav id="mobile-menu" aria-label="Main menu" className="absolute inset-x-0 top-full max-h-[calc(100dvh-3.5rem)] overflow-y-auto border-b border-t border-linen bg-ivory md:hidden">
      <ul className="divide-y divide-linen">
        {items.map((item, index) => {
          const children = item.children ?? [];
          const isExpanded = expanded === index;

          return (
            <li key={`${item.label}-${index}`}>
              <div className="flex items-stretch">
                {item.url ? (
                  <a href={item.url} className="flex min-h-11 flex-1 items-center px-4 text-body font-medium text-charcoal">
                    {item.label}
                  </a>
                ) : (
                  <button
                    type="button"
                    onClick={() => setExpanded(isExpanded ? null : index)}
                    aria-expanded={isExpanded}
                    className="flex min-h-11 flex-1 items-center px-4 text-left text-body font-medium text-charcoal"
                  >
                    {item.label}
                  </button>
                )}
                {children.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setExpanded(isExpanded ? null : index)}
                    aria-expanded={isExpanded}
                    aria-label={`${isExpanded ? "Hide" : "Show"} ${item.label} links`}
                    className="flex min-h-11 w-12 items-center justify-center border-l border-linen text-charcoal"
                  >
                    <Chevron open={isExpanded} />
                  </button>
                )}
              </div>
              {children.length > 0 && isExpanded && (
                <ul className="bg-linen/50">
                  {children.map((child) => (
                    <li key={child.url}>
                      <a href={child.url} className="flex min-h-11 items-center pl-8 pr-4 text-body text-charcoal">
                        {child.label}
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          );
        })}
      </ul>
      {/* What the header and the promo bar show from 768 px, on a phone: the account, the wishlist, order tracking and a call. */}
      <ul className="divide-y divide-linen border-t border-linen">
        <li>
          <a href="/account" className="flex min-h-11 items-center px-4 text-body font-medium text-charcoal">
            Account
          </a>
        </li>
        <li>
          <a href="/wishlist" className="flex min-h-11 items-center px-4 text-body font-medium text-charcoal">
            Wishlist
          </a>
        </li>
        <li>
          <a href="/track-order" className="flex min-h-11 items-center px-4 text-body font-medium text-charcoal">
            Track order
          </a>
        </li>
        {phone && (
          <li>
            <a href={`tel:${phone.replace(/s+/g, "")}`} className="flex min-h-11 items-center px-4 text-body font-medium text-charcoal">
              Call {phone}
            </a>
          </li>
        )}
      </ul>
    </nav>
  );
}
