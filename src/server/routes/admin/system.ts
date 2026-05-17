import type { FastifyInstance } from "fastify";
import { requireAuth } from "@/server/auth/middleware";

const RESTART_EXIT_CODE = 75;
const SUPERVISOR_ENV = "UMLAUTADAPTARREX_SUPERVISED";

// Restart support: the parent `start.mjs` re-spawns this process on exit
// code 75. In dev (`tsx watch`) the env var is missing, so we still let the
// admin trigger a shutdown — but we tell the UI ahead of time that it has
// to be brought back up manually. That way the button is a one-line
// behaviour switch instead of a missing feature on dev environments.
function canRestart(): boolean {
  return process.env[SUPERVISOR_ENV] === "1";
}

export async function systemRoutes(app: FastifyInstance): Promise<void> {
  app.get(
    "/api/admin/system/capabilities",
    { preHandler: requireAuth },
    async () => ({
      canRestart: canRestart(),
    }),
  );

  app.post(
    "/api/admin/system/restart",
    { preHandler: requireAuth },
    async (req, reply) => {
      const supervised = canRestart();
      req.log.warn(
        {
          supervised,
          ip: req.ip,
          ua: req.headers["user-agent"] ?? null,
        },
        "admin requested server restart",
      );
      // Send the response *before* tearing down so the UI gets a 202 and
      // can start polling /api/health. The 250ms delay lets Fastify flush
      // the response and any Set-Cookie headers.
      void reply.code(202).send({
        ok: true,
        supervised,
        exitCode: RESTART_EXIT_CODE,
      });
      setTimeout(() => {
        if (supervised) {
          // Hand off to start.mjs — its `umlautadaptarrex:restart` handler
          // runs the full shutdown (SIGTERM Next.js, close Fastify, exit 75)
          // so the parent supervisor respawns onto freed ports. A direct
          // process.exit(75) here would orphan the Next.js subprocess,
          // EADDRINUSE the respawn, and stop the container.
          // Cast: process.emit is typed only for built-in events (Signals,
          // 'disconnect'). Custom events go through the underlying EE.
          (process as NodeJS.EventEmitter).emit("umlautadaptarrex:restart");
        } else {
          // Dev (`tsx watch`): no parent supervisor watching for code 75,
          // so a normal exit is the cleanest signal — the UI told the user
          // up-front (canRestart=false) that they need to bring it back.
          process.exit(0);
        }
      }, 250);
    },
  );
}
