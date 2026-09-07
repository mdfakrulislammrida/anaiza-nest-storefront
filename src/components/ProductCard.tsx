import Image from "next/image";
import Link from "next/link";
import type { Product } from "@/lib/types";
import { formatPrice } from "@/lib/format";

export default function ProductCard({ product }: { product: Product }) {
  const image = product.images?.[0]?.url ?? null;

  return (
    <Link href={`/product/${product.slug}`} className="group block">
      <div className="relative aspect-square overflow-hidden bg-ink/5">
        {image ? (
          <Image
            src={image}
            alt={product.name}
            fill
            sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-ivory to-ink/10">
            <span className="font-serif text-lg text-ink/30">Anaiza</span>
          </div>
        )}

        {product.is_new && (
          <span className="absolute left-3 top-3 rounded-full bg-burgundy px-3 py-1 text-[11px] font-semibold uppercase tracking-widest text-ivory">
            New
          </span>
        )}
      </div>

      <div className="mt-4 space-y-1">
        <p className="text-xs font-semibold uppercase tracking-widest text-gold">
          {product.category.name}
        </p>
        <h3 className="font-serif text-lg text-ink">{product.name}</h3>
        <p className="text-sm font-medium text-ink/80">
          {formatPrice(product.price)}
        </p>
      </div>
    </Link>
  );
}
