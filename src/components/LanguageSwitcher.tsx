"use client";

import { useLocale } from "next-intl";
import { useRouter, usePathname } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { routing } from "@/i18n/routing";
import { Globe } from "lucide-react";
import { Button } from "@/components/ui/button";

const localeLabels: Record<string, string> = {
  de: "DE",
  en: "EN",
};

export function LanguageSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function switchLocale(next: string) {
    if (next === locale) return;
    const params = searchParams.toString();
    const target = params ? `${pathname}?${params}` : pathname;
    router.replace(target, { locale: next });
  }

  return (
    <div className="flex items-center gap-1">
      <Globe className="h-3.5 w-3.5 text-muted-foreground" />
      {routing.locales.map((l) => (
        <Button
          key={l}
          variant="ghost"
          size="sm"
          onClick={() => switchLocale(l)}
          className={`h-7 px-2 text-xs font-medium ${
            l === locale
              ? "text-primary"
              : "text-muted-foreground hover:text-foreground"
          }`}
          aria-label={`Switch to ${localeLabels[l]}`}
          aria-current={l === locale ? "true" : undefined}
        >
          {localeLabels[l]}
        </Button>
      ))}
    </div>
  );
}
