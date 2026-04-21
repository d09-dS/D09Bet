"use client";

import { useTranslations } from "next-intl";
import { signIn } from "next-auth/react";
import { Link } from "@/i18n/navigation";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Flame, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function LoginPage() {
  const t = useTranslations("auth");
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const username = formData.get("username") as string;
    const password = formData.get("password") as string;

    // First check credentials via API (gives detailed error messages)
    try {
      const checkRes = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      if (!checkRes.ok) {
        const data = await checkRes.json();
        setLoading(false);
        setError(data.error || t("invalidCredentials"));
        return;
      }
    } catch {
      setLoading(false);
      setError(t("invalidCredentials"));
      return;
    }

    // Credentials valid → create NextAuth session
    const result = await signIn("credentials", {
      username,
      password,
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      setError(t("invalidCredentials"));
    } else {
      const res = await fetch("/api/auth/session");
      const session = await res.json();
      if (session?.user?.bonusAwarded && session.user.bonusAwarded > 0) {
        toast.success(t("dailyBonusToast", { amount: session.user.bonusAwarded }));
      }
      router.push("/events");
    }
  }

  return (
    <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="rounded-lg border border-border bg-card p-8">
          <div className="mb-8 flex flex-col items-center">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
              <Flame className="h-6 w-6 text-primary" />
            </div>
            <h1 className="text-2xl font-extrabold">{t("loginTitle")}</h1>
            <p className="text-sm text-muted-foreground mt-1">{t("welcomeBack")}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="username" className="text-sm font-medium">{t("username")}</Label>
              <Input
                id="username"
                name="username"
                type="text"
                required
                autoComplete="username"
                placeholder={t("username")}
                className="h-11 rounded-xl bg-secondary/50 border-border/50 focus:border-primary/50 focus:ring-primary/20 transition-all"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium">{t("password")}</Label>
              <Input
                id="password"
                name="password"
                type="password"
                required
                autoComplete="current-password"
                placeholder={t("password")}
                className="h-11 rounded-xl bg-secondary/50 border-border/50 focus:border-primary/50 focus:ring-primary/20 transition-all"
              />
            </div>

            {error && (
              <p className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
                {error}
              </p>
            )}

            <Button type="submit" className="w-full h-11" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : t("loginButton")}
            </Button>
          </form>

          <p className="mt-8 text-center text-sm text-muted-foreground">
            {t("noAccount")}{" "}
            <Link href="/register" className="font-semibold text-primary hover:text-primary/80 transition-colors">
              {t("registerLink")}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
