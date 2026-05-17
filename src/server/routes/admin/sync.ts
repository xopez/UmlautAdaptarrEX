import type { FastifyInstance } from "fastify";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/server/auth/middleware";
import type { SyncScheduler } from "@/server/sync/scheduler";

export interface SyncRoutesDeps {
  scheduler: SyncScheduler;
}

export async function syncRoutes(
  app: FastifyInstance,
  deps: SyncRoutesDeps,
): Promise<void> {
  app.post(
    "/api/admin/sync",
    { preHandler: requireAuth },
    async (req, reply) => {
      const body = (req.body as { instanceId?: string } | undefined) ?? {};
      const outcome = await deps.scheduler.runNow(body.instanceId);
      if (outcome.status === "no_provider") {
        return reply.code(409).send({
          error: "no_provider",
          message:
            "No title provider configured. Check titleApiHost in settings.",
        });
      }
      if (outcome.status === "already_running") {
        return reply.code(409).send({
          error: "already_running",
          message: "A sync is already running.",
        });
      }
      if (outcome.status === "no_instances") {
        return reply.code(409).send({
          error: "no_instances",
          message: "No active instances.",
        });
      }
      return reply.code(202).send({
        ok: true,
        runIds: outcome.runIds,
        instanceCount: outcome.instanceCount,
      });
    },
  );

  app.get("/api/admin/sync-runs", { preHandler: requireAuth }, async (req) => {
    const q = (req.query as Record<string, string | undefined>) ?? {};
    const take = q.take ? Math.min(parseInt(q.take, 10) || 20, 200) : 20;
    if (q.ids && q.ids.length > 0) {
      // Cap input length and id count so a pathological query string
      // can't push the DB into a 10MB-IN clause.
      if (q.ids.length > 8 * 1024) {
        return [];
      }
      const ids = q.ids
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, 200);
      if (ids.length === 0) return [];
      return prisma.syncRun.findMany({
        where: { id: { in: ids } },
        orderBy: { startedAt: "desc" },
        include: { arrInstance: { select: { name: true, type: true } } },
      });
    }
    return prisma.syncRun.findMany({
      orderBy: { startedAt: "desc" },
      take,
      include: { arrInstance: { select: { name: true, type: true } } },
    });
  });
}
