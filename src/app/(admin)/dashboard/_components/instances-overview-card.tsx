"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { ArrowRight, Database } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { Instance } from "../_lib/dashboard-types";
import { InstanceCard } from "./instance-card";

interface InstancesOverviewCardProps {
  instances: Instance[] | undefined;
  loading: boolean;
}

export function InstancesOverviewCard({
  instances,
  loading,
}: InstancesOverviewCardProps) {
  const t = useTranslations("dashboard");

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 border-b">
        <div className="space-y-1">
          <CardTitle className="text-base">{t("instancesTitle")}</CardTitle>
          <CardDescription>{t("instancesSubtitle")}</CardDescription>
        </div>
        <Button asChild variant="ghost" size="sm">
          <Link href="/instances">
            {t("manageInstances")}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent className="pt-6">
        {loading ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        ) : !instances || instances.length === 0 ? (
          <div className="rounded-md border border-dashed p-8 text-center">
            <Database className="mx-auto h-6 w-6 text-muted-foreground" />
            <p className="mt-3 text-sm font-medium">{t("noInstancesTitle")}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {t("noInstancesHint")}
            </p>
            <Button asChild className="mt-4" size="sm">
              <Link href="/instances">{t("addInstance")}</Link>
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {instances.map((inst) => (
              <InstanceCard key={inst.id} instance={inst} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
