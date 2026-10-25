"use client";

import { useEffect } from "react";

// Special prices used to live at /hot-deals. The host redirects that address with a 301 (public/.htaccess); this page is
// for a request that gets here anyway (the dev server, or a host that does not read .htaccess): it sends the visitor on to
// /special-prices at once, keeping any search or filter in the address.
export default function HotDealsMoved() {
  useEffect(() => {
    window.location.replace(`/special-prices${window.location.search}${window.location.hash}`);
  }, []);

  return (
    <div className="mx-auto max-w-xl px-4 py-24 text-center">
      <p className="text-body text-stone">
        Special prices has a new address.{" "}
        <a href="/special-prices" className="text-navy underline">
          Go to Special prices
        </a>
        .
      </p>
    </div>
  );
}
