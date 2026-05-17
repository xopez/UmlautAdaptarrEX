import type { FastifyReply, FastifyRequest } from "fastify";
import { prisma } from "@/lib/db";
import {
  getLidarrTitleForExternalId,
  getReadarrTitleForExternalId,
} from "@/domain/normalization/index";
import { aggregateIndexerResponses, rewriteIndexerXml } from "@/domain/xml";
import type { IndexerFetcher } from "@/server/proxy/indexer-fetcher";
import {
  type AppState,
  type CachedSearchItem,
  getAppState,
} from "@/server/state";
import {
  assertLegacyContext,
  buildIndexerUrl,
  buildVariationSearch,
  type LegacyContext,
  recordRequest,
} from "./util";

export interface LegacySearchDeps {
  fetcher: IndexerFetcher;
}

type SearchType = "search" | "tvsearch" | "movie" | "music" | "book";

interface RouteSpec {
  type: SearchType;
}

// Mirrors the old SearchController constants — used by the generic `?t=search`
// route to decide whether the query is for Readarr (book) or Lidarr (audio).
const READARR_CATEGORY_IDS = new Set([
  "3030",
  "3130",
  "7000",
  "7010",
  "7020",
  "7030",
  "7100",
  "7110",
  "7120",
  "7130",
]);
const LIDARR_CATEGORY_IDS = new Set(["3000", "3010", "3020", "3040", "3050"]);

// Reproduces SearchController's per-action upfront lookup. Returning null
// means "no upfront searchItem" — rewrites still happen via per-item title
// lookup against the cache (matches old `useCacheService = searchItem == null`
// path in TitleMatchingService.RenameTitlesInContent).
function determineSearchItem(
  spec: RouteSpec,
  params: URLSearchParams,
  state: AppState,
): CachedSearchItem | null {
  const q = params.get("q");
  switch (spec.type) {
    case "tvsearch": {
      const tvdbid = params.get("tvdbid");
      if (tvdbid) return state.getByExternalId("tv", tvdbid);
      if (q) return state.findByTitle("tv", q);
      return null;
    }
    case "search": {
      if (!q) return null;
      const cat = params.get("cat");
      if (!cat) return null;
      const cats = cat.split(",").map((c) => c.trim());
      if (cats.some((c) => READARR_CATEGORY_IDS.has(c))) {
        return state.getByExternalId("book", getReadarrTitleForExternalId(q));
      }
      if (cats.some((c) => LIDARR_CATEGORY_IDS.has(c))) {
        return state.getByExternalId("audio", getLidarrTitleForExternalId(q));
      }
      return null;
    }
    case "movie":
    case "music":
    case "book":
      // Old MovieSearch/MusicSearch/BookSearch pass searchItem=null to
      // BaseSearch. Per-item rewrites still happen via the cache lookup.
      return null;
  }
}

// Mirrors SearchControllerBase.BaseSearch's variation list builder:
// titleSearchVariations + (toggle q) + (add expectedTitle if missing).
function buildVariationList(
  searchItem: CachedSearchItem,
  searchQuery: string,
): string[] {
  const variations: string[] = [...searchItem.titleSearchVariations];
  if (searchQuery) {
    // Old behavior: if the query is already in the alias list, drop it (the
    // alias query covers it); otherwise append the user's literal query so it
    // is still searched alongside the German variations.
    const idx = variations.indexOf(searchQuery);
    if (idx >= 0) {
      variations.splice(idx, 1);
    } else {
      variations.push(searchQuery);
    }
  }
  // TODO_FORCE_TEXT_SEARCH_ORIGINAL_TITLE was hard-coded `true` in the legacy
  // code, so always include the canonical expected title.
  const expected = searchItem.expectedTitle;
  if (expected && expected !== searchQuery && !variations.includes(expected)) {
    variations.push(expected);
  }
  return variations;
}

export async function handleSearch(
  req: FastifyRequest,
  reply: FastifyReply,
  spec: RouteSpec,
  deps: LegacySearchDeps,
): Promise<void> {
  const start = Date.now();
  const ctx = assertLegacyContext(req, reply, spec.type);
  if (!ctx) return;

  const params = new URLSearchParams(ctx.search);
  const externalId =
    params.get("tvdbid") ??
    params.get("tmdbid") ??
    params.get("imdbid") ??
    null;
  const q = params.get("q");

  const state = getAppState();
  const searchItem = determineSearchItem(spec, params, state);
  // While paused, the legacy path becomes a transparent pass-through: no
  // outbound variation fan-out and no response-XML rewriting. Logging and
  // request-history accounting stay intact because the gate sits inside the
  // rewrite callback rather than at the route entry.
  const isPaused = state.isPausedNow();

  const userAgent = String(req.headers["user-agent"] ?? "");
  const responses: string[] = [];
  let lastStatus = 200;
  let lastContentType = "application/xml";
  let cacheHit = true;

  const rewriteResponse = (body: string): string => {
    if (!body || isPaused) return body;
    return rewriteIndexerXml(body, {
      pack: state.languagePack,
      searchItem: searchItem ? state.toRewriteSearchItem(searchItem) : null,
      lookup: searchItem
        ? undefined
        : (mediaType, cleanTitle) => {
            const found = state.findByTitle(mediaType, cleanTitle);
            return found ? state.toRewriteSearchItem(found) : null;
          },
      onSkip: (event) => {
        req.log.debug(
          {
            domain: ctx.domain,
            route: spec.type,
            mediaType: event.mediaType,
            reason: event.reason,
            originalTitle: event.originalTitle,
            expectedTitle: event.expectedTitle,
          },
          "title rewrite skipped",
        );
      },
      onRename: (event) => {
        req.log.info(
          {
            domain: ctx.domain,
            route: spec.type,
            mediaType: event.mediaType,
            originalTitle: event.originalTitle,
            rewrittenTitle: event.rewrittenTitle,
            matchedSearchItemId: searchItem?.id ?? null,
            expectedTitle: searchItem?.expectedTitle ?? null,
          },
          "title rewritten",
        );
        void prisma.renameHistory
          .create({
            data: {
              originalTitle: event.originalTitle,
              rewrittenTitle: event.rewrittenTitle,
              mediaType: event.mediaType,
              matchedSearchItemId: searchItem?.id ?? null,
            },
          })
          .catch((dbErr) => {
            req.log.debug({ err: dbErr }, "renameHistory insert failed");
          });
      },
    });
  };

  try {
    const main = await deps.fetcher.fetch(buildIndexerUrl(ctx), {
      "user-agent": userAgent,
    });
    lastStatus = main.status;
    lastContentType = main.contentType;
    cacheHit = cacheHit && main.cacheHit;

    let initialBody = main.body.toString("utf8");
    if (lastStatus === 200) {
      initialBody = rewriteResponse(initialBody);
    }

    // Match SearchControllerBase.BaseSearch ordering: aggregate variations
    // first, then merge the initial response last so dedup keeps variation
    // hits ahead of the (typically less specific) original query.
    if (
      searchItem &&
      lastStatus === 200 &&
      searchItem.expectedTitle &&
      !isPaused
    ) {
      const variations = buildVariationList(searchItem, q ?? "");
      for (const variation of variations) {
        const variationCtx: LegacyContext = {
          ...ctx,
          search: buildVariationSearch(ctx.search, variation),
        };
        const extra = await deps.fetcher.fetch(buildIndexerUrl(variationCtx), {
          "user-agent": userAgent,
        });
        cacheHit = cacheHit && extra.cacheHit;
        if (extra.status === 200 && extra.body.length > 0) {
          responses.push(rewriteResponse(extra.body.toString("utf8")));
        }
      }
      responses.push(initialBody);
    } else {
      responses.push(initialBody);
    }

    const aggregated =
      responses.length > 1
        ? aggregateIndexerResponses(responses)
        : responses[0]!;
    reply
      .code(lastStatus)
      .header("content-type", lastContentType)
      .send(aggregated);
  } catch (err) {
    req.log.error(
      {
        err,
        domain: ctx.domain,
        route: spec.type,
        query: q,
        externalId,
      },
      "indexer search failed",
    );
    reply.code(502).send("Bad gateway");
    lastStatus = 502;
  }

  // cacheHit means "the response we delivered came from the indexer cache".
  // Only 2xx responses are ever stored (indexer-fetcher.ts), so a non-2xx
  // final status must report cacheHit=false even when the main fetch was a
  // cache hit but a later variation throw fell into the catch above.
  const recordedCacheHit = cacheHit && lastStatus >= 200 && lastStatus < 300;
  await recordRequest(
    {
      apiKey: ctx.apiKey,
      domain: ctx.domain,
      type: spec.type,
      query: q,
      externalId,
      status: lastStatus,
      durationMs: Date.now() - start,
      cacheHit: recordedCacheHit,
    },
    req,
  );

  // Slow-search visibility: surface anything > 8s separately so it stands out
  // from the normal "indexer search failed" error path.
  const totalMs = Date.now() - start;
  if (lastStatus < 400 && totalMs > 8_000) {
    req.log.warn(
      {
        route: spec.type,
        domain: ctx.domain,
        durationMs: totalMs,
        responses: responses.length,
        cacheHit,
        externalId,
      },
      "legacy search slow",
    );
  }
}
