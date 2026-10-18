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
      {/* On phones this is one line, the delivery promise: the phone number, Track order and the account link are in
          the menu there (a second row cost 35 px of a small screen). From sm up it is the single row it always was. */}
      <div className="mx-auto flex max-w-7xl flex-col px-4 py-2 text-caption sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-6">
        <p className="text-center sm:truncate sm:text-left">{promoText}</p>
        <div className="hidden shrink-0 items-center justify-between gap-4 sm:flex sm:w-auto sm:justify-end">
          {phone && (
            <a href={`tel:${phone.replace(/\s+/g, "")}`} className="hover:underline">
              {phone}
            </a>
          )}
          <Link href="/track-order" className="py-1 hover:underline">
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
