// What the Track order page shows about a booked parcel. The words come from the API (the shop's own plain sentence and the
// courier's name and code); the one thing checked here is the link, which is shown only if it is a plain https address.

export function courierLink(order: { tracking_url?: string | null; courier_name?: string | null }): { href: string; label: string } | null {
  const raw = order.tracking_url?.trim();

  if (!raw || !/^https:\/\//i.test(raw)) return null;

  try {
    const url = new URL(raw);
    if (url.protocol !== "https:") return null;

    return { href: url.toString(), label: order.courier_name ? `Track with ${order.courier_name}` : "Track the parcel" };
  } catch {
    return null;
  }
}
