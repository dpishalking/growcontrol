/**
 * Timeweb virtual hosting serves static files via nginx without try_files.
 * Copy root index.html into each static route folder so nginx can serve them.
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dist = join(root, "dist");
const indexPath = join(dist, "index.html");
const indexHtml = readFileSync(indexPath, "utf8");

/** Add routes here as the app grows. */
const STATIC_ROUTES = ["auth"];

for (const route of STATIC_ROUTES) {
  const dir = join(dist, route);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "index.html"), indexHtml);
}

writeFileSync(join(dist, "404.html"), indexHtml);

console.log(`[spa-fallback] wrote ${STATIC_ROUTES.length} route folders + 404.html`);
