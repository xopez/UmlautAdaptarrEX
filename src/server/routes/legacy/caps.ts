import type { FastifyReply, FastifyRequest } from "fastify";
import type { IndexerFetcher } from "@/server/proxy/indexer-fetcher";
import { assertLegacyContext, buildIndexerUrl, recordRequest } from "./util";

export interface LegacyDeps {
  fetcher: IndexerFetcher;
}

export async function handleCaps(
  req: FastifyRequest,
  reply: FastifyReply,
  deps: LegacyDeps,
): Promise<void> {
  const start = Date.now();
  const ctx = assertLegacyContext(req, reply, "caps");
  if (!ctx) return;

  let status = 502;
  let cacheHit = false;
  try {
    const result = await deps.fetcher.fetch(buildIndexerUrl(ctx), {
      "user-agent": String(req.headers["user-agent"] ?? ""),
    });
    status = result.status;
    cacheHit = result.cacheHit;
    reply
      .code(result.status)
      .header("content-type", result.contentType)
      .send(result.body);
  } catch (err) {
    req.log.error(
      { err, domain: ctx.domain, route: "caps" },
      "indexer fetch failed",
    );
    reply.code(502).send("Bad gateway");
  }

  await recordRequest(
    {
      apiKey: ctx.apiKey,
      domain: ctx.domain,
      type: "caps",
      query: null,
      externalId: null,
      status,
      durationMs: Date.now() - start,
      cacheHit,
    },
    req,
  );
}
