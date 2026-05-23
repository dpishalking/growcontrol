/**
 * Upload dist/ to Timeweb via FTP.
 * Requires .env.deploy (see .env.deploy.example).
 */
import { Client } from "basic-ftp";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dist = join(root, "dist");
const envPath = join(root, ".env.deploy");

function loadDeployEnv() {
  if (!existsSync(envPath)) {
    console.error("[ftp-deploy] Missing .env.deploy — copy from .env.deploy.example");
    process.exit(1);
  }

  const env = {};
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    env[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim();
  }
  return env;
}

const env = loadDeployEnv();
const host = env.TIMEWEB_FTP_HOST;
const user = env.TIMEWEB_FTP_USER;
const password = env.TIMEWEB_FTP_PASSWORD;
const remoteDir = env.TIMEWEB_FTP_SERVER_DIR || "/";

for (const [key, value] of Object.entries({ host, user, password })) {
  if (!value) {
    console.error(`[ftp-deploy] Missing ${key.toUpperCase()} in .env.deploy`);
    process.exit(1);
  }
}

if (!existsSync(dist)) {
  console.error("[ftp-deploy] dist/ not found — run npm run build first");
  process.exit(1);
}

const client = new Client(60_000);
client.ftp.verbose = process.env.FTP_VERBOSE === "1";

try {
  console.log(`[ftp-deploy] connecting to ${host}…`);
  await client.access({ host, user, password, secure: false });
  await client.ensureDir(remoteDir);
  await client.cd(remoteDir);
  console.log(`[ftp-deploy] uploading dist/ → ${remoteDir}`);
  await client.uploadFromDir(dist);
  console.log("[ftp-deploy] done");
} catch (error) {
  console.error("[ftp-deploy] failed:", error.message);
  process.exit(1);
} finally {
  client.close();
}
