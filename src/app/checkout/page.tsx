import type { Metadata } from "next";
import { getPaymentSettings } from "@/lib/api";
import { privatePageRobots } from "@/lib/seo";
import CheckoutForm from "@/components/CheckoutForm";
import type { PaymentSetting } from "@/lib/types";

export const metadata: Metadata = {
  robots: privatePageRobots(),
};

export default async function CheckoutPage() {
  let paymentSettings: PaymentSetting | null = null;

  try {
    paymentSettings = await getPaymentSettings();
  } catch {
    // CheckoutForm falls back to showing every payment method.
  }

  return <CheckoutForm paymentSettings={paymentSettings} />;
}
