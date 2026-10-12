// The quiet bot trap on the public forms. No captcha and nothing the visitor sees:
//  - a field no person fills in (hp_field). A script that fills every field fills it.
//  - the moment the form appeared (form_rendered_at, in milliseconds). A script posts within a blink.
// The server (anaiza-nest-api, middleware "form-proof") checks both. It refuses a form filled in faster than a person
// could type, so the page waits out the difference itself, invisibly, rather than ever rejecting someone who was quick.

export const HONEYPOT_FIELD = "hp_field";
export const RENDERED_AT_FIELD = "form_rendered_at";

export type FormKind = "order" | "form" | "newsletter";

// A little more than the server's own minimums (order 4, form 3, newsletter 1), so a slightly fast clock never matters.
export const MIN_SECONDS: Record<FormKind, number> = { order: 5, form: 4, newsletter: 2 };

export interface FormProof {
  hp_field: string;
  form_rendered_at: number;
}

export function proofFields(renderedAt: number, honeypotValue: string): FormProof {
  return { [HONEYPOT_FIELD]: honeypotValue, [RENDERED_AT_FIELD]: Math.round(renderedAt) } as unknown as FormProof;
}

/** How many milliseconds are left before this form has been open long enough to send. 0 when it already has. */
export function msUntilSendable(renderedAt: number, kind: FormKind, now: number = Date.now()): number {
  const elapsed = now - renderedAt;

  // A clock that is wrong (a time in the future) is never held against anyone: the server ignores it too.
  if (elapsed < 0) return 0;

  return Math.max(0, MIN_SECONDS[kind] * 1000 - elapsed);
}

// The shape of ApiError, without importing it (this file stays free of browser and framework code).
interface ErrorLike {
  status?: number;
  message?: string;
  errors?: Record<string, string[]>;
}

/**
 * The sentence to show for a request that failed. The server's own wording (written in the shop's voice) wins; these
 * only fill in when there is none, such as no connection at all.
 */
export function calmMessage(error: unknown, fallback: string): string {
  const e = (typeof error === "object" && error !== null ? error : {}) as ErrorLike;

  if (e.status === 429) {
    return e.message || "That is a lot of tries in a short time. Please wait a minute and try again.";
  }

  if (e.status === 503) {
    return e.message || "We are a little busy just now. Please try again in a moment: nothing has been sent.";
  }

  // A refusal with no field to point at (the bot trap, a blocked number) already says what to do.
  if (typeof e.status === "number" && e.status >= 400 && e.status < 500 && !e.errors && e.message) {
    return e.message;
  }

  if (error instanceof TypeError) {
    return "We could not reach the shop just now. Please check your connection and try again.";
  }

  return fallback;
}

/** A Bangladeshi mobile number is 11 digits starting 01 and then 3 to 9. Typed with spaces, dashes or +88 is fine. */
const MOBILE = /^01[3-9]\d{8}$/;

export function mobileProblem(value: string): string | null {
  const digits = value.replace(/[\s\-().]/g, "").replace(/^\+?88(?=01)/, "");

  if (digits === "") return "Please enter your mobile number so our courier can reach you.";
  if (!MOBILE.test(digits)) return "Please enter a Bangladeshi mobile number, like 01712 345678, so our courier can reach you.";

  return null;
}
