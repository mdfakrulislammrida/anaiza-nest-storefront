// The one small tag a product card carries on its photo, and the other words a card says about stock.
// No imports on purpose, so the node tests can load it.

export type CardTagKind = "sold-out" | "sale" | "label" | "new";

export interface CardTag {
  kind: CardTagKind;
  text: string;
}

// "Only a few left" shows at this many or fewer.
export const LOW_STOCK_AT = 3;

export function isSoldOut(stock: number): boolean {
  return !(stock > 0);
}

export function isLowStock(stock: number): boolean {
  return stock > 0 && stock <= LOW_STOCK_AT;
}

// One tag, never two: sold out; else Special price (only on a real sale); else the product's first label from the
// admin; else New; else none. The admin's label text is trimmed (one saved with a stray tab or space is a label all the same).
export function cardTag(product: {
  stock_quantity: number;
  is_new: boolean;
  labels?: { name: string }[];
}, onSale: boolean): CardTag | null {
  if (isSoldOut(product.stock_quantity)) return { kind: "sold-out", text: "Sold out" };
  if (onSale) return { kind: "sale", text: "Special price" };

  const label = (product.labels ?? []).map((item) => item.name.trim()).find((name) => name !== "");
  if (label) return { kind: "label", text: label };

  if (product.is_new) return { kind: "new", text: "New" };

  return null;
}

// "1 product", "2 products".
export function countOf(count: number, noun: string): string {
  return `${count} ${noun}${count === 1 ? "" : "s"}`;
}
