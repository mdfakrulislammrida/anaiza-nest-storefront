// The words for an order's status, in plain sentence case. The shop moves an order along by hand and, from the courier's reports, by itself
// (pending, processing, shipped, delivered), and a person can also mark one cancelled or returned. Whatever the API sends, a customer never sees
// a code: a status this list does not know gets a calm general label.

const LABELS: Record<string, string> = {
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

/** What a status is called when this list has no word for it. */
export const UNKNOWN_STATUS_LABEL = "In progress";

/** "On_hold", "on-hold" and "ON HOLD" are one status. */
function key(status: string): string {
  return status
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
}

export function orderStatusLabel(status: string | null | undefined): string {
  if (typeof status !== "string" || status.trim() === "") return UNKNOWN_STATUS_LABEL;

  return LABELS[key(status)] ?? UNKNOWN_STATUS_LABEL;
}

/** Every status with its own label, for the report and the tests. */
export function knownOrderStatuses(): string[] {
  return Object.keys(LABELS);
}
