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
      <nav className="mb-6 text-caption text-stone">
        <Link href="/" className="hover:text-navy">
          Home
        </Link>
        <span className="mx-1.5">/</span>
        <Link href="/blog" className="hover:text-navy">
          Blog
        </Link>
        <span className="mx-1.5">/</span>
        <span className="text-charcoal">{article.title}</span>
      </nav>

      {article.published_at && (
        <p className="text-caption font-semibold text-stone">
          {formatDate(article.published_at)}
        </p>
      )}
      <h1 className="mt-2 font-serif text-charcoal text-h1">{article.title}</h1>

      <p className="mt-4 text-body text-stone">
        {authorName && (
          <>
            By <span className="font-medium text-charcoal">{authorName}</span>
            {" · "}
          </>
        )}
        Last updated <time dateTime={article.updated_at}>{formatDate(article.updated_at)}</time>
      </p>

      {article.featured_image && (
        <div className="relative mt-8 aspect-[16/9] overflow-hidden rounded-xl bg-linen">
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
        <nav aria-label="Table of contents" className="mt-8 rounded-xl border border-linen bg-linen p-6">
          <p className="text-caption font-semibold text-stone">In this article</p>
          <ol className="mt-4 list-decimal space-y-1.5 pl-6 text-body">
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
          className={`mt-8 space-y-4 text-body leading-relaxed text-charcoal/80 [&_a]:text-navy [&_a]:underline [&_h2]:mt-8 [&_h2]:scroll-mt-24 [&_h2]:font-serif [&_h2]:text-h2 [&_h2]:text-charcoal [&_h3]:mt-6 [&_h3]:font-serif [&_h3]:text-h2 [&_h3]:text-charcoal [&_img]:rounded-lg [&_li]:ml-6 [&_ol]:list-decimal [&_strong]:text-charcoal [&_ul]:list-disc ${RICH_TABLE_CLASSES}`}
          dangerouslySetInnerHTML={{ __html: body.html }}
        />
      )}

      {authorName && authorBio && (
        <aside className="mt-12 rounded-xl border border-linen p-6 text-body">
          <p className="text-caption font-semibold text-stone">About the author</p>
          <p className="mt-2 font-medium text-charcoal">{authorName}</p>
          <p className="mt-1 leading-relaxed text-charcoal/80">{authorBio}</p>
        </aside>
      )}

      <div className="mt-12 border-t border-linen pt-8">
        <Link href="/blog" className="text-body font-medium text-navy hover:underline">
          ← Back to Blog
        </Link>
      </div>
    </div>
  );
}
