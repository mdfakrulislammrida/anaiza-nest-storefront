import type { Metadata } from "next";
import { getHomeCatalog, getHomepageSections } from "@/lib/api";
import { DEFAULT_HOMEPAGE_SECTIONS } from "@/lib/defaultHomepageSections";
import HomeClient from "@/components/HomeClient";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

export default async function Home() {
  const catalog = await getHomeCatalog().catch(() => null);
  const sections = await getHomepageSections().catch(() => null);

  return (
    <div>
      {catalog ? (
        <HomeClient
          initialCatalog={catalog}
          initialSections={sections && sections.length > 0 ? sections : DEFAULT_HOMEPAGE_SECTIONS}
        />
      ) : (
        <div className="mx-auto max-w-7xl px-4 py-20 text-center sm:px-6">
          <p className="text-stone">
            We couldn&apos;t load the collection just now. Please refresh in a moment.
          </p>
        </div>
      )}
    </div>
  );
}
