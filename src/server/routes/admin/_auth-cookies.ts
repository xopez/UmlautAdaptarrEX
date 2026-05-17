import type { FastifyRequest } from "fastify";

// `Secure` is derived from the actual connection (req.protocol honors
// X-Forwarded-Proto via trustProxy), so cookies work both on plain HTTP and
// behind an HTTPS reverse proxy.
export const sessionCookieOptions = (
  req: FastifyRequest,
  maxAgeMs: number,
) => ({
  httpOnly: true,
  sameSite: "lax" as const,
  secure: req.protocol === "https",
  path: "/",
  maxAge: Math.floor(maxAgeMs / 1000),
});

export const csrfCookieOptions = (req: FastifyRequest) => ({
  httpOnly: false,
  sameSite: "lax" as const,
  secure: req.protocol === "https",
  path: "/",
});
