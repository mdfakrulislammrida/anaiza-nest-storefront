"use client";

import { useEffect, useState } from "react";
import { getHomeCatalog, type HomeCatalog } from "@/lib/api";
import HotDealsSection from "./HotDealsSection";
import ProductSection from "./ProductSection";

// Seeded directly from the statically-built catalog, so first render already
// shows real content -- no loading state. On mount we silently refetch once
// to pick up anything that changed since the build (price, stock, a newly
// featured item) and swap it in if different; a failed refetch just keeps
// what was already rendered.
export default function HomeClient({ initialCatalog }: { initialCatalog: HomeCatalog }) {
  const [catalog, setCatalog] = useState(initialCatalog);

  useEffect(() => {
    let cancelled = false;

    getHomeCatalog()
      .then((fresh) => {
        if (!cancelled) setCatalog(fresh);
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
      <HotDealsSection products={catalog.hotDeals} />
      <ProductSection
        title="Bestsellers"
        subtitle="What Anaiza Nest shoppers are loving right now."
        products={catalog.bestsellers}
      />
      <ProductSection title="New Arrivals" subtitle="Fresh in this week." products={catalog.newArrivals} />
    </>
  );
}
