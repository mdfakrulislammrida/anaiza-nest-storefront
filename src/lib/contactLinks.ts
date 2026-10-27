/** Which kind of contact link a href is: a WhatsApp chat or a phone call, else null. Used to report a tap on one as a lead (generate_lead). */
export function contactMethod(href: string | null | undefined): "whatsapp" | "phone" | null {
  if (!href) return null;
  if (/^tel:/i.test(href)) return "phone";
  if (/^whatsapp:/i.test(href) || /^https?:\/\/(wa\.me|api\.whatsapp\.com|web\.whatsapp\.com|chat\.whatsapp\.com)(\/|\?|$)/i.test(href)) return "whatsapp";

  return null;
}
