// Runs automatically before `npm run build` (npm "prebuild").
//
// 1. Next keeps every GET it makes during a build -- our API calls included -- in
//    .next/cache/fetch-cache and reuses those responses on the next build. Because the
//    storefront is a static export baked from the API, a repeat build would otherwise ship
//    the previous build's products, prices and settings after they changed in the admin.
//    Only the data cache is cleared; the compiler cache stays, so builds are still fast.
//
// 2. The contents of out/ are removed too. The build now stops loudly when the API cannot be
//    read, and without this a failed build would leave the previous site sitting in out/, ready
//    to be zipped and uploaded by mistake. After a failed build out/ is empty. (The folder itself
//    is kept, so this still works when a terminal or server has it open, as Windows allows.)
import { existsSync, readdirSync, rmSync } from "node:fs";

rmSync(new URL("../.next/cache/fetch-cache", import.meta.url), { recursive: true, force: true });

const out = new URL("../out/", import.meta.url);
if (existsSync(out)) {
  try {
    for (const name of readdirSync(out)) {
      rmSync(new URL(name, out), { recursive: true, force: true });
    }
  } catch (error) {
    console.error(`\n[anaiza-nest build] Could not clear out/ before building: ${error.message}`);
    console.error("[anaiza-nest build] Close anything using files inside out/ (a file server, an explorer window) and run the build again.");
    process.exit(1);
  }
}
