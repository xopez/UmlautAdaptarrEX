import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { LogsClient } from "./logs-client";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("logs");
  return { title: t("title") };
}

export default function LogsPage() {
  return <LogsClient />;
}
