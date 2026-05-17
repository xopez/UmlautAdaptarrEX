// IMPORTANT: import the db helper FIRST so DATABASE_URL is set before
// `@/lib/db` constructs its prisma client.
import "./db";

import type { FastifyInstance } from "fastify";
import { hashPassword } from "@/lib/auth/password";
import { readSetCookie } from "./app";

export interface AuthSession {
  csrfToken: string;
  sessionCookie: string;
  csrfCookie: string;
  /** The signed `_csrf` cookie set by `@fastify/csrf-protection`. */
  signedCsrfCookie: string;
}

export const ADMIN_USERNAME = "admin";
export const ADMIN_PASSWORD = "test-admin-password";

export async function seedAdminUser(): Promise<{
  id: string;
  username: string;
}> {
  const { prisma } = await import("@/lib/db");
  const passwordHash = await hashPassword(ADMIN_PASSWORD);
  return prisma.adminUser.create({
    data: { username: ADMIN_USERNAME, passwordHash },
  });
}

export async function login(app: FastifyInstance): Promise<AuthSession> {
  const r = await app.inject({
    method: "POST",
    url: "/api/auth/login",
    payload: { username: ADMIN_USERNAME, password: ADMIN_PASSWORD },
  });
  if (r.statusCode !== 200) {
    throw new Error(
      `login helper failed (statusCode=${r.statusCode}): ${r.body}`,
    );
  }
  const sessionCookie = readSetCookie(r.headers["set-cookie"], "uaSession");
  const csrfCookie = readSetCookie(r.headers["set-cookie"], "ua-csrf");
  const signedCsrfCookie = readSetCookie(r.headers["set-cookie"], "_csrf");
  if (!sessionCookie || !csrfCookie || !signedCsrfCookie) {
    throw new Error("login helper: missing one or more auth cookies");
  }
  const body = r.json() as { csrf: string };
  return {
    csrfToken: body.csrf,
    sessionCookie,
    csrfCookie,
    signedCsrfCookie,
  };
}

/** Cookie+header bundle for a state-changing request that needs a valid CSRF roundtrip. */
export function authCookies(session: AuthSession): {
  cookies: Record<string, string>;
  headers: { "x-csrf-token": string };
} {
  return {
    cookies: {
      uaSession: session.sessionCookie,
      _csrf: session.signedCsrfCookie,
    },
    headers: { "x-csrf-token": session.csrfToken },
  };
}

/** Cookie-only bundle for safe-method requests (CSRF not required). */
export function sessionCookieOnly(session: AuthSession): {
  cookies: Record<string, string>;
} {
  return {
    cookies: { uaSession: session.sessionCookie },
  };
}
