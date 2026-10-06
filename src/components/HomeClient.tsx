"use client";

import { Fragment, useEffect, useState } from "react";
import { getHomeCatalog, getHomepageSections, type HomeCatalog } from "@/lib/api";
import type { HomepageSection } from "@/lib/types";
import Hero from "./Hero";
import TrustBadges from "./TrustBadges";
import NewsletterBanner from "./NewsletterBanner";
import HotDealsSection from "./HotDealsSection";
import ProductSection from "./ProductSection";
import CustomHtmlSection from "./CustomHtmlSection";
import OccasionsSection from "./OccasionsSection";
import WhyUsSection from "./WhyUsSection";

// Seeded directly from the statically-built catalog/section order, so first
// render already shows real content -- no loading state. On mount we
// silently refetch both once to pick up anything that changed since the
// build (a reorder, a new custom HTML block, a price/stock change) and swap
// them in if the fetch succeeds; a failed refetch just keeps what was
// already rendered.
export default function HomeClient({
  initialCatalog,
  initialSections,
}: {
  initialCatalog: HomeCatalog;
  initialSections: HomepageSection[];
}) {
  const [catalog, setCatalog] = useState(initialCatalog);
  const [sections, setSections] = useState(initialSections);

  useEffect(() => {
    let cancelled = false;

    Promise.all([getHomeCatalog(), getHomepageSections()])
      .then(([freshCatalog, freshSections]) => {
        if (cancelled) return;
        setCatalog(freshCatalog);
        if (freshSections.length > 0) setSections(freshSections);
      })
      .catch(() => {
        // Static content already rendered is still correct enough to show.
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <>
      {sections.map((section) => {
        switch (section.type) {
          case "hero_banner":
            // TrustBadges isn't its own section type -- it's a trust-
            // reinforcement strip for the hero pitch, not independently
            // reorderable, so it travels with hero_banner rather than
            // needing a 7th type of its own.
            return (
              <Fragment key={section.id}>
                <Hero />
                <TrustBadges />
              </Fragment>
            );
          case "hot_deals":
            return (
              <HotDealsSection
                key={section.id}
                products={catalog.hotDeals}
                endsAt={section.deal_ends_at}
                {...(section.custom_title ? { title: section.custom_title } : {})}
                {...(section.custom_subtitle ? { subtitle: section.custom_subtitle } : {})}
              />
            );
          case "bestsellers":
            return (
              <ProductSection
                key={section.id}
                title={section.custom_title || "Featured gifts"}
                subtitle={section.custom_subtitle || "A few pieces to give, packed by hand and ready to go."}
                products={catalog.bestsellers}
              />
            );
          case "new_arrivals":
            return (
              <ProductSection
                key={section.id}
                title={section.custom_title || "New arrivals"}
                subtitle={section.custom_subtitle || "Recently added to the collection."}
                products={catalog.newArrivals}
              />
            );
          case "newsletter":
            return <NewsletterBanner key={section.id} title={section.custom_title} subtitle={section.custom_subtitle} />;
          case "occasions":
            return (
              <OccasionsSection
                key={section.id}
                title={section.custom_title}
                subtitle={section.custom_subtitle}
                tiles={section.tiles ?? []}
              />
            );
          case "why_us":
            return (
              <WhyUsSection
                key={section.id}
                title={section.custom_title}
                subtitle={section.custom_subtitle}
                reasons={section.reasons ?? []}
              />
            );
          case "custom_html":
            return (
              <CustomHtmlSection key={section.id} title={section.custom_title} html={section.custom_html} />
            );
          default:
            // Forward-compatible: a type this build doesn't know about yet
            // is skipped rather than crashing the homepage.
            return null;
        }
      })}
    </>
  );
}
