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
      <nav className="mb-6 text-caption text-stone">
        <Link href="/" className="hover:text-navy">
          Home
        </Link>
        <span className="mx-1.5">/</span>
        <span className="text-charcoal">Wishlist</span>
      </nav>

      <h1 className="font-serif text-charcoal text-h1">Your wishlist</h1>

      {items.length === 0 ? (
        <>
          <p className="mt-4 text-body text-stone">Tap the heart on anything you would like to keep.</p>
          <Link
            href="/shop?search=tea%20sets"
            className="mt-8 inline-flex items-center justify-center rounded-btn bg-navy px-8 py-4 text-button text-ivory transition-opacity hover:opacity-90"
          >
            Shop tea sets
          </Link>
        </>
      ) : (
        <div className="mt-8 divide-y divide-linen">
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
    <div className="flex items-center gap-4 py-6">
      {/* Plain <a>: /product/<slug> is a single static shell that needs a
          real navigation, not next/link's client-side routing. */}
      <a href={`/product/${item.slug}`} className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-linen">
        {item.image && <Image src={item.image} alt={item.name} fill className="object-cover" />}
      </a>
      <div className="flex-1">
        <a href={`/product/${item.slug}`} className="text-body font-medium text-charcoal hover:text-navy">
          {item.name}
        </a>
        <p className="mt-1 text-body text-charcoal/70">{formatPrice(item.price)}</p>
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
        className="rounded-btn bg-navy px-4 py-2 text-caption font-medium text-ivory transition-opacity hover:opacity-90"
      >
        Add to cart
      </button>
      <button type="button" onClick={onRemove} aria-label="Remove from wishlist" className="text-stone hover:text-navy">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-4 w-4">
          <path d="M18 6 6 18M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}
