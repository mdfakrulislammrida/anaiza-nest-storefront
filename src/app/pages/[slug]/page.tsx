import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ApiError, getPage, getPages, getSlugRedirects } from "@/lib/api";
import { breadcrumbJsonLd, pageMetaFromCms } from "@/lib/jsonld";
import CmsPageClient from "@/components/CmsPageClient";
import NotFound from "@/app/not-found";
import { PLACEHOLDER_METADATA, PLACEHOLDER_SLUG, staticParamsWithOld } from "@/lib/placeholder";
import MovedNotice from "@/components/MovedNotice";
import { siteDefaultShareImage } from "@/lib/defaultShare";
import { SITE_URL } from "@/lib/config";
import { pickShareImage, shareMetadata } from "@/lib/shareImage";
import { movedTo, oldSlugs, pathOf } from "@/lib/slugs";

// Static export needs every CMS page slug enumerated at build time. A slug
// that doesn't appear here (added after this build) isn't 404 though --
// public/.htaccess falls back to the client-only shell at /pages for any
// /pages/<slug> request that doesn't match a file this generated.
export async function generateStaticParams() {
  return staticParamsWithOld(await getPages(), oldSlugs("page", await getSlugRedirects()));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  if (slug === PLACEHOLDER_SLUG) return PLACEHOLDER_METADATA;
  const page = await getPage(slug).catch(() => null);
  if (!page) return {};

  const { title, description, images } = pageMetaFromCms(page);
  const path = movedTo("page", slug, page) ?? pathOf("page", page);
  const image = pickShareImage(images, await siteDefaultShareImage(), SITE_URL);

  return {
    title,
    description,
    alternates: { canonical: path },
    ...shareMetadata({ title, description, url: path, image }),
  };
}

export default async function CmsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  // The empty-catalogue placeholder: the calm not-found page, rendered into the HTML itself (noindex via generateMetadata).
  if (slug === PLACEHOLDER_SLUG) return <NotFound />;

  const page = await getPage(slug).catch((error: unknown) => {
    if (error instanceof ApiError && error.status === 404) {
      notFound();
    }
    throw error;
  });

  const moved = movedTo("page", slug, page);
  if (moved !== null) return <MovedNotice to={moved} />;

  const breadcrumbs = breadcrumbJsonLd([
    { name: "Home", path: "/" },
    { name: page.title, path: pathOf("page", page) },
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
