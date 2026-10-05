import type { ReactNode } from "react";

export default function Accordion({
  title,
  children,
  defaultOpen = false,
  asHeading = false,
}: {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
  // Render the title as a real <h3> inside the <summary> (valid HTML) -- used
  // for FAQ questions so they are headings in the page outline. The answer is
  // always in the HTML either way, whether or not the item is open.
  asHeading?: boolean;
}) {
  return (
    <details className="group border-b border-linen py-4" open={defaultOpen}>
      <summary className="flex cursor-pointer list-none items-center justify-between text-body font-medium text-charcoal">
        {asHeading ? <h3 className="font-medium text-body">{title}</h3> : title}
        <span className="text-body text-stone transition-transform group-open:rotate-45">+</span>
      </summary>
      <div className="mt-4 text-body leading-relaxed text-charcoal/80">{children}</div>
    </details>
  );
}
