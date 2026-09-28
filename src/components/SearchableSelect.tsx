"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

interface SearchableSelectProps {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
  disabled?: boolean;
  disabledHint?: string;
  placeholder?: string;
  searchPlaceholder?: string;
  error?: string | null;
}

// A single implementation for every screen size, not separate mobile/desktop
// components: it renders as a full-width bottom sheet on narrow screens and
// a centered dialog from `sm:` up (see the panel's className below). That
// keeps this to one code path to maintain, and it's a genuinely fine desktop
// pattern too -- no need for a second, native-<select>-based implementation.
export default function SearchableSelect({
  label,
  value,
  options,
  onChange,
  disabled = false,
  disabledHint,
  placeholder = "Select an option",
  searchPlaceholder = "Search...",
  error,
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);
  const listId = useId();

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return options;
    return options.filter((option) => option.toLowerCase().includes(query));
  }, [options, search]);

  // Body-scroll lock + focus the search box the moment the sheet mounts.
  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    searchInputRef.current?.focus();

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  // Escape closes, and so does the device/browser back button: pushing a
  // history entry on open means back navigation fires popstate here first,
  // closing the sheet instead of leaving the checkout page.
  useEffect(() => {
    if (!open) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") close();
    }

    function handlePopState() {
      setOpen(false);
    }

    window.history.pushState({ searchableSelect: true }, "");
    document.addEventListener("keydown", handleKeyDown);
    window.addEventListener("popstate", handlePopState);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("popstate", handlePopState);
    };
  }, [open]);

  function openSheet() {
    if (disabled) return;
    setSearch("");
    setOpen(true);
  }

  function close() {
    setOpen(false);
    // Consume the history entry pushed on open, so back navigation from the
    // page itself still works normally afterward.
    if (window.history.state?.searchableSelect) window.history.back();
  }

  function select(option: string) {
    onChange(option);
    close();
  }

  const triggerClass =
    "mt-1 flex w-full items-center justify-between rounded-lg border border-line bg-ivory px-3 py-2.5 text-left text-base text-ink focus:border-navy focus:outline-none disabled:cursor-not-allowed disabled:bg-pill disabled:text-muted";
  const labelClass = "text-xs font-semibold uppercase tracking-widest text-muted";

  return (
    <div>
      <label className={labelClass}>{label}</label>
      <button type="button" onClick={openSheet} disabled={disabled} className={triggerClass}>
        <span className={value ? "" : "text-muted"}>
          {value || (disabled ? disabledHint : placeholder)}
        </span>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-4 w-4 shrink-0 text-muted">
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}

      {open &&
        createPortal(
          <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label={label}>
            <div className="absolute inset-0 bg-black/40" onClick={close} />

            <div
              className="absolute inset-x-0 bottom-0 flex max-h-[70vh] flex-col rounded-t-2xl bg-ivory shadow-xl sm:inset-x-auto sm:left-1/2 sm:top-1/2 sm:bottom-auto sm:w-full sm:max-w-sm sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl"
            >
              <div className="flex items-center justify-between border-b border-line px-4 py-3">
                <p className="font-serif text-lg text-ink">{label}</p>
                <button
                  type="button"
                  onClick={close}
                  aria-label="Close"
                  className="flex h-9 w-9 items-center justify-center rounded-full text-ink hover:bg-pill"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-5 w-5">
                    <path d="M18 6 6 18M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="border-b border-line px-4 py-3">
                <input
                  ref={searchInputRef}
                  type="text"
                  inputMode="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder={searchPlaceholder}
                  aria-controls={listId}
                  className="w-full rounded-lg border border-line bg-white px-3 py-2.5 text-base text-ink focus:border-navy focus:outline-none"
                />
              </div>

              <ul id={listId} className="flex-1 overflow-y-auto overscroll-contain pb-[env(safe-area-inset-bottom)]">
                {filtered.length === 0 ? (
                  <li className="px-4 py-6 text-center text-sm text-muted">No matches found.</li>
                ) : (
                  filtered.map((option) => {
                    const selected = option === value;
                    return (
                      <li key={option}>
                        <button
                          type="button"
                          onClick={() => select(option)}
                          className={`flex min-h-[48px] w-full items-center justify-between px-4 text-left text-base ${
                            selected ? "bg-pill font-medium text-navy" : "text-ink hover:bg-pill/60"
                          }`}
                        >
                          {option}
                          {selected && (
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4 shrink-0">
                              <path d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </button>
                      </li>
                    );
                  })
                )}
              </ul>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
