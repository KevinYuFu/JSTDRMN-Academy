import { spawn, execFile } from "node:child_process";
import { randomBytes } from "node:crypto";
import dns from "node:dns/promises";
import { existsSync } from "node:fs";
import { chmod, mkdir, open, readFile, unlink, writeFile } from "node:fs/promises";
import http from "node:http";
import net from "node:net";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { localReviewClusterMatches, localReviewEntryDecision } from "../lib/local-review-entry.ts";
// Named previews are started with tsx so this TypeScript import loads. node alone does not.
import {
  EMBEDDED_POSTGRES_VERSION,
  LOCAL_APP_PORT,
  LOCAL_DB_USER,
  LOCAL_LEAD_EMAIL,
  LOCAL_REVIEW_PORT,
  PREVIEW_APP_PORT_MAX,
  PREVIEW_APP_PORT_MIN,
  PREVIEW_DB_PORT_MAX,
  PREVIEW_DB_PORT_MIN,
  PREVIEW_INTERNAL_PORT_MAX,
  PREVIEW_INTERNAL_PORT_MIN,
  SESSION_COOKIE,
  assertNotHostedDatabase,
  assertPreviewDatabaseUrl,
  isPreviewAppPort,
  isPreviewDbPort,
  isPreviewInternalPort,
  previewDatabaseName,
  previewDatabaseUrl,
  previewLabelOk,
  previewPublicHost,
} from "./local-review-guard.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const NEVER_PORTS = new Set([LOCAL_APP_PORT, 43124, LOCAL_REVIEW_PORT]);

export function parsePreviewArgs(argv) {
  const out = { label: "", branch: "", stop: false, status: false };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--label") out.label = argv[++i] ?? "";
    else if (arg === "--branch") out.branch = argv[++i] ?? "";
    else if (arg === "--stop") out.stop = true;
    else if (arg === "--status") out.status = true;
    else throw new Error(`Unknown argument ${arg}. Use --label, --branch, --stop, or --status.`);
  }
  if ((out.stop || out.branch || out.label) && !out.status && !previewLabelOk(out.label)) {
    throw new Error("Use a label like editor or cleanup. Lowercase letters, numbers, and hyphens only.");
  }
  if (!out.stop && !out.status && !out.branch) {
    throw new Error("Name the branch to preview, for example --label editor --branch cursor/program-lead-edit-9d9b");
  }
  return out;
}

export function blockedPreviewPort(port) {
  return NEVER_PORTS.has(port);
}

const invokedDirectly =
  process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (invokedDirectly) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.stack || error.message : String(error));
    process.exit(1);
  });
}

async function main() {
  if (typeof process.getuid === "function" && process.getuid() === 0) {
    throw new Error("Run this as your own user, not root. Postgres will not start as root.");
  }
  if (process.env.NODE_ENV && process.env.NODE_ENV !== "development") {
    throw new Error("A named preview only runs when NODE_ENV is unset or development.");
  }
  assertNotHostedDatabase(process.env.DATABASE_URL, "DATABASE_URL");
  assertNotHostedDatabase(process.env.DATABASE_URL_UNPOOLED, "DATABASE_URL_UNPOOLED");

  const args = parsePreviewArgs(process.argv.slice(2));
  if (args.status) {
    await printStatus();
    return;
  }
  const dir = previewDir(args.label);
  if (args.stop) {
    await stopPreview(dir, args.label);
    return;
  }
  await startPreview(dir, args.label, args.branch);
}

function previewDir(label) {
  const dir = path.resolve(root, ".local-review", "previews", label);
  const expected = path.resolve(root, ".local-review", "previews", label);
  if (dir !== expected || dir.includes(`${path.sep}.local-review${path.sep}pgdata`)) {
    throw new Error("Refusing to use a preview directory outside .local-review/previews.");
  }
  return dir;
}

async function startPreview(dir, label, branch) {
  const recordPath = path.join(dir, "preview.json");
  const existing = await readRecord(recordPath);
  if (existing && existing.branch !== branch) {
    throw new Error(
      `Preview ${label} already tracks ${existing.branch}. Choose another label. This command will not switch its database.`,
    );
  }
  if (await ourPreviewIsRunning(existing)) {
    printReady(existing);
    console.log("That preview is already running. This command did not restart it or reseed it.");
    return;
  }
  await resolvePreviewCommit(branch, root);
  await mkdir(dir, { recursive: true });

  const reserved = await withPreviewLock(async () => reservePreviewPorts(existing));
  const { appPort, internalPort, dbPort } = reserved;
  let { releaseApp, releaseInternal, releaseDb } = reserved;

  const host = previewPublicHost(label, appPort);
  const hostname = host.slice(0, host.lastIndexOf(":"));
  await noteOsResolver(hostname);

  const src = path.join(dir, "src");
  const commit = await ensureWorktree(src, branch);
  const dbPassword = await readOrCreateSecret(path.join(dir, "db-password.txt"), path.join(dir, "pgdata"));
  const lead = await readLead(path.join(dir, "lead-login.txt"), path.join(dir, "pgdata"));
  const databaseUrl = previewDatabaseUrl(dbPassword, label, dbPort);
  assertPreviewDatabaseUrl(databaseUrl, label);
  const pgData = path.join(dir, "pgdata");

  const record = {
    label,
    branch,
    commit,
    appPort,
    internalPort,
    dbPort,
    host,
  };
  await writeFile(recordPath, `${JSON.stringify(record, null, 2)}\n`);

  await ensureWorktreeModules(src);
  const EmbeddedPostgres = await loadEmbeddedPostgres();
  const postgres = new EmbeddedPostgres({
    databaseDir: pgData,
    user: LOCAL_DB_USER,
    password: dbPassword,
    port: dbPort,
    persistent: true,
    authMethod: "password",
    autoRehydrateSymlinks: true,
    initdbFlags: ["--encoding=UTF8", "--locale=C"],
    postgresFlags: ["-c", "listen_addresses=127.0.0.1"],
    onLog: () => {},
    onError: () => {},
  });

  let stopping = false;
  let nextProc = null;
  async function stopQuiet(cluster) {
    try {
      await cluster.stop();
    } catch {
      // Keep the data directory even when startup fails.
    }
  }

  async function shutdown(code) {
    if (stopping) return;
    stopping = true;
    try {
      nextProc?.kill("SIGTERM");
    } catch {
      // The app may already be stopped.
    }
    await stopQuiet(postgres);
    process.exit(code);
  }
  process.on("SIGINT", () => void shutdown(0));
  process.on("SIGTERM", () => void shutdown(0));

  const token = randomBytes(32).toString("hex");
  const nextEnv = previewEnv({ databaseUrl, pgData, lead, host, label, branch, commit, token });
  nextEnv.PATH = `${path.join(src, "node_modules", ".bin")}${path.delimiter}${path.join(root, "node_modules", ".bin")}${path.delimiter}${nextEnv.PATH ?? ""}`;

  if (!existsSync(path.join(pgData, "PG_VERSION"))) await postgres.initialise();
  await releaseDb();
  releaseDb = async () => {};
  await postgres.start();
  try {
    await postgres.createDatabase(previewDatabaseName(label));
  } catch (error) {
    const text = error instanceof Error ? error.message : String(error);
    if (!/already exists/i.test(text)) {
      await stopQuiet(postgres);
      throw error;
    }
  }
  try {
    await run(process.execPath, [prismaBin(src), "generate"], src, nextEnv);
    await run(process.execPath, [prismaBin(src), "migrate", "deploy"], src, nextEnv);
    if (await leadExists(postgres, label)) {
      console.log(`Local Lead already exists for ${label}. Leaving saved rows in place.`);
    } else {
      console.log(`Seeding a new database for ${label}.`);
      await run(process.execPath, [prismaBin(src), "db", "seed"], src, nextEnv);
    }
    await bindPreview(postgres, label, pgData, token);
    await rememberLabel(postgres, label);
  } catch (error) {
    await stopQuiet(postgres);
    throw error;
  }

  await releaseInternal();
  releaseInternal = async () => {};
  nextProc = spawn(process.execPath, [nextBin(src), "dev", "-H", "127.0.0.1", "-p", String(internalPort)], {
    cwd: src,
    env: nextEnv,
    stdio: ["ignore", "pipe", "pipe"],
  });
  const logStream = await openLog(path.join(dir, "next.log"));
  nextProc.stdout?.pipe(logStream);
  nextProc.stderr?.pipe(logStream);
  nextProc.on("exit", () => void shutdown(0));

  await waitForPort(internalPort);
  await releaseApp();
  releaseApp = async () => {};
  const proxy = await listenProxy({
    appPort,
    internalPort,
    host,
    label,
    branch,
    commit,
    postgres,
    pgData,
    token,
    databaseUrl,
  });
  record.scriptPid = process.pid;
  record.proxyPid = process.pid;
  await writeFile(recordPath, `${JSON.stringify(record, null, 2)}\n`);
  printReady(record);
  proxy.unref?.();
  await new Promise(() => {});
}

function previewEnv({ databaseUrl, pgData, lead, host, label, branch, commit, token }) {
  const env = { ...process.env };
  env.DATABASE_URL = databaseUrl;
  env.DATABASE_URL_UNPOOLED = databaseUrl;
  env.NODE_ENV = "development";
  env.APP_URL = `http://${host}`;
  env.SEED_ADMIN_EMAIL = lead.email;
  env.SEED_ADMIN_PASSWORD = lead.password;
  env.LOCAL_REVIEW = "1";
  env.LOCAL_REVIEW_PGDATA = pgData;
  env.LOCAL_REVIEW_HOST = host;
  env.LOCAL_REVIEW_TOKEN = token;
  env.LOCAL_REVIEW_LABEL = label;
  env.LOCAL_REVIEW_BRANCH = branch;
  env.LOCAL_REVIEW_COMMIT = commit;
  env.VERCEL = "";
  env.VERCEL_ENV = "";
  env.VERCEL_URL = "";
  for (const name of [
    "AUTH_GOOGLE_ID",
    "AUTH_GOOGLE_SECRET",
    "GOOGLE_CLIENT_ID",
    "GOOGLE_CLIENT_SECRET",
    "STRIPE_SECRET_KEY",
    "STRIPE_WEBHOOK_SECRET",
    "HUBSPOT_PRIVATE_APP_TOKEN",
    "HUBSPOT_CLIENT_SECRET",
    "DISCORD_BOT_TOKEN",
    "DISCORD_CLIENT_SECRET",
  ]) {
    env[name] = "";
  }
  return env;
}

function printReady(record) {
  console.log("");
  console.log(`Preview ${record.label} is running. This is not production.`);
  console.log(`Open: http://${record.host}/`);
  console.log(`Branch: ${record.branch}`);
  console.log(`Commit: ${record.commit}`);
  console.log(`Database: 127.0.0.1:${record.dbPort}/${previewDatabaseName(record.label)}`);
  console.log("The password file stays in this preview folder and is not printed.");
  console.log(`Stop: sh scripts/local-review.sh --label ${record.label} --stop`);
  console.log("Stop does not delete the database. Ports 43123, 43124, and 55432 are not used.");
  console.log("");
}

async function listenProxy(options) {
  const handler = (req, res) => void onRequest(req, res, options).catch(() => {
    if (!res.headersSent) res.writeHead(404).end();
  });
  const v4 = http.createServer(handler);
  const v6 = http.createServer(handler);
  await new Promise((resolve, reject) => {
    v4.once("error", reject);
    v4.listen(options.appPort, "127.0.0.1", resolve);
  });
  await new Promise((resolve, reject) => {
    v6.once("error", reject);
    v6.listen(options.appPort, "::1", resolve);
  });
  return { v4, v6 };
}

async function onRequest(req, res, options) {
  const url = req.url ?? "/";
  if (url.startsWith("/local-review/enter")) {
    if (!guardRequest(req, options, false).ok) {
      res.writeHead(404).end();
      return;
    }
    const minted = await mintSession(options);
    if (!minted) {
      res.writeHead(404).end();
      return;
    }
    res.writeHead(302, {
      location: "/?entered=1",
      "set-cookie": sessionCookie(minted),
      "cache-control": "no-store",
    });
    res.end();
    return;
  }
  if (!guardRequest(req, options, true).ok) {
    res.writeHead(404).end();
    return;
  }
  if (url.startsWith("/local-review/whoami")) {
    const email = await sessionEmail(options, req.headers.cookie);
    res.writeHead(email ? 200 : 401, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" });
    res.end(JSON.stringify(email ? { email, label: options.label, branch: options.branch, commit: options.commit } : { email: null }));
    return;
  }
  if (isDocument(req) && guardRequest(req, options, false).ok && !(await sessionEmail(options, req.headers.cookie))) {
    res.writeHead(302, { location: "/local-review/enter", "cache-control": "no-store" });
    res.end();
    return;
  }
  await forward(req, res, options);
}

function guardRequest(req, options, relaxFetch) {
  return localReviewEntryDecision({
    nodeEnv: "development",
    localReview: "1",
    localReviewToken: options.token,
    databaseUrl: options.databaseUrl,
    pgData: options.pgData,
    vercel: "",
    vercelEnv: "",
    vercelUrl: "",
    host: String(req.headers.host ?? ""),
    reviewHost: options.host,
    expectedDatabase: previewDatabaseName(options.label),
    forwardedHost: headerOrNull(req, "x-forwarded-host"),
    forwardedFor: headerOrNull(req, "x-forwarded-for"),
    forwarded: headerOrNull(req, "forwarded"),
    realIp: headerOrNull(req, "x-real-ip"),
    origin: headerOrNull(req, "origin"),
    referer: headerOrNull(req, "referer"),
    secFetchSite: relaxFetch ? "none" : headerOrNull(req, "sec-fetch-site"),
    secFetchMode: relaxFetch ? "navigate" : headerOrNull(req, "sec-fetch-mode"),
    secFetchDest: relaxFetch ? "document" : headerOrNull(req, "sec-fetch-dest"),
  });
}

function headerOrNull(req, name) {
  const value = req.headers[name];
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

function isDocument(req) {
  if (req.method !== "GET") return false;
  if (req.headers.rsc || req.headers["next-router-prefetch"] || req.headers["next-url"]) return false;
  const dest = headerOrNull(req, "sec-fetch-dest");
  const mode = headerOrNull(req, "sec-fetch-mode");
  if (dest && dest !== "document") return false;
  if (mode && mode !== "navigate") return false;
  const url = req.url ?? "/";
  return url === "/" || url.startsWith("/?");
}

async function forward(req, res, options) {
  const headers = { ...req.headers, host: `127.0.0.1:${options.internalPort}` };
  delete headers["accept-encoding"];
  delete headers["x-forwarded-host"];
  delete headers["x-forwarded-for"];
  delete headers.forwarded;
  delete headers["x-real-ip"];
  const upstream = http.request(
    {
      host: "127.0.0.1",
      port: options.internalPort,
      method: req.method,
      path: req.url,
      headers,
    },
    (up) => {
      const type = String(up.headers["content-type"] ?? "");
      if (!type.includes("text/html")) {
        res.writeHead(up.statusCode ?? 200, up.headers);
        up.pipe(res);
        return;
      }
      const chunks = [];
      up.on("data", (chunk) => chunks.push(chunk));
      up.on("end", () => {
        const html = injectPreviewLabel(Buffer.concat(chunks).toString("utf8"), options);
        const responseHeaders = { ...up.headers };
        delete responseHeaders["content-length"];
        delete responseHeaders["content-encoding"];
        res.writeHead(up.statusCode ?? 200, responseHeaders);
        res.end(html);
      });
    },
  );
  upstream.on("error", () => {
    if (!res.headersSent) res.writeHead(502).end();
  });
  req.pipe(upstream);
}

export function previewLabelScript(options) {
  const label = JSON.stringify(String(options.label));
  const branch = JSON.stringify(String(options.branch));
  const commit = JSON.stringify(String(options.commit).slice(0, 7));
  return `<script data-local-preview-boot>(function(){var label=${label},branch=${branch},commit=${commit};function place(){if(!document.body||document.getElementById("local-preview-label"))return;var bar=document.createElement("div");bar.id="local-preview-label";bar.setAttribute("data-local-preview","1");bar.textContent="Preview "+label+" \\u00b7 "+branch+" \\u00b7 "+commit;bar.style.cssText="position:sticky;top:0;z-index:50;background:#241433;color:#fff2cc;font:14px/1.4 sans-serif;padding:8px 16px;border-bottom:1px solid rgba(255,242,204,.4)";document.documentElement.insertBefore(bar,document.body);}if(document.readyState==="complete")place();else window.addEventListener("load",place,{once:true});})();</script>`;
}

export function injectPreviewLabel(html, options) {
  if (!/<\/head>/i.test(html)) return html;
  return html.replace(/<\/head>/i, `${previewLabelScript(options)}</head>`);
}

function sessionCookie(token) {
  return `${SESSION_COOKIE}=${token}; HttpOnly; Path=/; SameSite=Lax; Max-Age=2592000`;
}

async function mintSession(options) {
  const bound = await clusterOk(options);
  if (!bound) return null;
  const client = options.postgres.getPgClient(previewDatabaseName(options.label), "127.0.0.1");
  await client.connect();
  try {
    const user = await client.query('SELECT id, email, role FROM "User" WHERE email = $1', [LOCAL_LEAD_EMAIL]);
    const row = user.rows[0];
    if (!row || row.role !== "lead" || row.email !== LOCAL_LEAD_EMAIL) return null;
    const token = randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    await client.query(
      'INSERT INTO "Session" ("id", "token", "userId", "expiresAt") VALUES ($1, $2, $3, $4)',
      [`pv_${randomBytes(12).toString("hex")}`, token, row.id, expires],
    );
    return token;
  } finally {
    await client.end();
  }
}

async function sessionEmail(options, cookieHeader) {
  const token = readCookie(cookieHeader, SESSION_COOKIE);
  if (!/^[a-f0-9]{64}$/.test(token)) return null;
  const client = options.postgres.getPgClient(previewDatabaseName(options.label), "127.0.0.1");
  await client.connect();
  try {
    const found = await client.query(
      'SELECT u.email FROM "Session" s JOIN "User" u ON u.id = s."userId" WHERE s.token = $1 AND s."expiresAt" > NOW()',
      [token],
    );
    return found.rows[0]?.email ?? null;
  } finally {
    await client.end();
  }
}

function readCookie(header, name) {
  for (const part of String(header ?? "").split(/; */)) {
    const eq = part.indexOf("=");
    if (eq === -1) continue;
    if (part.slice(0, eq) === name) return decodeURIComponent(part.slice(eq + 1));
  }
  return "";
}

async function clusterOk(options) {
  const client = options.postgres.getPgClient(previewDatabaseName(options.label), "127.0.0.1");
  await client.connect();
  try {
    const rows = await client.query(
      "SELECT current_database()::text AS db, inet_server_addr()::text AS addr, current_setting('data_directory') AS dir",
    );
    const meta = await client.query('SELECT value FROM "Meta" WHERE key = $1', ["localReviewBootstrap"]);
    const row = rows.rows[0];
    return localReviewClusterMatches({
      currentDatabase: row?.db ?? null,
      serverAddr: row?.addr ?? null,
      dataDirectory: row?.dir ?? null,
      expectedDataDirectory: options.pgData,
      expectedDatabase: previewDatabaseName(options.label),
      metaToken: meta.rows[0]?.value ?? null,
      envToken: options.token,
    });
  } finally {
    await client.end();
  }
}

async function bindPreview(postgres, label, pgData, token) {
  const client = postgres.getPgClient(previewDatabaseName(label), "127.0.0.1");
  await client.connect();
  try {
    const dir = await client.query("SHOW data_directory");
    if (path.resolve(String(dir.rows[0]?.data_directory ?? "")) !== path.resolve(pgData)) {
      throw new Error("Postgres data directory does not match this preview.");
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

async function rememberLabel(postgres, label) {
  const client = postgres.getPgClient(previewDatabaseName(label), "127.0.0.1");
  await client.connect();
  try {
    await client.query(
      `INSERT INTO "Meta" ("key", "value") VALUES ('previewLabel', $1)
       ON CONFLICT ("key") DO NOTHING`,
      [label],
    );
  } finally {
    await client.end();
  }
}

async function leadExists(postgres, label) {
  const client = postgres.getPgClient(previewDatabaseName(label), "127.0.0.1");
  await client.connect();
  try {
    const found = await client.query('SELECT id FROM "User" WHERE email = $1', [LOCAL_LEAD_EMAIL]);
    return found.rowCount > 0;
  } finally {
    await client.end();
  }
}

export function remoteBranchRequest(branch) {
  const trimmed = String(branch ?? "").trim();
  if (!trimmed || trimmed === "HEAD") return { kind: "head" };
  if (trimmed.startsWith("-") || /[\s~^:?*[\\\]]/.test(trimmed) || trimmed.includes("..")) {
    throw new Error(`Branch name "${trimmed}" is not allowed. Nothing was fetched.`);
  }
  if (/^[0-9a-f]{7,40}$/i.test(trimmed)) return { kind: "sha", name: trimmed };
  const name = trimmed.replace(/^refs\/heads\//, "").replace(/^origin\//, "");
  if (!/^[A-Za-z0-9._/-]+$/.test(name) || name.startsWith("/") || name.endsWith("/")) {
    throw new Error(`Branch name "${trimmed}" is not allowed. Nothing was fetched.`);
  }
  return { kind: "branch", name };
}

export async function resolvePreviewCommit(branch, repoRoot = root) {
  const request = remoteBranchRequest(branch);
  if (request.kind === "head") return git(["rev-parse", "--verify", "HEAD"], repoRoot);
  if (request.kind === "sha") {
    try {
      return await git(["rev-parse", "--verify", `${request.name}^{commit}`], repoRoot);
    } catch {
      throw new Error(
        `Commit ${request.name} is not in this checkout. Pass the branch name so it can be fetched from origin. Nothing was changed.`,
      );
    }
  }
  for (const candidate of [request.name, `origin/${request.name}`]) {
    try {
      return await git(["rev-parse", "--verify", `${candidate}^{commit}`], repoRoot);
    } catch {
      // The fresh single-branch checkout often has neither ref yet.
    }
  }
  try {
    await git(["remote", "get-url", "origin"], repoRoot);
  } catch {
    throw new Error("This checkout has no origin remote, so the branch cannot be fetched. Nothing was changed.");
  }
  const remoteRef = `refs/remotes/origin/${request.name}`;
  try {
    await git(
      ["fetch", "--no-tags", "origin", `+refs/heads/${request.name}:${remoteRef}`],
      repoRoot,
    );
  } catch (error) {
    const text = error instanceof Error ? error.message : String(error);
    if (/couldn't find remote ref|not found|does not appear to be a git repository/i.test(text)) {
      throw new Error(
        `No branch named "${request.name}" on origin. Nothing was checked out and no preview data was deleted.`,
      );
    }
    throw new Error(`Could not fetch "${request.name}" from origin. ${text}`);
  }
  try {
    return await git(["rev-parse", "--verify", `${remoteRef}^{commit}`], repoRoot);
  } catch {
    throw new Error(
      `No branch named "${request.name}" on origin. Nothing was checked out and no preview data was deleted.`,
    );
  }
}

async function ensureWorktree(src, branch) {
  const sha = await resolvePreviewCommit(branch, root);
  if (!existsSync(path.join(src, ".git"))) {
    await git(["worktree", "add", "--detach", src, sha]);
  }
  return git(["rev-parse", "HEAD"], src);
}

async function ensureWorktreeModules(src) {
  if (!existsSync(path.join(src, "node_modules", "next", "package.json"))) {
    if (existsSync(path.join(root, "node_modules", "next", "package.json"))) {
      await run("cp", ["-a", path.join(root, "node_modules"), path.join(src, "node_modules")], root, process.env);
    } else {
      await run("npm", ["install"], src, process.env);
    }
  }
}

async function loadEmbeddedPostgres() {
  const toolsDir = path.join(root, ".local-review", "tools");
  const entry = path.join(toolsDir, "node_modules", "embedded-postgres", "dist", "index.js");
  if (!existsSync(entry)) {
    await mkdir(toolsDir, { recursive: true });
    await writeFile(
      path.join(toolsDir, "package.json"),
      `${JSON.stringify({ private: true, dependencies: { "embedded-postgres": EMBEDDED_POSTGRES_VERSION } }, null, 2)}\n`,
    );
    await run("npm", ["install"], toolsDir, process.env);
  }
  const loaded = await import(pathToFileURL(entry).href);
  return loaded.default;
}

function prismaBin(src) {
  return path.join(src, "node_modules", "prisma", "build", "index.js");
}

function nextBin(src) {
  return path.join(src, "node_modules", "next", "dist", "bin", "next");
}

async function withPreviewLock(fn) {
  const lockPath = path.join(root, ".local-review", "previews", "port.lock");
  await mkdir(path.dirname(lockPath), { recursive: true });
  for (let attempt = 0; attempt < 50; attempt += 1) {
    try {
      const handle = await open(lockPath, "wx");
      try {
        return await fn();
      } finally {
        await handle.close();
        await unlink(lockPath).catch(() => {});
      }
    } catch (error) {
      if (error?.code !== "EEXIST") throw error;
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
  }
  throw new Error("Another preview is still choosing ports.");
}

async function reservePreviewPorts(existing) {
  const savedOk =
    isPreviewAppPort(existing?.appPort) &&
    isPreviewInternalPort(existing?.internalPort) &&
    isPreviewDbPort(existing?.dbPort) &&
    (await portIsFree(existing.appPort)) &&
    (await portIsFree(existing.internalPort)) &&
    (await portIsFree(existing.dbPort));
  const appPort = savedOk ? existing.appPort : await firstFreePort(PREVIEW_APP_PORT_MIN, PREVIEW_APP_PORT_MAX);
  const internalPort = savedOk ? existing.internalPort : await firstFreePort(PREVIEW_INTERNAL_PORT_MIN, PREVIEW_INTERNAL_PORT_MAX);
  const dbPort = savedOk ? existing.dbPort : await firstFreePort(PREVIEW_DB_PORT_MIN, PREVIEW_DB_PORT_MAX);
  if (!savedOk && existing?.appPort) {
    console.log("Saved ports for this preview were taken. Choosing new ones. The database folder is unchanged.");
  }
  return {
    appPort,
    internalPort,
    dbPort,
    releaseApp: await reservePort(appPort),
    releaseInternal: await reservePort(internalPort),
    releaseDb: await reservePort(dbPort),
  };
}

async function reservePort(port) {
  if (blockedPreviewPort(port)) throw new Error(`Refusing reserved port ${port}.`);
  const servers = [];
  for (const host of ["127.0.0.1", "::1"]) {
    const server = net.createServer();
    await new Promise((resolve, reject) => {
      server.once("error", reject);
      server.listen({ port, host, ipv6Only: host === "::1" }, resolve);
    });
    servers.push(server);
  }
  return async () => {
    await Promise.all(servers.map((server) => new Promise((resolve) => server.close(() => resolve()))));
  };
}

async function firstFreePort(start, end) {
  for (let port = start; port <= end; port += 1) {
    if (blockedPreviewPort(port)) continue;
    if (await portIsFree(port)) return port;
  }
  throw new Error("No free preview port was found.");
}

export function portIsFree(port) {
  const hosts = ["127.0.0.1", "::1"];
  return new Promise((resolve) => {
    let pending = hosts.length;
    let free = true;
    for (const host of hosts) {
      const server = net.createServer();
      server.unref();
      const finish = (ok) => {
        if (!ok) free = false;
        server.close(() => {
          pending -= 1;
          if (pending === 0) resolve(free);
        });
      };
      server.once("error", () => {
        free = false;
        pending -= 1;
        if (pending === 0) resolve(false);
      });
      server.listen({ port, host, ipv6Only: host === "::1" }, () => finish(true));
    }
  });
}

export function classifyLoopbackLookup(addresses) {
  if (!addresses || addresses.length === 0) return "absent";
  return addresses.every((address) => address === "127.0.0.1" || address === "::1") ? "loopback" : "public";
}

export function lookupFailureIsFatal(code) {
  return code !== "ENOTFOUND" && code !== "EAI_AGAIN" && code !== "ENODATA";
}

async function noteOsResolver(hostname) {
  try {
    const looked = await dns.lookup(hostname, { all: true });
    const kind = classifyLoopbackLookup(looked.map((item) => item.address));
    if (kind === "public") {
      throw new Error(
        `${hostname} resolved outside loopback. Refusing so a browser that trusts the OS resolver cannot be sent off this computer.`,
      );
    }
    if (kind === "loopback") console.log(`${hostname} resolves to loopback in the OS resolver.`);
    return;
  } catch (error) {
    if (error instanceof Error && /outside loopback/.test(error.message)) throw error;
    const code = error && typeof error === "object" ? error.code : "";
    if (!lookupFailureIsFatal(code)) {
      console.log(
        `${hostname} is not in this computer's OS resolver (${code}). The preview still listens on 127.0.0.1 and ::1. Chrome and Firefox open names ending in .localhost without that lookup. The page address stays on that name so previews do not share 127.0.0.1 cookies.`,
      );
      return;
    }
    throw error;
  }
}

async function waitForPort(port) {
  const started = Date.now();
  while (Date.now() - started < 120000) {
    if (!(await portIsFree(port))) return;
    await new Promise((resolve) => setTimeout(resolve, 300));
  }
  throw new Error("The app did not open its local port.");
}

async function stopPreview(dir, label) {
  const record = await readRecord(path.join(dir, "preview.json"));
  if (!record) throw new Error(`No preview named ${label}. Nothing was deleted.`);
  if (record.scriptPid) {
    try {
      process.kill(record.scriptPid, "SIGTERM");
    } catch {
      // Already stopped.
    }
  }
  console.log(`Stopped preview ${label} if it was running. Its database folder was kept.`);
}

async function printStatus() {
  const base = path.join(root, ".local-review", "previews");
  if (!existsSync(base)) {
    console.log("No named previews yet.");
    return;
  }
  const { readdir } = await import("node:fs/promises");
  for (const name of await readdir(base)) {
    const record = await readRecord(path.join(base, name, "preview.json"));
    if (!record) continue;
    const running = await ourPreviewIsRunning(record);
    console.log(`${record.label} ${running ? "running" : "stopped"} http://${record.host}/ ${record.branch} ${String(record.commit).slice(0, 7)}`);
  }
}

async function ourPreviewIsRunning(record) {
  if (!record?.scriptPid) return false;
  try {
    process.kill(record.scriptPid, 0);
    return true;
  } catch {
    return false;
  }
}

async function readRecord(file) {
  try {
    return JSON.parse(await readFile(file, "utf8"));
  } catch {
    return null;
  }
}

async function readOrCreateSecret(file, pgData) {
  try {
    const text = (await readFile(file, "utf8")).trim();
    if (text.length >= 8) return text;
  } catch {
    // Created below.
  }
  if (existsSync(path.join(pgData, "PG_VERSION"))) {
    throw new Error("This preview database exists, but its password file is missing. Not recreating it.");
  }
  const value = randomBytes(24).toString("hex");
  await writeSecret(file, `${value}\n`);
  return value;
}

async function readLead(file, pgData) {
  try {
    const text = await readFile(file, "utf8");
    const email = text.match(/^email=(.+)$/m)?.[1]?.trim();
    const password = text.match(/^password=(.+)$/m)?.[1]?.trim();
    if (email === LOCAL_LEAD_EMAIL && password && password.length >= 8) return { email, password };
  } catch {
    // Created below.
  }
  if (existsSync(path.join(pgData, "PG_VERSION"))) {
    throw new Error("This preview database exists, but its login file is missing. Not recreating it.");
  }
  const password = randomBytes(24).toString("hex");
  await writeSecret(file, `email=${LOCAL_LEAD_EMAIL}\npassword=${password}\n`);
  return { email: LOCAL_LEAD_EMAIL, password };
}

async function writeSecret(file, contents) {
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, contents, { mode: 0o600 });
  await chmod(file, 0o600);
}

async function openLog(file) {
  const handle = await import("node:fs");
  return handle.createWriteStream(file, { flags: "a" });
}

function git(args, cwd = root) {
  return new Promise((resolve, reject) => {
    execFile("git", args, { cwd }, (error, stdout, stderr) => {
      if (error) reject(new Error((stderr || error.message).trim()));
      else resolve(stdout.trim());
    });
  });
}

function run(command, args, cwd, env) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd, env, stdio: "inherit" });
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${path.basename(command)} exited ${code}`));
    });
  });
}
