import Link from "next/link";
import type { SiteSetting } from "@/lib/types";

export default function TopPromoBar({ siteSettings }: { siteSettings: SiteSetting | null }) {
  const phone = siteSettings?.contact_phone;

  return (
    <div className="bg-black text-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-2 text-xs sm:px-6">
        <p className="truncate">Free delivery inside Dhaka on orders over ৳2,000</p>
        <div className="flex shrink-0 items-center gap-4">
          {phone && (
            <a href={`tel:${phone.replace(/\s+/g, "")}`} className="hidden sm:inline">
              {phone}
            </a>
          )}
          <Link href="/track-order" className="hover:underline">
            Track Order
          </Link>
          <Link href="/account" className="hover:underline">
            Login / Sign Up
          </Link>
        </div>
      </div>
    </div>
  );
}
