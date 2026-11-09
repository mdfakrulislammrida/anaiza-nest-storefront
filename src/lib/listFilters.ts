// The active filters of a product list as the chips under the phone's Filter/Sort bar, and the number on the Filter button. Plain rules (no browser),
// so they can be tested. The URLs are the same as before: a chip's `remove` is the change to the list's own address that takes that one filter away.
import { PRICE_RANGES } from "./priceRanges.ts";

export type FilterOverrides = Record<string, string | number | undefined>;

export interface FilterChip {
  key: "price" | "tag" | "search";
  label: string;
  /** What to set on the list's address (undefined = remove the parameter) to take this filter away. */
  remove: FilterOverrides;
}

const taka = (amount: number): string => `৳${amount.toLocaleString("en-US")}`;

const known = (value: number | undefined): number | undefined => (value !== undefined && Number.isFinite(value) ? value : undefined);

/** "Under ৳1,500", "৳1,500 – ৳3,000", "Above ৳6,000": the shop's own wording for a range, else one made from the two numbers. Null when there is no price filter. */
export function priceLabel(min?: number, max?: number): string | null {
  const low = known(min);
  const high = known(max);

  if (low === undefined && high === undefined) return null;

  const match = PRICE_RANGES.find((range) => range.min === low && range.max === high);
  if (match) return match.label;

  if (low !== undefined && high !== undefined) return `${taka(low)} – ${taka(high)}`;
  if (high !== undefined) return `Under ${taka(high)}`;

  return `Above ${taka(low as number)}`;
}

export interface ListFilterState {
  search?: string;
  tag?: string;
  /** The tag's name when the products carry it (else the slug, read as words). */
  tagName?: string | null;
  minPrice?: number;
  maxPrice?: number;
}

/** One chip for each filter that is on: price, tag and search, in that order. */
export function activeFilterChips(state: ListFilterState): FilterChip[] {
  const chips: FilterChip[] = [];
  const price = priceLabel(state.minPrice, state.maxPrice);

  if (price !== null) chips.push({ key: "price", label: price, remove: { min_price: undefined, max_price: undefined } });
  if (state.tag) chips.push({ key: "tag", label: `Tag: ${state.tagName || state.tag.replace(/-/g, " ")}`, remove: { tag: undefined } });
  if (state.search) chips.push({ key: "search", label: `Search: ${state.search}`, remove: { search: undefined } });

  return chips;
}

/** The number on the Filter button: how many filters are on (one for each chip). */
export function activeFilterCount(state: ListFilterState): number {
  return activeFilterChips(state).length;
}
