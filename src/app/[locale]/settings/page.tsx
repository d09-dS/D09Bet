"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { useLocale } from "next-intl";
import { api } from "@/lib/api";
import { translateApiError } from "@/lib/translate-api-error";
import { User } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Settings, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function SettingsPage() {
  const t = useTranslations("profile");
  const tCommon = useTranslations("common");
  const tApiErrors = useTranslations("apiErrors");
  const { data: session, status } = useSession();
  const router = useRouter();
  const locale = useLocale();

  const [profile, setProfile] = useState<User | null>(null);
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [selectedLocale, setSelectedLocale] = useState(locale);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (status === "loading") return;
    if (!session?.user?.accessToken) {
      router.push("/login");
      return;
    }
    loadProfile();
  }, [session, status]);

  async function loadProfile() {
    if (!session?.user?.accessToken) return;
    setLoading(true);
    try {
      const data = await api.get<User>("/users/me", session.user.accessToken);
      setProfile(data);
      setBio(data.bio || "");
      setAvatarUrl(data.avatarUrl || "");
      setSelectedLocale(data.locale || locale);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (!session?.user?.accessToken) return;
    setSaving(true);
    try {
      await api.put("/users/me", {
        bio: bio || null,
        avatarUrl: avatarUrl || null,
        locale: selectedLocale,
      }, session.user.accessToken);
      toast.success(t("saved"));

      if (selectedLocale !== locale) {
        router.replace("/settings", { locale: selectedLocale });
      }
    } catch (err) {
      toast.error(translateApiError(err, tApiErrors));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl space-y-6 px-4 py-8">
        <div className="h-8 w-48 bg-secondary rounded-lg animate-shimmer" />
        <div className="h-64 bg-secondary rounded-lg animate-shimmer" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8 px-4 py-8">
      <div>
        <div className="flex items-center gap-3 mb-1">
          <Settings className="h-5 w-5 text-primary" />
          <h1 className="text-2xl font-bold">{t("settings")}</h1>
        </div>
        <p className="text-sm text-muted-foreground">{t("settingsDesc")}</p>
      </div>

      <div className="rounded-lg border border-border bg-card p-6 space-y-5">
        <div className="space-y-2">
          <Label htmlFor="username" className="text-sm font-medium">
            {tCommon("appName")} ID
          </Label>
          <Input
            id="username"
            value={profile?.username || ""}
            disabled
            className="bg-secondary/50"
          />
          <p className="text-xs text-muted-foreground">
            {profile?.email}
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="bio" className="text-sm font-medium">{t("bio")}</Label>
          <textarea
            id="bio"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder={t("bioPlaceholder")}
            rows={3}
            maxLength={200}
            className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
          />
          <p className="text-xs text-muted-foreground text-right">{bio.length}/200</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="avatar" className="text-sm font-medium">{t("avatarUrl")}</Label>
          <Input
            id="avatar"
            value={avatarUrl}
            onChange={(e) => setAvatarUrl(e.target.value)}
            placeholder={t("avatarUrlPlaceholder")}
            type="url"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-medium">{t("language")}</Label>
          <div className="flex gap-2">
            {[
              { value: "de", label: "Deutsch" },
              { value: "en", label: "English" },
            ].map((l) => (
              <button
                key={l.value}
                type="button"
                onClick={() => setSelectedLocale(l.value)}
                className={`px-4 py-2 text-sm font-medium rounded-lg border transition-colors ${
                  selectedLocale === l.value
                    ? "bg-primary/10 border-primary text-primary"
                    : "border-border text-muted-foreground hover:text-foreground hover:border-foreground/30"
                }`}
              >
                {l.label}
              </button>
            ))}
          </div>
        </div>

        <div className="pt-2">
          <Button onClick={handleSave} disabled={saving} className="gap-2">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {t("saveSettings")}
          </Button>
        </div>
      </div>
    </div>
  );
}
