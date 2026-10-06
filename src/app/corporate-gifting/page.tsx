import type { Metadata } from "next";
import CorporateEnquiryForm from "@/components/CorporateEnquiryForm";
import CorporateIntro from "@/components/CorporateIntro";

export const metadata: Metadata = {
  alternates: { canonical: "/corporate-gifting" },
  title: "Corporate gifting",
  description: "Ask Anaiza Nest for a corporate quotation. Tell us the quantity and the date you need it by.",
};

export default function CorporateGiftingPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <h1 className="font-serif text-charcoal text-h1">Corporate gifting</h1>
      <CorporateIntro />

      <div className="relative mt-10">
        <CorporateEnquiryForm />
      </div>
    </div>
  );
}
