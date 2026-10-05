import Link from "next/link";
import type { Page } from "@/lib/types";
import { RICH_TABLE_CLASSES, wrapTables } from "@/lib/richHtml";

// Pure presentational -- shared by the statically-rendered server page and
// its client-side background-refresh wrapper.
export default function CmsPageContent({ page }: { page: Page }) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <nav className="mb-6 text-caption text-stone">
        <Link href="/" className="hover:text-navy">
          Home
        </Link>
        <span className="mx-1.5">/</span>
        <span className="text-charcoal">{page.title}</span>
      </nav>

      <h1 className="font-serif text-charcoal text-h1">{page.title}</h1>
      {page.content && (
        <div
          className={`mt-8 space-y-4 text-body leading-relaxed text-charcoal/80 [&_a]:text-navy [&_a]:underline [&_h2]:mt-8 [&_h2]:font-serif [&_h2]:text-h2 [&_h2]:text-charcoal [&_h3]:mt-6 [&_h3]:font-serif [&_h3]:text-h2 [&_h3]:text-charcoal [&_li]:ml-6 [&_ol]:list-decimal [&_strong]:text-charcoal [&_ul]:list-disc ${RICH_TABLE_CLASSES}`}
          dangerouslySetInnerHTML={{ __html: wrapTables(page.content) }}
        />
      )}
    </div>
  );
}
