import type { ReactNode } from "react";

// The one row of Filter and Sort that stays under the header while a product list scrolls, on a phone only (from sm the filter is the column beside the
// list and Sort sits above it): two equal buttons on a solid ivory band with a 1 px linen line under it, nothing showing through. It sticks exactly
// where the header ends: the header's bar is h-14 plus its 1 px border (see Header), 3.5625rem.
export default function PhoneListBar({ children }: { children: ReactNode }) {
  return (
    <div
      data-phone-list-bar
      className="sticky top-[3.5625rem] z-30 -mx-4 grid grid-cols-2 gap-2 border-b border-linen bg-ivory px-4 py-2 sm:hidden"
    >
      {children}
    </div>
  );
}
