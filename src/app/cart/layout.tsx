import type { Metadata } from "next";
import type { ReactNode } from "react";
import { privatePageRobots } from "@/lib/seo";

// The page itself is a client component, which can't export metadata -- this
// server layout exists only to carry the title and the noindex tag.
export const metadata: Metadata = {
  // Shown as "Your cart | Anaiza Nest" (the title template in the root layout).
  title: "Your cart",
  robots: privatePageRobots(),
};

export default function Layout({ children }: { children: ReactNode }) {
  return children;
}
