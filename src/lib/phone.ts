// The mobile number field (PhoneField): what is typed is turned into the local 11-digit number, and judged. Pure text rules (no browser), so they can be tested.
//
// What is submitted is exactly what the forms sent before: the local number, 01XXXXXXXXX. The "+88" shown in the field is a label, never part of the value. (The
// server accepts that form and compares numbers as numbers; the data layer's hash is made from 8801XXXXXXXXX in userData.ts, which is not changed.)

/** The country code shown at the left of the field. */
export const PHONE_PREFIX = "+88";

/** A Bangladeshi mobile number: 01, then 3 to 9, then 8 digits. */
export const BD_MOBILE = /^01[3-9]\d{8}$/;

/** The same rule as a text for the field's `pattern` attribute. */
export const BD_MOBILE_PATTERN = "01[3-9][0-9]{8}";

export const PHONE_MESSAGE = "Enter an 11-digit mobile number, e.g. 01712345678";

/** The field never takes more than this many characters from the keyboard or an autofill (room for "+88 01712-345678"); the value is cut to 11 digits anyway. */
export const PHONE_MAX_LENGTH = 20;

/**
 * Whatever was typed, pasted or autofilled, as the local number as far as it goes. Lenient: it never refuses a keystroke.
 *  - only digits are kept ("01712-345 678" is "01712345678");
 *  - a leading 0088, +88 or 88 is taken off when what is left starts with 01 ("+8801712345678" is "01712345678");
 *  - exactly 10 digits starting with 1 get the leading 0 ("1712345678" is "01712345678");
 *  - at most 11 digits.
 */
export function normalizePhoneInput(raw: string | null | undefined): string {
  let digits = (raw ?? "").replace(/\D/g, "");

  if (digits.startsWith("0088") && digits.slice(4).startsWith("01")) digits = digits.slice(4);
  else if (digits.startsWith("88") && digits.slice(2).startsWith("01")) digits = digits.slice(2);

  if (digits.length === 10 && digits.startsWith("1")) digits = `0${digits}`;

  return digits.slice(0, 11);
}

export function isValidBdMobile(value: string | null | undefined): boolean {
  return BD_MOBILE.test(value ?? "");
}

export type PhoneState = "neutral" | "valid" | "invalid";

/**
 * How the field looks. Neutral while the person is typing (and while it is empty); green with a check as soon as the number is valid; red with the short message
 * only for a number that is not valid AFTER the field was left or the form was submitted. Nothing is red before anything was typed, unless the form was submitted
 * with the field empty.
 */
export function phoneView(value: string, left: boolean, submitted: boolean): { state: PhoneState; message: string | null } {
  if (isValidBdMobile(value)) return { state: "valid", message: null };

  const show = value === "" ? submitted : left || submitted;

  return show ? { state: "invalid", message: PHONE_MESSAGE } : { state: "neutral", message: null };
}

/** The accessible name of the field: the visible label and the country code, e.g. "Mobile number, +88". */
export function phoneAccessibleName(label: string): string {
  return `${label}, ${PHONE_PREFIX}`;
}
