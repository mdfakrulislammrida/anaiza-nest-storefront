import Link from "next/link";
import Seal from "./Seal";

// A calm, complete empty state for any list that has nothing in it yet: the seal, one warm line, and one way forward as an
// outline button. A new shop with no products, a category with none assigned, an empty cart or wishlist, a search that
// found nothing, or special prices when nothing is marked down. Never an empty heading, never a spinner. The seal is the
// page's one, so a page that shows this has no other.
export default function EmptyState({
  title = "Nothing here just yet",
  text = "The collection is still being set out. Please check back soon, or get in touch and we will help you find a gift.",
  linkHref = "/contact",
  linkLabel = "Get in touch",
  heading = "h2",
}: {
  title?: string;
  text?: string;
  linkHref?: string;
  linkLabel?: string;
  // The page's own title is the heading when the page has nothing else (the empty cart).
  heading?: "h1" | "h2";
}) {
  const Heading = heading;

  return (
    <div className="mx-auto max-w-xl px-4 py-20 text-center">
      <Seal message="Packed by hand" className="mx-auto" />
      <Heading className={`mt-6 font-serif text-charcoal ${heading === "h1" ? "text-h1" : "text-h2"}`}>{title}</Heading>
      <p className="mt-3 text-body text-stone">{text}</p>
      <Link
        href={linkHref}
        className="mt-8 inline-flex min-h-11 items-center justify-center rounded-btn border border-navy px-8 text-button text-navy transition-colors duration-200 ease-out hover:bg-linen"
      >
        {linkLabel}
      </Link>
    </div>
  );
}
