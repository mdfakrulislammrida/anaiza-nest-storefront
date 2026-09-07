import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ApiError, getPage } from "@/lib/api";

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
    <div className="mx-auto max-w-3xl px-6 py-20">
      <h1 className="font-serif text-4xl text-ink">{page.title}</h1>
      {page.content && (
        <div
          className="mt-8 space-y-4 leading-relaxed text-ink/80 [&_a]:text-gold [&_a]:underline [&_h2]:mt-8 [&_h2]:font-serif [&_h2]:text-2xl [&_h2]:text-ink [&_h3]:mt-6 [&_h3]:font-serif [&_h3]:text-xl [&_h3]:text-ink [&_li]:ml-5 [&_ol]:list-decimal [&_strong]:text-ink [&_ul]:list-disc"
          dangerouslySetInnerHTML={{ __html: page.content }}
        />
      )}
    </div>
  );
}
