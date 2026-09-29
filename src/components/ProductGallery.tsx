"use client";

import { useState } from "react";
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

  return (
    <div>
      <div className="relative aspect-square overflow-hidden rounded-xl bg-pill">
        {active ? (
          <ResponsiveImage
            image={active}
            alt={productName}
            priority
            sizes="(min-width: 1024px) 50vw, 100vw"
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-cream to-pill">
            <span className="font-serif text-2xl text-ink/20">Anaiza Nest</span>
          </div>
        )}
      </div>

      {images.length > 1 && (
        <div className="mt-4 grid grid-cols-5 gap-3">
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
