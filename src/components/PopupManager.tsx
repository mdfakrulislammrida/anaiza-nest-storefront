"use client";

import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import Modal from "./Modal";
import { getPopupSettings, subscribeToNewsletter } from "@/lib/api";
import { useSiteSettings } from "@/context/SiteSettingsContext";
import { resolveWording } from "@/lib/homepageWording";
import type { PopupConfig, PopupPage, PopupSettings } from "@/lib/types";

const COOLDOWN_MS = 24 * 60 * 60 * 1000;

// Popups never appear while someone is buying: not in the cart, checkout or on the confirmation,
// whatever the admin chose in "Show on". An interruption there costs the order.
const NO_POPUP_PATHS = ["/cart", "/checkout", "/order-confirmation"];

function isPurchaseFlow(pathname: string): boolean {
  return NO_POPUP_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

function pageMatches(pages: PopupPage[], pathname: string): boolean {
  if (isPurchaseFlow(pathname)) return false;
  if (pages.includes("all")) return true;
  if (pages.includes("home") && pathname === "/") return true;
  if (pages.includes("shop") && pathname === "/shop") return true;
  if (pages.includes("product") && pathname.startsWith("/product")) return true;
  if (pages.includes("category") && pathname.startsWith("/category")) return true;
  return false;
}

function isDismissedRecently(storageKey: string): boolean {
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return false;
    return Date.now() - Number(raw) < COOLDOWN_MS;
  } catch {
    return false;
  }
}

function markDismissed(storageKey: string): void {
  try {
    window.localStorage.setItem(storageKey, String(Date.now()));
  } catch {
    // Private browsing / storage disabled -- it just won't remember, no big deal.
  }
}

function PopupController({
  config,
  storageKey,
  ariaLabel,
  canShow,
  onShown,
  onClosed,
  children,
}: {
  config: PopupConfig;
  storageKey: string;
  ariaLabel: string;
  canShow: boolean;
  onShown: () => void;
  onClosed: () => void;
  children: (close: () => void) => ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const armedRef = useRef(false);

  useEffect(() => {
    if (!config.enabled) return;
    if (!pageMatches(config.pages, pathname)) return;
    if (isDismissedRecently(storageKey)) return;
    if (!canShow) return;
    if (armedRef.current) return;
    armedRef.current = true;

    const show = () => {
      setOpen(true);
      onShown();
    };

    if (config.trigger === "delay") {
      const timer = setTimeout(show, config.delay_seconds * 1000);
      return () => clearTimeout(timer);
    }

    if (config.trigger === "scroll") {
      const onScroll = () => {
        const scrollable = document.documentElement.scrollHeight - window.innerHeight;
        const scrolledPast = scrollable > 0 ? window.scrollY / scrollable : 0;
        if (scrolledPast > 0.5) {
          window.removeEventListener("scroll", onScroll);
          show();
        }
      };
      window.addEventListener("scroll", onScroll, { passive: true });
      return () => window.removeEventListener("scroll", onScroll);
    }

    // exit_intent: mouse leaving toward the top of the viewport (the
    // classic "heading for the tab bar / back button" signal). Never fires
    // on touch devices, which is expected -- there's no mouse to leave with.
    const onMouseOut = (event: MouseEvent) => {
      if (event.clientY <= 0 && !event.relatedTarget) {
        document.removeEventListener("mouseout", onMouseOut);
        show();
      }
    };
    document.addEventListener("mouseout", onMouseOut);
    return () => document.removeEventListener("mouseout", onMouseOut);
  }, [config, pathname, canShow, storageKey, onShown]);

  // An already-open popup is closed (without starting the 24h cooldown) if the visitor heads
  // into the purchase flow, e.g. via Buy Now.
  useEffect(() => {
    if (open && isPurchaseFlow(pathname)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setOpen(false);
      onClosed();
    }
  }, [open, pathname, onClosed]);

  function handleClose() {
    setOpen(false);
    markDismissed(storageKey);
    onClosed();
  }

  return (
    <Modal open={open} onClose={handleClose} ariaLabel={ariaLabel}>
      {children(handleClose)}
    </Modal>
  );
}

function PopupImage({ src, alt }: { src: string | null; alt: string }) {
  if (!src) return null;
  // eslint-disable-next-line @next/next/no-img-element -- next/image is inert under images.unoptimized.
  return <img src={src} alt={alt} className="h-40 w-full object-cover" />;
}

function NewsletterPopupContent({ image }: { image: string | null }) {
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const wording = resolveWording(useSiteSettings().siteSettings);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const email = String(new FormData(form).get("email") ?? "");
    if (!email) return;

    setStatus("loading");
    try {
      await subscribeToNewsletter(email);
      setStatus("done");
      form.reset();
    } catch {
      setStatus("error");
    }
  }

  return (
    <div>
      <PopupImage src={image} alt="Newsletter" />
      <div className="p-6 text-center">
        <h2 className="font-serif text-xl text-ink">{wording.newsletter_headline}</h2>
        <p className="mt-2 text-sm text-muted">{wording.newsletter_text}</p>

        {status === "done" ? (
          <p className="mt-5 text-sm font-medium text-ink">Thanks — you&apos;re on the list.</p>
        ) : (
          <form onSubmit={handleSubmit} className="mt-5 space-y-2">
            <input
              type="email"
              name="email"
              required
              placeholder="you@example.com"
              className="w-full rounded-full border border-line bg-white px-4 py-2.5 text-sm text-ink placeholder:text-muted focus:border-navy focus:outline-none"
            />
            <button
              type="submit"
              disabled={status === "loading"}
              className="w-full rounded-full bg-navy px-5 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Subscribe
            </button>
          </form>
        )}
        {status === "error" && (
          <p className="mt-2 text-xs text-red-600">Something went wrong. Please try again.</p>
        )}
      </div>
    </div>
  );
}

function GiftFinderPopupContent({ image, onNavigate }: { image: string | null; onNavigate: () => void }) {
  return (
    <div>
      <PopupImage src={image} alt="Gift Finder" />
      <div className="p-6 text-center">
        <h2 className="font-serif text-xl text-ink">Not sure what to get?</h2>
        <p className="mt-2 text-sm text-muted">
          Answer three quick questions and we&apos;ll match you with the perfect gift.
        </p>
        {/* Same close path as the X button (marks the 24h cooldown too) --
            clicking through counts as "seen it", so it won't immediately
            reappear if they navigate back. */}
        <Link
          href="/gift-finder"
          onClick={onNavigate}
          className="mt-5 block rounded-full bg-navy px-5 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
        >
          Try the Gift Finder
        </Link>
      </div>
    </div>
  );
}

export default function PopupManager() {
  const [settings, setSettings] = useState<PopupSettings | null>(null);
  const [activePopup, setActivePopup] = useState<"newsletter" | "gift_finder" | null>(null);

  useEffect(() => {
    getPopupSettings()
      .then(setSettings)
      .catch(() => {
        // No popups is a perfectly fine outcome if the settings fetch fails.
      });
  }, []);

  if (!settings) return null;

  return (
    <>
      <PopupController
        config={settings.newsletter}
        storageKey="popup-dismissed-newsletter"
        ariaLabel="Newsletter signup"
        canShow={activePopup === null}
        onShown={() => setActivePopup("newsletter")}
        onClosed={() => setActivePopup(null)}
      >
        {() => <NewsletterPopupContent image={settings.newsletter.image} />}
      </PopupController>

      <PopupController
        config={settings.gift_finder}
        storageKey="popup-dismissed-giftfinder"
        ariaLabel="Gift Finder"
        canShow={activePopup === null}
        onShown={() => setActivePopup("gift_finder")}
        onClosed={() => setActivePopup(null)}
      >
        {(close) => <GiftFinderPopupContent image={settings.gift_finder.image} onNavigate={close} />}
      </PopupController>
    </>
  );
}
