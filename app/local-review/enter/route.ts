import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import { createSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  LOCAL_REVIEW_META_KEY,
  isSyntheticLocalLead,
  localReviewClusterMatches,
  localReviewEntryDecision,
  localReviewEntryFrom,
} from "@/lib/local-review-entry";
import { LOCAL_LEAD_EMAIL } from "@/scripts/local-review-guard.mjs";

export const dynamic = "force-dynamic";

/** Loopback-only session for the synthetic local Lead. Anywhere else this is a 404. */
export async function GET(request: Request) {
  const decision = localReviewEntryDecision(localReviewEntryFrom(process.env, request.headers));
  if (!decision.ok) return new NextResponse(null, { status: 404 });

  const bound = await clusterMatches();
  if (!bound) return new NextResponse(null, { status: 404 });

  const user = await prisma.user.findUnique({ where: { email: LOCAL_LEAD_EMAIL } });
  if (!isSyntheticLocalLead(user) || !user) return new NextResponse(null, { status: 404 });

  await createSession(user.id);
  redirect("/?entered=1");
}

async function clusterMatches() {
  const rows = await prisma.$queryRaw<Array<{ db: string; addr: string | null; dir: string }>>`
    SELECT current_database()::text AS db,
           inet_server_addr()::text AS addr,
           current_setting('data_directory') AS dir
  `;
  const row = rows[0];
  if (!row) return false;
  const meta = await prisma.meta.findUnique({ where: { key: LOCAL_REVIEW_META_KEY } });
  return localReviewClusterMatches({
    currentDatabase: row.db,
    serverAddr: row.addr,
    dataDirectory: row.dir,
    expectedDataDirectory: process.env.LOCAL_REVIEW_PGDATA ?? "",
    metaToken: meta?.value ?? null,
    envToken: process.env.LOCAL_REVIEW_TOKEN ?? "",
  });
}
