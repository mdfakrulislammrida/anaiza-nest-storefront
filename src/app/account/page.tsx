"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { ApiError } from "@/lib/api";

const inputClass =
  "mt-1 w-full rounded-lg border border-line bg-ivory px-3 py-2.5 text-sm text-ink focus:border-navy focus:outline-none";
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

      {mode === "login" ? (
        <>
          <h1 className="font-serif text-3xl text-ink">Welcome back</h1>
          <p className="mt-2 text-sm text-muted">Login to view your orders and saved addresses.</p>

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
          <h1 className="font-serif text-3xl text-ink">Create your account</h1>
          <p className="mt-2 text-sm text-muted">Save your addresses and track orders faster.</p>

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
