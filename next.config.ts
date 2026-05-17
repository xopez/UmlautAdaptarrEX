import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/lib/i18n.ts");

const apiUpstream = process.env.API_UPSTREAM ?? "http://127.0.0.1:5005";

const config: NextConfig = {
  output: "standalone",
  reactStrictMode: true,
  typedRoutes: true,
  poweredByHeader: false,
  serverExternalPackages: ["better-sqlite3", "argon2", "@prisma/client"],
  async rewrites() {
    return [
      {
        source: "/api/admin/:path*",
        destination: `${apiUpstream}/api/admin/:path*`,
      },
      {
        source: "/api/auth/:path*",
        destination: `${apiUpstream}/api/auth/:path*`,
      },
      // /api/health is what the RestartServerButton polls until the server
      // is back. Without this rewrite the poll lands on Next.js (which has
      // no /api/health route) and the UI shows a "timeout after 30s" toast
      // even though the restart itself succeeded.
      { source: "/api/health", destination: `${apiUpstream}/api/health` },
    ];
  },
  async headers() {
    // Default security headers for HTML responses served by Next.js.
    // Fastify routes set their own headers; this only applies to pages
    // and static assets served by the Next process.
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
};

export default withNextIntl(config);
