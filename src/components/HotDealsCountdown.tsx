"use client";

import { useEffect, useState } from "react";
import { getHomepageSections } from "@/lib/api";
import CountdownTimer from "./CountdownTimer";

// The /hot-deals banner's countdown. Seeded with the end time baked in at build, then refreshed
// once from the API so an edit (or clearing the date) in the admin takes effect without a rebuild.
// Renders nothing when no end time is set or it has passed.
export default function HotDealsCountdown({
  initialEndsAt,
  className,
}: {
  initialEndsAt: string | null;
  className?: string;
}) {
  const [endsAt, setEndsAt] = useState(initialEndsAt);

  useEffect(() => {
    let cancelled = false;

    getHomepageSections()
      .then((sections) => {
        if (cancelled) return;
        setEndsAt(sections.find((section) => section.type === "hot_deals")?.deal_ends_at ?? null);
      })
      .catch(() => {
        // Keep the build-time value.
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return <CountdownTimer endsAt={endsAt} className={className} />;
}
