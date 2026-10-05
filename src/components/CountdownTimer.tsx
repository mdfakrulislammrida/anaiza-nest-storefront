"use client";

import { useEffect, useState } from "react";

function pad(value: number) {
  return String(value).padStart(2, "0");
}

// A real countdown to an admin-set moment (the Special prices section's "Deal ends at").
// It renders nothing unless that moment is valid and still in the future -- no default
// window, no restarting loop -- and disappears by itself when the time runs out.
// "now" is only read after mount, so the static HTML never contains a stale time.
export default function CountdownTimer({
  endsAt,
  className = "",
}: {
  endsAt: string | null | undefined;
  className?: string;
}) {
  const [now, setNow] = useState<number | null>(null);

  const end = endsAt ? new Date(endsAt).getTime() : NaN;
  const valid = Number.isFinite(end);

  useEffect(() => {
    if (!valid) return;
    // Client-only clock: reading Date.now() during render would differ between the static HTML and hydration.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [valid, end]);

  if (!valid || now === null || end <= now) return null;

  const total = Math.floor((end - now) / 1000);
  const days = Math.floor(total / 86400);
  const hours = Math.floor((total % 86400) / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;

  return (
    <div className={`flex items-center gap-2 text-body text-ivory/90 ${className}`} role="timer" aria-label="Time left on this offer">
      <span>Ends in</span>
      <div className="flex items-center gap-1 font-mono">
        {days > 0 && (
          <>
            <span className="rounded bg-ivory/10 px-2 py-1">{days}d</span>
            <span>:</span>
          </>
        )}
        <span className="rounded bg-ivory/10 px-2 py-1">{pad(hours)}</span>
        <span>:</span>
        <span className="rounded bg-ivory/10 px-2 py-1">{pad(minutes)}</span>
        <span>:</span>
        <span className="rounded bg-ivory/10 px-2 py-1">{pad(seconds)}</span>
      </div>
    </div>
  );
}
