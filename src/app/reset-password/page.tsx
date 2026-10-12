"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { ApiError, checkPasswordResetToken, resetPassword } from "@/lib/api";
import { passwordProblems, tokenFromSearch } from "@/lib/passwordReset";
import { useHydrated } from "@/components/useFormGuard";

// text-base (not text-body): iOS Safari auto-zooms the page when a focused
// input's font is under 16px, which text-body's 14px would trigger.
const inputClass =
  "mt-1 w-full rounded-btn border border-stone/80 bg-ivory px-4 py-2 text-base text-charcoal focus:border-navy focus:outline-none";
const labelClass = "text-caption font-semibold text-stone";

type Stage = "checking" | "ready" | "ended" | "done";

// The page the link in a "choose a new password" email opens. The token is read from the address in the browser (the site is
// static), checked with the shop first so an ended link is said so before anyone types, and sent with the new password.
export default function ResetPasswordPage() {
  const hydrated = useHydrated();
  const [stage, setStage] = useState<Stage>("checking");
  const [token, setToken] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    const found = tokenFromSearch(window.location.search);
    // One-time sync from the address on mount -- window is unavailable during the static render.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setToken(found);

    if (found === null) {
      setStage("ended");
      return;
    }

    let cancelled = false;

    checkPasswordResetToken(found)
      .then((result) => {
        if (!cancelled) setStage(result.valid ? "ready" : "ended");
      })
      .catch(() => {
        // Cannot tell: show the form, and the server's answer to the real request settles it.
        if (!cancelled) setStage("ready");
      });

    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (token === null) return;

    const form = new FormData(event.currentTarget);
    const password = String(form.get("password") ?? "");
    const confirmation = String(form.get("password_confirmation") ?? "");

    const problems = passwordProblems(password, confirmation);
    setErrors(problems);
    setFormError(null);
    if (Object.keys(problems).length > 0) return;

    setSubmitting(true);

    try {
      await resetPassword({ token, password, password_confirmation: confirmation });
      setStage("done");
    } catch (error) {
      if (error instanceof ApiError && error.errors?.token) {
        setStage("ended");
      } else if (error instanceof ApiError && error.errors) {
        // The server's messages are written in our voice, so they are shown as they are.
        setErrors({ password: error.errors.password?.[0], password_confirmation: error.errors.password_confirmation?.[0] });
        setFormError(error.errors.password ? null : error.message);
      } else if (error instanceof ApiError && error.status === 429) {
        setFormError("That is a lot of tries in a short time. Please wait a little and try again.");
      } else {
        setFormError("Sorry, that did not go through. Please try again in a moment.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16 sm:px-6">
      <nav className="mb-6 text-caption text-stone">
        <Link href="/" className="hover:text-navy">
          Home
        </Link>
        <span className="mx-1.5">/</span>
        <Link href="/account" className="hover:text-navy">
          Account
        </Link>
        <span className="mx-1.5">/</span>
        <span className="text-charcoal">New password</span>
      </nav>

      {stage === "checking" && <p className="text-body text-stone">One moment.</p>}

      {stage === "ended" && (
        <div role="status">
          <h1 className="font-serif text-charcoal text-h1">This link has ended</h1>
          <p className="mt-4 text-body text-stone">
            A link to choose a new password works once and for one hour. Ask for a new one and we will email it to you.
          </p>
          <Link
            href="/account"
            className="mt-8 inline-flex min-h-12 w-full items-center justify-center rounded-btn bg-navy px-8 py-4 text-button text-ivory transition-opacity hover:opacity-90 sm:w-auto"
          >
            Ask for a new link
          </Link>
        </div>
      )}

      {stage === "ready" && (
        <>
          <h1 className="font-serif text-charcoal text-h1">Choose a new password</h1>
          <p className="mt-2 text-body text-stone">Use at least 8 characters. You will be signed out everywhere else.</p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4" noValidate>
            <div>
              <label htmlFor="new-password" className={labelClass}>
                New password
              </label>
              <input
                id="new-password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                aria-invalid={errors.password ? true : undefined}
                className={inputClass}
              />
              {errors.password && <p className="mt-1 text-caption text-burgundy">{errors.password}</p>}
            </div>
            <div>
              <label htmlFor="confirm-password" className={labelClass}>
                Type it again
              </label>
              <input
                id="confirm-password"
                name="password_confirmation"
                type="password"
                autoComplete="new-password"
                required
                aria-invalid={errors.password_confirmation ? true : undefined}
                className={inputClass}
              />
              {errors.password_confirmation && <p className="mt-1 text-caption text-burgundy">{errors.password_confirmation}</p>}
            </div>

            {formError && (
              <p role="alert" className="text-body text-burgundy">
                {formError}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting || !hydrated}
              className="min-h-12 w-full rounded-btn bg-navy px-8 py-4 text-button text-ivory transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {submitting ? "Saving..." : "Save new password"}
            </button>
          </form>
        </>
      )}

      {stage === "done" && (
        <div role="status">
          <h1 className="font-serif text-charcoal text-h1">Your password is changed</h1>
          <p className="mt-4 text-body text-stone">You can log in with it now.</p>
          <Link
            href="/account"
            className="mt-8 inline-flex min-h-12 w-full items-center justify-center rounded-btn bg-navy px-8 py-4 text-button text-ivory transition-opacity hover:opacity-90 sm:w-auto"
          >
            Log in
          </Link>
        </div>
      )}
    </div>
  );
}
