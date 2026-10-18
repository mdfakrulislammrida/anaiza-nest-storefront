import type { ReactNode } from "react";

// The one row of Filter and Sort that stays under the header while a product list scrolls, on a phone only (from sm
// the filter is the column beside the list and Sort sits above it). A 1 px linen line under it and no shadow. The
// header is 77 px tall on a phone, which is where this sticks.
export default function PhoneListBar({ children }: { children: ReactNode }) {
  return (
    <div className="sticky top-[4.8125rem] z-30 -mx-4 flex min-h-11 items-center justify-between border-b border-linen bg-ivory px-4 sm:hidden">
      {children}
    </div>
  );
}
