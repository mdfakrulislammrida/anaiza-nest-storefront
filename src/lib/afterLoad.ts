// Runs something a little after the page has finished loading, instead of the moment it appears. The page's own pictures, scripts and
// fonts are what a visitor is waiting for; the quiet checks that the build-time copy of the shop's settings and lists is still current
// can wait a few seconds, and then do not compete with them for a phone's connection and processor.
// Returns a function that cancels it (for an effect's clean-up). On the server it does nothing.

export const AFTER_LOAD_MS = 2500;

export function afterLoad(run: () => void, delay: number = AFTER_LOAD_MS): () => void {
  if (typeof window === "undefined") return () => {};

  let cancelled = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const start = () => {
    timer = setTimeout(() => {
      if (!cancelled) run();
    }, delay);
  };

  if (document.readyState === "complete") start();
  else window.addEventListener("load", start, { once: true });

  return () => {
    cancelled = true;
    if (timer !== undefined) clearTimeout(timer);
    window.removeEventListener("load", start);
  };
}
