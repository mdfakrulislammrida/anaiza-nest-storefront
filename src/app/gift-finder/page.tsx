import type { Metadata } from "next";
import GiftFinderQuiz from "@/components/GiftFinderQuiz";

export const metadata: Metadata = {
  title: "Gift Finder",
  description: "Answer three quick questions and we'll match you with the perfect gift.",
};

export default function GiftFinderPage() {
  return <GiftFinderQuiz />;
}
