import type { Metadata } from "next";
import ContactForm from "@/components/ContactForm";
import { getSiteSettings } from "@/lib/api";
import type { SiteSetting } from "@/lib/types";

export const metadata: Metadata = {
  title: "Contact Us",
  description: "Get in touch with Anaiza Nest about an order, a product, or bulk gifting.",
};

export default async function ContactPage() {
  const siteSettings: SiteSetting | null = await getSiteSettings().catch(() => null);

  return (
    <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6">
      <h1 className="font-serif text-3xl text-ink sm:text-4xl">Get in Touch</h1>
      <p className="mt-2 max-w-lg text-sm text-muted">
        Questions about an order, a product, or a bulk gifting request? We
        usually reply within a few hours.
      </p>

      <div className="mt-10 flex flex-col gap-10 lg:flex-row">
        <div className="flex-1">
          <ContactForm />
        </div>

        <aside className="space-y-6 lg:w-64">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-muted">Phone</p>
            <p className="mt-1 text-sm text-ink">{siteSettings?.contact_phone ?? "+880 1886-004421"}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-muted">WhatsApp</p>
            <a
              href="https://wa.me/8801886004421"
              target="_blank"
              rel="noreferrer noopener"
              className="mt-1 inline-block text-sm text-navy hover:underline"
            >
              Chat with us
            </a>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-muted">Email</p>
            <p className="mt-1 text-sm text-ink">{siteSettings?.contact_email ?? "hello@anaizanest.com"}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-muted">Address</p>
            <p className="mt-1 text-sm text-ink">{siteSettings?.address ?? "Dhaka, Bangladesh"}</p>
          </div>
        </aside>
      </div>
    </div>
  );
}
