"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

// Visibility (hidden on mobile, an expandable row, etc.) is controlled by
// the caller's wrapping element -- this component just renders the field.
export default function SearchBar({
  className = "",
  autoFocus = false,
  onSubmitted,
}: {
  className?: string;
  autoFocus?: boolean;
  onSubmitted?: () => void;
}) {
  const router = useRouter();
  const [value, setValue] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = value.trim();
    router.push(trimmed ? `/shop?search=${encodeURIComponent(trimmed)}` : "/shop");
    onSubmitted?.();
  }

  return (
    <form onSubmit={handleSubmit} className={`flex-1 ${className}`}>
      <div className="relative">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.8}
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="m21 21-4.3-4.3" />
        </svg>
        <input
          type="search"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder="Search for tea sets, ceramics, gift boxes..."
          autoFocus={autoFocus}
          // text-base (not text-sm): avoids iOS Safari's auto-zoom on focus.
          className="w-full rounded-full border border-line bg-pill py-2.5 pl-10 pr-4 text-base text-ink placeholder:text-muted focus:border-navy focus:outline-none"
        />
      </div>
    </form>
  );
}
