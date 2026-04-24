"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { api } from "@/lib/api";
import { BetEvent, Category } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { DateTimeInput } from "@/components/ui/date-time-input";
import { toast } from "sonner";
import { Plus, Loader2, XCircle, PlusCircle } from "lucide-react";

const inputClass = "h-11 rounded-xl bg-secondary/50 border-border/50 focus:border-primary/50 focus:ring-primary/20 transition-all [&:not(:placeholder-shown)]:bg-white [&:not(:placeholder-shown)]:text-[#0A0E13] [&:not(:placeholder-shown)]:border-white/30";

export default function CreateBetPage() {
  const tAdmin = useTranslations("admin");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const { data: session, status } = useSession();
  const router = useRouter();

  const [categories, setCategories] = useState<Category[]>([]);
  const [newEvent, setNewEvent] = useState({
    title: "",
    titleEn: "",
    description: "",
    descriptionEn: "",
    endTime: "",
    categoryId: "",
  });
  const [newOutcomes, setNewOutcomes] = useState([
    { name: "", odds: "2.00" },
    { name: "", odds: "2.00" },
  ]);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (status === "loading") return;
    if (!session?.user?.accessToken) {
      router.push("/login");
      return;
    }
    api
      .get<Category[]>("/events/categories")
      .then(setCategories)
      .catch(() => {});
  }, [session, status, router]);

  const tok = session?.user?.accessToken || "";

  async function handleCreate() {
    if (!tok || !newEvent.title) return;
    if (!newEvent.endTime) {
      toast.error(tAdmin("endRequired"));
      return;
    }
    if (newOutcomes.some((o) => !o.name)) {
      toast.error(tAdmin("fillAllOutcomes"));
      return;
    }
    setCreating(true);
    try {
      const created = await api.post<BetEvent>(
        "/events",
        {
          title: newEvent.title,
          titleEn: newEvent.titleEn || undefined,
          description: newEvent.description || undefined,
          descriptionEn: newEvent.descriptionEn || undefined,
          categoryId: newEvent.categoryId
            ? Number(newEvent.categoryId)
            : undefined,
          endTime: new Date(newEvent.endTime).toISOString(),
        },
        tok,
      );
      if (newOutcomes.length >= 2 && newOutcomes.every((o) => o.name)) {
        await api.post(
          `/events/${created.id}/markets`,
          {
            name: newEvent.title,
            nameEn: newEvent.titleEn || undefined,
            type: "CUSTOM",
            marginFactor: 0.95,
            virtualPool: 100,
            outcomes: newOutcomes.map((o, i) => ({
              name: o.name,
              initialOdds: parseFloat(o.odds) || 2.0,
              sortOrder: i,
            })),
          },
          tok,
        );
      }
      if (session?.user?.role === "ADMIN") {
        toast.success(tAdmin("eventCreated"));
        router.push("/admin");
      } else {
        toast.success(tAdmin("eventCreatedUser"));
        router.push("/events");
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : tCommon("error"));
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <div className="flex items-center gap-3 mb-6">
        <PlusCircle className="h-6 w-6 text-primary" />
        <h1 className="text-3xl font-bold">{tAdmin("createNewBet")}</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{tAdmin("createNewBet")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Category selection */}
          {categories.length > 0 && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">{tAdmin("marketCategory")} *</Label>
              <select
                className="h-11 w-full rounded-xl bg-secondary/50 border border-border/50 px-3 py-2 text-sm focus:border-primary/50 focus:ring-primary/20 transition-all"
                value={newEvent.categoryId}
                onChange={(e) =>
                  setNewEvent({ ...newEvent, categoryId: e.target.value })
                }
              >
                <option value="">{tAdmin("selectMarket")}</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Event details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">{tAdmin("betTitleDe")} *</Label>
              <Input
                value={newEvent.title}
                onChange={(e) =>
                  setNewEvent({ ...newEvent, title: e.target.value })
                }
                placeholder={tAdmin("betTitleDePlaceholder")}
                className={inputClass}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">{tAdmin("betTitleEn")}</Label>
              <Input
                value={newEvent.titleEn}
                onChange={(e) =>
                  setNewEvent({ ...newEvent, titleEn: e.target.value })
                }
                placeholder={tAdmin("betTitleEn")}
                className={inputClass}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">{tAdmin("descriptionDe")}</Label>
              <Input
                value={newEvent.description}
                onChange={(e) =>
                  setNewEvent({ ...newEvent, description: e.target.value })
                }
                placeholder={tAdmin("descriptionDe")}
                className={inputClass}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">{tAdmin("descriptionEn")}</Label>
              <Input
                value={newEvent.descriptionEn}
                onChange={(e) =>
                  setNewEvent({ ...newEvent, descriptionEn: e.target.value })
                }
                placeholder={tAdmin("descriptionEn")}
                className={inputClass}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">{tAdmin("endTime")} *</Label>
              <DateTimeInput
                required
                value={newEvent.endTime}
                onChange={(e) =>
                  setNewEvent({ ...newEvent, endTime: e.target.value })
                }
              />
            </div>
          </div>

          <Separator />

          {/* Outcomes with odds */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">{tAdmin("outcomesAndOdds")}</Label>
            <p className="text-xs text-muted-foreground">
              {tAdmin("oddsMultiplierHint")}
            </p>
            {newOutcomes.map((row, i) => (
              <div key={i} className="flex gap-2 items-center">
                <Input
                  placeholder={
                    tAdmin("outcomePlaceholder", { number: i + 1 }) + " *"
                  }
                  value={row.name}
                  onChange={(e) => {
                    const copy = [...newOutcomes];
                    copy[i] = { ...copy[i], name: e.target.value };
                    setNewOutcomes(copy);
                  }}
                  className={`flex-1 ${inputClass}`}
                />
                <div className="flex items-center gap-1">
                  <Input
                    placeholder={tAdmin("oddsLabel")}
                    value={row.odds}
                    onChange={(e) => {
                      const copy = [...newOutcomes];
                      copy[i] = { ...copy[i], odds: e.target.value };
                      setNewOutcomes(copy);
                    }}
                    className={`w-24 ${inputClass}`}
                  />
                </div>
                {newOutcomes.length > 2 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0"
                    onClick={() =>
                      setNewOutcomes(newOutcomes.filter((_, j) => j !== i))
                    }
                  >
                    <XCircle className="h-4 w-4 text-red-400" />
                  </Button>
                )}
              </div>
            ))}
            <Button
              variant="ghost"
              size="sm"
              onClick={() =>
                setNewOutcomes([...newOutcomes, { name: "", odds: "2.00" }])
              }
            >
              <Plus className="mr-1 h-3 w-3" /> {tAdmin("addOutcome")}
            </Button>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={handleCreate}
              disabled={
                !newEvent.title ||
                !newEvent.endTime ||
                newOutcomes.some((o) => !o.name) ||
                creating
              }
            >
              {creating ? (
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
              ) : (
                <Plus className="mr-1 h-4 w-4" />
              )}
              {tAdmin("createBet")}
            </Button>
            <Button variant="outline" onClick={() => router.back()}>
              {tCommon("cancel")}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
