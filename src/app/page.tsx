import { getHomeCatalog } from "@/lib/api";
import Hero from "@/components/Hero";
import TrustBadges from "@/components/TrustBadges";
import NewsletterBanner from "@/components/NewsletterBanner";
import HomeClient from "@/components/HomeClient";

export default async function Home() {
  const catalog = await getHomeCatalog().catch(() => null);

  return (
    <div>
      <Hero />
      <TrustBadges />

      {catalog ? (
        <HomeClient initialCatalog={catalog} />
      ) : (
        <div className="mx-auto max-w-7xl px-4 py-20 text-center sm:px-6">
          <p className="text-muted">
            We couldn&apos;t reach the catalog right now. Please make sure the
            Anaiza Nest API is running and refresh.
          </p>
        </div>
      )}

      <NewsletterBanner />
    </div>
  );
}
