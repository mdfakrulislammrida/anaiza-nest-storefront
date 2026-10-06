// Strict, retrying GET for the static build.
//
// The storefront is baked from the API, so a half-answered build must never ship: a timeout or a
// 504 from the shared host that quietly became "no products" would publish an empty shop. This
// retries what is plausibly transient, and otherwise throws an error that names the URL and status.
// A 200 with a valid empty list is NOT an error -- that is simply an empty catalogue.
//
// Kept free of Next and project imports so it can be unit-tested with `npm test`.

export class BuildFetchError extends Error {
  readonly url: string;
  readonly status: number | null;
  readonly attempts: number;

  constructor(url: string, status: number | null, detail: string, attempts: number) {
    super(
      `API request failed: GET ${url} -> ${status ?? "no response"} (${detail}) after ${attempts} attempt${attempts === 1 ? "" : "s"}`,
    );
    this.name = "BuildFetchError";
    this.url = url;
    this.status = status;
    this.attempts = attempts;
  }
}

export interface StrictFetchOptions {
  /** Extra tries after the first one. */
  retries?: number;
  /** Base delay; attempt N waits N times this. */
  delayMs?: number;
  /** Per-attempt timeout. */
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
  sleep?: (ms: number) => Promise<void>;
}

interface Failure {
  status: number | null;
  detail: string;
  retriable: boolean;
}

export async function fetchJsonStrict(
  url: string,
  init: RequestInit = {},
  options: StrictFetchOptions = {},
): Promise<unknown> {
  const {
    retries = 3,
    delayMs = 1500,
    timeoutMs = 30_000,
    fetchImpl = fetch,
    sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)),
  } = options;
  const attempts = retries + 1;

  for (let attempt = 1; ; attempt++) {
    let failure: Failure;

    try {
      const res = await fetchImpl(url, { ...init, signal: AbortSignal.timeout(timeoutMs) });
      const text = await res.text();

      if (res.ok) {
        try {
          return JSON.parse(text);
        } catch {
          // A 200 carrying a host error page, or a cut-off body: worth another try.
          failure = { status: res.status, detail: "the response was not valid JSON", retriable: true };
        }
      } else {
        failure = {
          status: res.status,
          detail: `HTTP ${res.status}`,
          // 5xx, 429 and 408 are the shared host struggling; any other 4xx will not change on a retry.
          retriable: res.status >= 500 || res.status === 429 || res.status === 408,
        };
      }
    } catch (error) {
      const timedOut = error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError");
      failure = {
        status: null,
        detail: timedOut ? `timed out after ${timeoutMs} ms` : error instanceof Error ? error.message : String(error),
        retriable: true,
      };
    }

    if (!failure.retriable || attempt >= attempts) {
      throw new BuildFetchError(url, failure.status, failure.detail, attempt);
    }

    await sleep(delayMs * attempt);
  }
}
