// Downloading an invoice. Kept free of React and of Next so it can be tested with `npm test`.
//
// The API gives every order a signed link (`invoice_url`, valid for seven days). Asking for it returns the PDF, or JSON with an error: a link
// that is wrong or out of date is a 403, a missing order a 404, a PDF that could not be made a 500. The PDF is fetched first and handed to the
// browser as a file afterwards (an anchor with `download` on a blob address). Nothing here opens a window: a `window.open` after an `await` is
// stopped by the pop-up blockers of phones and Safari, which is the usual reason a download "does nothing".

export const INVOICE_ERROR_MESSAGE =
  "We could not prepare your invoice just now. Please try again in a minute, or message us on WhatsApp with your order number.";

export function invoiceFileName(orderNumber: number | string): string {
  return `AnaizaNest-Invoice-${String(orderNumber).replace(/[^A-Za-z0-9_-]/g, "")}.pdf`;
}

export type InvoiceFailure = "link" | "server" | "network" | "not_pdf" | "refused_address";

export type InvoiceResult = { ok: true; blob: Blob; fileName: string } | { ok: false; reason: InvoiceFailure; status: number | null };

/**
 * Fetches the PDF. Only the shop's own API is ever asked (`apiOrigin`), whatever address an order carries.
 * Never throws: every way it can go wrong is a result.
 */
export async function fetchInvoice(
  invoiceUrl: string,
  orderNumber: number | string,
  apiOrigin: string,
  fetchImpl: typeof fetch = fetch,
): Promise<InvoiceResult> {
  let url: URL;

  try {
    url = new URL(invoiceUrl);
  } catch {
    return { ok: false, reason: "refused_address", status: null };
  }

  if (url.origin !== new URL(apiOrigin).origin) return { ok: false, reason: "refused_address", status: null };

  let response: Response;

  try {
    // No cookies and no login header: the signature in the link is the proof.
    response = await fetchImpl(url.toString(), { method: "GET", headers: { Accept: "application/pdf, application/json" }, credentials: "omit" });
  } catch {
    return { ok: false, reason: "network", status: null };
  }

  if (!response.ok) return { ok: false, reason: response.status === 403 || response.status === 404 ? "link" : "server", status: response.status };

  const type = (response.headers.get("Content-Type") ?? "").toLowerCase();

  // A 200 that is not a PDF (an HTML page from a proxy, JSON with an error) is a failure, never a file.
  if (!type.includes("application/pdf")) return { ok: false, reason: "not_pdf", status: response.status };

  try {
    const blob = await response.blob();

    return blob.size > 0 ? { ok: true, blob, fileName: invoiceFileName(orderNumber) } : { ok: false, reason: "not_pdf", status: response.status };
  } catch {
    return { ok: false, reason: "network", status: response.status };
  }
}

/** Hands a file to the browser: an anchor with `download` on a blob address, which is revoked afterwards. */
export function saveBlob(blob: Blob, fileName: string, doc: Document = document, urls: Pick<typeof URL, "createObjectURL" | "revokeObjectURL"> = URL): void {
  const address = urls.createObjectURL(blob);
  const anchor = doc.createElement("a");

  anchor.href = address;
  anchor.download = fileName;
  anchor.rel = "noopener";
  anchor.style.display = "none";
  doc.body.appendChild(anchor);
  anchor.click();
  anchor.remove();

  // The browser has taken the file by the next turn; a little later is safe on every browser.
  setTimeout(() => urls.revokeObjectURL(address), 1000);
}

export type InvoiceState = "idle" | "loading" | "error";

/**
 * One download at a time: while one is running, another press does nothing (no double submit). The state is reported as it changes.
 */
export function createInvoiceDownloader(options: {
  apiOrigin: string;
  fetchImpl?: typeof fetch;
  save?: (blob: Blob, fileName: string) => void;
  onState: (state: InvoiceState) => void;
}): (invoiceUrl: string, orderNumber: number | string) => Promise<"saved" | "failed" | "busy"> {
  let busy = false;
  const save = options.save ?? ((blob: Blob, fileName: string) => saveBlob(blob, fileName));

  return async (invoiceUrl, orderNumber) => {
    if (busy) return "busy";

    busy = true;
    options.onState("loading");

    try {
      const result = await fetchInvoice(invoiceUrl, orderNumber, options.apiOrigin, options.fetchImpl);

      if (!result.ok) {
        options.onState("error");

        return "failed";
      }

      try {
        save(result.blob, result.fileName);
      } catch {
        options.onState("error");

        return "failed";
      }

      options.onState("idle");

      return "saved";
    } finally {
      busy = false;
    }
  };
}
