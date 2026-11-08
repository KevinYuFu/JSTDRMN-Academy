import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

// Next can bundle this module more than once, including under `next start`.
// One client keeps a single pool instead of opening a new one per route.
globalForPrisma.prisma = prisma;
