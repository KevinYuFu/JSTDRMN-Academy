import { randomBytes } from "crypto";
import { compare, hash } from "bcryptjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { prisma } from "./db";
import { homeForRole, isLead, isStaff } from "./roles";

const COOKIE = "jstdrmn_session";
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
  jar.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token) {
    await prisma.session.deleteMany({ where: { token } });
  }
  jar.delete(COOKIE);
}

/**
 * One session lookup per request. The header and the page both need the
 * signed-in user; without this they each hit Postgres.
 */
export const getUser = cache(async () => {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;
  const session = await prisma.session.findUnique({
    where: { token },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true,
          passwordHash: true,
          role: true,
          googleSub: true,
          discordId: true,
          discordUsername: true,
          createdAt: true,
        },
      },
    },
  });
  if (!session) return null;
  if (session.expiresAt.getTime() < Date.now()) {
    await prisma.session.delete({ where: { id: session.id } });
    return null;
  }
  return session.user;
});

export async function requireUser() {
  const user = await getUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireStaff() {
  const user = await requireUser();
  if (!isStaff(user.role)) redirect(homeForRole(user.role));
  return user;
}

/** Lead only. Instructor and Mentor go back to the staff view. Students go home. */
export async function requireLead() {
  const user = await requireUser();
  if (!isLead(user.role)) {
    if (isStaff(user.role)) redirect("/teacher?skillTree=forbidden");
    redirect(homeForRole(user.role));
  }
  return user;
}
