"use client";

import { useSiteSettings } from "@/context/SiteSettingsContext";

// One quiet line of proof under the trust strip, in the words the owner has typed in Site settings. Empty means nothing
// is shown: the shop never writes a claim of its own here.
export default function ProofLine() {
  const line = useSiteSettings().siteSettings?.home_proof_line?.trim();

  if (!line) return null;

  return (
    <p className="mx-auto max-w-7xl px-4 pb-8 text-center text-caption text-stone sm:px-6">{line}</p>
  );
}
