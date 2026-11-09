import Link from "next/link";

// The filters that are on, as chips under the phone's Filter/Sort bar. Each is a link to the same list without that one filter, so removing it is a tap.
export default function ActiveFilterChips({ chips }: { chips: { key: string; label: string; href: string }[] }) {
  if (chips.length === 0) return null;

  return (
    <ul aria-label="Active filters" className="mt-3 flex flex-wrap gap-2 sm:hidden">
      {chips.map((chip) => (
        <li key={chip.key} className="min-w-0 max-w-full">
          <Link
            href={chip.href}
            aria-label={`Remove filter: ${chip.label}`}
            className="inline-flex min-h-10 max-w-full items-center gap-1.5 rounded-btn border border-stone/80 bg-ivory pl-3 pr-2 text-caption text-charcoal"
          >
            <span className="min-w-0 truncate">{chip.label}</span>
            <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="h-4 w-4 shrink-0">
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </Link>
        </li>
      ))}
    </ul>
  );
}
