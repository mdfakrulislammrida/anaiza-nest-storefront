"use client";

import { useSiteSettings } from "@/context/SiteSettingsContext";
import { paymentStateMessage } from "@/lib/payment";

// Where a wallet payment stands, in plain words. Nothing is shown for cash on delivery. When we could
// not match a payment, the phone and WhatsApp links are right there.
export default function PaymentStateNotice({ status }: { status: string | null | undefined }) {
  const { siteSettings } = useSiteSettings();
  const message = paymentStateMessage(status);
  if (!message) return null;

  const failed = status === "failed";
  const phone = siteSettings?.contact_phone ?? null;

  return (
    <div
      role="status"
      className={`rounded-btn border p-4 text-body ${
        failed ? "border-burgundy/30 bg-linen text-burgundy" : "border-linen bg-linen text-charcoal"
      }`}
    >
      <p className="font-medium">{message}</p>
      {failed && phone && (
        <p className="mt-2 text-charcoal">
          Call{" "}
          <a href={`tel:${phone.replace(/\s+/g, "")}`} className="font-medium underline">
            {phone}
          </a>{" "}
          or{" "}
          <a
            href={`https://wa.me/${phone.replace(/[^\d]/g, "")}`}
            target="_blank"
            rel="noreferrer noopener"
            className="font-medium underline"
          >
            message us on WhatsApp
          </a>
          , and mention your order number.
        </p>
      )}
    </div>
  );
}
