"use client";

import { useCallback, useSyncExternalStore } from "react";

// Whether a CSS media query matches right now, and again when it changes. False in the static HTML (the server has no
// screen), so the first paint is the same for every visitor and the right answer arrives with the first client render.
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (notify: () => void) => {
      const list = window.matchMedia(query);
      list.addEventListener("change", notify);
      return () => list.removeEventListener("change", notify);
    },
    [query],
  );

  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false,
  );
}
