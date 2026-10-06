"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { getCookieConsentSettings } from "@/lib/api";
import type { CookieConsentSettings } from "@/lib/types";

const DESCRIPTIONS = {
  necessary: "Keep the cart and checkout working. Always on.",
  analytics: "Help us see how the shop is used.",
  marketing: "Let us measure our ads and show you relevant ones.",
};

// The cookie banner: small, fixed to the bottom, never in the page flow, so it cannot shift the layout. It
// stacks above the fixed Add to Cart bar on product pages and above the WhatsApp bubble (through --cookie-top),
// and gives the page end the same amount of room, so nothing is left hidden behind it. What it records and what
// it gates is decided by the inline consent script in <head>; this only asks the visitor and tells that script.
export default function CookieConsent({ initial }: { initial: CookieConsentSettings | null }) {
  const pathname = usePathname();
  const [settings, setSettings] = useState(initial);
  const [visible, setVisible] = useState(false);
  const [customizing, setCustomizing] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);
  const [barHeight, setBarHeight] = useState(0);
  const bannerRef = useRef<HTMLElement>(null);

  // Wording and links refresh from the API (so an edit needs no rebuild); the mode and the on/off switch are
  // built into the page's head script.
  useEffect(() => {
    let cancelled = false;
    getCookieConsentSettings()
      .then((fresh) => {
        if (!cancelled) setSettings(fresh);
      })
      .catch(() => {
        // Keep the wording from the build.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const enabled = Boolean(settings?.enabled);

  // Open on the first visit (no saved choice), and whenever the footer's "Cookie settings" link asks.
  useEffect(() => {
    const consent = window.anaizaConsent;
    if (!enabled || !consent) return;

    if (!consent.get()) {
      // One-time sync from the saved choice on mount -- the choice lives in a cookie, unknown to the server render.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setVisible(true);
    }

    function reopen() {
      const current = window.anaizaConsent?.effective();
      setAnalytics(current?.a ?? false);
      setMarketing(current?.m ?? false);
      setCustomizing(true);
      setVisible(true);
    }
    window.addEventListener("anaiza:cookie-settings", reopen);
    return () => window.removeEventListener("anaiza:cookie-settings", reopen);
  }, [enabled]);

  // Sit above any fixed bottom bar (the product page's Add to Cart bar, only fixed on phones).
  useEffect(() => {
    function measure() {
      // How far the highest fixed bar reaches up from the bottom of the screen.
      let height = 0;
      document.querySelectorAll<HTMLElement>("[data-bottom-bar]").forEach((bar) => {
        if (getComputedStyle(bar).position === "fixed") height = Math.max(height, window.innerHeight - bar.getBoundingClientRect().top);
      });
      setBarHeight(Math.max(0, Math.round(height)));
    }

    // The bar belongs to the product page and may mount after this banner does, so watch for it appearing as well
    // as for its size changing.
    const resizeObserver = new ResizeObserver(measure);
    let timer = 0;
    function schedule() {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        document.querySelectorAll("[data-bottom-bar]").forEach((bar) => resizeObserver.observe(bar));
        measure();
      }, 30);
    }

    schedule();
    window.addEventListener("resize", schedule);
    const mutationObserver = new MutationObserver(schedule);
    mutationObserver.observe(document.body, { childList: true, subtree: true });
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("resize", schedule);
      mutationObserver.disconnect();
      resizeObserver.disconnect();
    };
  }, [pathname, visible]);

  // Publish how far the banner reaches up from the bottom (for the WhatsApp bubble) and leave the same room at
  // the end of the page, so the last of the page can always be scrolled clear of it.
  useEffect(() => {
    const root = document.documentElement;
    const banner = bannerRef.current;

    if (!visible || !banner) {
      root.style.removeProperty("--cookie-top");
      document.body.style.removeProperty("padding-bottom");
      return;
    }

    function publish() {
      const height = Math.round(banner?.getBoundingClientRect().height ?? 0);
      root.style.setProperty("--cookie-top", `${barHeight + height}px`);
      document.body.style.paddingBottom = `${height}px`;
    }
    publish();
    const observer = new ResizeObserver(publish);
    observer.observe(banner);
    return () => {
      observer.disconnect();
      root.style.removeProperty("--cookie-top");
      document.body.style.removeProperty("padding-bottom");
    };
  }, [visible, barHeight, customizing]);

  const choose = useCallback((allowAnalytics: boolean, allowMarketing: boolean) => {
    window.anaizaConsent?.set(allowAnalytics, allowMarketing);
    setVisible(false);
    setCustomizing(false);
  }, []);

  if (!enabled || !visible || !settings) return null;

  const labels = settings.labels;
  const buttonClass =
    "min-h-11 rounded-btn px-3 text-button transition-colors";

  return (
    <section
      ref={bannerRef}
      aria-label="Cookie settings"
      style={{ bottom: barHeight }}
      className="fixed inset-x-0 z-[35] mx-auto w-full max-w-3xl px-3 pb-3 sm:px-4"
    >
      <div className="max-h-[70vh] overflow-y-auto rounded-btn border border-linen bg-ivory p-3 shadow-[0_-4px_16px_rgba(42,38,34,0.12)] sm:p-4">
        <p className="text-caption leading-snug text-charcoal">{settings.banner_text}</p>

        {customizing ? (
          <div className="mt-2 space-y-1">
            <ul className="divide-y divide-linen">
              <li className="flex min-h-11 items-center justify-between gap-3 py-2">
                <span>
                  <span className="block text-body font-medium text-charcoal">Necessary</span>
                  <span className="block text-caption text-stone">{DESCRIPTIONS.necessary}</span>
                </span>
                <input type="checkbox" checked disabled aria-label="Necessary, always on" className="h-6 w-6 shrink-0 accent-navy" />
              </li>
              <li>
                <label className="flex min-h-11 cursor-pointer items-center justify-between gap-3 py-2">
                  <span>
                    <span className="block text-body font-medium text-charcoal">Analytics</span>
                    <span className="block text-caption text-stone">{DESCRIPTIONS.analytics}</span>
                  </span>
                  <input
                    type="checkbox"
                    checked={analytics}
                    onChange={(event) => setAnalytics(event.target.checked)}
                    className="h-6 w-6 shrink-0 accent-navy"
                  />
                </label>
              </li>
              <li>
                <label className="flex min-h-11 cursor-pointer items-center justify-between gap-3 py-2">
                  <span>
                    <span className="block text-body font-medium text-charcoal">Marketing</span>
                    <span className="block text-caption text-stone">{DESCRIPTIONS.marketing}</span>
                  </span>
                  <input
                    type="checkbox"
                    checked={marketing}
                    onChange={(event) => setMarketing(event.target.checked)}
                    className="h-6 w-6 shrink-0 accent-navy"
                  />
                </label>
              </li>
            </ul>
            {settings.privacy_url && (
              <a href={settings.privacy_url} className="inline-flex min-h-10 items-center text-caption text-navy underline">
                {settings.privacy_label}
              </a>
            )}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button type="button" onClick={() => choose(analytics, marketing)} className={`${buttonClass} bg-navy text-ivory hover:opacity-90`}>
                {labels.save}
              </button>
              <button type="button" onClick={() => choose(true, true)} className={`${buttonClass} border border-stone/80 text-charcoal hover:border-navy`}>
                {labels.accept}
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-2">
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => choose(true, true)} className={`${buttonClass} bg-navy text-ivory hover:opacity-90`}>
                {labels.accept}
              </button>
              <button type="button" onClick={() => choose(false, false)} className={`${buttonClass} border border-stone/80 text-charcoal hover:border-navy`}>
                {labels.reject}
              </button>
            </div>
            <div className="mt-1 flex items-center justify-center gap-6">
              <button
                type="button"
                onClick={() => {
                  const current = window.anaizaConsent?.effective();
                  setAnalytics(current?.a ?? false);
                  setMarketing(current?.m ?? false);
                  setCustomizing(true);
                }}
                className="inline-flex min-h-10 items-center text-caption font-medium text-navy underline"
              >
                {labels.customize}
              </button>
              {settings.privacy_url && (
                <a href={settings.privacy_url} className="inline-flex min-h-10 items-center text-caption text-navy underline">
                  {settings.privacy_label}
                </a>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
