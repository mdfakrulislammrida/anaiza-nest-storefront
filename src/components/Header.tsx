"use client";

import Link from "next/link";
import { useCart } from "@/context/CartContext";

const NAV_LINKS = [
  { href: "/shop", label: "Shop" },
  { href: "/about", label: "About" },
];

export default function Header() {
  const { itemCount } = useCart();

  return (
    <header className="sticky top-0 z-40 border-b border-ink/10 bg-ivory/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <Link
          href="/"
          className="font-serif text-2xl tracking-wide text-ink"
          aria-label="Anaiza home"
        >
          Anaiza
        </Link>

        <nav className="hidden items-center gap-8 text-sm font-medium tracking-wide text-ink/80 sm:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="transition-colors hover:text-gold"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-4 sm:gap-6">
          <nav className="flex items-center gap-4 text-sm font-medium tracking-wide text-ink/80 sm:hidden">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="transition-colors hover:text-gold"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <Link
            href="/cart"
            className="relative flex items-center gap-2 text-sm font-medium tracking-wide text-ink transition-colors hover:text-gold"
            aria-label={`Cart, ${itemCount} item${itemCount === 1 ? "" : "s"}`}
          >
            <span className="hidden sm:inline">Cart</span>
            <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-burgundy px-1.5 text-xs font-semibold text-ivory">
              {itemCount}
            </span>
          </Link>
        </div>
      </div>
    </header>
  );
}
