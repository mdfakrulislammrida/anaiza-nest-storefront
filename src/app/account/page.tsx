"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { ApiError } from "@/lib/api";
import { API_BASE_URL } from "@/lib/config";

// text-base (not text-sm): iOS Safari auto-zooms the page when a focused
// input's font is under 16px, which text-sm's 14px would trigger.
const inputClass =
  "mt-1 w-full rounded-lg border border-line bg-ivory px-3 py-2.5 text-base text-ink focus:border-navy focus:outline-none";
const labelClass = "text-xs font-semibold uppercase tracking-widest text-muted";

export default function AccountPage() {
  const router = useRouter();
  const { customer, login, register, logout } = useAuth();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    const form = new FormData(event.currentTarget);
    try {
      await login({
        email: String(form.get("email") ?? ""),
        password: String(form.get("password") ?? ""),
      });
      router.push("/");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRegister(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    const form = new FormData(event.currentTarget);
    try {
      await register({
        name: String(form.get("name") ?? ""),
        email: String(form.get("email") ?? ""),
        password: String(form.get("password") ?? ""),
        phone: String(form.get("phone") ?? ""),
        address: String(form.get("address") ?? ""),
        city: String(form.get("city") ?? ""),
        postal_code: String(form.get("postal_code") ?? ""),
      });
      router.push("/");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (customer) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 sm:px-6">
        <nav className="mb-6 text-xs text-muted">
          <Link href="/" className="hover:text-navy">
            Home
          </Link>
          <span className="mx-1.5">/</span>
          <span className="text-ink">Account</span>
        </nav>
        <h1 className="font-serif text-3xl text-ink">Hi, {customer.name.split(" ")[0]}</h1>
        <p className="mt-2 text-sm text-muted">{customer.email}</p>
        <button
          type="button"
          onClick={logout}
          className="mt-8 w-full rounded-full border border-line px-8 py-3 text-sm font-medium text-ink hover:bg-pill"
        >
          Log out
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16 sm:px-6">
      <nav className="mb-6 text-xs text-muted">
        <Link href="/" className="hover:text-navy">
          Home
        </Link>
        <span className="mx-1.5">/</span>
        <span className="text-ink">Account</span>
      </nav>

      <h1 className="font-serif text-3xl text-ink">
        {mode === "login" ? "Welcome back" : "Create your account"}
      </h1>
      <p className="mt-2 text-sm text-muted">
        {mode === "login"
          ? "Login to view your orders and saved addresses."
          : "Save your addresses and track orders faster."}
      </p>

      <div className="mt-6 space-y-3">
        <a
          href={`${API_BASE_URL}/auth/google/redirect`}
          className="flex w-full items-center justify-center gap-2.5 rounded-full border border-line px-8 py-3 text-sm font-medium text-ink hover:bg-pill"
        >
          <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
            <path
              fill="#4285F4"
              d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62Z"
            />
            <path
              fill="#34A853"
              d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.81.54-1.84.87-3.04.87-2.34 0-4.32-1.58-5.03-3.7H.94v2.33A9 9 0 0 0 9 18Z"
            />
            <path
              fill="#FBBC05"
              d="M3.97 10.73A5.4 5.4 0 0 1 3.68 9c0-.6.1-1.19.29-1.73V4.94H.94A9 9 0 0 0 0 9c0 1.45.35 2.83.94 4.06l3.03-2.33Z"
            />
            <path
              fill="#EA4335"
              d="M9 3.58c1.32 0 2.51.46 3.44 1.35l2.59-2.59C13.46.89 11.43 0 9 0A9 9 0 0 0 .94 4.94l3.03 2.33C4.68 5.16 6.66 3.58 9 3.58Z"
            />
          </svg>
          Continue with Google
        </a>
        <a
          href={`${API_BASE_URL}/auth/facebook/redirect`}
          className="flex w-full items-center justify-center gap-2.5 rounded-full border border-line px-8 py-3 text-sm font-medium text-ink hover:bg-pill"
        >
          <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
            <path
              fill="#1877F2"
              d="M18 9a9 9 0 1 0-10.41 8.89v-6.29H5.31V9h2.28V7.02c0-2.25 1.34-3.49 3.39-3.49.98 0 2.01.18 2.01.18v2.21h-1.13c-1.11 0-1.46.69-1.46 1.4V9h2.49l-.4 2.6h-2.09v6.29A9 9 0 0 0 18 9Z"
            />
          </svg>
          Continue with Facebook
        </a>
      </div>

      <div className="my-6 flex items-center gap-3 text-xs uppercase tracking-widest text-muted">
        <span className="h-px flex-1 bg-line" />
        or
        <span className="h-px flex-1 bg-line" />
      </div>

      {mode === "login" ? (
        <>
          <form onSubmit={handleLogin} className="mt-6 space-y-4">
            <div>
              <label className={labelClass}>Email or Phone</label>
              <input name="email" type="text" required className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Password</label>
              <input name="password" type="password" required className={inputClass} />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-full bg-navy px-8 py-3 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {submitting ? "Logging in..." : "Login"}
            </button>
          </form>

          <p className="mt-4 text-sm text-muted">
            New here?{" "}
            <button type="button" onClick={() => setMode("register")} className="font-medium text-navy hover:underline">
              Create an account
            </button>
          </p>
        </>
      ) : (
        <>
          <form onSubmit={handleRegister} className="mt-6 space-y-4">
            <div>
              <label className={labelClass}>Full name</label>
              <input name="name" required className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Email</label>
              <input name="email" type="email" required className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Phone</label>
              <input name="phone" type="tel" required className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Address</label>
              <input name="address" required className={inputClass} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>City</label>
                <input name="city" required className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Postal code</label>
                <input name="postal_code" required className={inputClass} />
              </div>
            </div>
            <div>
              <label className={labelClass}>Password</label>
              <input name="password" type="password" required minLength={8} className={inputClass} />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-full bg-navy px-8 py-3 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {submitting ? "Creating account..." : "Create account"}
            </button>
          </form>

          <p className="mt-4 text-sm text-muted">
            Already have an account?{" "}
            <button type="button" onClick={() => setMode("login")} className="font-medium text-navy hover:underline">
              Log in
            </button>
          </p>
        </>
      )}
    </div>
  );
}
