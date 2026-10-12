import type { Metadata } from "next";
import type { ReactNode } from "react";
import { privatePageRobots } from "@/lib/seo";

// The page is a client component, which cannot export metadata: this server layout carries the title and the noindex tag.
export const metadata: Metadata = {
  title: "Choose a new password",
  robots: privatePageRobots(),
};

export default function Layout({ children }: { children: ReactNode }) {
  return children;
}
