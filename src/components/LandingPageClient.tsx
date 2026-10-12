"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { ApiError, getLandingPage, getPaymentSettings, sendLandingEvent } from "@/lib/api";
import { useSiteSettings } from "@/context/SiteSettingsContext";
import { trackViewContentList } from "@/lib/tracking";
import { dhakaTime, ENDED_TEXT, ENDED_TITLE, landingSlugFromPath, previewTokenFromSearch, viewedKey } from "@/lib/landing";
import type { LandingBlock, LandingPage, PaymentSetting, Product } from "@/lib/types";
import CheckoutForm from "./CheckoutForm";
import Logo from "./Logo";
import { useLandingChrome } from "./LandingChrome";
import {
  BenefitsBlock,
  CountdownBlock,
  CustomHtmlBlock,
  FaqBlock,
  HeroBlock,
  ProductsBlock,
  ReviewsBlock,
  RichTextBlock,
} from "./landing/LandingBlocks";

// A landing page, drawn from what the API sends. Used by the statically built /lp/<slug> (seeded with the page as it was
// at build time, then refreshed once) and by the /lp fallback shell, which reads the slug from the address and fetches the
// page: that is how a page made after the last build works at once.

function setMeta(name: string, content: string) {
  let tag = document.head.querySelector<HTMLMetaElement>(`meta[name="${name}"]`);

  if (!tag) {
    tag = document.createElement("meta");
    tag.name = name;
    document.head.appendChild(tag);
  }

  tag.content = content;
}

function productsOf(blocks: LandingBlock[]): Product[] {
  const seen = new Set<number>();
  const out: Product[] = [];

  for (const block of blocks) {
    if (block.type !== "products") continue;

    for (const product of block.products) {
      if (!seen.has(product.id)) {
        seen.add(product.id);
        out.push(product);
      }
    }
  }

  return out;
}

export default function LandingPageClient({
  initialPage = null,
  initialPaymentSettings = null,
}: {
  initialPage?: LandingPage | null;
  initialPaymentSettings?: PaymentSetting | null;
}) {
  const pathname = usePathname();
  const slug = initialPage?.slug ?? landingSlugFromPath(pathname);
  const chrome = useLandingChrome();
  const { siteSettings } = useSiteSettings();

  const [page, setPage] = useState<LandingPage | null>(initialPage);
  const [paymentSettings, setPaymentSettings] = useState<PaymentSetting | null>(initialPaymentSettings);
  const [status, setStatus] = useState<"loading" | "ready" | "missing">(initialPage ? "ready" : "loading");
  // True once the page has been checked against the API in this browser: only then is a view counted.
  const [confirmed, setConfirmed] = useState(false);

  useEffect(() => {
    if (!slug) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- no slug in the address: nothing to fetch.
      setStatus("missing");
      return;
    }

    let cancelled = false;
    const preview = previewTokenFromSearch(window.location.search);

    Promise.all([getLandingPage(slug, preview), initialPaymentSettings ? Promise.resolve(initialPaymentSettings) : getPaymentSettings().catch(() => null)])
      .then(([fresh, payments]) => {
        if (cancelled) return;
        setPage(fresh);
        setPaymentSettings(payments);
        setStatus("ready");
        setConfirmed(true);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        // A page that is gone (or not open yet) says so; any other failure keeps what the build had.
        if (error instanceof ApiError && error.status === 404) {
          setPage(null);
          setStatus("missing");
        } else if (!initialPage) {
          setStatus("missing");
        } else {
          setConfirmed(true);
        }
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- runs once for this address; the seed is only a starting point
  }, [slug]);

  // The title, description and robots tag: the build sets them for a built page; the fallback shell sets them here.
  useEffect(() => {
    if (!page || initialPage) return;

    document.title = `${page.seo.title} | ${siteSettings?.site_name ?? "Anaiza Nest"}`;
    if (page.seo.description) setMeta("description", page.seo.description);
    setMeta("robots", page.seo.noindex ? "noindex, nofollow" : "index, follow");
  }, [page, initialPage, siteSettings?.site_name]);

  const blocks = useMemo(() => (page?.state === "ended" ? [] : (page?.blocks ?? [])), [page]);
  const live = page?.state === "live";

  // One count per visitor session, and ViewContent for the products on the page. A preview or an ended page counts nothing.
  const reported = useRef<number | null>(null);

  useEffect(() => {
    if (!page || !live || !confirmed || reported.current === page.id) return;
    reported.current = page.id;

    trackViewContentList(productsOf(page.blocks), `Landing page: ${page.slug}`);

    try {
      const key = viewedKey(page.id);
      if (window.sessionStorage.getItem(key)) return;
      window.sessionStorage.setItem(key, "1");
    } catch {
      // No session storage: the view is counted, a reload may count it again.
    }

    void sendLandingEvent(page.slug, "view");
  }, [page, live, confirmed]);

  if (status === "loading") {
    return (
      <div className="mx-auto max-w-3xl px-4 py-24 text-center sm:px-6">
        <p className="text-stone">One moment&hellip;</p>
      </div>
    );
  }

  if (status === "missing" || !page) {
    return (
      <div className="mx-auto max-w-xl px-4 py-24 text-center sm:px-6">
        <h1 className="font-serif text-charcoal text-h1">We could not find that page</h1>
        <p className="mt-4 text-body text-stone">The address may have been typed a little differently, or the offer may be over.</p>
        <a href="/shop" className="mt-8 inline-flex min-h-12 items-center justify-center rounded-btn bg-navy px-8 py-4 text-button text-ivory transition-opacity hover:opacity-90">
          See the shop
        </a>
      </div>
    );
  }

  const focus = page.layout === "focus";
  const hasOrderForm = blocks.some((block) => block.type === "order_form");
  const hasHero = blocks.some((block) => block.type === "hero");
  const heroHasImage = blocks.some((block) => block.type === "hero" && (block.image_desktop || block.image_mobile));
  const firstProductsKey = blocks.find((block) => block.type === "products")?.key;
  const countAdd = () => {
    if (live) void sendLandingEvent(page.slug, "add_to_cart");
  };

  function render(block: LandingBlock) {
    switch (block.type) {
      case "hero":
        return <HeroBlock key={block.key} block={block} headline={page!.title} />;
      case "rich_text":
        return <RichTextBlock key={block.key} block={block} />;
      case "custom_html":
        return <CustomHtmlBlock key={block.key} block={block} />;
      case "products":
        return (
          <ProductsBlock
            key={block.key}
            block={block}
            eagerFirst={!heroHasImage && block.key === firstProductsKey}
            hasOrderForm={hasOrderForm}
            onAdded={countAdd}
          />
        );
      case "benefits":
        return <BenefitsBlock key={block.key} block={block} />;
      case "faq":
        return <FaqBlock key={block.key} block={block} />;
      case "reviews":
        return <ReviewsBlock key={block.key} block={block} />;
      case "countdown":
        return <CountdownBlock key={block.key} block={block} />;
      case "order_form":
        return (
          <section key={block.key} id="landing-order" className="mx-auto w-full max-w-3xl scroll-mt-4 px-4 py-10 sm:px-6">
            <CheckoutForm embedded landing={{ id: page!.id, slug: page!.slug }} paymentSettings={paymentSettings} heading={block.heading} intro={block.intro} />
          </section>
        );
      default:
        return null;
    }
  }

  return (
    <div className="pb-24 lg:pb-0">
      {page.state === "preview" && (
        <p className="bg-champagne px-4 py-2 text-center text-caption font-medium text-navy">
          Preview. Only people with this link can see this page; it is not counted and search engines are told to skip it.
        </p>
      )}

      {focus ? (
        // Logo only, and not a link: nothing here leads away from the offer.
        <header className="border-b border-linen bg-ivory">
          <div className="mx-auto flex h-16 max-w-5xl items-center justify-center px-4">
            <Logo />
          </div>
        </header>
      ) : (
        chrome?.top
      )}

      {page.state === "ended" ? (
        <section className="mx-auto max-w-xl px-4 py-24 text-center sm:px-6">
          <h1 className="font-serif text-charcoal text-h1">{ENDED_TITLE}</h1>
          <p className="mt-4 text-body text-stone">
            {dhakaTime(page.publish_until) ? `It closed on ${dhakaTime(page.publish_until)}. ` : ""}
            {ENDED_TEXT}
          </p>
          <a href="/shop" className="mt-8 inline-flex min-h-12 items-center justify-center rounded-btn bg-navy px-8 py-4 text-button text-ivory transition-opacity hover:opacity-90">
            See the shop
          </a>
        </section>
      ) : (
        <>
          {!hasHero && <h1 className="sr-only">{page.title}</h1>}
          {blocks.map(render)}
        </>
      )}

      {focus ? (
        <footer className="border-t border-linen bg-ivory px-4 py-6 text-center text-caption text-stone">
          {siteSettings?.site_name ?? "Anaiza Nest"}
        </footer>
      ) : (
        chrome?.bottom
      )}
    </div>
  );
}
