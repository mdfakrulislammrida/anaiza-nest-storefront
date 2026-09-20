"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";

const OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "Most Relevant" },
  { value: "newest", label: "Newest" },
  { value: "price_asc", label: "Price: Low to High" },
  { value: "price_desc", label: "Price: High to Low" },
  { value: "top_rated", label: "Top Rated" },
];

export default function SortDropdown() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function handleChange(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set("sort", value);
    } else {
      params.delete("sort");
    }
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <label className="flex items-center gap-2 text-xs">
      <span className="font-semibold uppercase tracking-widest text-muted">Sort:</span>
      <select
        defaultValue={searchParams.get("sort") ?? ""}
        onChange={(event) => handleChange(event.target.value)}
        className="border-0 bg-transparent text-sm font-medium text-ink focus:outline-none"
      >
        {OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
