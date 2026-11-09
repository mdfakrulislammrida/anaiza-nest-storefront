"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import type { KeyboardEvent as ReactKeyboardEvent } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { listBarButton } from "@/lib/listBar";

export interface FilterOption {
  label: string;
  /** Where the list goes when this one is chosen and applied (the same address the old filter link had). */
  href: string;
  active: boolean;
}

// The phone's Filter button, and the bottom sheet it opens: the existing price ranges, "Clear" and "Apply" fixed at the foot. It closes by the dark
// overlay, a swipe down on its top, the close button, Escape, or the phone's Back (the sheet takes a history entry while it is open, so Back closes it
// instead of leaving the page). Choosing a range only takes effect on Apply, which goes to the same address the filter links always did.
export default function FilterSheet({
  options,
  clearHref,
  count,
  priceActive,
}: {
  options: FilterOption[];
  clearHref: string;
  /** How many filters are on (price, tag, search): the number on the button. */
  count: number;
  /** A price filter is on (it may be a range that is not one of `options`). */
  priceActive: boolean;
}) {
  const router = useRouter();
  const titleId = useId();
  const activeIndex = options.findIndex((option) => option.active);
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(activeIndex);
  const opener = useRef<HTMLButtonElement>(null);
  const sheet = useRef<HTMLDivElement>(null);
  const pushed = useRef(false);
  const afterClose = useRef<(() => void) | null>(null);
  const scrollY = useRef(0);
  const drag = useRef<{ startY: number; dy: number } | null>(null);

  // The sheet is closed (by Back, or by the fallback below): put the page back as it was and carry on with what was waiting for it.
  const finish = useCallback(() => {
    if (!pushed.current && !sheet.current) return;
    pushed.current = false;
    setOpen(false);
    const wanted = scrollY.current;
    window.requestAnimationFrame(() => window.scrollTo(0, wanted));
    opener.current?.focus({ preventScroll: true });
    const next = afterClose.current;
    afterClose.current = null;
    next?.();
  }, []);

  const close = useCallback(
    (then?: () => void) => {
      if (pushed.current) {
        afterClose.current = then ?? null;
        window.history.back();
        // Back normally answers with a popstate; if it never does, do not leave the sheet stuck.
        window.setTimeout(() => {
          if (pushed.current) finish();
        }, 400);
        return;
      }

      setOpen(false);
      then?.();
    },
    [finish],
  );

  function openSheet() {
    setPending(activeIndex);
    scrollY.current = window.scrollY;
    window.history.pushState({ filterSheet: true }, "");
    pushed.current = true;
    setOpen(true);
  }

  useEffect(() => {
    if (!open) return;

    const onPop = () => finish();
    window.addEventListener("popstate", onPop);

    // The page behind does not scroll while the sheet is open.
    const root = document.documentElement;
    const before = root.style.overflow;
    root.style.overflow = "hidden";
    window.requestAnimationFrame(() => sheet.current?.focus({ preventScroll: true }));

    return () => {
      window.removeEventListener("popstate", onPop);
      root.style.overflow = before;
    };
  }, [open, finish]);

  function onKeyDown(event: ReactKeyboardEvent) {
    if (event.key === "Escape") {
      event.stopPropagation();
      close();
      return;
    }

    if (event.key !== "Tab" || !sheet.current) return;

    // Tab stays inside the sheet.
    const focusable = [...sheet.current.querySelectorAll<HTMLElement>('button:not([disabled]), a[href]')];
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (event.shiftKey && (document.activeElement === first || document.activeElement === sheet.current)) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  const clearEnabled = priceActive || pending !== -1;

  function clear() {
    if (priceActive) close(() => router.push(clearHref));
    else setPending(-1);
  }

  function apply() {
    const unchanged = pending === activeIndex && (pending !== -1 || !priceActive);
    if (unchanged) return close();

    const href = pending === -1 ? clearHref : options[pending].href;
    close(() => router.push(href));
  }

  return (
    <>
      <button
        ref={opener}
        type="button"
        onClick={openSheet}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={count > 0 ? `Filter, ${count} active` : "Filter"}
        className={listBarButton}
      >
        <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-4 w-4 shrink-0">
          <path d="M4 6h16M7 12h10M10 18h4" />
        </svg>
        <span>Filter</span>
        {count > 0 && (
          <span aria-hidden="true" className="flex h-5 min-w-5 items-center justify-center rounded-btn bg-navy px-1 text-[0.6875rem] font-semibold leading-none text-ivory">
            {count}
          </span>
        )}
      </button>

      {open &&
        createPortal(
          <div className="fixed inset-0 z-[60]">
            <div aria-hidden="true" onClick={() => close()} className="sheet-fade absolute inset-0 bg-deepink/40" />
            <div
              ref={sheet}
              role="dialog"
              aria-modal="true"
              aria-labelledby={titleId}
              tabIndex={-1}
              onKeyDown={onKeyDown}
              className="sheet-up absolute inset-x-0 bottom-0 flex max-h-[85dvh] flex-col rounded-t-btn bg-ivory outline-none"
            >
              {/* The top of the sheet: a swipe down on it closes the sheet. */}
              <div
                className="shrink-0 touch-none border-b border-linen px-4"
                onTouchStart={(event) => {
                  drag.current = { startY: event.touches[0].clientY, dy: 0 };
                }}
                onTouchMove={(event) => {
                  const current = drag.current;
                  if (!current || !sheet.current) return;
                  current.dy = Math.max(0, event.touches[0].clientY - current.startY);
                  sheet.current.style.transition = "none";
                  sheet.current.style.transform = `translateY(${current.dy}px)`;
                }}
                onTouchEnd={() => {
                  const current = drag.current;
                  drag.current = null;
                  if (!current || !sheet.current) return;
                  if (current.dy > 90) {
                    close();
                  } else {
                    sheet.current.style.transition = "transform 150ms ease-out";
                    sheet.current.style.transform = "";
                  }
                }}
              >
                <div aria-hidden="true" className="mx-auto mt-2 h-1 w-10 rounded-btn bg-stone/40" />
                <div className="flex min-h-12 items-center justify-between">
                  <h2 id={titleId} className="text-body font-semibold text-charcoal">
                    Filter
                  </h2>
                  <button type="button" onClick={() => close()} aria-label="Close filter" className="-mr-3 flex h-11 w-11 items-center justify-center text-charcoal">
                    <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="h-5 w-5">
                      <path d="M6 6l12 12M18 6 6 18" />
                    </svg>
                  </button>
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4">
                <p id={`${titleId}-price`} className="text-caption font-semibold text-stone">
                  Price
                </p>
                <div role="radiogroup" aria-labelledby={`${titleId}-price`} className="mt-1">
                  {options.map((option, index) => (
                    <button
                      key={option.label}
                      type="button"
                      role="radio"
                      aria-checked={pending === index}
                      onClick={() => setPending(pending === index ? -1 : index)}
                      className="flex min-h-12 w-full items-center justify-between gap-3 border-b border-linen text-left text-body text-charcoal"
                    >
                      <span className={pending === index ? "font-semibold text-navy" : ""}>{option.label}</span>
                      {pending === index && (
                        <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5 shrink-0 text-navy">
                          <path d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid shrink-0 grid-cols-2 gap-2 border-t border-linen bg-ivory px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
                <button
                  type="button"
                  onClick={clear}
                  disabled={!clearEnabled}
                  className="min-h-11 rounded-btn border border-stone/80 px-3 text-button text-charcoal transition-colors hover:border-navy disabled:opacity-40 disabled:hover:border-stone/80"
                >
                  Clear
                </button>
                <button type="button" onClick={apply} className="min-h-11 rounded-btn bg-navy px-3 text-button text-ivory transition-opacity hover:opacity-90">
                  Apply
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
