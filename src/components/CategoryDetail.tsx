import { Suspense } from "react";
import ProductListing from "@/components/ProductListing";
import ProductListingFallback from "@/components/ProductListingFallback";
import Accordion from "@/components/Accordion";
import GiftFrame from "@/components/GiftFrame";
import CategoryAbout from "@/components/CategoryAbout";
import type { CategoryDetail as CategoryDetailType, ProductListResponse } from "@/lib/types";

// Pure presentational -- shared by the statically-rendered server page and
// its client-side background-refresh wrapper, so both render identical
// markup regardless of which one is currently supplying the data.
export default function CategoryDetail({
  category,
  initialProducts,
}: {
  category: CategoryDetailType;
  initialProducts: ProductListResponse | null;
}) {
  const { banner_desktop: desktop, banner_mobile: mobile } = category;
  const hasBanner = Boolean(desktop.url || mobile.url);

  return (
    <div>
      {hasBanner && (
        <div className="relative aspect-[3/2] w-full overflow-hidden bg-linen sm:aspect-[4/1]">
          <picture>
            {mobile.url && <source media="(max-width: 639px)" srcSet={mobile.url} />}
            <img
              src={desktop.url ?? mobile.url ?? undefined}
              alt={category.name}
              width={desktop.width ?? mobile.width ?? undefined}
              height={desktop.height ?? mobile.height ?? undefined}
              fetchPriority="high"
              loading="eager"
              decoding="sync"
              className="absolute inset-0 h-full w-full object-cover"
            />
          </picture>
          {/* The kit's gift frame, on the category banner. */}
          <GiftFrame tone="gold" />
        </div>
      )}

      <div className="mx-auto max-w-7xl px-4 pt-10 sm:px-6">
        <h1 className="font-serif text-charcoal text-h1">{category.name}</h1>
        {category.intro_text && (
          <p className="an-intro">{category.intro_text}</p>
        )}
      </div>

      <div className="mt-4">
        <Suspense
          fallback={
            <ProductListingFallback
              result={initialProducts}
              breadcrumbLabel={category.name}
              basePath={`/category/${category.slug}`}
              emptyTitle="Nothing in this category just yet"
              emptyText="We are still setting this category out. Please check back soon, or have a look at the rest of the collection."
              emptyLink={{ href: "/shop", label: "See all gifts" }}
            />
          }
        >
          <ProductListing
            fixedParams={{ category: category.slug }}
            breadcrumbLabel={category.name}
            initialResult={initialProducts}
            emptyTitle="Nothing in this category just yet"
              emptyText="We are still setting this category out. Please check back soon, or have a look at the rest of the collection."
              emptyLink={{ href: "/shop", label: "See all gifts" }}
          />
        </Suspense>
      </div>

      {category.seo_description && <CategoryAbout name={category.name} html={category.seo_description} />}

      {category.faqs && category.faqs.length > 0 && (
        <section className="mx-auto max-w-3xl px-4 pb-16 sm:px-6">
          <h2 className="mb-4 font-serif text-charcoal text-h2">
            Frequently asked questions
          </h2>
          <div>
            {category.faqs.map((faq) => (
              <Accordion key={faq.id} title={faq.question} asHeading>
                {faq.answer}
              </Accordion>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
