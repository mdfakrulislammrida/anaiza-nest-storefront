// Five star shapes, filled to the given rating. Gold on ivory has low contrast (2.9), so stars are only ever drawn as
// shapes at 20px or larger and always sit beside the number in charcoal or stone: the colour never carries the meaning.
const STAR = "M12 2.5l2.9 6.1 6.6.9-4.8 4.6 1.2 6.6L12 17.5l-5.9 3.2 1.2-6.6L2.5 9.5l6.6-.9z";

function Row({ filled }: { filled: boolean }) {
  return (
    <span className="flex">
      {[0, 1, 2, 3, 4].map((index) => (
        <svg
          key={index}
          viewBox="0 0 24 24"
          aria-hidden="true"
          className={`h-5 w-5 shrink-0 ${filled ? "fill-gold stroke-gold" : "fill-none stroke-stone/50"}`}
          strokeWidth={1.2}
          strokeLinejoin="round"
        >
          <path d={STAR} />
        </svg>
      ))}
    </span>
  );
}

export default function Stars({ rating, className = "" }: { rating: number; className?: string }) {
  const clamped = Math.max(0, Math.min(5, rating));

  return (
    <span
      role="img"
      aria-label={`${clamped} out of 5 stars`}
      className={`relative inline-flex ${className}`}
      data-stars={clamped}
    >
      <Row filled={false} />
      <span className="absolute inset-y-0 left-0 overflow-hidden" style={{ width: `${(clamped / 5) * 100}%` }}>
        <Row filled />
      </span>
    </span>
  );
}
