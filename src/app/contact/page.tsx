import type { Metadata } from "next";
import ContactForm from "@/components/ContactForm";
import { getSiteSettings } from "@/lib/api";
import type { SiteSetting } from "@/lib/types";

export const metadata: Metadata = {
  alternates: { canonical: "/contact" },
  title: "Contact us",
  description: "Get in touch with Anaiza Nest about an order, a gift or a corporate quotation.",
};

export default async function ContactPage() {
  const siteSettings: SiteSetting | null = await getSiteSettings().catch(() => null);

  return (
    <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6">
      <h1 className="font-serif text-charcoal text-h1">Get in touch</h1>
      <p className="mt-2 max-w-lg text-body text-stone">
        Questions about an order or a gift, or a corporate quotation? Send us a message and we will help.
      </p>

      <div className="mt-10 flex flex-col gap-10 lg:flex-row">
        <div className="flex-1">
          <ContactForm />
        </div>

        <aside className="space-y-6 lg:w-64">
          <div>
            <p className="text-caption font-medium text-stone">Phone</p>
            <p className="mt-1 text-body text-charcoal">{siteSettings?.contact_phone ?? "+880 1886-004421"}</p>
          </div>
          <div>
            <p className="text-caption font-medium text-stone">WhatsApp</p>
            <a
              href={`https://wa.me/${(siteSettings?.contact_phone ?? "+8801886004421").replace(/[^\d]/g, "")}`}
              target="_blank"
              rel="noreferrer noopener"
              className="mt-1 inline-block text-body text-navy hover:underline"
            >
              Message us on WhatsApp
            </a>
          </div>
          <div>
            <p className="text-caption font-medium text-stone">Email</p>
            <p className="mt-1 text-body text-charcoal">{siteSettings?.contact_email ?? "hello@anaizanest.com"}</p>
          </div>
          <div>
            <p className="text-caption font-medium text-stone">Address</p>
            <p className="mt-1 text-body text-charcoal">{siteSettings?.address ?? "Dhaka, Bangladesh"}</p>
          </div>
        </aside>
      </div>
    </div>
  );
}
