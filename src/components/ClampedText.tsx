"use client";

import { useEffect, useId, useRef, useState } from "react";

// A paragraph that shows three lines on phones with a tap-to-expand toggle, and in full from the
// sm breakpoint up. The clamp is CSS only, so the whole text stays in the HTML (and in the static
// export) for crawlers and screen readers. The toggle appears only once the text is measured to
// overflow, so a short paragraph never gets a pointless "Read more".
export default function ClampedText({ text, className = "" }: { text: string; className?: string }) {
  const id = useId();
  const ref = useRef<HTMLParagraphElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [overflowing, setOverflowing] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || expanded) return;

    // ResizeObserver rather than a window resize listener: it fires after the layout has
    // settled, so rotating the phone or resizing the window re-measures the new line count.
    const measure = () => setOverflowing(el.scrollHeight - el.clientHeight > 1);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [text, expanded]);

  return (
    <>
      <p
        id={id}
        ref={ref}
        className={`${className} ${expanded ? "" : "line-clamp-3 sm:line-clamp-none"}`}
      >
        {text}
      </p>
      {(overflowing || expanded) && (
        <button
          type="button"
          onClick={() => setExpanded((open) => !open)}
          aria-expanded={expanded}
          aria-controls={id}
          className="-mt-1 inline-flex min-h-11 items-center text-sm font-medium text-navy hover:underline sm:hidden"
        >
          {expanded ? "Show less" : "Read more"}
        </button>
      )}
    </>
  );
}
