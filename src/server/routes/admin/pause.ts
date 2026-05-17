import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { prisma } from "@/lib/db";
import { PauseRequestSchema } from "@/schemas/settings";
import { requireAuth } from "@/server/auth/middleware";
import { getAppState } from "@/server/state";
import { parseOrReply } from "./_helpers";

// Sentinel for an indefinite pause. The UI treats any date >= +100y from now
// as "unlimited" and renders the unlimited label instead of a countdown.
const PAUSE_UNLIMITED_UNTIL = new Date("9999-12-31T00:00:00.000Z");

interface PauseResponse {
  pausedUntil: string | null;
}

async function postPause(
  req: FastifyRequest,
  reply: FastifyReply,
): Promise<PauseResponse | undefined> {
  const data = parseOrReply(req.body, PauseRequestSchema, reply);
  if (!data) return;
  const pausedUntil =
    data.durationMinutes === null
      ? PAUSE_UNLIMITED_UNTIL
      : new Date(Date.now() + data.durationMinutes * 60_000);
  await prisma.setting.update({
    where: { id: 1 },
    data: { pausedUntil },
  });
  await getAppState().reloadSettings();
  req.log.info(
    {
      userId: req.session?.userId ?? null,
      ip: req.ip,
      pausedUntil: pausedUntil.toISOString(),
      durationMinutes: data.durationMinutes,
    },
    "umlaut pause activated",
  );
  return { pausedUntil: pausedUntil.toISOString() };
}

async function deletePause(req: FastifyRequest): Promise<PauseResponse> {
  await prisma.setting.update({
    where: { id: 1 },
    data: { pausedUntil: null },
  });
  await getAppState().reloadSettings();
  req.log.info(
    {
      userId: req.session?.userId ?? null,
      ip: req.ip,
    },
    "umlaut pause cleared",
  );
  return { pausedUntil: null };
}

export async function pauseRoutes(app: FastifyInstance): Promise<void> {
  const auth = { preHandler: requireAuth } as const;
  app.post("/api/admin/pause", auth, postPause);
  app.delete("/api/admin/pause", auth, deletePause);
}
