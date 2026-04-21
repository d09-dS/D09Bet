"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RotateCcw } from "lucide-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("error");

  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      console.error("Page error:", error);
    }
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <div>
        <div className="mb-5 mx-auto flex h-16 w-16 items-center justify-center rounded-lg bg-red-500/10 border border-red-500/20">
          <AlertTriangle className="h-8 w-8 text-red-400" />
        </div>
        <h2 className="mb-2 text-xl font-bold">{t("title")}</h2>
        <p className="mb-8 max-w-md text-sm text-muted-foreground">
          {t("description")}
        </p>
        <Button onClick={reset} className="gap-2">
          <RotateCcw className="h-4 w-4" />
          {t("retry")}
        </Button>
      </div>
    </div>
  );
}
