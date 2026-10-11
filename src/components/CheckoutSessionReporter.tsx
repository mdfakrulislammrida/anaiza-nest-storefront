"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useCart } from "@/context/CartContext";
import { noteCart, noteStage } from "@/lib/checkoutSession";

// Renders nothing. Passes the cart, and the checkout page being open, to the shop's cart recovery (debounced, and silent if
// anything goes wrong). What is sent, and for whom, is decided in lib/recovery.ts.
export default function CheckoutSessionReporter() {
  const { items } = useCart();
  const pathname = usePathname();

  useEffect(() => {
    noteCart(items);
  }, [items]);

  useEffect(() => {
    if (pathname.startsWith("/checkout") && items.length > 0) noteStage("checkout_started");
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the stage follows the page; the cart is reported by the effect above
  }, [pathname]);

  return null;
}
