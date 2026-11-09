"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import SortLabel from "@/components/SortLabel";
import { listBarButton } from "@/lib/listBar";

const OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "Most relevant" },
  { value: "newest", label: "Newest" },
  { value: "price_asc", label: "Price: low to high" },
  { value: "price_desc", label: "Price: high to low" },
];

// "inline" is the sort above the list from 640 px up. "bar" is the phone's button in the Filter/Sort bar: it looks like a button (value cut cleanly) and
// the real <select> lies over it, invisible, so a tap opens the phone's own picker. The options, the address it sets (?sort=) and the rest are the same.
export default function SortDropdown({ variant = "inline" }: { variant?: "inline" | "bar" }) {
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

  if (variant === "bar") {
    const current = OPTIONS.find((option) => option.value === (searchParams.get("sort") ?? "")) ?? OPTIONS[0];

    return (
      <label className={`${listBarButton} relative justify-between`}>
        <SortLabel value={current.label} />
        <select
          aria-label="Sort products"
          value={current.value}
          onChange={(event) => handleChange(event.target.value)}
          className="absolute inset-0 h-full w-full cursor-pointer appearance-none opacity-0"
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

  return (
    <label className="flex items-center gap-2 text-caption">
      <span className="font-semibold text-stone">Sort:</span>
      <select
        defaultValue={searchParams.get("sort") ?? ""}
        onChange={(event) => handleChange(event.target.value)}
        className="min-h-11 border-0 bg-transparent text-body font-medium text-charcoal focus:outline-none"
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
