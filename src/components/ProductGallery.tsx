"use client";

import { useRef, useState, type TouchEvent } from "react";
import ResponsiveImage from "@/components/ResponsiveImage";
import type { ProductImage } from "@/lib/types";

export default function ProductGallery({
  images,
  productName,
  selectedImageId = null,
}: {
  images: ProductImage[];
  productName: string;
  // Set when the chosen variant has its own image -- jumps the gallery to
  // it, same as if the visitor had clicked that thumbnail themselves.
  selectedImageId?: number | null;
}) {
  const [activeIndex, setActiveIndex] = useState(() => {
    if (selectedImageId === null) return 0;
    const index = images.findIndex((image) => image.id === selectedImageId);
    return index !== -1 ? index : 0;
  });
  // Adjusting state during render (React's documented pattern for reacting
  // to a prop change) instead of an effect: re-renders once more before
  // paint rather than committing the stale frame first, then re-running.
  const [appliedImageId, setAppliedImageId] = useState(selectedImageId);
  if (selectedImageId !== appliedImageId) {
    setAppliedImageId(selectedImageId);
    // null means the newly selected variant has no image override -- fall
    // back to the product's own main image, rather than leaving whatever
    // the previously selected variant had showing.
    const index = selectedImageId === null ? 0 : images.findIndex((image) => image.id === selectedImageId);
    setActiveIndex(index !== -1 ? index : 0);
  }

  const active = images[activeIndex];

  // Swipe between images on touch screens. touch-action: pan-y on the frame leaves vertical
  // scrolling to the browser and hands horizontal drags to us; a drag only counts as a swipe when
  // it is mostly horizontal and long enough, so scrolling past the gallery never flips an image.
  const touchStart = useRef<{ x: number; y: number } | null>(null);

  function handleTouchStart(event: TouchEvent) {
    const touch = event.touches[0];
    touchStart.current = { x: touch.clientX, y: touch.clientY };
  }

  function handleTouchEnd(event: TouchEvent) {
    const start = touchStart.current;
    touchStart.current = null;
    if (!start || images.length < 2) return;

    const touch = event.changedTouches[0];
    const dx = touch.clientX - start.x;
    const dy = touch.clientY - start.y;
    if (Math.abs(dx) < 40 || Math.abs(dx) < Math.abs(dy) * 1.5) return;

    setActiveIndex((index) => Math.min(Math.max(index + (dx < 0 ? 1 : -1), 0), images.length - 1));
  }

  return (
    <div>
      <div
        className="relative aspect-square touch-pan-y overflow-hidden rounded-xl bg-linen shadow-warm"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={() => (touchStart.current = null)}
      >
        {active ? (
          <ResponsiveImage
            image={active}
            alt={productName}
            priority
            sizes="(min-width: 1024px) 50vw, 100vw"
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-linen">
            <span className="font-serif text-h2 text-charcoal/70">Anaiza Nest</span>
          </div>
        )}

        {/* Tells a phone visitor there is more to swipe to. */}
        {images.length > 1 && (
          <p
            aria-live="polite"
            className="absolute bottom-3 right-3 rounded-btn bg-deepink/80 px-2 py-1 text-caption font-medium text-ivory sm:hidden"
          >
            {activeIndex + 1} / {images.length}
          </p>
        )}
      </div>

      {images.length > 1 && (
        <div className="mt-4 grid grid-cols-5 gap-4">
          {images.map((image, index) => (
            <button
              key={image.id}
              type="button"
              onClick={() => setActiveIndex(index)}
              className={`relative aspect-square overflow-hidden rounded-lg border ${
                index === activeIndex ? "border-navy" : "border-transparent"
              }`}
            >
              <ResponsiveImage
                image={image}
                alt={`${productName} thumbnail ${index + 1}`}
                sizes="100px"
                className="absolute inset-0 h-full w-full object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
