// What the phone's Sort button says: "Sort: Most relevant" with a chevron. The value is cut with an ellipsis when it does not fit, never wrapped, so the
// button keeps its height at any width. Shared by the real Sort (SortDropdown) and the stand-in the static page shows before the page loads.
export default function SortLabel({ value }: { value: string }) {
  return (
    <>
      <span className="min-w-0 truncate">
        <span className="text-stone">Sort:</span> <span className="font-semibold">{value}</span>
      </span>
      <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="h-4 w-4 shrink-0">
        <path d="m6 9 6 6 6-6" />
      </svg>
    </>
  );
}
