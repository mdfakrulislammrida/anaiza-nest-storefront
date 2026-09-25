"use client";

import Image from "next/image";
import Link from "next/link";
import { useWishlist } from "@/context/WishlistContext";
import { useCart } from "@/context/CartContext";
import { formatPrice } from "@/lib/format";

export default function WishlistPage() {
  const { items, removeItem } = useWishlist();

  return (
    <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6">
      <nav className="mb-6 text-xs text-muted">
        <Link href="/" className="hover:text-navy">
          Home
        </Link>
        <span className="mx-1.5">/</span>
        <span className="text-ink">Wishlist</span>
      </nav>

      <h1 className="font-serif text-3xl text-ink sm:text-4xl">Your Wishlist</h1>

      {items.length === 0 ? (
        <>
          <p className="mt-3 text-muted">Save items you love by tapping the heart icon.</p>
          <Link
            href="/shop"
            className="mt-8 inline-flex items-center justify-center rounded-full bg-navy px-8 py-3.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
          >
            Browse Products
          </Link>
        </>
      ) : (
        <div className="mt-8 divide-y divide-line">
          {items.map((item) => (
            <WishlistRow key={item.productId} item={item} onRemove={() => removeItem(item.productId)} />
          ))}
        </div>
      )}
    </div>
  );
}

function WishlistRow({
  item,
  onRemove,
}: {
  item: { productId: number; slug: string; name: string; image: string | null; price: number };
  onRemove: () => void;
}) {
  const { addItem } = useCart();

  return (
    <div className="flex items-center gap-4 py-5">
      {/* Plain <a>: /product/<slug> is a single static shell that needs a
          real navigation, not next/link's client-side routing. */}
      <a href={`/product/${item.slug}`} className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-pill">
        {item.image && <Image src={item.image} alt={item.name} fill className="object-cover" />}
      </a>
      <div className="flex-1">
        <a href={`/product/${item.slug}`} className="text-sm font-medium text-ink hover:text-navy">
          {item.name}
        </a>
        <p className="mt-1 text-sm text-ink/70">{formatPrice(item.price)}</p>
      </div>
      <button
        type="button"
        onClick={() =>
          addItem(
            {
              id: item.productId,
              slug: item.slug,
              name: item.name,
              images: item.image ? [{ url: item.image }] : [],
              effective_price: item.price,
              stock_quantity: 99,
            },
            null,
            1,
          )
        }
        className="rounded-full bg-navy px-4 py-2 text-xs font-medium text-white transition-opacity hover:opacity-90"
      >
        Add to cart
      </button>
      <button type="button" onClick={onRemove} aria-label="Remove from wishlist" className="text-muted hover:text-red-600">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-4 w-4">
          <path d="M18 6 6 18M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}
