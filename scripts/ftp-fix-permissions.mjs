/**
 * Timeweb FTP sometimes uploads files as 600 — nginx then returns 403 on /auth/, etc.
 * Recursively chmod files to 644 and directories to 755 under the deploy root.
 */
import { Client } from "basic-ftp";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const envPath = join(root, ".env.deploy");

function loadEnv() {
  const fromFile = {};
  if (existsSync(envPath)) {
    for (const line of readFileSync(envPath, "utf8").split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      fromFile[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim();
    }
  }

  return {
    host: process.env.TIMEWEB_FTP_HOST || fromFile.TIMEWEB_FTP_HOST,
    user: process.env.TIMEWEB_FTP_USER || fromFile.TIMEWEB_FTP_USER,
    password: process.env.TIMEWEB_FTP_PASSWORD || fromFile.TIMEWEB_FTP_PASSWORD,
    remoteDir: process.env.TIMEWEB_FTP_SERVER_DIR || fromFile.TIMEWEB_FTP_SERVER_DIR || "/",
  };
}

async function chmodPath(client, remotePath, mode) {
  try {
    await client.send(`SITE CHMOD ${mode} ${remotePath}`);
    return true;
  } catch {
    try {
      await client.send(`CHMOD ${mode} ${remotePath}`);
      return true;
    } catch {
      return false;
    }
  }
}

async function walk(client, dir) {
  const entries = await client.list(dir === "." ? undefined : dir);
  for (const entry of entries) {
    if (entry.name === "." || entry.name === "..") continue;
    const remotePath = dir === "." ? entry.name : `${dir}/${entry.name}`;
    if (entry.isDirectory) {
      await chmodPath(client, remotePath, "755");
      await walk(client, remotePath);
    } else {
      await chmodPath(client, remotePath, "644");
    }
  }
}

const { host, user, password, remoteDir } = loadEnv();
for (const [key, value] of Object.entries({ host, user, password })) {
  if (!value) {
    console.error(`[ftp-fix-permissions] Missing ${key}`);
    process.exit(1);
  }
}

const client = new Client(60_000);
try {
  console.log(`[ftp-fix-permissions] connecting to ${host}…`);
  await client.access({ host, user, password, secure: false });
  await client.cd(remoteDir);
  await walk(client, ".");
  console.log("[ftp-fix-permissions] done");
} catch (error) {
  console.error("[ftp-fix-permissions] failed:", error.message);
  process.exit(1);
} finally {
  client.close();
}
