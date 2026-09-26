"use client";

import Link from "next/link";
import { useSiteSettings } from "@/context/SiteSettingsContext";

const FALLBACK_PROMO_TEXT = "Free delivery inside Dhaka on orders over ৳2,000";

export default function TopPromoBar() {
  const { siteSettings } = useSiteSettings();
  const phone = siteSettings?.contact_phone;
  const promoText = siteSettings?.promo_text ?? FALLBACK_PROMO_TEXT;

  return (
    <div className="bg-black text-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-2 text-xs sm:px-6">
        {/* Hidden below sm: with the promo message, phone, and both links
            all fighting for one row, this truncated illegibly on narrow
            screens. "Login / Sign Up" is also redundant with the account
            icon already in the header, so it's dropped on mobile too. */}
        <p className="hidden truncate sm:block">{promoText}</p>
        <div className="flex w-full shrink-0 items-center justify-between gap-4 sm:w-auto sm:justify-end">
          {phone && (
            <a href={`tel:${phone.replace(/\s+/g, "")}`} className="hidden sm:inline">
              {phone}
            </a>
          )}
          <Link href="/track-order" className="py-1 hover:underline">
            Track Order
          </Link>
          <Link href="/account" className="hidden py-1 hover:underline sm:inline">
            Login / Sign Up
          </Link>
        </div>
      </div>
    </div>
  );
}
