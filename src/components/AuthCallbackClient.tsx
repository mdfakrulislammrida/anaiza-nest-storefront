"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

const ERROR_MESSAGES: Record<string, string> = {
  social_login_failed: "We couldn't complete that sign-in. Please try again.",
  no_email_from_provider:
    "That account didn't share an email address with us, so we can't sign you in with it.",
};

export default function AuthCallbackClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { loginWithToken } = useAuth();

  // Read once at mount: the callback URL's query string doesn't change
  // during this page's short life, so there's nothing to react to here --
  // only the async token exchange below needs an effect.
  const [error, setError] = useState<string | null>(() => {
    const errorCode = searchParams.get("error");
    if (errorCode) {
      return ERROR_MESSAGES[errorCode] ?? "Something went wrong signing you in. Please try again.";
    }
    return searchParams.get("token") ? null : "Missing sign-in details. Please try again.";
  });

  useEffect(() => {
    const token = searchParams.get("token");
    if (!token) return;

    loginWithToken(token)
      .then(() => router.replace("/account"))
      .catch(() => setError("We couldn't sign you in. Please try again."));
  }, [searchParams, loginWithToken, router]);

  if (error) {
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center sm:px-6">
        <h1 className="font-serif text-2xl text-ink">Sign-in failed</h1>
        <p className="mt-3 text-sm text-muted">{error}</p>
        <Link
          href="/account"
          className="mt-8 inline-flex items-center justify-center rounded-full bg-navy px-8 py-3 text-sm font-medium text-white transition-opacity hover:opacity-90"
        >
          Back to login
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md px-4 py-24 text-center sm:px-6">
      <h1 className="font-serif text-2xl text-ink">Signing you in&hellip;</h1>
      <p className="mt-3 text-sm text-muted">Just a moment.</p>
    </div>
  );
}
