import Link from "next/link";
import { Suspense } from "react";
import ProductListing from "@/components/ProductListing";
import ProductListingFallback from "@/components/ProductListingFallback";
import Accordion from "@/components/Accordion";
import CategoryIntro from "@/components/CategoryIntro";
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
      {/* On a phone the banner is capped at 220 px (still filling its box from the centre), so the title and the products
          are not a screen down; the frame is 4% of the shorter side of whatever the box is. */}
      {hasBanner && (
        <div className="relative aspect-[3/2] max-h-[13.75rem] w-full overflow-hidden bg-linen sm:aspect-[4/1] sm:max-h-none">
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

      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        {/* "Home / Name" above the title, where it says where you are; the list below does not repeat it. */}
        <nav aria-label="Breadcrumb" className="pb-3 pt-4 text-caption text-stone">
          <Link href="/" className="hover:text-navy">
            Home
          </Link>
          <span className="mx-1.5">/</span>
          <span className="text-charcoal">{category.name}</span>
        </nav>
        <h1 className="font-serif text-charcoal text-h1">{category.name}</h1>
        {category.intro_text && <CategoryIntro text={category.intro_text} />}
      </div>

      <div className="mt-4">
        <Suspense
          fallback={
            <ProductListingFallback
              result={initialProducts}
              breadcrumbLabel={category.name}
              showBreadcrumb={false}
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
            showBreadcrumb={false}
            initialResult={initialProducts}
            emptyTitle="Nothing in this category just yet"
              emptyText="We are still setting this category out. Please check back soon, or have a look at the rest of the collection."
              emptyLink={{ href: "/shop", label: "See all gifts" }}
          />
        </Suspense>
      </div>

      {category.seo_description && <CategoryAbout name={category.name} html={category.seo_description} />}

      {/* The FAQ sits in the same 720 px column as the About text above, so the two share one left edge. */}
      {category.faqs && category.faqs.length > 0 && (
        <section className="mx-auto max-w-[45rem] px-4 pb-16 sm:px-6">
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
