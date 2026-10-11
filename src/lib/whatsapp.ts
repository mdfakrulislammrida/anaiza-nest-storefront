// WhatsApp links, in one place. The number, the first message, the bubble switch and the pages that hide it all come from
// the shop's Site Settings (the API's `whatsapp` block, with the contact phone as the number when none is set), so a change
// shows without a rebuild. Nothing about the number lives in code.
//
// The same rule is applied by the admin's wa.me links in the API (App\Support\WhatsApp): digits only, the message encoded.

export const DEFAULT_WHATSAPP_MESSAGE = "Hello, I would like some help choosing a gift.";

interface WhatsAppSettingsBlock {
  number?: string | null;
  message?: string | null;
  show_bubble?: boolean | null;
  hidden_paths?: string[] | null;
}

export interface WhatsAppConfig {
  /** As the admin typed it, or the contact phone. Null when the shop has neither. */
  number: string | null;
  message: string;
  showBubble: boolean;
  hiddenPaths: string[];
}

/** Digits only, with the country code. A local Bangladeshi number (01XXXXXXXXX) gets 880 in front. */
export function whatsappDigits(number: string | null | undefined): string | null {
  let digits = (number ?? "").replace(/\D/g, "");
  if (digits === "") return null;

  if (digits.startsWith("00")) digits = digits.slice(2);
  else if (digits.startsWith("0")) digits = `880${digits.slice(1)}`;

  return digits.length >= 8 ? digits : null;
}

/** A wa.me link with the message ready in the box, or null when there is no usable number. */
export function whatsappLink(number: string | null | undefined, message?: string | null): string | null {
  const digits = whatsappDigits(number);
  if (digits === null) return null;

  const text = (message ?? "").trim();

  return `https://wa.me/${digits}${text === "" ? "" : `?text=${encodeURIComponent(text)}`}`;
}

/** Whether a page is one the bubble is hidden on: the path itself, or anything under it. "/" means the home page only. */
export function isPathHidden(pathname: string, hiddenPaths: string[] | null | undefined): boolean {
  const here = normalizePath(pathname);

  return (hiddenPaths ?? []).some((raw) => {
    const hidden = normalizePath(raw);

    return hidden === "/" ? here === "/" : here === hidden || here.startsWith(`${hidden}/`);
  });
}

function normalizePath(path: string): string {
  const clean = `/${path.trim().split(/[?#]/)[0].replace(/^\/+|\/+$/g, "")}`;

  return clean === "/" ? "/" : clean.toLowerCase();
}

export function resolveWhatsApp(
  settings: { contact_phone?: string | null; whatsapp?: WhatsAppSettingsBlock | null } | null | undefined,
): WhatsAppConfig {
  const block = settings?.whatsapp ?? null;
  const number = block?.number?.trim() || settings?.contact_phone?.trim() || null;

  return {
    number,
    message: block?.message?.trim() || DEFAULT_WHATSAPP_MESSAGE,
    // An API that predates the block keeps the bubble on, as it always was.
    showBubble: block?.show_bubble !== false,
    hiddenPaths: block?.hidden_paths ?? [],
  };
}
