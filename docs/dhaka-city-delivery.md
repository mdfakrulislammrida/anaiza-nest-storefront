# "Inside Dhaka" means Dhaka city (Batch FEE1, storefront)

The rule is unchanged: inside Dhaka ৳80 (1-3 business days), outside ৳150 (3-5 business days), free delivery over ৳10,000 only inside Dhaka. "Inside Dhaka" is now
**Dhaka city only**: division Dhaka + district Dhaka + a thana of the city list. Gazipur, Narayanganj, Savar, Keraniganj and everywhere else pay the outside fee and
get no free delivery. The server decides the same way and recomputes the fee when the order is placed.

## One helper

`src/lib/dhakaCity.ts` (`isDhakaCity`, `areasFor`, `resolveDhakaCity`). The lists come from the API (`GET /api/site-settings` → `data.policy.dhaka_city`: `division`,
`district`, `thanas`, `outside_upazilas`) and fall back to `DHAKA_CITY_THANAS` and `DHAKA_OUTSIDE_UPAZILAS` in `src/lib/bangladesh-geography.ts` when the API does not send
them (an older API, a failed request). To move a thana, move it between those two lists; no name is renamed or removed (the Dhaka district list is built from both).
Names are compared as stored; only case and extra spaces are ignored. A missing or unknown thana is outside, as on the server.

`deliveryChargeFor(rules, division, district, thana, subtotal)` in `src/lib/checkout.ts` uses it. It returns `null` until the area is chosen, so no final fee is shown before.

## The checkout

* Two choices stay: **Inside Dhaka city** and **Outside Dhaka city**. Inside offers only the city thanas. Outside asks for division, district and area; with Dhaka district
  it offers only the upazilas outside the city (Dhamrai, Dohar, Keraniganj, Nawabganj, Savar), so the choice and the fee can never disagree.
* Before the area is chosen: "Delivery ৳80 in Dhaka city, ৳150 elsewhere. We will confirm once you choose your area." and the summary row says "Choose your area". The exact fee
  appears as soon as the area is chosen. The fee is worked out from the address on every render, so changing the zone, division, district or area never leaves an old fee.
* The street address box appears as soon as Inside or Outside is chosen (it was after the area). It is required only once an area is chosen, so the first error is still the
  missing area.
* There is no saved checkout draft: the address is never stored (the walk checks the browser's storage), so a reload starts empty and nothing stale can be restored.
* `add_shipping_info` still sends the shipping tier "Inside Dhaka" / "Outside Dhaka" (the tracking value is unchanged).

## Wording

"Dhaka city" now appears in: the checkout choice and its error message, the free-delivery nudge, the product page delivery line and Delivery info, the trust badge, the
default promo line, and the order confirmation delivery sentence (decided from the saved address, not the division). The Shipping policy, FAQ and Returns pages are text
edited in the admin: change "inside Dhaka" to "inside Dhaka city" there.

## Not changed

Product structured data (`src/lib/jsonld.ts`) still describes the low rate for the region "Dhaka" and the outside rate for the other divisions: schema.org's `DefinedRegion`
cannot say "city only", so this is a decision for the owner. The fallback numbers in `src/lib/policy.ts` (free over ৳2,000, ৳130) are only used when the API cannot be reached.

## Checks

`npm test` (checkout.test.ts, dhakaCity.test.ts), `npm run address:check` (every division and district through the real dropdowns, then Dhaka city ৳80, Savar and Keraniganj
৳150, Gazipur and Narayanganj ৳150, free over ৳10,000 only in Dhaka city, back and forth without a stale fee, reload).
