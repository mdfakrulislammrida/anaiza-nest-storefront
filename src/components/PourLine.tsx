"use client";

import { useEffect, useRef } from "react";

// The brand kit's pour line: one 1px champagne line, either vertical from the top edge of its
// container ending in a small round drop, or a horizontal divider. It draws itself once when it
// scrolls into view and never loops; under prefers-reduced-motion it is simply there (see
// globals.css). CSS transitions plus one IntersectionObserver -- no library. Use at most one per layout.
export default function PourLine({
  orientation = "vertical",
  length = "8rem",
  className = "",
}: {
  orientation?: "vertical" | "horizontal";
  // How far the vertical line runs from the top edge.
  length?: string;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const draw = () => {
      el.dataset.drawn = "true";
    };
    if (typeof IntersectionObserver === "undefined") {
      draw();
      return;
    }

    // Watch the parent: the line itself has no height until it has been drawn.
    const target = el.parentElement ?? el;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          draw();
          observer.disconnect();
        }
      },
      { threshold: 0.25 },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      aria-hidden="true"
      className={`pour-line ${orientation === "horizontal" ? "pour-line-h" : ""} ${className}`}
      style={{ "--pour-length": length } as React.CSSProperties}
    />
  );
}
