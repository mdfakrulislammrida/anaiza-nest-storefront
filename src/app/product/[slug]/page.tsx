import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ApiError, getAllProducts, getProduct, getProducts, getSiteSettings } from "@/lib/api";
import { breadcrumbJsonLd, faqPageJsonLd, productJsonLd } from "@/lib/jsonld";
import ProductDetailClient from "@/components/ProductDetailClient";
import NotFound from "@/app/not-found";
import { PLACEHOLDER_METADATA, PLACEHOLDER_SLUG, staticParamsOrPlaceholder } from "@/lib/placeholder";

// Static export needs every product slug enumerated at build time. A slug
// that doesn't appear here (added after this build) isn't 404 though --
// public/.htaccess falls back to the client-only shell at /product for any
// /product/<slug> request that doesn't match a file this generated.
export async function generateStaticParams() {
  return staticParamsOrPlaceholder(await getAllProducts());
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  if (slug === PLACEHOLDER_SLUG) return PLACEHOLDER_METADATA;
  const product = await getProduct(slug).catch(() => null);
  if (!product) return {};

  const title = product.seo?.meta_title || product.name;
  const description = product.seo?.meta_description || product.short_description || undefined;
  const image = product.seo?.og_image || product.images?.[0]?.url;

  return {
    title,
    description,
    alternates: { canonical: `/product/${product.slug}` },
    openGraph: {
      title,
      description,
      type: "website",
      url: `/product/${product.slug}`,
      ...(image ? { images: [{ url: image }] } : {}),
    },
    ...(image ? { twitter: { card: "summary_large_image", title, description, images: [image] } } : {}),
  };
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  // The empty-catalogue placeholder: the calm not-found page, rendered into the HTML itself (noindex via generateMetadata).
  if (slug === PLACEHOLDER_SLUG) return <NotFound />;

  const product = await getProduct(slug).catch((error: unknown) => {
    if (error instanceof ApiError && error.status === 404) {
      notFound();
    }
    throw error;
  });

  // Delivery/returns in the product schema come from the editable store policy.
  const siteSettings = await getSiteSettings().catch(() => null);

  const related = await getProducts({ category: product.category.slug, per_page: 5 })
    .then((res) => res.data.filter((p) => p.id !== product.id).slice(0, 4))
    .catch(() => []);

  const breadcrumbs = breadcrumbJsonLd([
    { name: "Home", path: "/" },
    { name: product.category.name, path: `/category/${product.category.slug}` },
    { name: product.name, path: `/product/${product.slug}` },
  ]);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd(product, siteSettings?.policy)) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs) }}
      />
      {product.faqs && product.faqs.length > 0 && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqPageJsonLd(product.faqs)) }}
        />
      )}
      <ProductDetailClient initialProduct={product} initialRelated={related} />
    </>
  );
}
