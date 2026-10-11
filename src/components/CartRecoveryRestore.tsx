"use client";

import { useEffect, useRef, useState } from "react";
import { useCart } from "@/context/CartContext";
import { getRecoveredCart } from "@/lib/api";
import { restorePlan } from "@/lib/cartRecovery";
import { saveCouponCode, saveRecoveryToken } from "@/lib/coupon";

// The link in a reminder email opens /cart?recover=TOKEN. This puts the saved cart back (leaving out what is no longer
// available, with a calm word about it), keeps the coupon for checkout, and then takes the token out of the address.
export default function CartRecoveryRestore() {
  const { restoreItems } = useCart();
  const [notes, setNotes] = useState<string[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [couponLine, setCouponLine] = useState<string | null>(null);
  const done = useRef(false);

  useEffect(() => {
    if (done.current) return;
    const token = new URLSearchParams(window.location.search).get("recover");
    if (!token) return;
    done.current = true;

    let cancelled = false;

    getRecoveredCart(token)
      .then((cart) => {
        if (cancelled) return;

        const plan = restorePlan(cart);
        restoreItems(plan.lines);
        saveRecoveryToken(token);

        // Their details, so checkout starts filled in. Kept for this visit only.
        try {
          window.sessionStorage.setItem(
            "anaiza-recovered-contact",
            JSON.stringify({ name: cart.name, email: cart.email, phone: cart.phone }),
          );
        } catch {
          // Checkout simply starts empty.
        }

        if (plan.lines.length > 0) {
          setMessage("Welcome back. We have put your cart back as you left it.");
        } else {
          setMessage("Welcome back. The pieces in your saved cart are not available just now.");
        }
        setNotes(plan.notes);

        if (cart.coupon) {
          saveCouponCode(cart.coupon.code);
          setCouponLine(
            `Your code ${cart.coupon.code} (${cart.coupon.value_label} off) will be applied at checkout${
              cart.coupon.valid_until_text ? `. It ends on ${cart.coupon.valid_until_text}` : ""
            }.`,
          );
        } else if (cart.coupon_ended) {
          setCouponLine("The offer in that email has ended, but your cart is ready.");
        }
      })
      .catch(() => {
        if (!cancelled) setMessage("We could not find that saved cart, so it may have ended. Anything you added is still here.");
      })
      .finally(() => {
        // The token is single-purpose; take it out of the address so a refresh does not run this again.
        try {
          const url = new URL(window.location.href);
          url.searchParams.delete("recover");
          window.history.replaceState(null, "", url.pathname + (url.search ? url.search : "") + url.hash);
        } catch {
          // Leaving it in the address is harmless.
        }
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- runs once, for the link this page was opened with
  }, []);

  if (!message) return null;

  return (
    <div role="status" className="mx-auto mt-6 max-w-6xl px-4 sm:px-6">
      <div className="rounded-btn border border-linen bg-linen p-4 text-body text-charcoal">
        <p className="font-medium">{message}</p>
        {notes.length > 0 && (
          <ul className="mt-2 list-disc space-y-1 pl-6">
            {notes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        )}
        {couponLine && <p className="mt-2">{couponLine}</p>}
      </div>
    </div>
  );
}
