import type { PaymentMethod } from "./types";

// How a payment method is written for customers (the API stores the short code).
export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cod: "Cash on Delivery",
  bkash: "bKash",
  nagad: "Nagad",
  rocket: "Rocket",
};

export function paymentMethodLabel(method: string): string {
  return PAYMENT_METHOD_LABELS[method as PaymentMethod] ?? method;
}

// The mobile wallets that are paid by sending money and then giving us the transaction ID.
export type WalletMethod = "bkash" | "nagad" | "rocket";

export function isWalletMethod(method: string): method is WalletMethod {
  return method === "bkash" || method === "nagad" || method === "rocket";
}

// Where a payment stands, as the API reports it.
export type PaymentStatus = "cod" | "awaiting_verification" | "verified" | "failed";

// The same plain words the confirmation email uses. Null when there is nothing to say (cash on delivery,
// or an older API that does not send a status).
export function paymentStateMessage(status: string | null | undefined): string | null {
  switch (status) {
    case "awaiting_verification":
      return "We are checking your payment, we will confirm it shortly.";
    case "verified":
      return "Payment received.";
    case "failed":
      return "We could not match this payment, please contact us.";
    default:
      return null;
  }
}

// A Bangladeshi mobile number as 01XXXXXXXXX, whatever way it was typed (spaces, dashes, +88).
export function normalizeBdNumber(value: string): string {
  return value.replace(/[\s\-().]/g, "").replace(/^\+?88(?=01)/, "");
}

export const SENDER_NUMBER_PATTERN = /^01[3-9]\d{8}$/;
export const TRX_ID_PATTERN = /^[A-Za-z0-9]{6,20}$/;

// Checked before the order is sent, so a typo is fixed on the spot. The server checks the same rules again.
export function walletFieldProblems(senderNumber: string, trxId: string): Record<string, string[]> {
  const problems: Record<string, string[]> = {};
  const sender = normalizeBdNumber(senderNumber.trim());
  const trx = trxId.trim();

  if (sender === "") {
    problems.payment_sender_number = ["Please enter the number you paid from."];
  } else if (!SENDER_NUMBER_PATTERN.test(sender)) {
    problems.payment_sender_number = ["That does not look like a Bangladeshi mobile number. It has 11 digits and starts with 01."];
  }

  if (trx === "") {
    problems.payment_trx_id = ["Please enter the transaction ID from your payment message."];
  } else if (!TRX_ID_PATTERN.test(trx)) {
    problems.payment_trx_id = ["A transaction ID is 6 to 20 letters and digits, with no spaces or symbols."];
  }

  return problems;
}

// Fills {{amount}} and {{number}} in the admin's steps. A value that is not known yet is left as a plain
// phrase rather than a raw placeholder.
export function fillInstructions(html: string, amount: string | null, number: string): string {
  return html
    .replaceAll("{{amount}}", amount ?? "the total shown in your order summary")
    .replaceAll("{{number}}", number);
}
