// Writes docs/gtm-container-anaizanest.json from src/lib/gtmContainer.ts.
//   node --no-warnings scripts/build-gtm-container.ts
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { buildContainer } from "../src/lib/gtmContainer.ts";

const target = fileURLToPath(new URL("../docs/gtm-container-anaizanest.json", import.meta.url));
const container = buildContainer();

writeFileSync(target, `${JSON.stringify(container, null, 2)}\n`);
console.log(
  `docs/gtm-container-anaizanest.json written: ${container.containerVersion.tag.length} tags, ${container.containerVersion.trigger.length} triggers, ${container.containerVersion.variable.length} variables.`,
);
