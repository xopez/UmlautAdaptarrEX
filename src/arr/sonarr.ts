import {
  buildSearchItem,
  type SearchItemDerived,
} from "@/domain/variations/index";
import { getActiveLanguagePack } from "@/domain/plugins";
import { requiredLanguages } from "@/providers";
import type { TitleProvider } from "@/providers/types";
import { ArrClient, type ArrClientOptions } from "./base";

interface SonarrSeries {
  id: number;
  tvdbId?: number;
  title: string;
  year?: number;
  alternateTitles?: { title: string }[];
}

interface SonarrClientOptions extends ArrClientOptions {
  provider: TitleProvider;
}

export class SonarrClient extends ArrClient {
  constructor(private readonly sopts: SonarrClientOptions) {
    super(sopts);
  }

  async fetchAllItems(): Promise<SearchItemDerived[]> {
    const series = await this.getJson<SonarrSeries[]>("/api/v3/series", {
      includeSeasonImages: "false",
    });
    if (!series) return [];

    const tvdbIds = series
      .filter((s) => s.tvdbId != null)
      .map((s) => String(s.tvdbId));
    const langs = requiredLanguages(getActiveLanguagePack());
    const titles = await this.sopts.provider.fetchBulk("tv", tvdbIds, langs);

    return series
      .filter((s) => s.tvdbId != null)
      .map((s) => {
        const payload = titles.get(String(s.tvdbId));
        return buildSearchItem({
          arrId: s.id,
          externalId: String(s.tvdbId),
          title: s.title,
          expectedTitle: s.title,
          germanTitle: payload?.germanTitle ?? null,
          titlesByLang: payload?.titlesByLang,
          aliases:
            payload?.aliases ?? s.alternateTitles?.map((a) => a.title) ?? null,
          mediaType: "tv",
          year: s.year && s.year > 0 ? s.year : null,
        });
      });
  }
}
