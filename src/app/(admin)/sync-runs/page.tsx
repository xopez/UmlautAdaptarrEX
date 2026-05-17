import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { SyncRunsClient } from "./sync-runs-client";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("syncRuns");
  return { title: t("title") };
}

export default function SyncRunsPage() {
  return <SyncRunsClient />;
}
