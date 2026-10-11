"use client";

import { useSiteSettings } from "@/context/SiteSettingsContext";
import { resolveWhatsApp, whatsappLink } from "@/lib/whatsapp";

// The contact page's details. Read from Site Settings (built into the page, then refreshed live), so a number or an address
// changed in the admin shows without a rebuild. Nothing about the phone or WhatsApp number lives in code.
export default function ContactDetails() {
  const { siteSettings } = useSiteSettings();
  const whatsapp = resolveWhatsApp(siteSettings);
  const whatsappHref = whatsappLink(whatsapp.number, whatsapp.message);

  return (
    <aside className="space-y-6 lg:w-64">
      {siteSettings?.contact_phone && (
        <div>
          <p className="text-caption font-medium text-stone">Phone</p>
          <p className="mt-1 text-body text-charcoal">{siteSettings.contact_phone}</p>
        </div>
      )}
      {whatsappHref && (
        <div>
          <p className="text-caption font-medium text-stone">WhatsApp</p>
          <a
            href={whatsappHref}
            target="_blank"
            rel="noreferrer noopener"
            className="mt-1 inline-block text-body text-navy hover:underline"
          >
            Message us on WhatsApp
          </a>
        </div>
      )}
      <div>
        <p className="text-caption font-medium text-stone">Email</p>
        <p className="mt-1 text-body text-charcoal">{siteSettings?.contact_email ?? "hello@anaizanest.com"}</p>
      </div>
      <div>
        <p className="text-caption font-medium text-stone">Address</p>
        <p className="mt-1 text-body text-charcoal">{siteSettings?.address ?? "Dhaka, Bangladesh"}</p>
      </div>
    </aside>
  );
}
