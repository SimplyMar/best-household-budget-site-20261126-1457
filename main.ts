// Hearthledger v3 submission entrypoint for make.fun best-household-budget-site-20261126-1457.
// Stages the modular static household budget app and verified screenshots into /output and writes dossier.json.

import { cpSync, existsSync, mkdirSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { buildDossier } from "./vendor/makefun-frontend.ts";

const projectRoot = dirname(fileURLToPath(import.meta.url));
const outputRoot = resolve(process.env.MAKEFUN_OUTPUT_DIR ?? "/output");

const DOSSIER_CAPS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 16777216,
} as const;

function stageHouseholdSite(srcRoot: string, destRoot: string): void {
  const appSrc = join(srcRoot, "app");
  const shotsSrc = join(srcRoot, "screenshots");
  if (!existsSync(join(appSrc, "index.html"))) {
    throw new Error("Missing app/index.html in Hearthledger repository");
  }
  mkdirSync(destRoot, { recursive: true });
  cpSync(appSrc, join(destRoot, "app"), { recursive: true });

  const shotsDest = join(destRoot, "screenshots");
  mkdirSync(shotsDest, { recursive: true });
  if (existsSync(shotsSrc) && readdirSync(shotsSrc).length > 0) {
    cpSync(shotsSrc, shotsDest, { recursive: true });
  }
}

stageHouseholdSite(projectRoot, outputRoot);
const dossierPayload = buildDossier(outputRoot, DOSSIER_CAPS);
writeFileSync(join(outputRoot, "dossier.json"), dossierPayload);