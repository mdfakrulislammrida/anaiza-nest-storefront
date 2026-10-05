"use client";

import { useSiteSettings } from "@/context/SiteSettingsContext";

// One logo per layout, drawn from the master files the admin uploads -- never redrawn here.
// Colourway by background: "navy" for ivory areas (default), "ivory" for deep ink areas.
// A missing upload falls back, in order, to the previous logo (navy only: it is not safe on a dark
// background) and then to the site name set in Fraunces.
export default function Logo({
  variant = "navy",
  className = "",
}: {
  variant?: "navy" | "ivory";
  className?: string;
}) {
  const { siteSettings } = useSiteSettings();
  const siteName = siteSettings?.site_name ?? "Anaiza Nest";
  const src =
    variant === "ivory"
      ? siteSettings?.logo_ivory
      : siteSettings?.logo_navy || siteSettings?.logo_url;

  if (src) {
    // Screen minimum 120px wide; height-bound otherwise so the master is never stretched.
    // eslint-disable-next-line @next/next/no-img-element -- admin-supplied URL
    return <img src={src} alt={siteName} className={`block h-7 min-w-[120px] w-auto object-contain object-left ${className}`} />;
  }

  return (
    <span className={`font-serif text-h2 ${variant === "ivory" ? "text-ivory" : "text-navy"} ${className}`}>
      {siteName}
    </span>
  );
}
