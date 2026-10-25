import type { Metadata } from "next";
import type { ReactNode } from "react";

// A moved address: never indexed, and its canonical is the page it moved to.
export const metadata: Metadata = {
  title: "Special prices",
  alternates: { canonical: "/special-prices" },
  robots: { index: false, follow: true },
};

export default function HotDealsLayout({ children }: { children: ReactNode }) {
  return children;
}
