import Link from "next/link";
import type { OccasionTile } from "@/lib/types";

const tileClass =
  "group relative flex aspect-[4/3] items-end overflow-hidden rounded-btn border border-linen bg-linen p-3 text-charcoal transition-colors hover:border-gold sm:p-4";

// "Shop by occasion": two tiles to a row on phones, a small WebP picture (or a plain linen panel
// when there is none) and the label. Nothing is rendered when the admin has no tile switched on,
// so an empty section leaves no heading behind.
export default function OccasionsSection({
  title,
  subtitle,
  tiles,
}: {
  title?: string | null;
  subtitle?: string | null;
  tiles: OccasionTile[];
}) {
  if (tiles.length === 0) return null;

  return (
    <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
      <div className="mb-8">
        <h2 className="font-serif text-charcoal text-h2">{title || "Shop by occasion"}</h2>
        {subtitle && <p className="mt-1 text-body text-stone">{subtitle}</p>}
      </div>

      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
        {tiles.map((tile) => {
          const content = (
            <>
              {tile.image && (
                // eslint-disable-next-line @next/next/no-img-element -- next/image is inert under images.unoptimized.
                <img
                  src={tile.image}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  className="absolute inset-0 h-full w-full object-cover"
                />
              )}
              <span
                className={
                  tile.image
                    ? "relative rounded-btn bg-ivory/90 px-2 py-1 font-serif text-body text-charcoal"
                    : "relative font-serif text-body text-charcoal"
                }
              >
                {tile.label}
              </span>
            </>
          );

          return (
            <li key={`${tile.label}-${tile.href}`}>
              {/^https?:\/\//.test(tile.href) ? (
                <a href={tile.href} className={tileClass}>
                  {content}
                </a>
              ) : (
                <Link href={tile.href} className={tileClass}>
                  {content}
                </Link>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
