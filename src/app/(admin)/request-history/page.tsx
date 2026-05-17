import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { RequestHistoryClient } from "./request-history-client";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("history.request");
  return { title: t("title") };
}

export default function RequestHistoryPage() {
  return <RequestHistoryClient />;
}
