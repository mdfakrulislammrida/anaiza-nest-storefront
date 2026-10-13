"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { autoplaySeconds, indexFromScroll, stepIndex, toSlideViews, type SlideView } from "@/lib/slider";
import type { Banner, BannerSliderSettings } from "@/lib/types";

// How long autoplay stays still after a visitor has touched, hovered or focused the slider.
const SETTLE_MS = 4000;

function Chevron({ direction }: { direction: "left" | "right" }) {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <path d={direction === "left" ? "M14.5 5.5 8 12l6.5 6.5" : "M9.5 5.5 16 12l-6.5 6.5"} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function SlideBody({ slide, first, active, position, total }: { slide: SlideView; first: boolean; active: boolean; position: number; total: number }) {
  const { desktop, mobile } = slide;
  const hasText = Boolean(slide.headline || slide.subtext || slide.buttonText);
  const label = slide.buttonText ?? slide.headline ?? "See more";

  return (
    <li
      role="group"
      aria-roledescription="slide"
      aria-label={`${position} of ${total}`}
      aria-hidden={active ? undefined : true}
      className="relative aspect-[3/2] w-full shrink-0 snap-start overflow-hidden bg-linen sm:aspect-[12/5]"
    >
      <picture>
        {mobile && <source media="(max-width: 639px)" srcSet={mobile.src} />}
        <img
          src={desktop.src}
          srcSet={desktop.srcSet ?? undefined}
          sizes={desktop.srcSet ? "(min-width: 1280px) 1280px, 100vw" : undefined}
          alt=""
          width={desktop.width}
          height={desktop.height}
          // Only the first slide is on screen at load: it is the one that is fetched first.
          loading={first ? "eager" : "lazy"}
          fetchPriority={first ? "high" : "auto"}
          decoding={first ? "sync" : "async"}
          className="absolute inset-0 h-full w-full object-cover"
        />
      </picture>

      {hasText && (
        <div data-scrim="" className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-col items-start gap-4 bg-gradient-to-t from-deepink/80 via-deepink/40 to-transparent p-6 pt-16 text-ivory sm:p-10 sm:pt-24">
          {slide.headline && <p className="max-w-xl font-serif text-h2">{slide.headline}</p>}
          {slide.subtext && <p className="max-w-lg text-body text-ivory/90">{slide.subtext}</p>}
          {slide.buttonText && (
            <span className="rounded-btn bg-ivory px-6 py-4 text-button text-navy">{slide.buttonText}</span>
          )}
        </div>
      )}

      {/* The whole slide is the link, so a tap anywhere on a phone goes where the button says. */}
      {slide.link &&
        (slide.linkIsInternal ? (
          <Link href={slide.link} aria-label={label} tabIndex={active ? undefined : -1} className="absolute inset-0 z-10" />
        ) : (
          <a href={slide.link} aria-label={label} tabIndex={active ? undefined : -1} className="absolute inset-0 z-10" />
        ))}
    </li>
  );
}

// The homepage banner slider: CSS scroll-snap does the swiping, so there is no library and nothing to load. One slide shows
// as a plain picture with no controls. Autoplay is off unless the admin switched it on, is never faster than six seconds,
// and stands still while the visitor hovers, touches or focuses the slider, when the tab is hidden, when the slider is off
// screen, and for anyone who asked their device for less motion.
export default function HeroSlider({ slides, settings }: { slides: Banner[]; settings: BannerSliderSettings }) {
  const views = toSlideViews(slides);
  const count = views.length;
  const scroller = useRef<HTMLUListElement>(null);
  const root = useRef<HTMLElement>(null);
  const [active, setActive] = useState(0);
  const activeRef = useRef(0);
  const held = useRef({ hover: false, touch: false, focus: false, last: 0 });
  const frame = useRef(0);

  const reducedMotion = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const goTo = useCallback((index: number) => {
    const el = scroller.current;
    if (!el) return;
    el.scrollTo({ left: index * el.clientWidth, behavior: reducedMotion() ? "auto" : "smooth" });
  }, []);

  const touched = () => {
    held.current.last = Date.now();
  };

  const onScroll = () => {
    if (frame.current) return;
    frame.current = requestAnimationFrame(() => {
      frame.current = 0;
      const el = scroller.current;
      if (!el) return;
      const index = indexFromScroll(el.scrollLeft, el.clientWidth, count);
      if (index !== activeRef.current) {
        activeRef.current = index;
        setActive(index);
      }
    });
  };

  const autoplay = settings.autoplay && count > 1;
  const seconds = autoplaySeconds(settings);

  useEffect(() => {
    if (!autoplay) return;

    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (motion.matches) return;

    let visible = true;
    const observer = typeof IntersectionObserver === "undefined" ? null : new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
    });
    if (observer && root.current) observer.observe(root.current);

    const timer = window.setInterval(() => {
      const state = held.current;
      if (state.hover || state.touch || state.focus || document.hidden || !visible) return;
      if (Date.now() - state.last < SETTLE_MS) return;
      goTo(stepIndex(activeRef.current, 1, count));
    }, seconds * 1000);

    return () => {
      window.clearInterval(timer);
      observer?.disconnect();
    };
  }, [autoplay, seconds, count, goTo]);

  useEffect(() => () => {
    if (frame.current) cancelAnimationFrame(frame.current);
  }, []);

  if (count === 0) return null;

  if (count === 1) {
    return (
      <section aria-label="Featured" className="mx-auto max-w-7xl">
        <ul className="flex">
          <SlideBody slide={views[0]} first active position={1} total={1} />
        </ul>
      </section>
    );
  }

  return (
    <section
      ref={root}
      aria-roledescription="carousel"
      aria-label="Featured"
      className="mx-auto max-w-7xl"
      onMouseEnter={() => {
        held.current.hover = true;
      }}
      onMouseLeave={() => {
        held.current.hover = false;
        touched();
      }}
      onTouchStart={() => {
        held.current.touch = true;
        touched();
      }}
      onTouchEnd={() => {
        held.current.touch = false;
        touched();
      }}
      onTouchCancel={() => {
        held.current.touch = false;
        touched();
      }}
      onFocus={() => {
        held.current.focus = true;
      }}
      onBlur={() => {
        held.current.focus = false;
        touched();
      }}
    >
      <div className="relative">
        <ul
          ref={scroller}
          tabIndex={0}
          aria-label="Slides"
          onScroll={onScroll}
          className="flex snap-x snap-mandatory overflow-x-auto scroll-smooth [scrollbar-width:none] motion-reduce:scroll-auto [&::-webkit-scrollbar]:hidden"
        >
          {views.map((slide, index) => (
            <SlideBody key={slide.id} slide={slide} first={index === 0} active={index === active} position={index + 1} total={count} />
          ))}
        </ul>

        {/* Arrows are for the desktop; a phone swipes. */}
        <button
          type="button"
          aria-label="Previous slide"
          onClick={() => {
            touched();
            goTo(stepIndex(active, -1, count));
          }}
          className="absolute left-3 top-1/2 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-btn bg-ivory/90 text-navy transition-opacity hover:opacity-100 sm:flex"
        >
          <Chevron direction="left" />
        </button>
        <button
          type="button"
          aria-label="Next slide"
          onClick={() => {
            touched();
            goTo(stepIndex(active, 1, count));
          }}
          className="absolute right-3 top-1/2 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-btn bg-ivory/90 text-navy transition-opacity hover:opacity-100 sm:flex"
        >
          <Chevron direction="right" />
        </button>
      </div>

      <div className="flex items-center justify-center bg-ivory py-1">
        {views.map((slide, index) => (
          <button
            key={slide.id}
            type="button"
            aria-label={`Show slide ${index + 1} of ${count}`}
            aria-current={index === active ? "true" : undefined}
            onClick={() => {
              touched();
              goTo(index);
            }}
            className="flex h-8 w-8 items-center justify-center"
          >
            <span className={`block h-2 rounded-full transition-all ${index === active ? "w-6 bg-navy" : "w-2 bg-navy/30"}`} />
          </button>
        ))}
      </div>
    </section>
  );
}
