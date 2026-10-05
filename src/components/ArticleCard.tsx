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
      <div className="relative aspect-[16/10] overflow-hidden bg-linen">
        {article.featured_image ? (
          <Image
            src={article.featured_image}
            alt={article.title}
            fill
            sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-linen">
            <span className="font-serif text-body text-charcoal/20">Anaiza Nest</span>
          </div>
        )}
      </div>

      <div className="mt-4 space-y-2">
        {article.published_at && (
          <p className="text-caption font-semibold text-stone">
            {formatDate(article.published_at)}
          </p>
        )}
        <h2 className="line-clamp-2 font-serif text-charcoal group-hover:text-navy text-h2">{article.title}</h2>
        <p className="line-clamp-2 text-body text-charcoal/70">{excerptFromHtml(article.content)}</p>
      </div>
    </a>
  );
}
