import { randomBytes } from "crypto";
import { compare, hash } from "bcryptjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { cache } from "react";
import { findLiveSession, leadGate, staffGate } from "./access-rules";
import { prisma } from "./db";
import { SESSION_COOKIE } from "./session-cookie";

const MAX_AGE = 60 * 60 * 24 * 30;

export async function hashPassword(password: string) {
  return hash(password, 10);
}

export async function checkPassword(password: string, passwordHash: string | null) {
  if (!passwordHash) return false;
  return compare(password, passwordHash);
}

export async function createSession(userId: string) {
  const token = randomBytes(32).toString("hex");
  await prisma.session.create({
    data: {
      token,
      userId,
      expiresAt: new Date(Date.now() + MAX_AGE * 1000),
    },
  });
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) {
    await prisma.session.deleteMany({ where: { token } });
  }
  jar.delete(SESSION_COOKIE);
}

/**
 * One session lookup per request. The header and the page both call this.
 * React cache() keeps the cookie read, the query, and an expired-session delete
 * the same, and skips the second database read.
 */
export const getUser = cache(async function getUser() {
  // A prerender must stop before the expiry clock. connection() waits for a real
  // request, then the cookie read, then findLiveSession's Date.now().
  await connection();
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = await findLiveSession(token, {
    findSession: (sessionToken) => prisma.session.findUnique({ where: { token: sessionToken }, include: { user: true } }),
    deleteSession: (session) => prisma.session.delete({ where: { id: session.id } }),
  });
  if (!session) return null;
  return session.user;
});

export async function requireUser() {
  const user = await getUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireStaff() {
  const user = await requireUser();
  const gate = staffGate(user.role);
  if (gate) redirect(gate.redirect);
  return user;
}

/** Lead only. Instructor and Mentor go back to the staff view. Students go home. */
export async function requireLead() {
  const user = await requireUser();
  const gate = leadGate(user.role);
  if (gate) redirect(gate.redirect);
  return user;
}
