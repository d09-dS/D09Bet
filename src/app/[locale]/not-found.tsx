"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Home, ArrowLeft } from "lucide-react";

export default function NotFound() {
  const t = useTranslations("notFound");
  const tCommon = useTranslations("common");
  const tNav = useTranslations("nav");

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-4 text-center">
      <div>
        <div className="mb-6 text-9xl font-extrabold text-primary select-none">404</div>
        <h1 className="mb-3 text-2xl font-bold">{t("title")}</h1>
        <p className="mb-10 max-w-md text-muted-foreground">
          {t("description")}
        </p>
        <div className="flex gap-3 justify-center">
          <Link href="/">
            <Button className="gap-2">
              <Home className="h-4 w-4" />
              {tCommon("home")}
            </Button>
          </Link>
          <Link href="/events">
            <Button variant="outline" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              {tNav("events")}
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
