import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { existsSync } from "node:fs";
import { chmod, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  EMBEDDED_POSTGRES_VERSION,
  LOCAL_APP_PORT,
  LOCAL_DB_NAME,
  LOCAL_DB_USER,
  LOCAL_LEAD_EMAIL,
  LOCAL_REVIEW_PORT,
  assertInheritedDatabaseEnv,
  assertLocalReviewDatabaseUrl,
  localDatabaseUrl,
} from "./local-review-guard.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const reviewDir = path.join(root, ".local-review");
const pgDir = path.join(reviewDir, "pgdata");
const toolsDir = path.join(reviewDir, "tools");
const leadFile = path.join(reviewDir, "lead-login.txt");
const dbPasswordFile = path.join(reviewDir, "db-password.txt");

const clearedForThisProcess = [
  "AUTH_GOOGLE_ID",
  "AUTH_GOOGLE_SECRET",
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",
  "LEAD_EMAILS",
  "TEACHER_EMAILS",
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "HUBSPOT_PRIVATE_APP_TOKEN",
  "HUBSPOT_CLIENT_SECRET",
  "DISCORD_BOT_TOKEN",
  "DISCORD_CLIENT_SECRET",
  "BUNNY_STREAM_TOKEN_KEY",
  "CRON_SECRET",
];

if (typeof process.getuid === "function" && process.getuid() === 0) {
  console.error("Run this as your own user, not root. Postgres will not start as root.");
  process.exit(1);
}

if (process.env.NODE_ENV && process.env.NODE_ENV !== "development") {
  console.error("Local review only runs when NODE_ENV is unset or development.");
  process.exit(1);
}

assertInheritedDatabaseEnv(process.env.DATABASE_URL, "DATABASE_URL");
assertInheritedDatabaseEnv(process.env.DATABASE_URL_UNPOOLED, "DATABASE_URL_UNPOOLED");

await mkdir(reviewDir, { recursive: true });
const dbPassword = await readOrCreate(dbPasswordFile, () => randomBytes(24).toString("hex"));
const lead = await readLeadLogin();
const databaseUrl = localDatabaseUrl(dbPassword);
assertLocalReviewDatabaseUrl(databaseUrl, "DATABASE_URL");
assertLocalReviewDatabaseUrl(databaseUrl, "DATABASE_URL_UNPOOLED");

process.env.DATABASE_URL = databaseUrl;
process.env.DATABASE_URL_UNPOOLED = databaseUrl;
process.env.PATH = `${path.join(root, "node_modules", ".bin")}${path.delimiter}${process.env.PATH ?? ""}`;
process.env.NODE_ENV = "development";
process.env.APP_URL = `http://127.0.0.1:${LOCAL_APP_PORT}`;
process.env.SEED_ADMIN_EMAIL = lead.email;
process.env.SEED_ADMIN_PASSWORD = lead.password;
process.env.LOCAL_REVIEW = "1";
process.env.LOCAL_REVIEW_PGDATA = pgDir;
process.env.VERCEL = "";
process.env.VERCEL_ENV = "";
process.env.VERCEL_URL = "";
for (const name of clearedForThisProcess) process.env[name] = "";

await ensureAppDependencies();
const EmbeddedPostgres = await loadEmbeddedPostgres();
const postgres = new EmbeddedPostgres({
  databaseDir: pgDir,
  user: LOCAL_DB_USER,
  password: dbPassword,
  port: LOCAL_REVIEW_PORT,
  persistent: true,
  authMethod: "password",
  autoRehydrateSymlinks: true,
  initdbFlags: ["--encoding=UTF8", "--locale=C"],
  postgresFlags: ["-c", "listen_addresses=127.0.0.1"],
  onLog: () => {},
  onError: (message) => {
    const text = message instanceof Error ? message.message : String(message);
    if (text.trim()) console.error(text);
  },
});

let stopping = false;
async function shutdown(code) {
  if (stopping) return;
  stopping = true;
  try {
    await postgres.stop();
  } catch {
    // The cluster may already be stopped.
  }
  process.exit(code);
}

process.on("SIGINT", () => void shutdown(0));
process.on("SIGTERM", () => void shutdown(0));

console.log(`Starting local Postgres on 127.0.0.1:${LOCAL_REVIEW_PORT}.`);
if (!existsSync(path.join(pgDir, "PG_VERSION"))) {
  await postgres.initialise();
}
await postgres.start();
try {
  await postgres.createDatabase(LOCAL_DB_NAME);
} catch (error) {
  const text = error instanceof Error ? error.message : String(error);
  if (!/already exists/i.test(text)) throw error;
}

assertLocalReviewDatabaseUrl(process.env.DATABASE_URL, "DATABASE_URL");
await run(process.execPath, [prismaCli(), "generate"]);
await run(process.execPath, [prismaCli(), "migrate", "deploy"]);
if (await leadExists(postgres)) {
  console.log("Local Lead already exists. Leaving saved program text in place.");
} else {
  console.log("Seeding the local database.");
  await run(process.execPath, [prismaCli(), "db", "seed"]);
}
const bootstrapToken = randomBytes(32).toString("hex");
await bindLocalReview(postgres, bootstrapToken);
process.env.LOCAL_REVIEW_TOKEN = bootstrapToken;

console.log("");
console.log("Local review is running. This is not production.");
console.log(`Open: http://127.0.0.1:${LOCAL_APP_PORT}/`);
console.log("That page signs in the synthetic local Lead. No password to type.");
console.log("Password login is still at /login. The password file is .local-review/lead-login.txt.");
console.log("The database files are in .local-review/pgdata.");
console.log("Stop with Control-C. Do not delete .local-review if you want to keep edits.");
console.log("");

const nextBin = path.join(root, "node_modules", "next", "dist", "bin", "next");
const app = spawn(process.execPath, [nextBin, "dev", "-H", "127.0.0.1", "-p", String(LOCAL_APP_PORT)], {
  cwd: root,
  stdio: "inherit",
  env: process.env,
});

app.on("exit", (code) => {
  void shutdown(code ?? 0);
});

async function leadExists(cluster) {
  const client = cluster.getPgClient(LOCAL_DB_NAME, "127.0.0.1");
  await client.connect();
  try {
    const found = await client.query('SELECT id FROM "User" WHERE email = $1', [LOCAL_LEAD_EMAIL]);
    return found.rowCount > 0;
  } finally {
    await client.end();
  }
}

async function bindLocalReview(cluster, token) {
  const client = cluster.getPgClient(LOCAL_DB_NAME, "127.0.0.1");
  await client.connect();
  try {
    const dir = await client.query("SHOW data_directory");
    const actual = path.resolve(String(dir.rows[0]?.data_directory ?? ""));
    if (actual !== path.resolve(pgDir)) {
      throw new Error("Local Postgres data directory does not match .local-review/pgdata.");
    }
    await client.query(
      `INSERT INTO "Meta" ("key", "value") VALUES ('localReviewBootstrap', $1)
       ON CONFLICT ("key") DO UPDATE SET "value" = EXCLUDED."value"`,
      [token],
    );
  } finally {
    await client.end();
  }
}

function prismaCli() {
  return path.join(root, "node_modules", "prisma", "build", "index.js");
}

async function ensureAppDependencies() {
  if (existsSync(path.join(root, "node_modules", "next", "package.json"))) return;
  console.log("Installing app dependencies into node_modules.");
  await run(npmBin(), ["install"], { cwd: root });
}

async function loadEmbeddedPostgres() {
  const entry = path.join(toolsDir, "node_modules", "embedded-postgres", "dist", "index.js");
  if (!existsSync(entry)) {
    await mkdir(toolsDir, { recursive: true });
    await writeFile(
      path.join(toolsDir, "package.json"),
      JSON.stringify(
        {
          private: true,
          dependencies: { "embedded-postgres": EMBEDDED_POSTGRES_VERSION },
        },
        null,
        2,
      ) + "\n",
    );
    console.log("Downloading local Postgres binaries into .local-review/tools.");
    await run(npmBin(), ["install"], { cwd: toolsDir });
  }
  const loaded = await import(pathToFileURL(entry).href);
  return loaded.default;
}

function npmBin() {
  return process.platform === "win32" ? "npm.cmd" : "npm";
}

function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd ?? root,
      stdio: "inherit",
      env: process.env,
    });
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${path.basename(command)} ${args.join(" ")} exited ${code}`));
    });
  });
}

async function readLeadLogin() {
  try {
    const text = await readFile(leadFile, "utf8");
    const email = text.match(/^email=(.+)$/m)?.[1]?.trim();
    const password = text.match(/^password=(.+)$/m)?.[1]?.trim();
    if (email === LOCAL_LEAD_EMAIL && password && password.length >= 8) {
      return { email, password };
    }
  } catch {
    // First run writes the file below.
  }
  if (existsSync(path.join(pgDir, "PG_VERSION"))) {
    throw new Error("The local database exists, but .local-review/lead-login.txt is missing. Delete .local-review and start again.");
  }
  const password = randomBytes(24).toString("hex");
  await writeSecret(leadFile, `email=${LOCAL_LEAD_EMAIL}\npassword=${password}\n`);
  return { email: LOCAL_LEAD_EMAIL, password };
}

async function readOrCreate(file, create) {
  try {
    const text = (await readFile(file, "utf8")).trim();
    if (text.length >= 8) return text;
  } catch {
    // Created below.
  }
  if (existsSync(path.join(pgDir, "PG_VERSION"))) {
    throw new Error("The local database exists, but its password file is missing. Delete .local-review and start again.");
  }
  const value = create();
  await writeSecret(file, `${value}\n`);
  return value;
}

async function writeSecret(file, contents) {
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, contents, { mode: 0o600 });
  await chmod(file, 0o600);
}
