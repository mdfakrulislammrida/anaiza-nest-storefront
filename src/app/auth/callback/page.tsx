import type { Metadata } from "next";
import { Suspense } from "react";
import AuthCallbackClient from "@/components/AuthCallbackClient";

export const metadata: Metadata = {
  title: "Signing in",
  robots: { index: false, follow: false },
};

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={null}>
      <AuthCallbackClient />
    </Suspense>
  );
}
