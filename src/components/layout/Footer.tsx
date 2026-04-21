"use client";

import { useTranslations } from "next-intl";

export function Footer() {
  const t = useTranslations("metadata");

  return (
    <footer className="border-t border-border bg-card py-6">
      <div className="mx-auto max-w-7xl px-4 text-center text-sm text-muted-foreground">
        &copy; {new Date().getFullYear()} dotBet. {t("footerText")}
      </div>
    </footer>
  );
}
