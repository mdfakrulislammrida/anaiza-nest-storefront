"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { afterLoad } from "@/lib/afterLoad";
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

// initialSettings is the copy fetched at build time: it lets the static HTML show
// the real delivery/return numbers rather than fallbacks. The fetch below still
// runs, so an admin edit shows up without a rebuild.
export function SiteSettingsProvider({
  children,
  initialSettings = null,
}: {
  children: ReactNode;
  initialSettings?: SiteSetting | null;
}) {
  const [siteSettings, setSiteSettings] = useState<SiteSetting | null>(initialSettings);
  const [loading, setLoading] = useState(!initialSettings);

  useEffect(() => {
    let cancelled = false;

    const refresh = () =>
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

    // With the build's copy in hand this is only a check that it is still current, so it waits until the page has loaded.
    // Without one, the settings are needed now.
    const cancelLater = initialSettings
      ? afterLoad(() => void refresh())
      : (void refresh(), () => {});

    return () => {
      cancelled = true;
      cancelLater();
    };
    // initialSettings is the build's copy and never changes after the first render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
