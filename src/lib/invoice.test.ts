import assert from "node:assert/strict";
import { describe, it, mock } from "node:test";
import { createInvoiceDownloader, fetchInvoice, INVOICE_ERROR_MESSAGE, invoiceFileName, saveBlob, type InvoiceState } from "./invoice.ts";

const API = "https://api.anaizanest.com/api";
const LINK = "https://api.anaizanest.com/api/orders/12/invoice?expires=1&signature=abc";
const PDF = () => new Response(new Blob(["%PDF-1.7 fake"], { type: "application/pdf" }), { status: 200, headers: { "Content-Type": "application/pdf" } });
const json = (body: unknown, status: number) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

describe("invoice file name", () => {
  it("is AnaizaNest-Invoice-<order number>.pdf and cannot carry a path or an odd character", () => {
    assert.equal(invoiceFileName(12), "AnaizaNest-Invoice-12.pdf");
    assert.equal(invoiceFileName("1042"), "AnaizaNest-Invoice-1042.pdf");
    assert.equal(invoiceFileName("../../x y.pdf"), "AnaizaNest-Invoice-xypdf.pdf");
  });
});

describe("fetching the invoice", () => {
  it("success: a PDF becomes a blob with the right name, asked of the shop's API only", async () => {
    const calls: string[] = [];
    const result = await fetchInvoice(LINK, 12, API, async (input) => {
      calls.push(String(input));

      return PDF();
    });

    assert.ok(result.ok);
    assert.equal(result.fileName, "AnaizaNest-Invoice-12.pdf");
    assert.ok(result.blob.size > 0);
    assert.deepEqual(calls, [LINK]);
  });

  it("sends no cookies and no login: the signature in the link is the proof", async () => {
    let init: RequestInit | undefined;

    await fetchInvoice(LINK, 12, API, async (_input, options) => {
      init = options;

      return PDF();
    });

    assert.equal(init?.credentials, "omit");
    assert.equal((init?.headers as Record<string, string>).Authorization, undefined);
  });

  it("a JSON error (a 500 with invoice_failed) is a failure, never a file", async () => {
    const result = await fetchInvoice(LINK, 12, API, async () => json({ error: "invoice_failed", message: "Could not make it." }, 500));

    assert.deepEqual(result, { ok: false, reason: "server", status: 500 });
  });

  it("a 403 (a link that is wrong or out of date) and a 404 are failures of the link", async () => {
    for (const status of [403, 404]) {
      const result = await fetchInvoice(LINK, 12, API, async () => json({ error: "invoice_link_invalid" }, status));

      assert.deepEqual(result, { ok: false, reason: "link", status });
    }
  });

  it("a 200 that is not a PDF (a page from a proxy, JSON) is a failure", async () => {
    const html = await fetchInvoice(LINK, 12, API, async () => new Response("<html>oops</html>", { status: 200, headers: { "Content-Type": "text/html" } }));
    const body = await fetchInvoice(LINK, 12, API, async () => json({ ok: true }, 200));
    const empty = await fetchInvoice(LINK, 12, API, async () => new Response(new Blob([], { type: "application/pdf" }), { status: 200, headers: { "Content-Type": "application/pdf" } }));

    for (const result of [html, body, empty]) assert.deepEqual({ ok: result.ok, reason: result.ok ? null : result.reason }, { ok: false, reason: "not_pdf" });
  });

  it("no answer is a failure, not an exception", async () => {
    const result = await fetchInvoice(LINK, 12, API, async () => {
      throw new TypeError("Failed to fetch");
    });

    assert.deepEqual(result, { ok: false, reason: "network", status: null });
  });

  it("never asks a server that is not the shop's API", async () => {
    let called = false;

    for (const bad of ["https://evil.example/orders/12/invoice?signature=abc", "not a url", "http://api.anaizanest.com/api/x", "javascript:alert(1)"]) {
      const result = await fetchInvoice(bad, 12, API, async () => {
        called = true;

        return PDF();
      });

      assert.deepEqual({ ok: result.ok, reason: result.ok ? null : result.reason }, { ok: false, reason: "refused_address" }, bad);
    }

    assert.equal(called, false);
  });
});

describe("the download, one at a time", () => {
  it("goes loading, then idle, and hands the file over once", async () => {
    const states: InvoiceState[] = [];
    const saved: string[] = [];
    const download = createInvoiceDownloader({ apiOrigin: API, fetchImpl: async () => PDF(), save: (_blob, name) => saved.push(name), onState: (state) => states.push(state) });

    assert.equal(await download(LINK, 12), "saved");
    assert.deepEqual(states, ["loading", "idle"]);
    assert.deepEqual(saved, ["AnaizaNest-Invoice-12.pdf"]);
  });

  it("a failure shows the error state and saves nothing", async () => {
    const states: InvoiceState[] = [];
    const saved: string[] = [];

    for (const response of [() => json({ error: "invoice_failed" }, 500), () => json({ error: "invoice_link_invalid" }, 403)]) {
      states.length = 0;
      const download = createInvoiceDownloader({ apiOrigin: API, fetchImpl: async () => response(), save: (_blob, name) => saved.push(name), onState: (state) => states.push(state) });

      assert.equal(await download(LINK, 12), "failed");
      assert.deepEqual(states, ["loading", "error"]);
    }

    assert.deepEqual(saved, []);
  });

  it("a second press while one is running does nothing (no double submit), and the next one works afterwards", async () => {
    let release: (response: Response) => void = () => {};
    let fetches = 0;
    const states: InvoiceState[] = [];
    const download = createInvoiceDownloader({
      apiOrigin: API,
      fetchImpl: () => {
        fetches++;

        return new Promise<Response>((resolve) => {
          release = resolve;
        });
      },
      save: () => {},
      onState: (state) => states.push(state),
    });

    const first = download(LINK, 12);
    const second = await download(LINK, 12);

    assert.equal(second, "busy");
    assert.equal(fetches, 1);
    assert.deepEqual(states, ["loading"], "the second press changed nothing");

    release(PDF());
    assert.equal(await first, "saved");

    // Free again once the first has finished.
    const third = download(LINK, 12);
    release(PDF());
    assert.equal(await third, "saved");
    assert.equal(fetches, 2);
  });

  it("a browser that refuses the file is an error state, not a silent failure", async () => {
    const states: InvoiceState[] = [];
    const download = createInvoiceDownloader({
      apiOrigin: API,
      fetchImpl: async () => PDF(),
      save: () => {
        throw new Error("blocked");
      },
      onState: (state) => states.push(state),
    });

    assert.equal(await download(LINK, 12), "failed");
    assert.deepEqual(states, ["loading", "error"]);
  });

  it("the message is calm, says what to do, and shows no code", () => {
    assert.match(INVOICE_ERROR_MESSAGE, /could not prepare your invoice/);
    assert.match(INVOICE_ERROR_MESSAGE, /WhatsApp with your order number/);
    assert.doesNotMatch(INVOICE_ERROR_MESSAGE, /\b(403|404|500|invoice_failed|undefined|null)\b/);
  });
});

describe("handing the file to the browser", () => {
  it("clicks an anchor with download on a blob address, then lets the address go", () => {
    mock.timers.enable({ apis: ["setTimeout"] });

    try {
      const events: string[] = [];
      const anchor = { href: "", download: "", rel: "", style: { display: "" }, click: () => events.push("click"), remove: () => events.push("remove") };
      const doc = { createElement: () => anchor, body: { appendChild: () => events.push("append") } } as unknown as Document;
      const urls = { createObjectURL: () => "blob:fake-1", revokeObjectURL: (address: string) => events.push(`revoke ${address}`) };

      saveBlob(new Blob(["x"]), "AnaizaNest-Invoice-12.pdf", doc, urls);

      assert.equal(anchor.href, "blob:fake-1");
      assert.equal(anchor.download, "AnaizaNest-Invoice-12.pdf");
      assert.deepEqual(events, ["append", "click", "remove"], "no window.open anywhere, and the address is still alive");

      mock.timers.tick(1000);
      assert.deepEqual(events, ["append", "click", "remove", "revoke blob:fake-1"]);
    } finally {
      mock.timers.reset();
    }
  });
});
