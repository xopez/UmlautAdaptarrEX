import { nanoid } from "nanoid";
import { prisma } from "@/lib/db";

// No "__Host-" prefix — that would require HTTPS+Secure, which self-hosted
// deployments behind home networks often don't have.
export const SESSION_COOKIE = "uaSession";
// Production: 14 days. Dev (NODE_ENV !== "production"): 365 days, so a single
// /setup or /login lasts effectively forever during local development and
// survives DB resets are at most a one-time inconvenience.
export const SESSION_TTL_MS =
  process.env.NODE_ENV === "production"
    ? 14 * 24 * 60 * 60 * 1000
    : 365 * 24 * 60 * 60 * 1000;

export async function createSession(
  userId: string,
): Promise<{ id: string; expiresAt: Date }> {
  const id = nanoid(48);
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await prisma.session.create({
    data: { id, userId, expiresAt },
  });
  return { id, expiresAt };
}

export async function getSession(
  id: string,
): Promise<{ id: string; userId: string } | null> {
  const session = await prisma.session.findUnique({ where: { id } });
  if (!session) return null;
  if (session.expiresAt < new Date()) {
    await prisma.session.delete({ where: { id } }).catch(() => {});
    return null;
  }
  await prisma.session.update({
    where: { id },
    data: { lastUsed: new Date() },
  });
  return { id: session.id, userId: session.userId };
}

export async function revokeSession(id: string): Promise<void> {
  await prisma.session.delete({ where: { id } }).catch(() => {});
}
