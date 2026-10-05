"use client";

import type { ReactNode } from "react";
import { useSiteSettings } from "@/context/SiteSettingsContext";
import { deliveryTimeText, resolvePolicy } from "@/lib/policy";
import type { StorePolicy } from "@/lib/types";

// The brand kit's trust messages -- gift-ready, packed by hand, cash on delivery -- plus the delivery
// promise, which comes from the delivery settings. Cash on delivery is shown only while the admin
// has it switched on. Thin navy line icons.
const BADGES: {
  title: string;
  subtitle: string | ((policy: StorePolicy) => string);
  icon: ReactNode;
  needsCod?: boolean;
}[] = [
  {
    title: "Gift-ready",
    subtitle: "Beautiful to open, safe to send.",
    icon: <path d="M20 12v9H4v-9M2 7h20v5H2zM12 22V7M12 7H7.5a2.5 2.5 0 1 1 0-5C11 2 12 7 12 7ZM12 7h4.5a2.5 2.5 0 1 0 0-5C13 2 12 7 12 7Z" />,
  },
  {
    title: "Packed by hand",
    subtitle: "Sent with care.",
    icon: <path d="M16.5 9.4 7.5 4.2M21 16V8a2 2 0 0 0-1-1.7l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.7l7 4a2 2 0 0 0 2 0l7-4a2 2 0 0 0 1-1.7ZM3.3 7 12 12l8.7-5M12 22.1V12" />,
  },
  {
    title: "Cash on delivery",
    subtitle: "Pay when your order arrives.",
    needsCod: true,
    icon: <path d="M2 6h20v12H2zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM6 12h.01M18 12h.01" />,
  },
  {
    title: "Delivery",
    subtitle: deliveryTimeText,
    icon: (
      <path d="M3 7h11v8H3zM14 10h4l3 3v2h-7zM6.5 19a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3ZM17.5 19a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z" />
    ),
  },
];

export default function TrustBadges() {
  const { siteSettings } = useSiteSettings();
  const policy = resolvePolicy(siteSettings);
  const codOn = siteSettings?.cod_enabled !== false;
  const badges = BADGES.filter((badge) => !badge.needsCod || codOn);

  return (
    <section className="border-b border-linen">
      <div
        className={`mx-auto grid max-w-7xl grid-cols-2 gap-6 px-4 py-10 sm:px-6 ${badges.length === 4 ? "sm:grid-cols-4" : "sm:grid-cols-3"}`}
      >
        {badges.map((badge) => (
          <div key={badge.title} className="flex flex-col items-center gap-2 text-center sm:flex-row sm:text-left">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.25}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-6 w-6 shrink-0 text-navy"
              aria-hidden="true"
            >
              {badge.icon}
            </svg>
            <div>
              <p className="text-body font-medium text-charcoal">{badge.title}</p>
              <p className="text-caption text-stone">
                {typeof badge.subtitle === "function" ? badge.subtitle(policy) : badge.subtitle}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
