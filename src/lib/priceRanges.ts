// The four price ranges the shop filters by. The Filter panel on the shop and category pages and the home page's "Gift by
// budget" tiles read this one list, so a tile opens the shop with the same range the panel then shows as chosen.
// (The API filters on the regular price, with both ends included.)
export const PRICE_RANGES = [
  { label: "Under ৳1,500", tile: "Under ৳1,500", min: undefined, max: 1500 },
  { label: "৳1,500 – ৳3,000", tile: "৳1,500 to ৳3,000", min: 1500, max: 3000 },
  { label: "৳3,000 – ৳6,000", tile: "৳3,000 to ৳6,000", min: 3000, max: 6000 },
  { label: "Above ৳6,000", tile: "Above ৳6,000", min: 6000, max: undefined },
] as const;

export function priceRangeHref(range: { min?: number; max?: number }): string {
  const params = new URLSearchParams();
  if (range.min !== undefined) params.set("min_price", String(range.min));
  if (range.max !== undefined) params.set("max_price", String(range.max));
  return `/shop?${params.toString()}`;
}
