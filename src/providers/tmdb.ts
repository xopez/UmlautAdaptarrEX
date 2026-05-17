import { MovieDb } from "moviedb-promise";
import type { Logger } from "pino";
import type { MediaType } from "@/domain/variations/generate";
import { HostRateLimiter } from "./rate-limit";
import {
  makeTitlePayload,
  type BulkFetchOptions,
  type TitlePayload,
  type TitleProvider,
} from "./types";
import { describeError } from "@/lib/error-format";

interface TmdbProviderOptions {
  apiKey: string;
  userAgent: string;
  logger?: Logger | undefined;
}

// TMDB API expects a v3 API key (32-char hex). v4 Read Access Tokens (JWT
// "eyJ…") are *not* supported by `moviedb-promise` — sending one as the
// constructor arg fails at request time. We detect by prefix here so the
// caller can warn the user and avoid constructing the provider at all.
const V4_TOKEN_PREFIX_RE = /^eyJ[A-Za-z0-9_-]+\./;

export function looksLikeTmdbV4Token(key: string): boolean {
  return V4_TOKEN_PREFIX_RE.test(key);
}

export type TmdbProbeResult =
  | { ok: true; sample: { id: number; title: string } }
  | {
      ok: false;
      code:
        | "missing"
        | "v4_token"
        | "invalid_format"
        | "unauthorized"
        | "network"
        | "unknown";
      detail?: string;
    };

/**
 * Quick smoke-test of a TMDB v3 API key. Calls `movieInfo(550)` against a
 * long-lived public movie ID and translates the outcome into a structured
 * result the UI can render without leaking SDK internals. Used by both the
 * admin Settings page (saved key) and the setup wizard (typed-but-not-yet-
 * saved key).
 */
export async function probeTmdbKey(apiKey: string): Promise<TmdbProbeResult> {
  if (!apiKey) return { ok: false, code: "missing" };
  if (looksLikeTmdbV4Token(apiKey)) return { ok: false, code: "v4_token" };
  // Loose lower-bound — TMDB has historically issued slightly different
  // shapes; let the upstream call decide if it's the wrong key, but reject
  // clearly bogus values without burning a network roundtrip.
  if (apiKey.length < 16) return { ok: false, code: "invalid_format" };
  try {
    const client = new MovieDb(apiKey);
    const info = await client.movieInfo(550);
    const title = info.title ?? info.original_title ?? "Sample Movie";
    return { ok: true, sample: { id: 550, title } };
  } catch (err) {
    const status = (err as { response?: { status?: number } })?.response
      ?.status;
    if (status === 401) return { ok: false, code: "unauthorized" };
    const detail = describeError(err);
    return {
      ok: false,
      code: status ? "unknown" : "network",
      detail: detail.slice(0, 240),
    };
  }
}

interface RawTranslation {
  iso_639_1?: string;
  iso_3166_1?: string;
  data?: {
    title?: string;
    name?: string;
  };
}

interface RawAlternativeTitle {
  iso_3166_1?: string;
  title?: string;
  type?: string;
}

function pickTranslationTitle(t: RawTranslation): string | null {
  // Movie endpoint returns `data.title`; TV endpoint returns `data.name`.
  // Some translations carry both; prefer the one that's non-empty.
  const title = t.data?.title?.trim();
  if (title) return title;
  const name = t.data?.name?.trim();
  if (name) return name;
  return null;
}

// Map common ISO 3166-1 country codes to BCP-47 short language codes for
// alias bucketing. TMDB's alternative_titles endpoint groups by *country*,
// not language, so a German alias arrives as `iso_3166_1=DE`. This map keeps
// the most useful associations explicit; entries without a mapping are
// stored under the lower-cased country code, which lets callers still group
// region-specific aliases (e.g. "BR" Portuguese vs "PT" Portuguese).
const COUNTRY_TO_LANG: Readonly<Record<string, string>> = {
  DE: "de",
  AT: "de",
  CH: "de",
  US: "en",
  GB: "en",
  AU: "en",
  CA: "en",
  IE: "en",
  NZ: "en",
  FR: "fr",
  BE: "fr",
  SE: "sv",
  ES: "es",
  IT: "it",
  PT: "pt",
  BR: "pt",
  JP: "ja",
  KR: "ko",
  CN: "zh",
  TW: "zh",
  HK: "zh",
  RU: "ru",
  PL: "pl",
  NL: "nl",
  TR: "tr",
};

function countryToLang(iso_3166_1: string | undefined): string | null {
  if (!iso_3166_1) return null;
  const upper = iso_3166_1.toUpperCase();
  return COUNTRY_TO_LANG[upper] ?? upper.toLowerCase();
}

export class TmdbProvider implements TitleProvider {
  readonly name = "tmdb";
  private readonly limiter = new HostRateLimiter(250);
  private readonly client: MovieDb;
  private readonly log: Logger | null;

  constructor(opts: TmdbProviderOptions) {
    if (looksLikeTmdbV4Token(opts.apiKey)) {
      throw new Error(
        "TMDB provider requires a v3 API key (32-char hex). The configured " +
          "key looks like a v4 Read Access Token (JWT 'eyJ…') — please " +
          "replace it with the v3 key from your TMDB account settings.",
      );
    }
    this.client = new MovieDb(opts.apiKey);
    this.log = opts.logger?.child({ provider: "tmdb" }) ?? null;
  }

  // TMDB Translations endpoints return *all* localized titles in one shot,
  // so we don't filter by language at the request level — Composite asks
  // and the provider returns whatever it has.
  supportedLanguages(): readonly string[] {
    return ["*"];
  }

  async fetchByExternalId(
    type: MediaType,
    externalId: string,
    langs?: readonly string[],
  ): Promise<TitlePayload | null> {
    return (await this.fetchByExternalIdDetailed(type, externalId, langs))
      .payload;
  }

  /**
   * Detail variant used by `fetchBulk` to attribute each item to an outcome
   * bucket (ok/empty/notFound/unauthorized/network/other) without re-parsing
   * the error a second time. Public callers go through `fetchByExternalId`,
   * which discards the outcome for backwards compatibility with the
   * `TitleProvider` contract.
   */
  private async fetchByExternalIdDetailed(
    type: MediaType,
    externalId: string,
    langs?: readonly string[],
  ): Promise<{
    payload: TitlePayload | null;
    outcome:
      | "ok"
      | "empty"
      | "skipped"
      | "notFound"
      | "unauthorized"
      | "network"
      | "other";
    titleLangs: string[];
  }> {
    if (type !== "movie" && type !== "tv") {
      return { payload: null, outcome: "skipped", titleLangs: [] };
    }
    const idNum = Number(externalId);
    if (!Number.isFinite(idNum) || idNum <= 0) {
      this.log?.debug(
        { externalId, type },
        "tmdb: skipped non-numeric externalId",
      );
      return { payload: null, outcome: "skipped", titleLangs: [] };
    }

    await this.limiter.wait("api.themoviedb.org");
    const started = process.hrtime.bigint();
    let translations: RawTranslation[] = [];
    let alternative: RawAlternativeTitle[] = [];
    try {
      if (type === "movie") {
        const [t, a] = await Promise.all([
          this.client.movieTranslations(idNum),
          this.client.movieAlternativeTitles(idNum),
        ]);
        translations = (t.translations ?? []) as RawTranslation[];
        alternative = (a.titles ?? []) as RawAlternativeTitle[];
      } else {
        const [t, a] = await Promise.all([
          this.client.tvTranslations(idNum),
          this.client.tvAlternativeTitles(idNum),
        ]);
        translations = (t.translations ?? []) as RawTranslation[];
        // TV alternative titles are returned under `results`, not `titles`.
        alternative = ((a as { results?: RawAlternativeTitle[] }).results ??
          []) as RawAlternativeTitle[];
      }
    } catch (err) {
      const durationMs = Number(process.hrtime.bigint() - started) / 1_000_000;
      const status = (err as { response?: { status?: number } })?.response
        ?.status;
      const outcome =
        status === 401
          ? "unauthorized"
          : status === 404
            ? "notFound"
            : status
              ? "other"
              : "network";
      // 404 is a normal "TMDB doesn't know this id" — debug, not warn.
      const logMethod = outcome === "notFound" ? "debug" : "warn";
      this.log?.[logMethod](
        {
          externalId,
          type,
          status,
          outcome,
          durationMs: Math.round(durationMs),
          err,
          hint:
            outcome === "unauthorized"
              ? "TMDB rejected the v3 API key (401). Verify the key in Settings."
              : outcome === "notFound"
                ? undefined
                : "TMDB request failed — see error details.",
        },
        "tmdb lookup error",
      );
      return { payload: null, outcome, titleLangs: [] };
    }
    const durationMs = Number(process.hrtime.bigint() - started) / 1_000_000;

    const titlesByLang: Record<string, string> = {};
    for (const t of translations) {
      const lang = t.iso_639_1?.toLowerCase();
      if (!lang) continue;
      // Skip translations not requested (when caller specified langs and "*"
      // isn't included). This keeps the cache lean — we still pay the bulk
      // request, but we don't persist 50 languages we will never read.
      if (langs && !langs.includes(lang) && !langs.includes("*")) continue;
      const title = pickTranslationTitle(t);
      if (title && !titlesByLang[lang]) titlesByLang[lang] = title;
    }

    const aliasesByLang: Record<string, string[]> = {};
    for (const a of alternative) {
      if (!a.title) continue;
      const lang = countryToLang(a.iso_3166_1);
      if (!lang) continue;
      if (langs && !langs.includes(lang) && !langs.includes("*")) continue;
      const list = aliasesByLang[lang] ?? [];
      if (!list.includes(a.title)) list.push(a.title);
      aliasesByLang[lang] = list;
    }

    const titleLangs = Object.keys(titlesByLang);
    if (titleLangs.length === 0 && Object.keys(aliasesByLang).length === 0) {
      // Even when no *requested* language matched, TMDB may have returned
      // titles in other languages — surface one so the operator can identify
      // which work was queried (e.g. "we asked for DE+SV on tmdb:550 but only
      // EN/JA came back" instead of just "tmdb:550 returned nothing").
      const fallback =
        translations.map((t) => pickTranslationTitle(t)).find((t) => !!t) ??
        alternative.find((a) => !!a.title)?.title ??
        null;
      this.log?.debug(
        {
          externalId,
          type,
          durationMs: Math.round(durationMs),
          fallbackTitle: fallback,
          requestedLangs: langs ?? ["*"],
        },
        "tmdb returned no usable translations or alternative titles",
      );
      return { payload: null, outcome: "empty", titleLangs: [] };
    }

    // Representative title for the log line: prefer English (most operators
    // can read it), then German (our primary target audience), then any
    // available language. This is for debug output only — the payload itself
    // carries every language we kept.
    const representative =
      titlesByLang["en"] ??
      titlesByLang["de"] ??
      titlesByLang[titleLangs[0]!] ??
      null;
    this.log?.debug(
      {
        externalId,
        type,
        title: representative,
        germanTitle: titlesByLang["de"] ?? null,
        durationMs: Math.round(durationMs),
        translations: titleLangs,
        aliasLangs: Object.keys(aliasesByLang),
      },
      "tmdb lookup",
    );

    const payload = makeTitlePayload({
      titlesByLang,
      aliasesByLang:
        Object.keys(aliasesByLang).length > 0 ? aliasesByLang : undefined,
      externalId,
    });
    return { payload, outcome: "ok", titleLangs };
  }

  async fetchByTitle(): Promise<TitlePayload | null> {
    // Title-based search not implemented — Composite uses externalId-based
    // lookups exclusively for sync, and `fetchByTitle` is reserved for
    // future ad-hoc queries against pcjones (which has the better DE search).
    return null;
  }

  async fetchBulk(
    type: MediaType,
    externalIds: string[],
    langs?: readonly string[],
    opts?: BulkFetchOptions,
  ): Promise<Map<string, TitlePayload>> {
    const out = new Map<string, TitlePayload>();
    if (externalIds.length === 0) return out;
    if (type !== "movie" && type !== "tv") return out;

    const total = externalIds.length;
    this.log?.info(
      { type, count: total, langs: langs ?? ["*"] },
      "tmdb bulk request (sequential, no native bulk endpoint)",
    );

    const started = process.hrtime.bigint();
    const outcomeCounts = {
      ok: 0,
      empty: 0,
      skipped: 0,
      notFound: 0,
      unauthorized: 0,
      network: 0,
      other: 0,
    };
    // Per-language coverage = how many of the bulk items returned at least
    // one title in that language. The most useful debug signal for "why is
    // half my library missing German titles?" — beats the binary withTitles.
    const titlesByLang: Record<string, number> = {};
    // Progress milestones: every 25% for libraries >= 200, otherwise quiet.
    // Spammed every 100 would drown smaller installs in noise.
    const progressEvery = total >= 200 ? Math.ceil(total / 4) : Infinity;
    let processed = 0;

    for (const id of externalIds) {
      const result = await this.fetchByExternalIdDetailed(type, id, langs);
      outcomeCounts[result.outcome] += 1;
      if (result.payload) {
        out.set(id, result.payload);
        // Stream the per-id result so callers (DbCachedTitleProvider) can
        // checkpoint progress to the cache immediately. Persist failures are
        // logged inside the callback, never rethrown — a broken cache must
        // not abort a sync.
        if (opts?.onItem) {
          try {
            await opts.onItem(id, result.payload);
          } catch (err) {
            this.log?.warn(
              { externalId: id, err },
              "tmdb bulk onItem callback failed",
            );
          }
        }
      }
      for (const lang of result.titleLangs) {
        titlesByLang[lang] = (titlesByLang[lang] ?? 0) + 1;
      }

      processed += 1;
      if (processed % progressEvery === 0 && processed < total) {
        const elapsedMs = Number(process.hrtime.bigint() - started) / 1_000_000;
        const itemsPerSec = (processed / elapsedMs) * 1000;
        this.log?.info(
          {
            type,
            processed,
            total,
            percent: Math.round((processed / total) * 100),
            itemsPerSec: Math.round(itemsPerSec * 10) / 10,
            withTitles: outcomeCounts.ok,
          },
          "tmdb bulk progress",
        );
      }
    }

    const durationMs = Number(process.hrtime.bigint() - started) / 1_000_000;
    const summary = {
      type,
      requested: total,
      withTitles: outcomeCounts.ok,
      empty: outcomeCounts.empty,
      notFound: outcomeCounts.notFound,
      skipped: outcomeCounts.skipped,
      unauthorized: outcomeCounts.unauthorized,
      networkErrors: outcomeCounts.network,
      otherErrors: outcomeCounts.other,
      durationMs: Math.round(durationMs),
      // Coverage per requested language; useful for spotting "DE works but
      // FR coverage is 0%" without scraping individual debug lines.
      titlesByLang,
    };

    // Heuristic: if the API key is wrong, every single request returns 401 —
    // that's both more actionable AND more diagnostic than "withTitles: 0".
    if (outcomeCounts.unauthorized === total && total > 0) {
      this.log?.error(
        summary,
        "tmdb bulk: every request returned 401 — API key invalid or revoked",
      );
    } else if (
      outcomeCounts.network + outcomeCounts.other === total &&
      total > 0
    ) {
      this.log?.error(
        summary,
        "tmdb bulk: every request failed with network/other errors — TMDB unreachable?",
      );
    } else if (outcomeCounts.ok === 0 && total > 0) {
      this.log?.warn(
        summary,
        "tmdb bulk: 0 items resolved with titles — check API key, network, or external IDs",
      );
    } else {
      this.log?.info(summary, "tmdb bulk done");
    }
    return out;
  }
}
