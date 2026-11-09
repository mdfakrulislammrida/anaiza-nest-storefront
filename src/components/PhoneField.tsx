"use client";

import { useEffect, useId, useRef, useState } from "react";
import { BD_MOBILE_PATTERN, PHONE_MAX_LENGTH, PHONE_MESSAGE, PHONE_PREFIX, normalizePhoneInput, phoneAccessibleName, phoneView } from "@/lib/phone";

interface PhoneFieldProps {
  /** The form field's name: what the value is read under (FormData), as before. */
  name: string;
  id?: string;
  /** The visible label, e.g. "Phone number". The accessible name adds the country code: "Phone number, +88". */
  label: string;
  labelClassName?: string;
  required?: boolean;
  defaultValue?: string;
  placeholder?: string;
  /** A problem the form found (the server's, or its own check at submit): shown in place of the field's own message. */
  externalError?: string | null;
  /** Told every time the (normalised) value changes. */
  onValueChange?: (value: string) => void;
  onBlur?: () => void;
  className?: string;
}

// A fixed "+88" at the left of one rounded border, then the number. The "+88" is a label, not text of the input: it is not editable, not in the value, and
// not read by a screen reader as part of the field's text (the field's name says it). What is typed or pasted is normalised on the spot (see lib/phone.ts), so
// "+8801712345678", "8801712345678" and "01712-345 678" all end as 01712345678, and a browser's autofill with +880… does too.
export default function PhoneField({
  name,
  id,
  label,
  labelClassName = "text-caption font-medium text-stone",
  required = true,
  defaultValue = "",
  placeholder = "01712345678",
  externalError = null,
  onValueChange,
  onBlur,
  className = "",
}: PhoneFieldProps) {
  const autoId = useId();
  const fieldId = id ?? `${autoId}-phone`;
  const messageId = `${fieldId}-message`;
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState(() => normalizePhoneInput(defaultValue));
  const [left, setLeft] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // The field is not controlled: the form reads the input itself (so a page that fills it in, like a recovered cart, still works by setting the value and
  // sending an "input" event). The value is normalised in place, keeping the caret where the person was.
  function apply(input: HTMLInputElement) {
    const raw = input.value;
    const clean = normalizePhoneInput(raw);

    if (clean !== raw) {
      const fromEnd = raw.length - (input.selectionStart ?? raw.length);
      input.value = clean;
      const caret = Math.max(0, clean.length - fromEnd);
      if (document.activeElement === input) input.setSelectionRange(caret, caret);
    }

    setValue(clean);
    onValueChange?.(clean);
  }

  useEffect(() => {
    // A value the page gave it (the default, or one a browser filled in before this ran) is made right too.
    if (inputRef.current && inputRef.current.value !== "") apply(inputRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once, on mount
  }, []);

  const view = phoneView(value, left, submitted);
  const message = externalError ?? view.message;
  const state = externalError ? "invalid" : view.state;

  const border = state === "valid" ? "border-success" : state === "invalid" ? "border-burgundy" : "border-stone/80 focus-within:border-navy";

  return (
    <div className={className}>
      <label htmlFor={fieldId} className={labelClassName}>
        {label}
      </label>
      <div className={`mt-1 flex min-h-11 w-full items-center rounded-btn border bg-ivory text-base text-charcoal ${border}`}>
        <span aria-hidden="true" className="select-none whitespace-nowrap pl-4 pr-1 text-stone">
          {PHONE_PREFIX}
        </span>
        <input
          ref={inputRef}
          id={fieldId}
          name={name}
          type="tel"
          inputMode="numeric"
          autoComplete="tel-national"
          aria-label={phoneAccessibleName(label)}
          aria-invalid={state === "invalid" ? true : undefined}
          aria-describedby={message ? messageId : undefined}
          required={required}
          pattern={BD_MOBILE_PATTERN}
          title={PHONE_MESSAGE}
          maxLength={PHONE_MAX_LENGTH}
          placeholder={placeholder}
          defaultValue={normalizePhoneInput(defaultValue)}
          onInput={(event) => apply(event.currentTarget)}
          onBlur={(event) => {
            apply(event.currentTarget);
            setLeft(true);
            onBlur?.();
          }}
          onInvalid={() => setSubmitted(true)}
          className="min-h-[calc(2.75rem-2px)] min-w-0 flex-1 bg-transparent py-2 pl-1 pr-3 text-base text-charcoal outline-none placeholder:text-stone/60"
        />
        {state === "valid" && (
          <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="mr-3 h-4 w-4 shrink-0 text-success">
            <path d="M5 13l4 4L19 7" />
          </svg>
        )}
      </div>
      {message && (
        <p id={messageId} className="mt-1 text-caption text-burgundy" aria-live="polite">
          {message}
        </p>
      )}
    </div>
  );
}
