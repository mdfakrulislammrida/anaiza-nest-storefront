"use client";

import Link from "next/link";
import { useSiteSettings } from "@/context/SiteSettingsContext";
import type { SiteSetting } from "@/lib/types";

// CMS pages (/pages/*) are served by a single static shell that reads the
// slug from the URL client-side, so those links need a real browser
// navigation rather than Next's client-side router -- hence plain <a>.
const CUSTOMER_CARE_LINKS = [
  { href: "/track-order", label: "Track Order", hardNav: false },
  { href: "/pages/shipping", label: "Shipping Policy", hardNav: true },
  { href: "/pages/returns", label: "Returns & Refunds", hardNav: true },
  { href: "/faq", label: "FAQs", hardNav: false },
  { href: "/contact", label: "Contact Us", hardNav: false },
];

const PAYMENT_METHODS = ["bKash", "Nagad", "Rocket", "COD"];

const SOCIAL_LINKS: { key: keyof SiteSetting }[] = [
  { key: "facebook_url" },
  { key: "instagram_url" },
  { key: "youtube_url" },
  { key: "tiktok_url" },
];

export default function Footer() {
  const { siteSettings } = useSiteSettings();
  const siteName = siteSettings?.site_name ?? "Anaiza Nest";
  const socials = SOCIAL_LINKS.filter((social) => siteSettings?.[social.key]);

  return (
    <footer className="border-t border-line bg-cream text-ink">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:grid-cols-3 sm:px-6">
        <div>
          <p className="font-serif text-xl">{siteName}</p>
          <p className="mt-3 max-w-xs text-sm leading-relaxed text-muted">
            Bangladesh&rsquo;s #1 gift shop — handcrafted ceramic tea sets, porcelain
            collections, and premium gift boxes, delivered across Bangladesh with
            cash-on-delivery and mobile-wallet checkout.
          </p>
          {socials.length > 0 && (
            <div className="mt-4 flex gap-3">
              {socials.map((social) => (
                <a
                  key={social.key}
                  href={siteSettings?.[social.key] ?? undefined}
                  target="_blank"
                  rel="noreferrer noopener"
                  aria-label="Social link"
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-line text-xs text-ink transition-colors hover:border-navy hover:text-navy"
                >
                  •
                </a>
              ))}
            </div>
          )}
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted">
            Customer Care
          </p>
          <ul className="mt-4 space-y-2 text-sm text-ink/80">
            {CUSTOMER_CARE_LINKS.map((link) =>
              link.hardNav ? (
                <li key={link.href}>
                  <a href={link.href} className="transition-colors hover:text-navy">
                    {link.label}
                  </a>
                </li>
              ) : (
                <li key={link.href}>
                  <Link href={link.href} className="transition-colors hover:text-navy">
                    {link.label}
                  </Link>
                </li>
              ),
            )}
          </ul>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted">
            Get in Touch
          </p>
          <div className="mt-4 space-y-1 text-sm text-ink/80">
            <p>{siteSettings?.address ?? "Dhaka, Bangladesh"}</p>
            {siteSettings?.contact_phone && <p>{siteSettings.contact_phone}</p>}
            {siteSettings?.contact_email && <p>{siteSettings.contact_email}</p>}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {PAYMENT_METHODS.map((method) => (
              <span
                key={method}
                className="rounded border border-line px-2.5 py-1 text-xs font-medium text-ink/70"
              >
                {method}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="border-t border-line px-4 py-6 text-center text-xs text-muted sm:px-6">
        © {new Date().getFullYear()} {siteName}. All rights reserved.
      </div>
    </footer>
  );
}
