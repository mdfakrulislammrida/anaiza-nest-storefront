import { getProducts } from "@/lib/api";
import Hero from "@/components/Hero";
import TrustBadges from "@/components/TrustBadges";
import HotDealsSection from "@/components/HotDealsSection";
import ProductSection from "@/components/ProductSection";
import NewsletterBanner from "@/components/NewsletterBanner";
import type { Product } from "@/lib/types";

export default async function Home() {
  let hotDeals: Product[] = [];
  let bestsellers: Product[] = [];
  let newArrivals: Product[] = [];
  let apiUnreachable = false;

  try {
    const [hotDealsRes, featuredRes, newArrivalsRes] = await Promise.all([
      getProducts({ on_sale: true, per_page: 5 }),
      getProducts({ is_featured: true, per_page: 8 }),
      getProducts({ is_new: true, sort: "newest", per_page: 9 }),
    ]);

    hotDeals = hotDealsRes.data;
    newArrivals = newArrivalsRes.data;

    bestsellers = featuredRes.data;
    if (bestsellers.length === 0) {
      bestsellers = (await getProducts({ sort: "newest", per_page: 8 })).data;
    }
  } catch {
    apiUnreachable = true;
  }

  return (
    <div>
      <Hero />
      <TrustBadges />

      {apiUnreachable ? (
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
