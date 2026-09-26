"use client";

import { useSiteSettings } from "@/context/SiteSettingsContext";

const FALLBACK_ABOUT =
  "Bangladesh's #1 gift shop — handcrafted ceramic tea sets, porcelain collections, and premium gift boxes, delivered across Bangladesh with cash-on-delivery and mobile-wallet checkout.";

const FALLBACK_FOOTER_LINKS = [
  { label: "Track Order", url: "/track-order" },
  { label: "Shipping Policy", url: "/pages/shipping" },
  { label: "Returns & Refunds", url: "/pages/returns" },
  { label: "FAQs", url: "/faq" },
  { label: "Contact Us", url: "/contact" },
];

const FALLBACK_COPYRIGHT_TEXT = "All rights reserved.";

const PAYMENT_METHODS = ["bKash", "Nagad", "Rocket", "COD"];

// Feather-style stroke icons for the platforms customers actually use with
// this store; anything else (TikTok, Pinterest, WhatsApp, or a platform an
// admin free-types) falls back to a generic link glyph rather than guessing
// at an unfamiliar brand mark.
const SOCIAL_ICON_PATHS: Record<string, string> = {
  facebook: "M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z",
  twitter:
    "M23 3a10.9 10.9 0 0 1-3.14 1.53 4.48 4.48 0 0 0-7.86 3v1A10.66 10.66 0 0 1 3 4s-4 9 5 13a11.64 11.64 0 0 1-7 2c9 5 20 0 20-11.5a4.5 4.5 0 0 0-.08-.83A7.72 7.72 0 0 0 23 3z",
};

function SocialIcon({ platform }: { platform: string }) {
  if (platform === "instagram") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-4 w-4">
        <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
        <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
        <line x1="17.5" y1="6.5" x2="17.5" y2="6.5" />
      </svg>
    );
  }

  if (platform === "youtube") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-4 w-4">
        <path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33z" />
        <polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02" />
      </svg>
    );
  }

  if (platform === "linkedin") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-4 w-4">
        <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
        <rect x="2" y="9" width="4" height="12" />
        <circle cx="4" cy="4" r="2" />
      </svg>
    );
  }

  const path = SOCIAL_ICON_PATHS[platform];
  if (path) {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-4 w-4">
        <path d={path} />
      </svg>
    );
  }

  // Generic fallback for platforms without a dedicated icon above.
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-4 w-4">
      <path d="M10 14a3.5 3.5 0 0 0 5 0l3-3a3.5 3.5 0 0 0-5-5l-1.5 1.5" />
      <path d="M14 10a3.5 3.5 0 0 0-5 0l-3 3a3.5 3.5 0 0 0 5 5l1.5-1.5" />
    </svg>
  );
}

export default function Footer() {
  const { siteSettings } = useSiteSettings();
  const siteName = siteSettings?.site_name ?? "Anaiza Nest";
  const about = siteSettings?.footer_about ?? FALLBACK_ABOUT;
  const footerLinks = siteSettings?.footer_links?.length ? siteSettings.footer_links : FALLBACK_FOOTER_LINKS;
  const socialLinks = siteSettings?.social_links ?? [];
  const copyrightText = siteSettings?.footer_copyright_text ?? FALLBACK_COPYRIGHT_TEXT;

  return (
    <footer className="border-t border-line bg-cream text-ink">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:grid-cols-3 sm:px-6">
        <div>
          <p className="font-serif text-xl">{siteName}</p>
          <p className="mt-3 max-w-xs text-sm leading-relaxed text-muted">{about}</p>
          {socialLinks.length > 0 && (
            <div className="mt-4 flex gap-3">
              {socialLinks.map((social) => (
                <a
                  key={social.platform}
                  href={social.url}
                  target="_blank"
                  rel="noreferrer noopener"
                  aria-label={social.platform}
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-line text-ink transition-colors hover:border-navy hover:text-navy"
                >
                  <SocialIcon platform={social.platform} />
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
            {footerLinks.map((link) => (
              <li key={link.url}>
                {/* A plain <a>, not next/link: these URLs are admin-editable
                    (site-settings) rather than known at build time. */}
                <a href={link.url} className="transition-colors hover:text-navy">
                  {link.label}
                </a>
              </li>
            ))}
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
        © {new Date().getFullYear()} {siteName}. {copyrightText}
      </div>
    </footer>
  );
}
