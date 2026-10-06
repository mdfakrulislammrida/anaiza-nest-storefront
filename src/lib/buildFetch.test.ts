// Run with `npm test` (Node's built-in test runner; no extra dependency).
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { BuildFetchError, fetchJsonStrict } from "./buildFetch.ts";

const URL_UNDER_TEST = "https://api.example.test/api/products";

function respond(status: number, body: string): Response {
  return new Response(body, { status });
}

/** A fetch stub that plays back the given outcomes in order, and records how often it was called. */
function stub(outcomes: Array<Response | Error>) {
  const calls: string[] = [];
  const fetchImpl = (async (input: RequestInfo | URL) => {
    calls.push(String(input));
    const next = outcomes[Math.min(calls.length - 1, outcomes.length - 1)];
    if (next instanceof Error) throw next;
    // Responses can only be read once, so hand out a fresh copy.
    return next.clone();
  }) as typeof fetch;
  return { fetchImpl, calls };
}

const noSleep = { sleep: async () => {}, delayMs: 0 };

describe("fetchJsonStrict", () => {
  it("returns parsed JSON on a 200", async () => {
    const { fetchImpl, calls } = stub([respond(200, '{"data":[1,2]}')]);
    assert.deepEqual(await fetchJsonStrict(URL_UNDER_TEST, {}, { fetchImpl, ...noSleep }), { data: [1, 2] });
    assert.equal(calls.length, 1);
  });

  it("treats a 200 with a valid EMPTY list as success, not as a failure", async () => {
    const { fetchImpl } = stub([respond(200, '{"data":[],"meta":{"last_page":1}}')]);
    assert.deepEqual(await fetchJsonStrict(URL_UNDER_TEST, {}, { fetchImpl, ...noSleep }), {
      data: [],
      meta: { last_page: 1 },
    });
  });

  it("retries a 504 and succeeds when the host recovers", async () => {
    const { fetchImpl, calls } = stub([respond(504, "gateway timeout"), respond(504, "gateway timeout"), respond(200, '{"data":[]}')]);
    const slept: number[] = [];
    const result = await fetchJsonStrict(URL_UNDER_TEST, {}, { fetchImpl, delayMs: 100, sleep: async (ms) => void slept.push(ms) });
    assert.deepEqual(result, { data: [] });
    assert.equal(calls.length, 3);
    assert.deepEqual(slept, [100, 200], "waits a little longer before each retry");
  });

  it("gives up after 3 retries and names the URL and status", async () => {
    const { fetchImpl, calls } = stub([respond(504, "gateway timeout")]);
    await assert.rejects(fetchJsonStrict(URL_UNDER_TEST, {}, { fetchImpl, ...noSleep }), (error: unknown) => {
      assert.ok(error instanceof BuildFetchError);
      assert.equal(error.url, URL_UNDER_TEST);
      assert.equal(error.status, 504);
      assert.equal(error.attempts, 4);
      assert.match(error.message, /GET https:\/\/api\.example\.test\/api\/products -> 504/);
      return true;
    });
    assert.equal(calls.length, 4, "one try plus three retries");
  });

  it("does not retry a 404 (it will not change) but still fails", async () => {
    const { fetchImpl, calls } = stub([respond(404, '{"message":"Not found"}')]);
    await assert.rejects(fetchJsonStrict(URL_UNDER_TEST, {}, { fetchImpl, ...noSleep }), (error: unknown) => {
      assert.ok(error instanceof BuildFetchError);
      assert.equal(error.status, 404);
      assert.equal(error.attempts, 1);
      return true;
    });
    assert.equal(calls.length, 1);
  });

  it("fails on a 200 that is not JSON, rather than treating it as empty", async () => {
    const { fetchImpl } = stub([respond(200, "<html>Maintenance</html>")]);
    await assert.rejects(fetchJsonStrict(URL_UNDER_TEST, {}, { fetchImpl, ...noSleep }), /not valid JSON/);
  });

  it("fails on an empty body", async () => {
    const { fetchImpl } = stub([respond(200, "")]);
    await assert.rejects(fetchJsonStrict(URL_UNDER_TEST, {}, { fetchImpl, ...noSleep }), /not valid JSON/);
  });

  it("retries a dropped connection and reports no status if it never recovers", async () => {
    const { fetchImpl, calls } = stub([new TypeError("fetch failed")]);
    await assert.rejects(fetchJsonStrict(URL_UNDER_TEST, {}, { fetchImpl, ...noSleep }), (error: unknown) => {
      assert.ok(error instanceof BuildFetchError);
      assert.equal(error.status, null);
      assert.match(error.message, /no response/);
      assert.match(error.message, /fetch failed/);
      return true;
    });
    assert.equal(calls.length, 4);
  });

  it("reports a timeout as a timeout", async () => {
    const timeout = Object.assign(new Error("The operation was aborted due to timeout"), { name: "TimeoutError" });
    const { fetchImpl } = stub([timeout]);
    await assert.rejects(fetchJsonStrict(URL_UNDER_TEST, {}, { fetchImpl, timeoutMs: 5, ...noSleep }), /timed out after 5 ms/);
  });
});
