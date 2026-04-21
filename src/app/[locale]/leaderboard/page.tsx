"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { api } from "@/lib/api";
import { LeaderboardEntry } from "@/types";
import { Trophy, Medal, Award } from "lucide-react";
import { motion } from "framer-motion";

export default function LeaderboardPage() {
  const t = useTranslations("leaderboard");
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const data = await api.get<LeaderboardEntry[]>("/leaderboard?limit=50");
        setEntries(data);
      } catch {
        setEntries([]);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  function getRankIcon(rank: number) {
    if (rank === 1) return <Trophy className="h-5 w-5 text-yellow-500" />;
    if (rank === 2) return <Medal className="h-5 w-5 text-gray-400" />;
    if (rank === 3) return <Award className="h-5 w-5 text-amber-600" />;
    return <span className="w-5 text-center text-sm font-bold text-muted-foreground">{rank}</span>;
  }

  return (
    <div className="mx-auto max-w-4xl space-y-8 px-4 py-8">
      <div>
        <p className="text-sm font-medium text-muted-foreground tracking-wide mb-2">{t("ranking")}</p>
        <h1 className="text-3xl font-extrabold md:text-4xl">{t("title")}</h1>
      </div>

      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <div className="p-6">
          <div className="flex items-center gap-2 mb-6">
            <Trophy className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-bold">{t("allTime")}</h2>
          </div>

          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 py-3">
                  <div className="h-5 w-5 bg-secondary rounded-lg animate-shimmer" />
                  <div className="h-4 w-32 bg-secondary rounded-lg animate-shimmer" />
                  <div className="ml-auto h-4 w-20 bg-secondary rounded-lg animate-shimmer" />
                </div>
              ))}
            </div>
          ) : entries.length === 0 ? (
            <p className="text-center text-muted-foreground py-12">{t("noEntries")}</p>
          ) : (
            <div className="space-y-0.5">
              {/* Header */}
              <div className="grid grid-cols-12 gap-2 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <div className="col-span-1">{t("rank")}</div>
                <div className="col-span-5">{t("player")}</div>
                <div className="col-span-2 text-right">{t("profit")}</div>
                <div className="col-span-2 text-right">{t("bets")}</div>
                <div className="col-span-2 text-right">{t("winPercent")}</div>
              </div>

              {entries.map((entry, i) => (
                <motion.div
                  key={entry.userId}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.03, duration: 0.3 }}
                  className={`grid grid-cols-12 gap-2 items-center rounded-xl px-4 py-3.5 transition-colors hover:bg-primary/[0.03] ${
                    entry.rank === 1 ? "bg-gradient-to-r from-yellow-500/[0.06] to-transparent" :
                    entry.rank === 2 ? "bg-gradient-to-r from-gray-400/[0.04] to-transparent" :
                    entry.rank === 3 ? "bg-gradient-to-r from-amber-500/[0.04] to-transparent" : ""
                  }`}
                >
                  <div className="col-span-1 flex items-center justify-center">
                    {getRankIcon(entry.rank)}
                  </div>
                  <div className="col-span-5 font-semibold truncate">
                    {entry.username}
                  </div>
                  <div className={`col-span-2 text-right font-bold ${
                    entry.profit >= 0 ? "text-emerald-400" : "text-red-400"
                  }`}>
                    {entry.profit >= 0 ? "+" : ""}{entry.profit.toFixed(0)}
                  </div>
                  <div className="col-span-2 text-right text-muted-foreground">
                    {entry.totalBets}
                  </div>
                  <div className="col-span-2 text-right text-muted-foreground">
                    {entry.winRate.toFixed(1)}%
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
