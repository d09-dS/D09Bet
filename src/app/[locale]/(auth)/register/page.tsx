"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Flame, Loader2, CheckCircle } from "lucide-react";
import { useState } from "react";
import { api, ApiError } from "@/lib/api";

export default function RegisterPage() {
  const t = useTranslations("auth");
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setFieldErrors({});
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const username = formData.get("username") as string;
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    try {
      await api.post("/auth/register", { username, email, password });
      setLoading(false);
      setSuccess(true);
    } catch (err) {
      setLoading(false);
      if (err instanceof ApiError) {
        if (err.fieldErrors) {
          setFieldErrors(err.fieldErrors);
        } else {
          setError(err.message);
        }
      } else if (err instanceof Error) {
        setError(`${t("connectionError", { message: err.message })}`);
      } else {
        setError(t("backendNotReachable"));
      }
    }
  }

  const inputClass = "h-11 rounded-xl bg-secondary/50 border-border/50 focus:border-primary/50 focus:ring-primary/20 transition-all";

  if (success) {
    return (
      <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center px-4">
        <div className="w-full max-w-md">
          <div className="rounded-lg border border-border bg-card p-8 text-center">
            <div className="mb-4 flex justify-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10">
                <CheckCircle className="h-6 w-6 text-emerald-400" />
              </div>
            </div>
            <h1 className="text-2xl font-extrabold mb-2">{t("registerSuccessTitle")}</h1>
            <p className="text-sm text-muted-foreground mb-6">
              {t("registerSuccessDesc")}
            </p>
            <Link href="/login">
              <Button className="w-full h-11">{t("goToLogin")}</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="rounded-lg border border-border bg-card p-8">
          <div className="mb-8 flex flex-col items-center">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
              <Flame className="h-6 w-6 text-primary" />
            </div>
            <h1 className="text-2xl font-extrabold">{t("registerTitle")}</h1>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username" className="text-sm font-medium">{t("username")}</Label>
              <Input id="username" name="username" type="text" required autoComplete="username" placeholder={t("username")} className={inputClass} />
              {fieldErrors.username && <p className="text-xs text-destructive">{fieldErrors.username}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">{t("email")}</Label>
              <Input id="email" name="email" type="email" required autoComplete="email" placeholder={t("email")} className={inputClass} />
              {fieldErrors.email && <p className="text-xs text-destructive">{fieldErrors.email}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium">{t("password")}</Label>
              <Input id="password" name="password" type="password" required minLength={6} autoComplete="new-password" placeholder={t("password")} className={inputClass} />
              {fieldErrors.password && <p className="text-xs text-destructive">{fieldErrors.password}</p>}
            </div>

            {error && (
              <p className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
                {error}
              </p>
            )}

            <Button type="submit" className="w-full h-11" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : t("registerButton")}
            </Button>
          </form>

          <p className="mt-8 text-center text-sm text-muted-foreground">
            {t("hasAccount")}{" "}
            <Link href="/login" className="font-semibold text-primary hover:text-primary/80 transition-colors">
              {t("loginLink")}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
