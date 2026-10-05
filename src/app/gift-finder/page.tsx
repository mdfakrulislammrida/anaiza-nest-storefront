import type { Metadata } from "next";
import GiftFinderQuiz from "@/components/GiftFinderQuiz";

export const metadata: Metadata = {
  alternates: { canonical: "/gift-finder" },
  title: "Gift finder",
  description: "Answer three quick questions and we will suggest a few thoughtful gifts.",
};

export default function GiftFinderPage() {
  return <GiftFinderQuiz />;
}
