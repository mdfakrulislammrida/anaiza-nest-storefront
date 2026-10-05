"use client";

import Link from "next/link";
import { useSiteSettings } from "@/context/SiteSettingsContext";
import { freeDeliveryText, resolvePolicy } from "@/lib/policy";

export default function TopPromoBar() {
  const { siteSettings } = useSiteSettings();
  const phone = siteSettings?.contact_phone;
  const promoText = siteSettings?.promo_text ?? freeDeliveryText(resolvePolicy(siteSettings));

  return (
    <div className="bg-deepink text-ivory">
      {/* On phones this is two short rows -- the delivery promise on top, then the phone number and
          Track Order -- so the offer and a way to call are visible without opening anything. From
          sm up it is the single row it always was. "Login / Sign Up" stays desktop-only because the
          header already has an account icon. */}
      <div className="mx-auto flex max-w-7xl flex-col px-4 py-1 text-caption sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-6 sm:py-2">
        <p className="py-1 text-center sm:truncate sm:py-0 sm:text-left">{promoText}</p>
        <div className="flex shrink-0 items-center justify-between gap-4 sm:w-auto sm:justify-end">
          {phone && (
            <a href={`tel:${phone.replace(/\s+/g, "")}`} className="py-2 hover:underline sm:py-0">
              {phone}
            </a>
          )}
          <Link href="/track-order" className="py-2 hover:underline sm:py-1">
            Track order
          </Link>
          <Link href="/account" className="hidden py-1 hover:underline sm:inline">
            Log in / Sign up
          </Link>
        </div>
      </div>
    </div>
  );
}
