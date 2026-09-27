import Image from "next/image";
import Link from "next/link";
import type { Article } from "@/lib/types";
import { formatDate } from "@/lib/format";

// Pure presentational -- shared by the statically-rendered server page and
// its client-side background-refresh wrapper.
export default function BlogDetail({ article }: { article: Article }) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <nav className="mb-6 text-xs text-muted">
        <Link href="/" className="hover:text-navy">
          Home
        </Link>
        <span className="mx-1.5">/</span>
        <Link href="/blog" className="hover:text-navy">
          Blog
        </Link>
        <span className="mx-1.5">/</span>
        <span className="text-ink">{article.title}</span>
      </nav>

      {article.published_at && (
        <p className="text-xs font-semibold uppercase tracking-widest text-muted">
          {formatDate(article.published_at)}
        </p>
      )}
      <h1 className="mt-2 font-serif text-3xl text-ink sm:text-4xl">{article.title}</h1>

      {article.featured_image && (
        <div className="relative mt-8 aspect-[16/9] overflow-hidden rounded-xl bg-pill">
          <Image
            src={article.featured_image}
            alt={article.title}
            fill
            sizes="(min-width: 768px) 768px, 100vw"
            className="object-cover"
            priority
          />
        </div>
      )}

      {article.content && (
        <div
          className="mt-8 space-y-4 text-sm leading-relaxed text-ink/80 [&_a]:text-navy [&_a]:underline [&_h2]:mt-8 [&_h2]:font-serif [&_h2]:text-2xl [&_h2]:text-ink [&_h3]:mt-6 [&_h3]:font-serif [&_h3]:text-xl [&_h3]:text-ink [&_img]:rounded-lg [&_li]:ml-5 [&_ol]:list-decimal [&_strong]:text-ink [&_ul]:list-disc"
          dangerouslySetInnerHTML={{ __html: article.content }}
        />
      )}

      <div className="mt-12 border-t border-line pt-8">
        <Link href="/blog" className="text-sm font-medium text-navy hover:underline">
          ← Back to Blog
        </Link>
      </div>
    </div>
  );
}
