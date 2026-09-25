"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { getSiteSettings } from "@/lib/api";
import type { SiteSetting } from "@/lib/types";

interface SiteSettingsContextValue {
  siteSettings: SiteSetting | null;
  loading: boolean;
}

const SiteSettingsContext = createContext<SiteSettingsContextValue>({
  siteSettings: null,
  loading: true,
});

export function SiteSettingsProvider({ children }: { children: ReactNode }) {
  const [siteSettings, setSiteSettings] = useState<SiteSetting | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    getSiteSettings()
      .then((settings) => {
        if (!cancelled) setSiteSettings(settings);
      })
      .catch(() => {
        // Header/Footer fall back to defaults when the API is unreachable.
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <SiteSettingsContext.Provider value={{ siteSettings, loading }}>
      {children}
    </SiteSettingsContext.Provider>
  );
}

export function useSiteSettings() {
  return useContext(SiteSettingsContext);
}
