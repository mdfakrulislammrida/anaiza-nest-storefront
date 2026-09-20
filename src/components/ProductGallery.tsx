"use client";

import { useState } from "react";
import Image from "next/image";
import type { ProductImage } from "@/lib/types";

export default function ProductGallery({
  images,
  productName,
}: {
  images: ProductImage[];
  productName: string;
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const active = images[activeIndex];

  return (
    <div>
      <div className="relative aspect-square overflow-hidden rounded-xl bg-pill">
        {active ? (
          <Image
            src={active.url}
            alt={productName}
            fill
            priority
            sizes="(min-width: 1024px) 50vw, 100vw"
            className="object-cover"
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
              <Image
                src={image.url}
                alt={`${productName} thumbnail ${index + 1}`}
                fill
                sizes="100px"
                className="object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
