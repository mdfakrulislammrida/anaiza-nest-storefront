"use client";

import { useEffect, useState } from "react";

// Cosmetic only — the backend has no real flash-sale end time yet, so this
// counts down a fixed 6-hour window from first render, matching the
// reference site's "Ends in" display without implying real urgency data.
const DURATION_SECONDS = 6 * 60 * 60;

function pad(value: number) {
  return String(value).padStart(2, "0");
}

export default function CountdownTimer() {
  const [secondsLeft, setSecondsLeft] = useState(DURATION_SECONDS);

  useEffect(() => {
    const id = setInterval(() => {
      setSecondsLeft((prev) => (prev <= 1 ? DURATION_SECONDS : prev - 1));
    }, 1000);
    return () => clearInterval(id);
  }, []);

  const hours = Math.floor(secondsLeft / 3600);
  const minutes = Math.floor((secondsLeft % 3600) / 60);
  const seconds = secondsLeft % 60;

  return (
    <div className="flex items-center gap-2 text-sm text-white/90">
      <span>Ends in</span>
      <div className="flex items-center gap-1 font-mono">
        <span className="rounded bg-white/10 px-2 py-1">{pad(hours)}</span>
        <span>:</span>
        <span className="rounded bg-white/10 px-2 py-1">{pad(minutes)}</span>
        <span>:</span>
        <span className="rounded bg-white/10 px-2 py-1">{pad(seconds)}</span>
      </div>
    </div>
  );
}
