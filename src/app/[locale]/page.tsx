"use client";

import { useEffect, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useRouter, Link } from "@/i18n/navigation";
import { motion } from "framer-motion";
import { api } from "@/lib/api";
import { BetEvent, LeaderboardEntry } from "@/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Coins,
  Trophy,
  TrendingUp,
  UserPlus,
  Target,
  Zap,
  Calendar,
  ChevronRight,
  Medal,
  Award,
  ArrowRight,
  Shield,
  BarChart3,
  PlusCircle,
} from "lucide-react";

export default function HomePage() {
  const t = useTranslations("home");
  const tNav = useTranslations("nav");
  const tEvents = useTranslations("events");
  const tLb = useTranslations("leaderboard");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const locale = useLocale();

  const [featured, setFeatured] = useState<BetEvent[]>([]);
  const [leaders, setLeaders] = useState<LeaderboardEntry[]>([]);

  useEffect(() => {
    api
      .get<BetEvent[]>("/events/featured")
      .then(setFeatured)
      .catch(() => {});
    api
      .get<LeaderboardEntry[]>("/leaderboard?limit=5")
      .then(setLeaders)
      .catch(() => {});
  }, []);

  function getRankIcon(rank: number) {
    if (rank === 1) return <Trophy className="h-5 w-5 text-yellow-500" />;
    if (rank === 2) return <Medal className="h-5 w-5 text-gray-400" />;
    if (rank === 3) return <Award className="h-5 w-5 text-amber-600" />;
    return (
      <span className="w-5 text-center text-sm font-bold text-muted-foreground">
        {rank}
      </span>
    );
  }

  return (
    <div className="flex flex-col">
      {/* ── Hero ── */}
      <section className="pt-14 pb-4">
        <div className="mx-auto max-w-4xl px-4 text-center">
          <p className="text-sm font-medium text-primary tracking-wide mb-4">
            {t("tagline")}
          </p>
          <h1 className="text-4xl font-bold tracking-tight md:text-6xl lg:text-7xl mb-6">
            {t("hero")}
          </h1>
          <p className="mx-auto max-w-2xl text-lg text-muted-foreground md:text-xl mb-10">
            {t("heroSub")}
          </p>
          <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Link href="/events">
              <Button
                variant="outline"
                size="lg"
                className="gap-2 px-8 h-12 text-sm font-semibold"
              >
                {tNav("events")}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>

          <div className="mt-16 grid grid-cols-3 gap-8 max-w-md mx-auto">
            {[
              { value: "1.000", label: t("statsStartTokens") },
              { value: "2", label: t("statsDailyBonus") },
              { value: "2", label: t("statsRoles") },
            ].map((stat, i) => (
              <div key={i} className="text-center">
                <div className="text-2xl md:text-3xl font-bold text-primary">
                  {stat.value}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="pt-14 pb-4 border-t border-border/50 overflow-hidden">
        <div className="mx-auto max-w-5xl px-4">
          <motion.div
            className="text-center mb-14"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.5 }}
          >
            <p className="text-sm font-medium text-primary tracking-wide mb-2">
              {t("howItWorksSub")}
            </p>
            <h2 className="text-2xl font-bold md:text-4xl">
              {t("howItWorks")}
            </h2>
          </motion.div>

          <div className="grid gap-6 md:grid-cols-2">
            {[
              { icon: UserPlus, title: t("step1Title"), desc: t("step1Desc") },
              { icon: Target, title: t("step2Title"), desc: t("step2Desc") },
              { icon: PlusCircle, title: t("step3Title"), desc: t("step3Desc") },
              { icon: TrendingUp, title: t("step4Title"), desc: t("step4Desc") },
            ].map((step, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.45, delay: i * 0.1 }}
                className="group rounded-xl border border-border bg-card p-6 hover:border-primary/30 transition-colors"
              >
                <div className="flex items-center gap-4 mb-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <step.icon className="h-5 w-5 text-primary" />
                  </div>
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-xs font-bold text-muted-foreground">
                    {i + 1}
                  </span>
                </div>
                <h3 className="font-semibold mb-2 group-hover:text-primary transition-colors">
                  {step.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {step.desc}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Featured Events ── */}
      <section className="pt-14 pb-4 border-t border-border/50">
        <div className="mx-auto max-w-5xl px-4">
          <div className="flex items-end justify-between mb-10">
            <div>
              <p className="text-sm font-medium text-muted-foreground tracking-wide mb-2">
                {t("liveUpcoming")}
              </p>
              <h2 className="text-2xl font-bold md:text-4xl">
                {t("featuredEvents")}
              </h2>
            </div>
            <Link href="/events">
              <Button
                variant="ghost"
                size="sm"
                className="gap-1 text-muted-foreground hover:text-foreground"
              >
                {t("allEvents")} <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {(featured.length > 0
              ? featured.slice(0, 3)
              : [null, null, null]
            ).map((event, i) => (
              <div
                key={event?.id || i}
                onClick={() => event && router.push(`/events/${event.id}`)}
                className={`group rounded-lg border border-border bg-card p-5 card-hover ${event ? "cursor-pointer" : ""}`}
              >
                {event ? (
                  <>
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <h3 className="font-semibold leading-snug group-hover:text-primary transition-colors">
                        {event.title}
                      </h3>
                      <Badge variant="outline" className="shrink-0 text-xs">
                        {tEvents(`status.${event.status}`)}
                      </Badge>
                    </div>
                    {event.category && (
                      <p className="text-xs text-muted-foreground mb-3">
                        {event.category.name}
                      </p>
                    )}
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <div className="flex flex-col gap-0.5">
                        {event.startTime && (
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {new Date(event.startTime).toLocaleDateString(
                              locale,
                              {
                                day: "2-digit",
                                month: "short",
                                hour: "2-digit",
                                minute: "2-digit",
                              },
                            )}
                          </span>
                        )}
                        {event.endTime && (
                          <span className="flex items-center gap-1 text-muted-foreground/70">
                            <Calendar className="h-3 w-3" />
                            {t("until")}{" "}
                            {new Date(event.endTime).toLocaleDateString(
                              locale,
                              {
                                day: "2-digit",
                                month: "short",
                                hour: "2-digit",
                                minute: "2-digit",
                              },
                            )}
                          </span>
                        )}
                      </div>
                      <ChevronRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </>
                ) : (
                  <div className="space-y-3">
                    <div className="h-4 w-3/4 rounded bg-secondary animate-shimmer" />
                    <div className="h-3 w-1/2 rounded bg-secondary animate-shimmer" />
                    <div className="h-3 w-1/3 rounded bg-secondary animate-shimmer" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="pt-14 pb-4 border-t border-border/50">
        <div className="mx-auto max-w-5xl px-4">
          <div className="text-center mb-14">
            <p className="text-sm font-medium text-muted-foreground tracking-wide mb-2">
              {t("whyDotbet")}
            </p>
            <h2 className="text-2xl font-bold md:text-4xl">
              {t("allYouNeed")}
            </h2>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                icon: BarChart3,
                title: t("featLiveOddsTitle"),
                desc: t("featLiveOddsDesc"),
              },
              {
                icon: Coins,
                title: t("featTokenTitle"),
                desc: t("featTokenDesc"),
              },
              {
                icon: Shield,
                title: t("featSecureTitle"),
                desc: t("featSecureDesc"),
              },
              {
                icon: Zap,
                title: t("featRealtimeTitle"),
                desc: t("featRealtimeDesc"),
              },
            ].map((feat, i) => (
              <div
                key={i}
                className="rounded-lg border border-border bg-card p-5"
              >
                <div className="mb-3">
                  <feat.icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-semibold text-sm mb-1">{feat.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {feat.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Leaderboard Preview ── */}
      <section className="pt-14 pb-4 border-t border-border/50">
        <div className="mx-auto max-w-3xl px-4">
          <div className="flex items-end justify-between mb-8">
            <div>
              <p className="text-sm font-medium text-muted-foreground tracking-wide mb-2">
                {t("ranking")}
              </p>
              <h2 className="text-2xl font-bold md:text-4xl">
                {t("topLeaderboard")}
              </h2>
            </div>
            <Link href="/leaderboard">
              <Button
                variant="ghost"
                size="sm"
                className="gap-1 text-muted-foreground hover:text-foreground"
              >
                {tCommon("all")} <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>

          <div className="rounded-lg border border-border bg-card overflow-hidden">
            {leaders.length > 0 ? (
              leaders.map((entry) => (
                <div
                  key={entry.userId}
                  className="flex items-center justify-between px-5 py-4 border-b border-border last:border-b-0 hover:bg-secondary/50 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex items-center justify-center w-7 shrink-0">
                      {getRankIcon(entry.rank)}
                    </div>
                    <span className="font-medium truncate">
                      {entry.username}
                    </span>
                  </div>
                  <div className="flex items-center gap-6 text-sm shrink-0">
                    <span className="text-muted-foreground hidden sm:inline">
                      {entry.totalBets} {tLb("bets")}
                    </span>
                    <span
                      className={`font-semibold tabular-nums ${entry.profit >= 0 ? "text-emerald-500" : "text-red-500"}`}
                    >
                      {entry.profit >= 0 ? "+" : ""}
                      {entry.profit.toFixed(0)}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-12 text-center text-muted-foreground text-sm">
                {t("noPlayersYet")}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-16 border-t border-border/50">
        <div className="mx-auto max-w-2xl px-4 text-center">
          <h2 className="text-2xl font-bold md:text-4xl mb-3">
            {t("readyToBet")}
          </h2>
          <p className="text-muted-foreground mb-8 max-w-lg mx-auto">
            {t("ctaDesc")}
          </p>
          <Link href="/register">
            <Button size="lg" className="gap-2 px-10 h-12 font-semibold">
              {t("startNow")}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
