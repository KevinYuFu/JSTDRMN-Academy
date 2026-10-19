import { spawnSync } from "child_process";
import { existsSync } from "fs";

const schema = existsSync("prisma/schema.deploy.prisma") ? "prisma/schema.deploy.prisma" : "prisma/schema.prisma";
const result = spawnSync("npx", ["prisma", "generate", "--schema", schema], { stdio: "inherit" });
process.exit(result.status ?? 1);
