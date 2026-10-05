// Wording that comes straight from the Anaiza Nest brand kit v1.0 (docs/brand-kit-extract.md).
// Nothing here is invented: if the kit does not say it, it does not belong in this file.

export const BRAND = {
  name: "Anaiza Nest",
  tagline: "Gifted, beautifully.",
  essence: "Affection, made visible.",
  oneLine:
    "Anaiza Nest is a Dhaka gifting house for tea sets, gift boxes and homeware, packed by hand and ready to give.",
  short:
    "Anaiza Nest curates ceramic and glass tea sets, gift collections and homeware for people who care how a gift feels to open. Every order is packed by hand and sent gift-ready, online at anaizanest.com and in store in Dhaka. Anaiza Nest is part of Fast-Signs Group, trading in Bangladesh since 2003.",
  supporting: {
    secondCup: "For the people you'd pour a second cup for.",
    packed: "Packed by hand, sent with care.",
    bangla: "যত্নে সাজানো উপহার।",
  },
  promise: "Every order leaves us gift-ready: beautiful to open, safe to send, easy to pay for.",
} as const;

// The kit's calls to action.
export const CTA = {
  order: "Order now, pay on delivery",
  findGift: "Find the right gift",
  shopTeaSets: "Shop tea sets",
  sendGift: "Send a gift",
  corporate: "Ask for a corporate quotation",
} as const;

// The seal carries only these three messages.
export type SealMessage = "Gift-ready" | "Packed by hand" | "Cash on delivery";

// The tagline under the logo: the admin's text, the kit line until the settings load or on an older
// API, and nothing at all if the admin cleared it on purpose (the API then sends null).
export function resolveTagline(siteSettings: { tagline?: string | null } | null): string | null {
  if (!siteSettings || siteSettings.tagline === undefined) return BRAND.tagline;
  return siteSettings.tagline;
}
