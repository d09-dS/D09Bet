"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { useRouter } from "@/i18n/navigation";
import { useSession } from "next-auth/react";
import { useTranslations, useLocale } from "next-intl";
import { api } from "@/lib/api";
import { BetEvent } from "@/types";
import { useBetSlipStore } from "@/stores/betSlipStore";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Calendar,
  TrendingUp,
  TrendingDown,
  Minus,
  Users,
  Star,
} from "lucide-react";
import OddsChart from "@/components/OddsChart";
import { motion } from "framer-motion";
import { useFavoritesStore } from "@/stores/favoritesStore";
import { useStompClient } from "@/hooks/useStompClient";

const statusColors: Record<string, string> = {
  DRAFT: "bg-gray-500/15 text-gray-400 border-gray-500/20",
  SCHEDULED: "bg-blue-500/15 text-blue-400 border-blue-500/20",
  OPEN: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
  CLOSED: "bg-amber-500/15 text-amber-400 border-amber-500/20",
  SETTLED: "bg-purple-500/15 text-purple-400 border-purple-500/20",
  CANCELED: "bg-red-500/15 text-red-400 border-red-500/20",
};

export default function EventDetailPage() {
  const t = useTranslations("events");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const addItem = useBetSlipStore((s) => s.addItem);
  const { toggleFavorite, isFavorite } = useFavoritesStore();

  const [event, setEvent] = useState<BetEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const { subscribe } = useStompClient();

  useEffect(() => {
    if (params.id) {
      loadEvent(params.id as string);
    }
  }, [params.id]);

  /* Subscribe to live odds updates for each market */
  const handleOddsUpdate = useCallback((marketId: string, data: unknown) => {
    const updates = data as {
      outcomeId: string;
      currentOdds: number;
      totalStaked: number;
    }[];
    setEvent((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        markets: prev.markets.map((m) =>
          m.id === marketId
            ? {
                ...m,
                outcomes: m.outcomes.map((o) => {
                  const upd = updates.find((u) => u.outcomeId === o.id);
                  return upd
                    ? {
                        ...o,
                        currentOdds: upd.currentOdds,
                        totalStaked: upd.totalStaked,
                      }
                    : o;
                }),
              }
            : m,
        ),
      };
    });
  }, []);

  useEffect(() => {
    if (!event?.markets) return;
    const unsubs = event.markets
      .filter((m) => m.status === "OPEN")
      .map((m) =>
        subscribe(`/topic/markets/${m.id}/odds`, (body) =>
          handleOddsUpdate(m.id, body),
        ),
      );
    return () => unsubs.forEach((fn) => fn?.());
  }, [event?.markets?.map((m) => m.id).join(","), subscribe, handleOddsUpdate]);

  async function loadEvent(id: string) {
    setLoading(true);
    try {
      const data = await api.get<BetEvent>(`/events/${id}`);
      setEvent(data);
    } catch {
      setEvent(null);
    } finally {
      setLoading(false);
    }
  }

  function handleSelectOutcome(
    outcomeId: string,
    outcomeName: string,
    odds: number,
    marketName: string,
  ) {
    if (!event) return;
    addItem({
      outcomeId,
      outcomeName,
      odds,
      eventTitle: event.title,
      marketName,
    });
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-secondary rounded-lg animate-shimmer" />
        <div className="h-40 bg-secondary rounded-2xl animate-shimmer" />
        <div className="h-60 bg-secondary rounded-2xl animate-shimmer" />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground text-lg mb-6">{tCommon("error")}</p>
        <Button
          variant="outline"
          onClick={() => router.back()}
          className="rounded-xl"
        >
          <ArrowLeft className="mr-2 h-4 w-4" /> {tCommon("back")}
        </Button>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="space-y-6"
    >
      {/* Back button + title */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.back()}
          className="rounded-xl hover:bg-primary/5"
          aria-label="Go back"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-extrabold md:text-3xl">
              {event.title}
            </h1>
            <Badge className={statusColors[event.status] || ""}>
              {event.status === "OPEN" && (
                <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              )}
              {t(`status.${event.status}`)}
            </Badge>
          </div>
          {event.category && (
            <p className="text-sm text-muted-foreground mt-1">
              {event.category.name}
            </p>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="shrink-0"
          onClick={() => toggleFavorite(event.id)}
          aria-label={
            isFavorite(event.id) ? "Remove from favorites" : "Add to favorites"
          }
        >
          <Star
            className={`h-5 w-5 ${isFavorite(event.id) ? "fill-primary text-primary" : "text-muted-foreground"}`}
          />
        </Button>
      </div>

      {/* Event info card */}
      <div className="rounded-2xl border border-border/50 bg-card/80 p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          {event.description && (
            <p className="text-muted-foreground flex-1 leading-relaxed">
              {event.description}
            </p>
          )}
          <div className="flex gap-4 text-sm text-muted-foreground shrink-0">
            {event.startTime && (
              <span className="flex items-center gap-1.5">
                <Calendar className="h-4 w-4 text-primary" />
                {new Date(event.startTime).toLocaleDateString(locale, {
                  day: "2-digit",
                  month: "long",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            )}
            {event.endTime && (
              <span className="flex items-center gap-1.5">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                {t("endTime")}:{" "}
                {new Date(event.endTime).toLocaleDateString(locale, {
                  day: "2-digit",
                  month: "long",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Markets */}
      {event.markets && event.markets.length > 0 ? (
        <div className="space-y-5">
          {event.markets.map((market, mi) => (
            <motion.div
              key={market.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: mi * 0.1, duration: 0.4 }}
              className="rounded-lg border border-border bg-card overflow-hidden"
            >
              <div className="p-6 space-y-5">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold">{market.name}</h3>
                  <Badge variant="outline" className="text-xs rounded-lg">
                    {market.type}
                  </Badge>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {market.outcomes.map((outcome) => (
                    <button
                      key={outcome.id}
                      disabled={market.status !== "OPEN" || !session}
                      onClick={() =>
                        handleSelectOutcome(
                          outcome.id,
                          outcome.name,
                          outcome.currentOdds,
                          market.name,
                        )
                      }
                      className="odds-btn group flex items-center justify-between rounded-xl border border-border/50 bg-secondary/30 p-4 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <div className="text-left">
                        <p className="font-semibold">{outcome.name}</p>
                        <div className="flex items-center gap-2 mt-1.5 text-xs text-muted-foreground">
                          <Users className="h-3 w-3" />
                          <span>
                            {outcome.totalStaked} {tCommon("tokens")}
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-col items-end">
                        <span className="text-2xl font-extrabold text-primary">
                          {outcome.currentOdds.toFixed(2)}
                        </span>
                        {(() => {
                          const diff =
                            outcome.currentOdds - outcome.initialOdds;
                          const pct =
                            outcome.initialOdds > 0
                              ? (diff / outcome.initialOdds) * 100
                              : 0;
                          if (Math.abs(pct) < 0.5)
                            return (
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <Minus className="h-3 w-3" /> {t("odds")}
                              </span>
                            );
                          return diff > 0 ? (
                            <span className="text-xs text-emerald-400 flex items-center gap-1">
                              <TrendingUp className="h-3 w-3" /> +
                              {pct.toFixed(1)}%
                            </span>
                          ) : (
                            <span className="text-xs text-red-400  flex items-center gap-1">
                              <TrendingDown className="h-3 w-3" />{" "}
                              {pct.toFixed(1)}%
                            </span>
                          );
                        })()}
                      </div>
                    </button>
                  ))}
                </div>
                <OddsChart
                  marketId={market.id}
                  marketName={market.name}
                  outcomes={market.outcomes}
                />
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-border/50 bg-card/50 p-12 text-center">
          <p className="text-muted-foreground">{t("noMarkets")}</p>
        </div>
      )}
    </motion.div>
  );
}
