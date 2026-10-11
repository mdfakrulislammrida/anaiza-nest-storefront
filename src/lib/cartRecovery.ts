// Putting a saved cart back from a reminder's link. The server describes each piece as it is now (price, stock); this turns
// that into the lines to add and a calm note for anything that is different. Pure, so it can be tested.

export interface RecoveredLine {
  product_id: number;
  variant_id: number | null;
  slug: string;
  name: string;
  variant: string | null;
  sku: string | null;
  quantity: number;
  wanted: number;
  available: number;
  price: number;
  was_price: number;
  image: string | null;
  status: "ok" | "price_changed" | "reduced" | "out_of_stock" | "unavailable";
}

export interface RecoveredCart {
  found: boolean;
  name: string | null;
  email: string | null;
  phone: string | null;
  items: RecoveredLine[];
  coupon: { code: string; value_label: string; valid_until_text: string | null } | null;
  coupon_ended: boolean;
}

export interface RestoreLine {
  productId: number;
  variantId: number | null;
  slug: string;
  name: string;
  variantLabel: string | null;
  sku: string | null;
  price: number;
  quantity: number;
  stock: number;
  image: string | null;
}

export interface RestorePlan {
  lines: RestoreLine[];
  notes: string[];
}

function price(value: number): string {
  return `৳${Math.round(value).toLocaleString("en-US")}`;
}

/** What to put in the cart, and what to tell the visitor about anything that has changed since they left. */
export function restorePlan(cart: RecoveredCart): RestorePlan {
  const lines: RestoreLine[] = [];
  const notes: string[] = [];

  for (const item of cart.items) {
    const label = item.variant ? `${item.name} (${item.variant})` : item.name;

    if (item.status === "unavailable") {
      notes.push(`${label} is no longer in the shop, so we have left it out.`);
      continue;
    }

    if (item.status === "out_of_stock" || item.quantity <= 0) {
      notes.push(`${label} is out of stock just now, so we have left it out.`);
      continue;
    }

    if (item.status === "reduced") {
      notes.push(
        item.quantity === 1
          ? `Only one ${label} is left, so we have put one in your cart.`
          : `Only ${item.quantity} of ${label} are left, so we have put ${item.quantity} in your cart.`,
      );
    }

    if (item.status === "price_changed" || item.price !== item.was_price) {
      notes.push(`The price of ${label} is now ${price(item.price)}, it was ${price(item.was_price)}.`);
    }

    lines.push({
      productId: item.product_id,
      variantId: item.variant_id,
      slug: item.slug,
      name: item.name,
      variantLabel: item.variant,
      sku: item.sku,
      price: item.price,
      quantity: item.quantity,
      stock: item.available,
      image: item.image,
    });
  }

  return { lines, notes: [...new Set(notes)] };
}
