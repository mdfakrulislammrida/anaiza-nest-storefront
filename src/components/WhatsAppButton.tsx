"use client";

import { usePathname } from "next/navigation";
import { useSiteSettings } from "@/context/SiteSettingsContext";
import { isPathHidden, resolveWhatsApp, whatsappLink } from "@/lib/whatsapp";

// The number, the first message, the on/off switch and the pages that hide it all come from Site Settings (built into the
// page, then refreshed live), so changing any of them needs no rebuild.
export default function WhatsAppButton() {
  const { siteSettings } = useSiteSettings();
  const whatsapp = resolveWhatsApp(siteSettings);
  const href = whatsappLink(whatsapp.number, whatsapp.message);
  const pathname = usePathname();
  if (!whatsapp.showBubble || href === null || isPathHidden(pathname, whatsapp.hiddenPaths)) return null;

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer noopener"
      aria-label="Chat with us on WhatsApp"
      // It sits in the bottom corner and rises above the cookie banner and the fixed order bar (--cookie-top and --bar-top are how far
      // each reaches up from the bottom, absent when there is none) by a transform, so nothing on the page moves when they appear.
      className="whatsapp-bubble fixed right-5 z-40 flex h-12 w-12 items-center justify-center rounded-btn bg-champagne text-navy"
    >
      <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6">
        <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.39 1.26 4.81L2 22l5.42-1.35c1.37.75 2.94 1.18 4.62 1.18h.01c5.46 0 9.91-4.45 9.91-9.91C21.96 6.45 17.5 2 12.04 2Zm5.75 14.14c-.24.68-1.4 1.3-1.93 1.36-.5.06-1.02.24-3.42-.71-2.9-1.15-4.76-4.1-4.9-4.29-.14-.19-1.16-1.55-1.16-2.96s.73-2.1 1-2.39c.24-.26.53-.32.71-.32.18 0 .35 0 .5.01.16.01.38-.06.6.46.24.55.8 1.9.87 2.04.07.14.11.3.02.48-.45.9-.9.87-.63 1.34.91 1.6 1.86 2.32 3.29 3.03.24.12.38.1.53-.06.14-.16.6-.7.76-.94.16-.24.32-.2.53-.12.22.08 1.38.65 1.62.77.24.12.4.18.46.28.06.11.06.61-.18 1.02Z" />
      </svg>
    </a>
  );
}
