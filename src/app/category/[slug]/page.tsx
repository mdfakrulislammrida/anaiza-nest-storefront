import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ApiError, getCategories, getCategory, getProducts, getSlugRedirects } from "@/lib/api";
import { breadcrumbJsonLd, categoryMetaFromApi, faqPageJsonLd, itemListJsonLd } from "@/lib/jsonld";
import CategoryDetailClient from "@/components/CategoryDetailClient";
import NotFound from "@/app/not-found";
import { PLACEHOLDER_METADATA, PLACEHOLDER_SLUG, staticParamsWithOld } from "@/lib/placeholder";
import MovedNotice from "@/components/MovedNotice";
import { siteDefaultShareImage } from "@/lib/defaultShare";
import { SITE_URL } from "@/lib/config";
import { pickShareImage, shareMetadata } from "@/lib/shareImage";
import { movedTo, oldSlugs, pathOf } from "@/lib/slugs";

// Static export needs every category slug enumerated at build time. A slug
// that doesn't appear here (added after this build) isn't 404 though -- see
// the equivalent comment on /product/[slug]/page.tsx for the same pattern;
// categories don't have a flat-shell fallback yet since there are far fewer
// of them and they change far less often than products.
export async function generateStaticParams() {
  // Every category, and a stand-in for each address one used to have, so an old link leads to the new address.
  return staticParamsWithOld(await getCategories(), oldSlugs("category", await getSlugRedirects()));
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

  const { title, description, images } = categoryMetaFromApi(category);
  // The address the page lives at today: an old address names the new one as canonical.
  const path = movedTo("category", slug, category) ?? pathOf("category", category);
  const image = pickShareImage(images, await siteDefaultShareImage(), SITE_URL);

  return {
    title,
    description,
    alternates: { canonical: path },
    ...shareMetadata({ title, description, url: path, image }),
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

  // An old address: a small page that sends the visitor on (its canonical, in the head above, is the new address).
  const moved = movedTo("category", slug, category);
  if (moved !== null) return <MovedNotice to={moved} />;

  const categoryPath = pathOf("category", category);
  const breadcrumbs = breadcrumbJsonLd([
    { name: "Home", path: "/" },
    { name: category.name, path: categoryPath },
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
              itemListJsonLd(category.name, categoryPath, initialProducts.data),
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
