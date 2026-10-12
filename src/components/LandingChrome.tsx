"use client";

import { createContext, useContext, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { isLandingPath } from "@/lib/landing";

// The site's header, promo bar and footer are drawn by the root layout for every route. A landing page (/lp/...) draws its
// own frame instead: logo only in Focus mode, or these same pieces in Normal mode. So the layout hides them on /lp paths
// and hands them to the page through this context.

interface ChromePieces {
  top: ReactNode;
  bottom: ReactNode;
}

const LandingChromeContext = createContext<ChromePieces | null>(null);

export function LandingChromeProvider({ top, bottom, children }: ChromePieces & { children: ReactNode }) {
  return <LandingChromeContext.Provider value={{ top, bottom }}>{children}</LandingChromeContext.Provider>;
}

export function useLandingChrome(): ChromePieces | null {
  return useContext(LandingChromeContext);
}

/** Draws its children everywhere except on landing pages. Nothing here is a visual change for any other page. */
export function HideOnLanding({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return isLandingPath(pathname) ? null : <>{children}</>;
}
