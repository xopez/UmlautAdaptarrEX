import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { InstancesClient } from "./instances-client";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("instances");
  return { title: t("title") };
}

export default function InstancesPage() {
  return <InstancesClient />;
}
