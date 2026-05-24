import type { FastifyRequest } from "fastify";

// In production we hard-enforce `Secure` regardless of the observed
// request protocol: a mis-configured trustProxy / non-HTTPS health probe
// would otherwise mint a non-Secure cookie, and a single subsequent
// plaintext request could leak it. In development we still honor
// req.protocol so the cookie works on `http://localhost`.
const IS_PROD = process.env.NODE_ENV === "production";

function deriveSecure(req: FastifyRequest): boolean {
  if (IS_PROD) return true;
  return req.protocol === "https";
}

export const sessionCookieOptions = (
  req: FastifyRequest,
  maxAgeMs: number,
) => ({
  httpOnly: true,
  sameSite: "lax" as const,
  secure: deriveSecure(req),
  path: "/",
  maxAge: Math.floor(maxAgeMs / 1000),
});

export const csrfCookieOptions = (req: FastifyRequest) => ({
  httpOnly: false,
  sameSite: "lax" as const,
  secure: deriveSecure(req),
  path: "/",
});
