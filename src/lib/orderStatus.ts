// The words for an order's status, in plain sentence case. The shop moves an order along by hand and, from the courier's reports, by itself
// (pending, processing, shipped, delivered), and a person can also mark one cancelled or returned. Whatever the API sends, a customer never sees
// a code: a status this list does not know gets a calm general label.

const LABELS: Record<string, string> = {
  // Set by the shop only, for an item that is on pre-order: it comes before Order received and Being prepared.
  preorder: "Pre-order",
  pending: "Order received",
  processing: "Being prepared",
  shipped: "On its way",
  delivered: "Delivered",
  cancelled: "Cancelled",
  returned: "Returned",
  // Not sent today; here so a status added later reads well before anyone updates this file.
  confirmed: "Order confirmed",
  completed: "Completed",
  refunded: "Refunded",
  on_hold: "On hold",
  out_for_delivery: "Out for delivery",
};

// One calm line for the statuses that need a word of explanation beside the label (the track-order and confirmation pages).
const NOTES: Record<string, string> = {
  preorder: "This item is on pre-order. We will message you on WhatsApp as soon as it is ready to ship.",
};

/** What a status is called when this list has no word for it. */
export const UNKNOWN_STATUS_LABEL = "In progress";

/** "On_hold", "on-hold" and "ON HOLD" are one status; so are "preorder", "pre-order" and "Pre order". */
function key(status: string): string {
  const normal = status
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");

  return normal === "pre_order" ? "preorder" : normal;
}

export function orderStatusLabel(status: string | null | undefined): string {
  if (typeof status !== "string" || status.trim() === "") return UNKNOWN_STATUS_LABEL;

  return LABELS[key(status)] ?? UNKNOWN_STATUS_LABEL;
}

/** The line to show beside a status label, or null when the label says enough. */
export function orderStatusNote(status: string | null | undefined): string | null {
  if (typeof status !== "string" || status.trim() === "") return null;

  return NOTES[key(status)] ?? null;
}

/** Every status with its own label, for the report and the tests. */
export function knownOrderStatuses(): string[] {
  return Object.keys(LABELS);
}
