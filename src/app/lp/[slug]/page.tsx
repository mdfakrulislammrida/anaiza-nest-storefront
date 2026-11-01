import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ApiError, getLandingPage, getLandingPages, getPaymentSettings, getSlugRedirects } from "@/lib/api";
import { PLACEHOLDER_METADATA, PLACEHOLDER_SLUG, staticParamsWithOld } from "@/lib/placeholder";
import MovedNotice from "@/components/MovedNotice";
import { movedTo, oldSlugs, pathOf } from "@/lib/slugs";
import { siteDefaultShareImage } from "@/lib/defaultShare";
import { SITE_URL } from "@/lib/config";
import { pickShareImage, shareMetadata } from "@/lib/shareImage";
import { siteRobots } from "@/lib/seo";
import LandingPageClient from "@/components/LandingPageClient";
import NotFound from "@/app/not-found";

// A landing page open at build time is built into the HTML (the first paint is the real page, with no script needed).
// One made after the build is served by the /lp shell through the .htaccess fallback, so it works at once. Either way the
// page refreshes itself from the API when it opens, so an edit in the admin shows without a rebuild.
export async function generateStaticParams() {
  return staticParamsWithOld(await getLandingPages(), oldSlugs("landing_page", await getSlugRedirects()));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  if (slug === PLACEHOLDER_SLUG) return PLACEHOLDER_METADATA;

  const page = await getLandingPage(slug).catch(() => null);
  if (!page) return {};

  // Asked for by an old address, the page names its new one.
  const path = movedTo("landing_page", slug, page) ?? pathOf("landing_page", page);
  const image = pickShareImage([page.seo.image, page.seo.og_image], await siteDefaultShareImage(), SITE_URL);

  return {
    title: page.seo.title,
    description: page.seo.description ?? undefined,
    // A campaign page is kept out of search unless the admin switched that off (and staging builds stay noindex anyway).
    robots: page.seo.noindex ? { index: false, follow: false } : siteRobots(),
    alternates: { canonical: page.seo.canonical || path },
    ...shareMetadata({ title: page.seo.title, description: page.seo.description, url: path, image }),
  };
}

export default async function LandingPageRoute({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (slug === PLACEHOLDER_SLUG) return <NotFound />;

  const page = await getLandingPage(slug).catch((error: unknown) => {
    if (error instanceof ApiError && error.status === 404) notFound();
    throw error;
  });

  const moved = movedTo("landing_page", slug, page);
  if (moved !== null) return <MovedNotice to={moved} />;

  const paymentSettings = await getPaymentSettings().catch(() => null);

  return <LandingPageClient initialPage={page} initialPaymentSettings={paymentSettings} />;
}
