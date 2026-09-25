"use client";

import { useEffect, useState } from "react";
import { getProducts } from "@/lib/api";
import Hero from "@/components/Hero";
import TrustBadges from "@/components/TrustBadges";
import HotDealsSection from "@/components/HotDealsSection";
import ProductSection from "@/components/ProductSection";
import NewsletterBanner from "@/components/NewsletterBanner";
import type { Product } from "@/lib/types";

export default function Home() {
  const [hotDeals, setHotDeals] = useState<Product[]>([]);
  const [bestsellers, setBestsellers] = useState<Product[]>([]);
  const [newArrivals, setNewArrivals] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [apiUnreachable, setApiUnreachable] = useState(false);

  useEffect(() => {
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);

    (async () => {
      try {
        const [hotDealsRes, featuredRes, newArrivalsRes] = await Promise.all([
          getProducts({ on_sale: true, per_page: 5 }),
          getProducts({ is_featured: true, per_page: 8 }),
          getProducts({ is_new: true, sort: "newest", per_page: 9 }),
        ]);

        if (cancelled) return;

        let featured = featuredRes.data;
        if (featured.length === 0) {
          featured = (await getProducts({ sort: "newest", per_page: 8 })).data;
        }

        if (cancelled) return;
        setHotDeals(hotDealsRes.data);
        setBestsellers(featured);
        setNewArrivals(newArrivalsRes.data);
      } catch {
        if (!cancelled) setApiUnreachable(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div>
      <Hero />
      <TrustBadges />

      {loading ? (
        <div className="mx-auto max-w-7xl px-4 py-20 text-center sm:px-6">
          <p className="text-muted">Loading the catalog…</p>
        </div>
      ) : apiUnreachable ? (
        <div className="mx-auto max-w-7xl px-4 py-20 text-center sm:px-6">
          <p className="text-muted">
            We couldn&apos;t reach the catalog right now. Please make sure the
            Anaiza Nest API is running and refresh.
          </p>
        </div>
      ) : (
        <>
          <HotDealsSection products={hotDeals} />
          <ProductSection
            title="Bestsellers"
            subtitle="What Anaiza Nest shoppers are loving right now."
            products={bestsellers}
          />
          <ProductSection
            title="New Arrivals"
            subtitle="Fresh in this week."
            products={newArrivals}
          />
        </>
      )}

      <NewsletterBanner />
    </div>
  );
}
