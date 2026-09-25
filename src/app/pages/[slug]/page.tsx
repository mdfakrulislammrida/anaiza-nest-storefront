import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ApiError, getPage, getPages } from "@/lib/api";
import { breadcrumbJsonLd, pageMetaFromCms } from "@/lib/jsonld";
import CmsPageClient from "@/components/CmsPageClient";

// Static export needs every CMS page slug enumerated at build time. A slug
// that doesn't appear here (added after this build) isn't 404 though --
// public/.htaccess falls back to the client-only shell at /pages for any
// /pages/<slug> request that doesn't match a file this generated.
export async function generateStaticParams() {
  const pages = await getPages();
  return pages.map((page) => ({ slug: page.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const page = await getPage(slug).catch(() => null);
  if (!page) return {};

  const { title, description, image } = pageMetaFromCms(page);

  return {
    title,
    description,
    alternates: { canonical: `/pages/${page.slug}` },
    openGraph: {
      title,
      description,
      type: "website",
      url: `/pages/${page.slug}`,
      ...(image ? { images: [{ url: image }] } : {}),
    },
  };
}

export default async function CmsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const page = await getPage(slug).catch((error: unknown) => {
    if (error instanceof ApiError && error.status === 404) {
      notFound();
    }
    throw error;
  });

  const breadcrumbs = breadcrumbJsonLd([
    { name: "Home", path: "/" },
    { name: page.title, path: `/pages/${page.slug}` },
  ]);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs) }}
      />
      <CmsPageClient initialPage={page} />
    </>
  );
}
