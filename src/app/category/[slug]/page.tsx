import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ApiError, getCategories, getCategory, getProducts } from "@/lib/api";
import { breadcrumbJsonLd, categoryMetaFromApi, faqPageJsonLd, itemListJsonLd } from "@/lib/jsonld";
import CategoryDetailClient from "@/components/CategoryDetailClient";
import NotFound from "@/app/not-found";
import { PLACEHOLDER_METADATA, PLACEHOLDER_SLUG, staticParamsOrPlaceholder } from "@/lib/placeholder";

// Static export needs every category slug enumerated at build time. A slug
// that doesn't appear here (added after this build) isn't 404 though -- see
// the equivalent comment on /product/[slug]/page.tsx for the same pattern;
// categories don't have a flat-shell fallback yet since there are far fewer
// of them and they change far less often than products.
export async function generateStaticParams() {
  return staticParamsOrPlaceholder(await getCategories());
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  if (slug === PLACEHOLDER_SLUG) return PLACEHOLDER_METADATA;
  const category = await getCategory(slug).catch(() => null);
  if (!category) return {};

  const { title, description, image } = categoryMetaFromApi(category);

  return {
    title,
    description,
    alternates: { canonical: `/category/${category.slug}` },
    openGraph: {
      title,
      description,
      type: "website",
      url: `/category/${category.slug}`,
      ...(image ? { images: [{ url: image }] } : {}),
    },
  };
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  // The empty-catalogue placeholder: the calm not-found page, rendered into the HTML itself (noindex via generateMetadata).
  if (slug === PLACEHOLDER_SLUG) return <NotFound />;

  const category = await getCategory(slug).catch((error: unknown) => {
    if (error instanceof ApiError && error.status === 404) {
      notFound();
    }
    throw error;
  });

  // First page, same query the client makes -- rendered into the static HTML and described in ItemList JSON-LD.
  const initialProducts = await getProducts({ category: category.slug, page: 1, per_page: 24 }).catch(
    () => null,
  );

  const breadcrumbs = breadcrumbJsonLd([
    { name: "Home", path: "/" },
    { name: category.name, path: `/category/${category.slug}` },
  ]);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs) }}
      />
      {initialProducts && initialProducts.data.length > 0 && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(
              itemListJsonLd(category.name, `/category/${category.slug}`, initialProducts.data),
            ),
          }}
        />
      )}
      {category.faqs && category.faqs.length > 0 && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqPageJsonLd(category.faqs)) }}
        />
      )}
      <CategoryDetailClient initialCategory={category} initialProducts={initialProducts} />
    </>
  );
}
