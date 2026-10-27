"use client";

import { useEffect } from "react";
import { marketingAllowed } from "@/lib/consent";
import { contactMethod } from "@/lib/contactLinks";
import { forgetExternalId } from "@/lib/identity";
import { announceIdentity, trackLead } from "@/lib/tracking";

// Two small listeners for the whole app, so no single link or button has to remember to report anything:
//   - a tap on a WhatsApp or phone link is a lead (generate_lead, once per tap);
//   - when the visitor allows marketing, their id is made and the container is told; when they refuse it again, the id is forgotten.
export default function TrackingEvents() {
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (event.button !== 0) return;
      const link = (event.target as Element | null)?.closest?.("a[href]");
      const method = contactMethod(link?.getAttribute("href") ?? null);
      if (method) trackLead(method);
    };

    const onConsent = () => {
      if (marketingAllowed()) announceIdentity();
      else forgetExternalId();
    };

    document.addEventListener("click", onClick, true);
    window.addEventListener("anaiza:consent", onConsent);

    return () => {
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("anaiza:consent", onConsent);
    };
  }, []);

  return null;
}
