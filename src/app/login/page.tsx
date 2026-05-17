import { Suspense } from "react";
import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { LocaleToggle } from "@/components/locale-toggle";
import { ThemeToggle } from "@/components/theme-toggle";
import { BrandMark } from "@/components/brand-mark";
import { DEFAULT_LOCALE, isSupportedLocale } from "@/lib/i18n-config";
import { LoginForm, LoginFormSkeleton } from "./login-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("login");
  return { title: t("title") };
}

export default async function LoginPage() {
  const t = await getTranslations("login");
  const locale = await getLocale();
  const safeLocale = isSupportedLocale(locale) ? locale : DEFAULT_LOCALE;

  return (
    <main className="container mx-auto flex min-h-screen max-w-md flex-col items-stretch justify-center px-4 py-12">
      <div className="mb-8 flex flex-col items-center gap-3">
        <div className="absolute right-4 top-4 flex items-center gap-1">
          <ThemeToggle />
          <LocaleToggle current={safeLocale} />
        </div>
        <BrandMark variant="mark" height={88} priority />
        <BrandMark variant="wordmark" height={20} className="opacity-80" />
      </div>
      <Card className="w-full">
        <CardHeader>
          <CardTitle>{t("title")}</CardTitle>
          <CardDescription>{t("subtitle")}</CardDescription>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<LoginFormSkeleton />}>
            <LoginForm />
          </Suspense>
        </CardContent>
      </Card>
    </main>
  );
}
