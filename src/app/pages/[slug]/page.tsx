import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { ApiError, getPage, getPages } from "@/lib/api";

// Static export needs every CMS page slug enumerated at build time — there's
// no server to render an unknown slug on demand.
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

  return { title: page?.title ?? "Page" };
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

  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <nav className="mb-6 text-xs text-muted">
        <Link href="/" className="hover:text-navy">
          Home
        </Link>
        <span className="mx-1.5">/</span>
        <span className="text-ink">{page.title}</span>
      </nav>

      <h1 className="font-serif text-3xl text-ink sm:text-4xl">{page.title}</h1>
      {page.content && (
        <div
          className="mt-8 space-y-4 text-sm leading-relaxed text-ink/80 [&_a]:text-navy [&_a]:underline [&_h2]:mt-8 [&_h2]:font-serif [&_h2]:text-2xl [&_h2]:text-ink [&_h3]:mt-6 [&_h3]:font-serif [&_h3]:text-xl [&_h3]:text-ink [&_li]:ml-5 [&_ol]:list-decimal [&_strong]:text-ink [&_ul]:list-disc"
          dangerouslySetInnerHTML={{ __html: page.content }}
        />
      )}
    </div>
  );
}
