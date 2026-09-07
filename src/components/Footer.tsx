import Link from "next/link";
import NewsletterForm from "./NewsletterForm";
import type { Page, SiteSetting } from "@/lib/types";

const SOCIAL_LINKS: { key: keyof SiteSetting; label: string }[] = [
  { key: "facebook_url", label: "Facebook" },
  { key: "instagram_url", label: "Instagram" },
  { key: "youtube_url", label: "YouTube" },
  { key: "tiktok_url", label: "TikTok" },
];

export default function Footer({
  siteSettings,
  pages,
}: {
  siteSettings: SiteSetting | null;
  pages: Page[];
}) {
  const siteName = siteSettings?.site_name ?? "Anaiza";
  const socials = SOCIAL_LINKS.filter((social) => siteSettings?.[social.key]);

  return (
    <footer className="mt-24 border-t border-ink/10 bg-ink text-ivory">
      <div className="mx-auto grid max-w-6xl gap-10 px-6 py-14 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <p className="font-serif text-xl tracking-wide">{siteName}</p>
          <p className="mt-3 max-w-xs text-sm leading-relaxed text-ivory/70">
            Considered pieces, quietly made. Shop the current collection or
            learn about our approach.
          </p>

          {(siteSettings?.contact_phone || siteSettings?.contact_email) && (
            <div className="mt-4 space-y-1 text-sm text-ivory/70">
              {siteSettings?.contact_phone && <p>{siteSettings.contact_phone}</p>}
              {siteSettings?.contact_email && <p>{siteSettings.contact_email}</p>}
            </div>
          )}

          {socials.length > 0 && (
            <div className="mt-4 flex gap-4 text-xs font-semibold uppercase tracking-widest text-ivory/70">
              {socials.map((social) => (
                <a
                  key={social.key}
                  href={siteSettings?.[social.key] ?? undefined}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="transition-colors hover:text-gold"
                >
                  {social.label}
                </a>
              ))}
            </div>
          )}
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-gold">
            Shop
          </p>
          <ul className="mt-4 space-y-2 text-sm text-ivory/80">
            <li>
              <Link href="/shop" className="transition-colors hover:text-gold">
                All products
              </Link>
            </li>
            <li>
              <Link href="/cart" className="transition-colors hover:text-gold">
                Your cart
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-gold">
            Studio
          </p>
          <ul className="mt-4 space-y-2 text-sm text-ivory/80">
            <li>
              <Link href="/about" className="transition-colors hover:text-gold">
                About {siteName}
              </Link>
            </li>
            <li>
              <Link href="/faq" className="transition-colors hover:text-gold">
                FAQ
              </Link>
            </li>
            {pages.map((page) => (
              <li key={page.id}>
                <Link
                  href={`/pages/${page.slug}`}
                  className="transition-colors hover:text-gold"
                >
                  {page.title}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-gold">
            Stay in touch
          </p>
          <p className="mt-4 max-w-xs text-sm text-ivory/70">
            New arrivals and studio notes, occasionally.
          </p>
          <NewsletterForm />
        </div>
      </div>

      <div className="border-t border-ivory/10 px-6 py-6 text-center text-xs text-ivory/50">
        © {new Date().getFullYear()} {siteName}. All rights reserved.
      </div>
    </footer>
  );
}
