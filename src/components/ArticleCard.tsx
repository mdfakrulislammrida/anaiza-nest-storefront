import Image from "next/image";
import type { Article } from "@/lib/types";
import { formatDate } from "@/lib/format";
import { excerptFromHtml } from "@/lib/text";

export default function ArticleCard({ article }: { article: Article }) {
  return (
    // Plain <a>, not next/link: a slug added after the last build is served
    // by the flat shell at /article (see src/app/article/page.tsx), which
    // only resolves correctly on a real browser navigation, not a
    // client-side one -- same reasoning as ProductCard's product links.
    <a href={`/blog/${article.slug}`} className="group block">
      <div className="relative aspect-[16/10] overflow-hidden bg-pill">
        {article.featured_image ? (
          <Image
            src={article.featured_image}
            alt={article.title}
            fill
            sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-cream to-pill">
            <span className="font-serif text-lg text-ink/20">Anaiza Nest</span>
          </div>
        )}
      </div>

      <div className="mt-4 space-y-2">
        {article.published_at && (
          <p className="text-xs font-semibold uppercase tracking-widest text-muted">
            {formatDate(article.published_at)}
          </p>
        )}
        <h2 className="line-clamp-2 font-serif text-xl text-ink group-hover:text-navy">{article.title}</h2>
        <p className="line-clamp-2 text-sm text-ink/70">{excerptFromHtml(article.content)}</p>
      </div>
    </a>
  );
}
