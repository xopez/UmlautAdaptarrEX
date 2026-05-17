import { getTranslations } from "next-intl/server";
import { Loader2 } from "lucide-react";

export default async function Loading() {
  const t = await getTranslations("boundaries");
  return (
    <main className="container mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-4 py-12 text-center">
      <Loader2
        className="h-6 w-6 animate-spin text-muted-foreground"
        aria-hidden
      />
      <p className="mt-3 text-sm text-muted-foreground">{t("loadingHint")}</p>
    </main>
  );
}
