import type { Metadata } from "next";
import { ALLOW_INDEXING } from "./config";

// Site-wide default: staging builds are noindex, nofollow on every page.
// (undefined leaves the robots tag out entirely, i.e. normal behavior.)
export function siteRobots(): Metadata["robots"] {
  return ALLOW_INDEXING ? undefined : { index: false, follow: false };
}

// Pages that must never be indexed even on the live site (cart, checkout,
// account...). A page-level `robots` replaces the root one wholesale rather
// than merging with it, so staging has to be repeated here or these pages
// would quietly drop back to "follow" on a staging build.
export function privatePageRobots(): NonNullable<Metadata["robots"]> {
  return ALLOW_INDEXING ? { index: false, follow: true } : { index: false, follow: false };
}
