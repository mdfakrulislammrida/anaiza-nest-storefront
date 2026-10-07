import Stars from "./Stars";

// Stars and the count, shown only when there is at least one approved review. With none, this renders nothing at
// all: no empty stars, no "0 reviews".
export default function RatingSummary({
  average,
  count,
  href,
  compact = false,
  dark = false,
}: {
  average: number | null | undefined;
  count: number | null | undefined;
  href?: string;
  compact?: boolean;
  dark?: boolean;
}) {
  if (!count || count < 1 || average == null) return null;

  const text = compact ? `(${count})` : `${average.toFixed(1)} out of 5, ${count} ${count === 1 ? "review" : "reviews"}`;
  const body = (
    <>
      <Stars rating={average} />
      <span className={`text-caption ${dark ? "text-ivory/80" : "text-charcoal"}`}>{text}</span>
    </>
  );

  return href ? (
    <a href={href} className="inline-flex items-center gap-2 hover:underline">
      {body}
    </a>
  ) : (
    <span className="inline-flex items-center gap-2">{body}</span>
  );
}
