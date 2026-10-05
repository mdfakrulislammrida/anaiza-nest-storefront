// The brand kit's gift frame: a thin gold border inset 4% of the short side. Drop it inside any
// `relative` container (the hero, a category banner); it never captures clicks. The measure uses
// container query units where the browser has them and falls back to 4% of each side otherwise.
export default function GiftFrame({ tone = "champagne" }: { tone?: "champagne" | "gold" }) {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 [container-type:size]">
      <div className={`gift-frame-line absolute border ${tone === "gold" ? "border-gold" : "border-champagne/70"}`} />
    </div>
  );
}
