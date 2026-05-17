import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { RenameHistoryClient } from "./rename-history-client";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("history.rename");
  return { title: t("title") };
}

export default function RenameHistoryPage() {
  return <RenameHistoryClient />;
}
