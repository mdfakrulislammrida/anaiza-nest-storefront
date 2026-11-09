"use client";

import { useEffect, useRef, useState } from "react";
import ResponsiveImage from "@/components/ResponsiveImage";
import ProductVideoTile, { hasPlayableVideo, videoPosterOf } from "@/components/ProductVideoTile";
import type { ProductImage, ProductVideo } from "@/lib/types";

type Slide = { kind: "image"; image: ProductImage } | { kind: "video"; video: ProductVideo };

// How many photos still get one dot each (24 px apiece, centred): wide enough to clear the WhatsApp button at the right edge of a 360 px screen.
const MAX_DOTS = 8;

// The product's photos (and its video, as the last tile) in one row that scrolls and snaps: a swipe on a phone, a
// trackpad or the thumbnails from 768 px. 4:5 on a phone, square from 768 px, where the whole column also stays in view
// under the header (see ProductDetail). The first photo loads at once, the rest when they come near.
export default function ProductGallery({
  images,
  video = null,
  productName,
  selectedImageId = null,
}: {
  images: ProductImage[];
  video?: ProductVideo | null;
  productName: string;
  // Set when the chosen variant has its own image -- jumps the gallery to it, same as if the visitor had clicked
  // that thumbnail themselves.
  selectedImageId?: number | null;
}) {
  const slides: Slide[] = images.map((image) => ({ kind: "image", image }));
  if (video && hasPlayableVideo(video)) slides.push({ kind: "video", video });

  const track = useRef<HTMLUListElement>(null);
  const [active, setActive] = useState(0);

  function goTo(index: number, behavior: ScrollBehavior = "smooth") {
    const element = track.current;
    if (!element) return;
    element.scrollTo({ left: index * element.clientWidth, behavior });
  }

  // A variant with its own photo brings that photo into view (and back to the first when the next one has none).
  const selectedIndex = selectedImageId === null ? 0 : Math.max(images.findIndex((image) => image.id === selectedImageId), 0);
  useEffect(() => {
    goTo(selectedIndex, "auto");
  }, [selectedIndex]);

  // The dots and thumbnails follow the row as it scrolls, however it was moved.
  function handleScroll() {
    const element = track.current;
    if (!element || element.clientWidth === 0) return;
    setActive(Math.round(element.scrollLeft / element.clientWidth));
  }

  const count = slides.length;

  return (
    <div>
      {/* A photograph: no corners, no shadow. */}
      <div className="relative overflow-hidden bg-linen">
        {count > 0 ? (
          <ul
            ref={track}
            onScroll={handleScroll}
            aria-label={`${productName}, photos`}
            className="flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {slides.map((slide, index) => (
              <li
                key={slide.kind === "image" ? slide.image.id : "video"}
                aria-roledescription="slide"
                aria-label={`${index + 1} of ${count}`}
                className="relative aspect-[4/5] w-full shrink-0 snap-center md:aspect-square"
              >
                {slide.kind === "image" ? (
                  <ResponsiveImage
                    image={slide.image}
                    alt={slide.image.alt_text || `${productName}, photo ${index + 1}`}
                    priority={index === 0}
                    sizes="(min-width: 768px) 50vw, 100vw"
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                ) : (
                  <ProductVideoTile video={slide.video} />
                )}
              </li>
            ))}
          </ul>
        ) : (
          <div className="flex aspect-[4/5] items-center justify-center bg-linen md:aspect-square">
            <span className="font-serif text-h2 text-charcoal/70">Anaiza Nest</span>
          </div>
        )}

        {/* Dots on a phone, inside the photo near its bottom edge and centred, taking no room of their own and with no band across the picture: only a
            small dark, lightly blurred pill around the dots themselves, so they read on a light photo as well as a dark one. Round 8 px dots in white at
            60%, the current one a solid white pill; each is a 24 px target. With more photos than fit between the edge and the WhatsApp button (9 or more),
            a "3 / 9" counter takes their place. */}
        {count > 1 && (
          <div className="pointer-events-none absolute inset-x-0 bottom-2.5 flex justify-center md:hidden">
            {count > MAX_DOTS ? (
              <p className="rounded-btn bg-black/25 px-3 py-1 text-xs font-medium leading-4 text-white backdrop-blur-sm" aria-hidden="true">
                {active + 1} / {count}
              </p>
            ) : (
              <div data-round className="pointer-events-auto flex items-center rounded-full bg-black/25 px-1 backdrop-blur-sm">
                {slides.map((slide, index) => (
                  <button
                    key={slide.kind === "image" ? slide.image.id : "video"}
                    type="button"
                    onClick={() => goTo(index)}
                    aria-label={slide.kind === "video" ? "Show the video" : `Show photo ${index + 1}`}
                    aria-current={index === active}
                    className="flex h-6 w-6 items-center justify-center"
                  >
                    <span className={`h-2 rounded-full transition-all motion-reduce:transition-none ${index === active ? "w-4 bg-white" : "w-2 bg-white/60"}`} />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Thumbnails from 768 px. */}
      {count > 1 && (
        <div className="mt-4 hidden grid-cols-5 gap-4 md:grid">
          {slides.map((slide, index) => (
            <button
              key={slide.kind === "image" ? slide.image.id : "video"}
              type="button"
              onClick={() => goTo(index)}
              aria-label={slide.kind === "video" ? "Show the video" : `Show photo ${index + 1}`}
              aria-current={index === active}
              className={`relative aspect-square overflow-hidden border ${index === active ? "border-navy" : "border-linen"}`}
            >
              {slide.kind === "image" ? (
                <ResponsiveImage
                  image={slide.image}
                  alt=""
                  sizes="100px"
                  className="absolute inset-0 h-full w-full object-cover"
                />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element -- next/image is inert under images.unoptimized.
                <img src={videoPosterOf(slide.video) ?? ""} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
              )}
              {slide.kind === "video" && (
                <span aria-hidden="true" className="absolute inset-0 flex items-center justify-center bg-deepink/20">
                  <svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6 text-ivory">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
