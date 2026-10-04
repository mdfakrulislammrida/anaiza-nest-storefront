// Runs automatically before `npm run build` (npm "prebuild").
//
// Next keeps every GET it makes during a build -- our API calls included -- in
// .next/cache/fetch-cache and reuses those responses on the next build. Because the
// storefront is a static export baked from the API, a repeat build would otherwise ship
// the previous build's products, prices and settings after they changed in the admin.
// Only the data cache is cleared; the compiler cache stays, so builds are still fast.
import { rmSync } from "node:fs";

rmSync(new URL("../.next/cache/fetch-cache", import.meta.url), { recursive: true, force: true });
