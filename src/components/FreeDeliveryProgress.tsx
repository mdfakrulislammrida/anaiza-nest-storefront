"use client";

import { useSiteSettings } from "@/context/SiteSettingsContext";
import { freeDeliveryRemaining, type DeliveryZone } from "@/lib/checkout";
import { formatPrice } from "@/lib/format";

// "Add ৳X more for free delivery inside Dhaka." with a thin gold line that fills as the cart grows. The threshold is the
// shop's own setting and nothing else: with none set, or once the cart is over it, nothing is shown. In the checkout it
// follows the same rule as the delivery row (only when the parcel goes inside Dhaka), so it is given the chosen zone.
export default function FreeDeliveryProgress({
  subtotal,
  zone = "inside",
  className = "",
}: {
  subtotal: number;
  zone?: DeliveryZone;
  className?: string;
}) {
  const threshold = useSiteSettings().siteSettings?.policy?.free_delivery_threshold;
  const left = freeDeliveryRemaining(threshold, zone, subtotal);

  if (left === null || !threshold) return null;

  const percent = Math.min(100, Math.max(0, Math.round((subtotal / threshold) * 100)));

  return (
    <div className={className}>
      <p className="text-caption text-stone">Add {formatPrice(left)} more for free delivery inside Dhaka.</p>
      <div
        role="progressbar"
        aria-label="Progress towards free delivery"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        className="mt-2 h-0.5 bg-linen"
      >
        <div className="h-full bg-gold transition-[width] duration-200 ease-out" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}
