import Link from "next/link";
import type { Page } from "@/lib/types";
import { proseHtml } from "@/lib/prose";

// Pure presentational -- shared by the statically-rendered server page and
// its client-side background-refresh wrapper.
export default function CmsPageContent({ page }: { page: Page }) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <span className="an-pour" aria-hidden="true" />
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
          className="an-prose mt-8"
          dangerouslySetInnerHTML={{ __html: proseHtml(page.content) }}
        />
      )}
    </div>
  );
}
