import { NextResponse } from "next/server";
import { announcementContent } from "@/lib/announcements";
import { postChannelMessage } from "@/lib/discord";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

async function run(request: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  if (secret && request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const now = new Date();
  const due = await prisma.announcement.findMany({
    where: { status: "scheduled", sendAt: { lte: now } },
    orderBy: { sendAt: "asc" },
  });
  const results: { id: string; status: string }[] = [];
  for (const item of due) {
    const content = announcementContent(item.body, item.roleMention);
    const posted = await postChannelMessage({ channelId: item.channelId, content });
    if (!posted.ok) {
      await prisma.announcement.update({
        where: { id: item.id },
        data: { status: "failed", note: posted.error },
      });
      results.push({ id: item.id, status: "failed" });
      continue;
    }
    await prisma.announcement.update({
      where: { id: item.id },
      data: {
        status: "sent",
        note: posted.skipped ? "Logged locally. DISCORD_BOT_TOKEN is not set, so nothing was posted." : "Posted to Discord.",
      },
    });
    results.push({ id: item.id, status: posted.skipped ? "logged" : "sent" });
  }
  return NextResponse.json({ ok: true, processed: results.length, results });
}

export function GET(request: Request) {
  return run(request);
}

export function POST(request: Request) {
  return run(request);
}
