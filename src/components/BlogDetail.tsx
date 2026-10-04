import Image from "next/image";
import Link from "next/link";
import type { Article } from "@/lib/types";
import { formatDate } from "@/lib/format";
import { RICH_TABLE_CLASSES, addHeadingAnchors, wrapTables } from "@/lib/richHtml";

// Pure presentational -- shared by the statically-rendered server page and
// its client-side background-refresh wrapper.
export default function BlogDetail({ article }: { article: Article }) {
  // Anchor ids and the table of contents are computed from the body's <h2>s,
  // so they are in the static HTML and the jump links work without JavaScript.
  const body = article.content ? addHeadingAnchors(wrapTables(article.content)) : null;
  const authorName = article.author?.name;
  const authorBio = article.author?.bio;

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

      <p className="mt-3 text-sm text-muted">
        {authorName && (
          <>
            By <span className="font-medium text-ink">{authorName}</span>
            {" · "}
          </>
        )}
        Last updated <time dateTime={article.updated_at}>{formatDate(article.updated_at)}</time>
      </p>

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

      {body && body.toc.length >= 2 && (
        <nav aria-label="Table of contents" className="mt-8 rounded-xl border border-line bg-cream p-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted">In this article</p>
          <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-sm">
            {body.toc.map((item) => (
              <li key={item.id}>
                <a href={`#${item.id}`} className="text-navy hover:underline">
                  {item.text}
                </a>
              </li>
            ))}
          </ol>
        </nav>
      )}

      {body && (
        <div
          // scroll-mt keeps an anchored heading clear of the sticky header.
          className={`mt-8 space-y-4 text-sm leading-relaxed text-ink/80 [&_a]:text-navy [&_a]:underline [&_h2]:mt-8 [&_h2]:scroll-mt-24 [&_h2]:font-serif [&_h2]:text-2xl [&_h2]:text-ink [&_h3]:mt-6 [&_h3]:font-serif [&_h3]:text-xl [&_h3]:text-ink [&_img]:rounded-lg [&_li]:ml-5 [&_ol]:list-decimal [&_strong]:text-ink [&_ul]:list-disc ${RICH_TABLE_CLASSES}`}
          dangerouslySetInnerHTML={{ __html: body.html }}
        />
      )}

      {authorName && authorBio && (
        <aside className="mt-12 rounded-xl border border-line p-5 text-sm">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted">About the author</p>
          <p className="mt-2 font-medium text-ink">{authorName}</p>
          <p className="mt-1 leading-relaxed text-ink/80">{authorBio}</p>
        </aside>
      )}

      <div className="mt-12 border-t border-line pt-8">
        <Link href="/blog" className="text-sm font-medium text-navy hover:underline">
          ← Back to Blog
        </Link>
      </div>
    </div>
  );
}
