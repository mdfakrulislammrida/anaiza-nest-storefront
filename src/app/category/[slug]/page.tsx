import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ApiError, getCategories, getCategory } from "@/lib/api";
import { breadcrumbJsonLd, categoryMetaFromApi, faqPageJsonLd } from "@/lib/jsonld";
import CategoryDetailClient from "@/components/CategoryDetailClient";

// Static export needs every category slug enumerated at build time. A slug
// that doesn't appear here (added after this build) isn't 404 though -- see
// the equivalent comment on /product/[slug]/page.tsx for the same pattern;
// categories don't have a flat-shell fallback yet since there are far fewer
// of them and they change far less often than products.
export async function generateStaticParams() {
  const categories = await getCategories();
  return categories.map((category) => ({ slug: category.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
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

  const category = await getCategory(slug).catch((error: unknown) => {
    if (error instanceof ApiError && error.status === 404) {
      notFound();
    }
    throw error;
  });

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
      {category.faqs && category.faqs.length > 0 && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqPageJsonLd(category.faqs)) }}
        />
      )}
      <CategoryDetailClient initialCategory={category} />
    </>
  );
}
