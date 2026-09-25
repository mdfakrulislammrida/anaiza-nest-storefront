import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ApiError, getAllProducts, getProduct, getProducts } from "@/lib/api";
import { breadcrumbJsonLd, productJsonLd } from "@/lib/jsonld";
import ProductDetailClient from "@/components/ProductDetailClient";

// Static export needs every product slug enumerated at build time. A slug
// that doesn't appear here (added after this build) isn't 404 though --
// public/.htaccess falls back to the client-only shell at /product for any
// /product/<slug> request that doesn't match a file this generated.
export async function generateStaticParams() {
  const products = await getAllProducts();
  return products.map((product) => ({ slug: product.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProduct(slug).catch(() => null);
  if (!product) return {};

  const title = product.seo?.meta_title || product.name;
  const description = product.seo?.meta_description || product.description || undefined;
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

  const product = await getProduct(slug).catch((error: unknown) => {
    if (error instanceof ApiError && error.status === 404) {
      notFound();
    }
    throw error;
  });

  const related = await getProducts({ category: product.category.slug, per_page: 5 })
    .then((res) => res.data.filter((p) => p.id !== product.id).slice(0, 4))
    .catch(() => []);

  const breadcrumbs = breadcrumbJsonLd([
    { name: "Home", path: "/" },
    { name: "Gifts", path: `/shop?category=${product.category.slug}` },
    { name: product.name, path: `/product/${product.slug}` },
  ]);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd(product)) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs) }}
      />
      <ProductDetailClient initialProduct={product} initialRelated={related} />
    </>
  );
}
