import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { FileQuestion } from "lucide-react";
import { Button } from "@/components/ui/button";

export default async function NotFound() {
  const t = await getTranslations("boundaries");
  return (
    <main className="container mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-4 py-12 text-center">
      <FileQuestion
        className="mb-4 h-10 w-10 text-muted-foreground"
        aria-hidden
      />
      <h1 className="text-2xl font-semibold tracking-tight">
        {t("notFoundTitle")}
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">{t("notFoundBody")}</p>
      <Button className="mt-6" asChild>
        <Link href="/dashboard">{t("home")}</Link>
      </Button>
    </main>
  );
}
