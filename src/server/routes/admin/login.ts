import type { FastifyInstance } from "fastify";
import { prisma } from "@/lib/db";
import { verifyPassword } from "@/lib/auth/password";
import {
  createSession,
  getSession,
  revokeSession,
  SESSION_COOKIE,
  SESSION_TTL_MS,
} from "@/lib/auth/session";
import { CSRF_COOKIE } from "@/lib/auth/csrf";
import { requireAuth } from "@/server/auth/middleware";
import { LoginSchema } from "@/schemas/auth";
import { parseOrReply } from "./_helpers";
import { csrfCookieOptions, sessionCookieOptions } from "./_auth-cookies";

export async function loginRoutes(app: FastifyInstance): Promise<void> {
  app.post(
    "/api/auth/login",
    {
      config: {
        rateLimit: {
          max: 5,
          timeWindow: "5 minutes",
          keyGenerator: (req) => req.ip,
          // Surface bruteforce hits — without this the only signal is a 429
          // status the user never sees in the log stream.
          onExceeded: (req) => {
            req.log.warn(
              { ip: req.ip, ua: req.headers["user-agent"] ?? null },
              "login rate-limit exceeded",
            );
          },
        },
      },
    },
    async (req, reply) => {
      const data = parseOrReply(req.body, LoginSchema, reply);
      if (!data) {
        req.log.warn(
          { ip: req.ip, ua: req.headers["user-agent"] ?? null },
          "login rejected: validation",
        );
        return;
      }
      const user = await prisma.adminUser.findUnique({
        where: { username: data.username },
      });
      if (!user) {
        req.log.warn(
          {
            username: data.username,
            ip: req.ip,
            ua: req.headers["user-agent"] ?? null,
          },
          "login rejected: unknown username",
        );
        return reply.code(401).send({ error: "invalid-credentials" });
      }

      const ok = await verifyPassword(user.passwordHash, data.password);
      if (!ok) {
        req.log.warn(
          { username: user.username, ip: req.ip },
          "login rejected: bad password",
        );
        return reply.code(401).send({ error: "invalid-credentials" });
      }

      const session = await createSession(user.id);
      reply.setCookie(
        SESSION_COOKIE,
        session.id,
        sessionCookieOptions(req, SESSION_TTL_MS),
      );
      const csrf = reply.generateCsrf();
      reply.setCookie(CSRF_COOKIE, csrf, csrfCookieOptions(req));

      req.log.info(
        { username: user.username, userId: user.id, ip: req.ip },
        "login ok",
      );
      return { ok: true, csrf };
    },
  );

  // Logout is a state-changing POST; require both a valid session and the
  // CSRF token (via `requireAuth`) so a malicious cross-site can't force a
  // logout. Stale-cookie clients hit 401, they are effectively "logged out"
  // already, so no UX regression.
  app.post(
    "/api/auth/logout",
    { preHandler: requireAuth },
    async (req, reply) => {
      const sid = req.cookies[SESSION_COOKIE];
      if (sid) await revokeSession(sid);
      reply.clearCookie(SESSION_COOKIE, { path: "/" });
      reply.clearCookie(CSRF_COOKIE, { path: "/" });
      // The plugin's secret cookie. Clearing it forces the next login to
      // start a fresh CSRF chain rather than reusing a stale secret.
      reply.clearCookie("_csrf", { path: "/" });
      req.log.info(
        { userId: req.session?.userId ?? null, ip: req.ip },
        "logout",
      );
      return { ok: true };
    },
  );

  app.get("/api/auth/me", async (req, reply) => {
    const sid = req.cookies[SESSION_COOKIE];
    if (!sid) return reply.code(401).send({ error: "unauthorized" });
    const session = await getSession(sid);
    if (!session) return reply.code(401).send({ error: "unauthorized" });
    const user = await prisma.adminUser.findUnique({
      where: { id: session.userId },
    });
    if (!user) return reply.code(401).send({ error: "unauthorized" });
    return { id: user.id, username: user.username };
  });
}
