import type { Metadata } from "next";
import ContactDetails from "@/components/ContactDetails";
import ContactForm from "@/components/ContactForm";

export const metadata: Metadata = {
  alternates: { canonical: "/contact" },
  title: "Contact us",
  description: "Get in touch with Anaiza Nest about an order, a gift or a corporate quotation.",
};

export default function ContactPage() {
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

        {/* Read live from Site Settings, so the phone and WhatsApp details never wait for a rebuild. */}
        <ContactDetails />
      </div>
    </div>
  );
}
