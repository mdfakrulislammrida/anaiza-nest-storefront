"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { exchangeSocialCode } from "@/lib/api";
import { unavailableMessage } from "@/lib/socialLogin";

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
    if (errorCode === "social_login_unavailable") {
      return unavailableMessage(searchParams.get("provider"));
    }
    if (errorCode) {
      return ERROR_MESSAGES[errorCode] ?? "Something went wrong signing you in. Please try again.";
    }
    return searchParams.get("code") || searchParams.get("token") ? null : "Missing sign-in details. Please try again.";
  });

  // The code works once, so it must be used once: a development double-run of this effect must not spend it twice.
  const started = useRef(false);

  useEffect(() => {
    const code = searchParams.get("code");
    const legacyToken = searchParams.get("token");
    if ((!code && !legacyToken) || started.current) return;
    started.current = true;

    // Whatever arrived in the address is not left in the history.
    window.history.replaceState(null, "", window.location.pathname);

    const signIn = code
      ? exchangeSocialCode(code).then(({ token, is_new }) => loginWithToken(token, is_new === true))
      : loginWithToken(legacyToken as string);

    signIn
      .then(() => router.replace("/account"))
      .catch(() => setError("We couldn't sign you in. Please try again."));
  }, [searchParams, loginWithToken, router]);

  if (error) {
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center sm:px-6">
        <h1 className="font-serif text-charcoal text-h1">Sign-in failed</h1>
        <p className="mt-4 text-body text-stone">{error}</p>
        <Link
          href="/account"
          className="mt-8 inline-flex items-center justify-center rounded-btn bg-navy px-8 py-4 text-button text-ivory transition-opacity hover:opacity-90"
        >
          Back to login
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md px-4 py-24 text-center sm:px-6">
      <h1 className="font-serif text-charcoal text-h1">Signing you in&hellip;</h1>
      <p className="mt-4 text-body text-stone">Just a moment.</p>
    </div>
  );
}
