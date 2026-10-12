import type { Metadata } from "next";
import LandingPageClient from "@/components/LandingPageClient";

// The fallback shell for /lp/<slug>: public/.htaccess sends any /lp/<slug> that has no built page of its own here (a
// landing page made after the last build). The shell reads the slug from the address and fetches the page. It is
// noindex until the page says otherwise, so a half-loaded shell is never what a search engine keeps.
export const metadata: Metadata = {
  title: "Offer",
  robots: { index: false, follow: false },
};

export default function LandingShell() {
  return <LandingPageClient />;
}
