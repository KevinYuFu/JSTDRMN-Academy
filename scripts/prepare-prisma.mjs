import { existsSync, readFileSync, rmSync, writeFileSync } from "fs";

function databaseUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  if (!existsSync(".env")) return "";
  for (const line of readFileSync(".env", "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("DATABASE_URL=") || trimmed.startsWith("#")) continue;
    return trimmed.slice("DATABASE_URL=".length).replace(/^["']|["']$/g, "");
  }
  return "";
}

const deploySchema = "prisma/schema.deploy.prisma";
const url = databaseUrl();
const postgres = url.startsWith("postgres://") || url.startsWith("postgresql://");

if (!postgres) {
  if (existsSync(deploySchema)) rmSync(deploySchema);
  console.log("Prisma target: sqlite (prisma/schema.prisma)");
  process.exit(0);
}

const direct = process.env.DIRECT_URL ? "DIRECT_URL" : "DATABASE_URL";
const schema = readFileSync("prisma/schema.prisma", "utf8").replace(
  /datasource db \{\n  provider = "sqlite"\n  url\s+= env\("DATABASE_URL"\)\n\}/,
  `datasource db {\n  provider  = "postgresql"\n  url       = env("DATABASE_URL")\n  directUrl = env("${direct}")\n}`,
);

if (!schema.includes('provider  = "postgresql"')) {
  console.error("Could not switch prisma/schema.prisma to postgresql.");
  process.exit(1);
}

writeFileSync(deploySchema, schema);
console.log(`Prisma target: postgresql (${deploySchema})`);
