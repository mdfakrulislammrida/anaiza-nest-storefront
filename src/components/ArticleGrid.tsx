import ArticleCard from "./ArticleCard";
import type { Article } from "@/lib/types";

// Shared by the client BlogListing and the static fallback -- one markup, so
// the swap between them doesn't move anything.
export default function ArticleGrid({
  articles,
  dimmed = false,
}: {
  articles: Article[];
  dimmed?: boolean;
}) {
  return (
    <div
      className={`grid grid-cols-1 gap-x-8 gap-y-12 transition-opacity sm:grid-cols-2 lg:grid-cols-3 ${
        dimmed ? "opacity-60" : "opacity-100"
      }`}
    >
      {articles.map((article) => (
        <ArticleCard key={article.id} article={article} />
      ))}
    </div>
  );
}
