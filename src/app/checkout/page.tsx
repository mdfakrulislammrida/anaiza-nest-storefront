import { getPaymentSettings, getShippingZones } from "@/lib/api";
import CheckoutForm from "@/components/CheckoutForm";
import type { PaymentSetting, ShippingZone } from "@/lib/types";

export default async function CheckoutPage() {
  let shippingZones: ShippingZone[] = [];
  let paymentSettings: PaymentSetting | null = null;

  try {
    [shippingZones, paymentSettings] = await Promise.all([
      getShippingZones(),
      getPaymentSettings(),
    ]);
  } catch {
    // CheckoutForm handles an empty zones list with its own message.
  }

  return (
    <CheckoutForm shippingZones={shippingZones} paymentSettings={paymentSettings} />
  );
}
