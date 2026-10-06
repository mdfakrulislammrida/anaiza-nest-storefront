import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ApiError, getAllArticles, getArticle } from "@/lib/api";
import { articleJsonLd, breadcrumbJsonLd } from "@/lib/jsonld";
import BlogDetailClient from "@/components/BlogDetailClient";
import NotFound from "@/app/not-found";
import { PLACEHOLDER_METADATA, PLACEHOLDER_SLUG, staticParamsOrPlaceholder } from "@/lib/placeholder";

// Static export needs every published article slug enumerated at build
// time. A slug that doesn't appear here (published after the last build)
// isn't 404 though -- public/.htaccess falls back to the client-only shell
// at /article for any /blog/<slug> request that doesn't match a file this
// generated.
export async function generateStaticParams() {
  return staticParamsOrPlaceholder(await getAllArticles());
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  if (slug === PLACEHOLDER_SLUG) return PLACEHOLDER_METADATA;
  const article = await getArticle(slug).catch(() => null);
  if (!article) return {};

  const title = article.seo?.meta_title || article.title;
  const description = article.seo?.meta_description ?? undefined;
  const image = article.seo?.og_image || article.featured_image || undefined;

  return {
    title,
    description,
    alternates: { canonical: `/blog/${article.slug}` },
    openGraph: {
      title,
      description,
      type: "article",
      url: `/blog/${article.slug}`,
      ...(article.published_at ? { publishedTime: article.published_at } : {}),
      ...(image ? { images: [{ url: image }] } : {}),
    },
    ...(image ? { twitter: { card: "summary_large_image", title, description, images: [image] } } : {}),
  };
}

export default async function BlogArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  // The empty-catalogue placeholder: the calm not-found page, rendered into the HTML itself (noindex via generateMetadata).
  if (slug === PLACEHOLDER_SLUG) return <NotFound />;

  const article = await getArticle(slug).catch((error: unknown) => {
    if (error instanceof ApiError && error.status === 404) {
      notFound();
    }
    throw error;
  });

  const breadcrumbs = breadcrumbJsonLd([
    { name: "Home", path: "/" },
    { name: "Blog", path: "/blog" },
    { name: article.title, path: `/blog/${article.slug}` },
  ]);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd(article)) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs) }}
      />
      <BlogDetailClient initialArticle={article} />
    </>
  );
}
