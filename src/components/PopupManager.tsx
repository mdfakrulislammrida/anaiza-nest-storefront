"use client";

import { useEffect, useRef, useState, useSyncExternalStore, type FormEvent, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import Modal from "./Modal";
import { getPopupSettings, subscribeToNewsletter } from "@/lib/api";
import { calmMessage } from "@/lib/formGuard";
import { useFormGuard } from "./useFormGuard";
import { useSiteSettings } from "@/context/SiteSettingsContext";
import { CTA } from "@/lib/brand";
import { resolveWording } from "@/lib/homepageWording";
import type { PopupConfig, PopupPage, PopupSettings } from "@/lib/types";

const COOLDOWN_MS = 24 * 60 * 60 * 1000;

// Whatever the admin chose (a short delay, a scroll, an exit), no popup opens in the first 30 seconds of a visit: someone who
// has only just arrived is looking at the shop, not at a message about it.
const FIRST_QUIET_MS = 30_000;

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

    // Milliseconds left of the quiet first 30 seconds (performance.now() counts from the page's start).
    const quietFor = () => Math.max(0, FIRST_QUIET_MS - performance.now());
    let gateTimer: ReturnType<typeof setTimeout> | undefined;
    const showWhenQuiet = () => {
      const wait = quietFor();
      if (wait === 0) show();
      else gateTimer = setTimeout(show, wait);
    };

    if (config.trigger === "delay") {
      const timer = setTimeout(show, Math.max(config.delay_seconds * 1000, quietFor()));
      return () => clearTimeout(timer);
    }

    if (config.trigger === "scroll") {
      const onScroll = () => {
        const scrollable = document.documentElement.scrollHeight - window.innerHeight;
        const scrolledPast = scrollable > 0 ? window.scrollY / scrollable : 0;
        if (scrolledPast > 0.5) {
          window.removeEventListener("scroll", onScroll);
          showWhenQuiet();
        }
      };
      window.addEventListener("scroll", onScroll, { passive: true });
      return () => {
        window.removeEventListener("scroll", onScroll);
        clearTimeout(gateTimer);
      };
    }

    // exit_intent: mouse leaving toward the top of the viewport (the
    // classic "heading for the tab bar / back button" signal). Never fires
    // on touch devices, which is expected -- there's no mouse to leave with.
    const onMouseOut = (event: MouseEvent) => {
      if (event.clientY <= 0 && !event.relatedTarget) {
        document.removeEventListener("mouseout", onMouseOut);
        showWhenQuiet();
      }
    };
    document.addEventListener("mouseout", onMouseOut);
    return () => {
      document.removeEventListener("mouseout", onMouseOut);
      clearTimeout(gateTimer);
    };
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
  const [message, setMessage] = useState("");
  const guard = useFormGuard("newsletter");
  const wording = resolveWording(useSiteSettings().siteSettings);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const email = String(new FormData(form).get("email") ?? "");
    if (!email) return;

    setStatus("loading");
    try {
      await subscribeToNewsletter(email, await guard.proof());
      setStatus("done");
      form.reset();
    } catch (err) {
      setStatus("error");
      setMessage(calmMessage(err, "Sorry, that did not go through. Please try again in a moment."));
    }
  }

  return (
    <div>
      <PopupImage src={image} alt="Newsletter" />
      <div className="p-6 text-center">
        <h2 className="font-serif text-charcoal text-h2">{wording.newsletter_headline}</h2>
        <p className="mt-2 text-body text-stone">{wording.newsletter_text}</p>

        {status === "done" ? (
          <p className="mt-6 text-body font-medium text-charcoal">Thanks — you&apos;re on the list.</p>
        ) : (
          <form onSubmit={handleSubmit} className="relative mt-6 space-y-2">
            {guard.trap}
            <input
              type="email"
              name="email"
              required
              placeholder="you@example.com"
              className="w-full rounded-btn border border-stone/80 bg-ivory px-4 py-2 text-body text-charcoal placeholder:text-stone focus:border-navy focus:outline-none"
            />
            <button
              type="submit"
              disabled={status === "loading" || !guard.ready}
              className="w-full rounded-btn bg-navy px-6 py-2 text-button text-ivory transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Subscribe
            </button>
          </form>
        )}
        {status === "error" && (
          <p className="mt-2 text-caption text-burgundy">{message}</p>
        )}
      </div>
    </div>
  );
}

function GiftFinderPopupContent({ image, onNavigate }: { image: string | null; onNavigate: () => void }) {
  return (
    <div>
      <PopupImage src={image} alt="Gift finder" />
      <div className="p-6 text-center">
        <h2 className="font-serif text-charcoal text-h2">Not sure what to give?</h2>
        <p className="mt-2 text-body text-stone">
          Answer three quick questions and we will suggest a few thoughtful gifts.
        </p>
        {/* Same close path as the X button (marks the 24h cooldown too) --
            clicking through counts as "seen it", so it won't immediately
            reappear if they navigate back. */}
        <Link
          href="/gift-finder"
          onClick={onNavigate}
          className="mt-6 block rounded-btn bg-navy px-6 py-2 text-button text-ivory transition-opacity hover:opacity-90"
        >
          {CTA.findGift}
        </Link>
      </div>
    </div>
  );
}

// A popup never opens over the cookie banner: while the banner is on and the visitor has not chosen, it waits.
function subscribeToConsent(onChange: () => void) {
  window.addEventListener("anaiza:consent", onChange);
  return () => window.removeEventListener("anaiza:consent", onChange);
}

function consentIsPending(): boolean {
  const consent = window.anaizaConsent;
  return Boolean(consent?.config?.enabled && !consent.get());
}

export default function PopupManager() {
  const [settings, setSettings] = useState<PopupSettings | null>(null);
  const [activePopup, setActivePopup] = useState<"newsletter" | "gift_finder" | null>(null);
  const consentPending = useSyncExternalStore(subscribeToConsent, consentIsPending, () => false);

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
        canShow={activePopup === null && !consentPending}
        onShown={() => setActivePopup("newsletter")}
        onClosed={() => setActivePopup(null)}
      >
        {() => <NewsletterPopupContent image={settings.newsletter.image} />}
      </PopupController>

      <PopupController
        config={settings.gift_finder}
        storageKey="popup-dismissed-giftfinder"
        ariaLabel="Gift finder"
        canShow={activePopup === null && !consentPending}
        onShown={() => setActivePopup("gift_finder")}
        onClosed={() => setActivePopup(null)}
      >
        {(close) => <GiftFinderPopupContent image={settings.gift_finder.image} onNavigate={close} />}
      </PopupController>
    </>
  );
}
