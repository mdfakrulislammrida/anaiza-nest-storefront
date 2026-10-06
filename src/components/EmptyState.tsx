import Link from "next/link";

// A calm, complete empty state (heading, one sentence, one way forward) for any list that has nothing
// in it yet: a new shop with no products, a category with none assigned, a blog with no articles,
// or special prices when nothing is marked down. Never an empty heading, never a spinner.
export default function EmptyState({
  title = "Nothing here just yet",
  text = "The collection is still being set out. Please check back soon, or get in touch and we will help you find a gift.",
  linkHref = "/contact",
  linkLabel = "Get in touch",
}: {
  title?: string;
  text?: string;
  linkHref?: string;
  linkLabel?: string;
}) {
  return (
    <div className="mx-auto max-w-xl px-4 py-20 text-center">
      <h2 className="font-serif text-h2 text-charcoal">{title}</h2>
      <p className="mt-4 text-body text-stone">{text}</p>
      <Link
        href={linkHref}
        className="mt-8 inline-flex items-center justify-center rounded-btn bg-navy px-8 py-4 text-button text-ivory transition-opacity hover:opacity-90"
      >
        {linkLabel}
      </Link>
    </div>
  );
}
