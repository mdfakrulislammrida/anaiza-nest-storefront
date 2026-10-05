import { Suspense } from "react";
import ProductListing from "@/components/ProductListing";
import ProductListingFallback from "@/components/ProductListingFallback";
import Accordion from "@/components/Accordion";
import GiftFrame from "@/components/GiftFrame";
import { RICH_TABLE_CLASSES, wrapTables } from "@/lib/richHtml";
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
          <GiftFrame />
        </div>
      )}

      <div className="mx-auto max-w-7xl px-4 pt-10 sm:px-6">
        <h1 className="font-serif text-charcoal text-h1">{category.name}</h1>
        {category.intro_text && (
          <p className="mt-4 max-w-2xl text-body leading-relaxed text-charcoal/80">{category.intro_text}</p>
        )}
      </div>

      <div className="mt-4">
        <Suspense
          fallback={
            <ProductListingFallback
              result={initialProducts}
              breadcrumbLabel={category.name}
              basePath={`/category/${category.slug}`}
            />
          }
        >
          <ProductListing
            fixedParams={{ category: category.slug }}
            breadcrumbLabel={category.name}
            initialResult={initialProducts}
          />
        </Suspense>
      </div>

      {category.seo_description && (
        <section className="mx-auto max-w-3xl px-4 pb-16 sm:px-6">
          <h2 className="mb-4 font-serif text-charcoal text-h2">About {category.name}</h2>
          {/* CSS-only mobile collapse: the checkbox drives a `peer` class so
              the clipped height only ever changes via CSS (`peer-checked`,
              `sm:`), never JS -- the full description HTML below is always
              present in the server-rendered markup regardless of screen
              size or checkbox state. */}
          <input type="checkbox" id="category-description-expand" className="peer sr-only" />
          <div
            className={`max-h-40 overflow-hidden text-body leading-relaxed text-charcoal/80 [&_a]:text-navy [&_a]:underline [&_h2]:mt-4 [&_h2]:font-serif [&_h2]:text-body [&_h2]:text-charcoal [&_h2]:first:mt-0 [&_li]:ml-6 [&_ol]:list-decimal [&_p]:mt-4 [&_p]:first:mt-0 [&_ul]:list-disc peer-checked:max-h-none sm:max-h-none sm:overflow-visible ${RICH_TABLE_CLASSES}`}
            dangerouslySetInnerHTML={{ __html: wrapTables(category.seo_description) }}
          />
          <label
            htmlFor="category-description-expand"
            className="mt-2 inline-block cursor-pointer text-body font-medium text-navy underline peer-checked:hidden sm:hidden"
          >
            Read more
          </label>
          <label
            htmlFor="category-description-expand"
            className="mt-2 hidden cursor-pointer text-body font-medium text-navy underline peer-checked:inline-block sm:hidden"
          >
            Read less
          </label>
        </section>
      )}

      {category.faqs && category.faqs.length > 0 && (
        <section className="mx-auto max-w-3xl px-4 pb-16 sm:px-6">
          <h2 className="mb-4 font-serif text-charcoal text-h2">
            Frequently Asked Questions
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
