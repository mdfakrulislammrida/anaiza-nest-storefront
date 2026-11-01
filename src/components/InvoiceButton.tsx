"use client";

import { useMemo, useState } from "react";
import { API_BASE_URL } from "@/lib/config";
import { createInvoiceDownloader, INVOICE_ERROR_MESSAGE, type InvoiceState } from "@/lib/invoice";
import { useSiteSettings } from "@/context/SiteSettingsContext";
import { resolveWhatsApp, whatsappLink } from "@/lib/whatsapp";

// "Download invoice" for one order. The API gives each order a signed link (valid for seven days) with the order itself, so a guest straight after
// checkout, and a customer who has just looked their order up on Track order, need no login. The button is hidden when an order has no link (an
// older API). While the file is being prepared the button is disabled and says so, a second press does nothing, and a failure is said calmly, in words.
export default function InvoiceButton({ orderId, invoiceUrl, className = "" }: { orderId: number; invoiceUrl?: string | null; className?: string }) {
  const [state, setState] = useState<InvoiceState>("idle");
  const { siteSettings } = useSiteSettings();
  const whatsapp = resolveWhatsApp(siteSettings);
  const help = whatsappLink(whatsapp.number, `Hello, I need my invoice for order #${orderId}.`);

  const download = useMemo(() => createInvoiceDownloader({ apiOrigin: API_BASE_URL, onState: setState }), []);

  if (!invoiceUrl) return null;

  return (
    <div className={className}>
      <button
        type="button"
        onClick={() => void download(invoiceUrl, orderId)}
        disabled={state === "loading"}
        aria-busy={state === "loading"}
        className="inline-flex min-h-11 items-center justify-center rounded-btn border border-navy px-6 py-2 text-button text-navy transition-opacity hover:opacity-80 disabled:cursor-wait disabled:opacity-50"
      >
        {state === "loading" ? "Preparing your invoice..." : "Download invoice"}
      </button>
      {state === "error" && (
        <p role="alert" className="mt-3 text-body text-burgundy">
          {INVOICE_ERROR_MESSAGE}
          {help && (
            <>
              {" "}
              <a href={help} target="_blank" rel="noopener noreferrer" className="underline">
                Message us on WhatsApp
              </a>
            </>
          )}
        </p>
      )}
    </div>
  );
}
