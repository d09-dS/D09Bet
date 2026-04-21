"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { api } from "@/lib/api";
import { User, TokenTransaction, PageResponse } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Coins, TrendingUp, BarChart3, History, ArrowUpRight, ArrowDownRight, PieChart } from "lucide-react";
import { motion } from "framer-motion";
import BetAnalytics from "@/components/BetAnalytics";

interface BetResponse {
  id: string;
  eventTitle: string;
  marketName: string;
  outcomeName: string;
  stake: number;
  oddsAtPlacement: number;
  potentialWin: number;
  status: string;
  settledAt?: string;
  createdAt: string;
}

interface BetStats {
  totalBets: number;
  wonBets: number;
  lostBets: number;
  pendingBets: number;
  totalStaked: number;
  totalWon: number;
  profit: number;
  winRate: number;
}

const betStatusColors: Record<string, string> = {
  PENDING: "bg-blue-500/15 text-blue-400 border-blue-500/20",
  WON: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
  LOST: "bg-red-500/15 text-red-400 border-red-500/20",
  VOID: "bg-gray-500/15 text-gray-400 border-gray-500/20",
};

export default function ProfilePage() {
  const t = useTranslations("profile");
  const tBets = useTranslations("bets");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const { data: session, status } = useSession();
  const router = useRouter();

  const [profile, setProfile] = useState<User | null>(null);
  const [stats, setStats] = useState<BetStats | null>(null);
  const [bets, setBets] = useState<BetResponse[]>([]);
  const [transactions, setTransactions] = useState<TokenTransaction[]>([]);
  const [activeTab, setActiveTab] = useState<"bets" | "analytics" | "transactions">("bets");
  const [betFilter, setBetFilter] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

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
    const token = session.user.accessToken;
    setLoading(true);
    try {
      const [profileData, statsData, betsData, txData] = await Promise.all([
        api.get<User>("/users/me", token),
        api.get<BetStats>("/bets/my/stats", token),
        api.get<PageResponse<BetResponse>>("/bets/my?size=20", token),
        api.get<PageResponse<TokenTransaction>>("/users/me/transactions?size=20", token),
      ]);
      setProfile(profileData);
      setStats(statsData);
      setBets(betsData.content);
      setTransactions(txData.content);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl space-y-6 px-4 py-8">
        <div className="h-8 w-48 bg-secondary rounded-lg animate-shimmer" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 bg-secondary rounded-2xl animate-shimmer" />
          ))}
        </div>
      </div>
    );
  }

  const statCards = [
    { icon: Coins, label: t("balance"), value: profile?.tokenBalance?.toFixed(0) || "0", color: "text-primary" },
    { icon: BarChart3, label: t("totalBets"), value: String(stats?.totalBets || 0), color: "text-foreground" },
    { icon: TrendingUp, label: t("winRate"), value: `${stats?.winRate?.toFixed(1) || 0}%`, color: "text-foreground" },
    { icon: History, label: t("totalProfit"), value: `${(stats?.profit || 0) >= 0 ? "+" : ""}${stats?.profit?.toFixed(0) || 0}`, color: (stats?.profit || 0) >= 0 ? "text-emerald-400" : "text-red-400" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="mx-auto max-w-4xl space-y-8 px-4 py-8"
    >
      <div>
        <p className="text-sm font-semibold text-primary uppercase tracking-widest mb-1">{t("dashboard")}</p>
        <h1 className="text-3xl font-extrabold md:text-4xl">{t("title")}</h1>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08, duration: 0.4 }}
            className="rounded-2xl border border-border/50 bg-card/80 p-5"
          >
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-2">
              <stat.icon className="h-4 w-4" /> {stat.label}
            </div>
            <p className={`text-2xl font-extrabold ${stat.color}`}>{stat.value}</p>
          </motion.div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border/30">
        <button
          onClick={() => setActiveTab("bets")}
          className={`px-5 py-2.5 text-sm font-semibold border-b-2 transition-colors rounded-t-lg ${
            activeTab === "bets"
              ? "border-primary text-primary bg-primary/5"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          {tBets("title")}
        </button>
        <button
          onClick={() => setActiveTab("analytics")}
          className={`flex items-center gap-1.5 px-5 py-2.5 text-sm font-semibold border-b-2 transition-colors rounded-t-lg ${
            activeTab === "analytics"
              ? "border-primary text-primary bg-primary/5"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <PieChart className="h-3.5 w-3.5" />
          {t("analytics")}
        </button>
        <button
          onClick={() => setActiveTab("transactions")}
          className={`px-5 py-2.5 text-sm font-semibold border-b-2 transition-colors rounded-t-lg ${
            activeTab === "transactions"
              ? "border-primary text-primary bg-primary/5"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          {t("transactions")}
        </button>
      </div>

      {/* Analytics tab */}
      {activeTab === "analytics" && (
        <BetAnalytics stats={stats} transactions={transactions} bets={bets} />
      )}

      {/* Bets tab */}
      {activeTab === "bets" && (
        <div className="space-y-3">
          {/* Status filter */}
          <div className="flex gap-1.5 flex-wrap">
            {[
              { key: null, label: tCommon("all") },
              { key: "PENDING", label: tBets("open") },
              { key: "WON", label: tBets("won") },
              { key: "LOST", label: tBets("lost") },
            ].map((f) => (
              <button
                key={f.key ?? "all"}
                onClick={() => setBetFilter(f.key)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                  betFilter === f.key
                    ? "bg-primary/10 border-primary text-primary"
                    : "border-border text-muted-foreground hover:text-foreground hover:border-foreground/30"
                }`}
              >
                {f.label}
                {f.key && (
                  <span className="ml-1 text-muted-foreground">
                    {bets.filter((b) => b.status === f.key).length}
                  </span>
                )}
              </button>
            ))}
          </div>

          {(() => {
            const filtered = betFilter ? bets.filter((b) => b.status === betFilter) : bets;
            return filtered.length === 0 ? (
              <div className="rounded-lg border border-border bg-card p-12 text-center">
                <p className="text-muted-foreground">{tBets("noBets")}</p>
              </div>
            ) : (
              filtered.map((bet, i) => (
              <motion.div
                key={bet.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.03, duration: 0.3 }}
                className="rounded-xl border border-border/50 bg-card/80 px-5 py-4 flex items-center justify-between"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">{bet.eventTitle}</p>
                  <p className="text-sm text-muted-foreground">
                    {bet.marketName} &middot; {bet.outcomeName}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(bet.createdAt).toLocaleDateString(locale, {
                      day: "2-digit", month: "short", year: "numeric",
                      hour: "2-digit", minute: "2-digit",
                    })}
                  </p>
                </div>
                <div className="text-right shrink-0 ml-4">
                  <Badge className={betStatusColors[bet.status] || ""}>{bet.status}</Badge>
                  <p className="text-sm mt-1">
                    <span className="text-muted-foreground">{bet.stake}</span>
                    <span className="mx-1 text-muted-foreground/50">×</span>
                    <span className="text-primary font-bold">{bet.oddsAtPlacement.toFixed(2)}</span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    → {bet.potentialWin.toFixed(1)} {tCommon("tokens")}
                  </p>
                </div>
              </motion.div>
            ))
          );
          })()}
        </div>
      )}

      {/* Transactions tab */}
      {activeTab === "transactions" && (
        <div className="space-y-2">
          {transactions.length === 0 ? (
            <div className="rounded-2xl border border-border/50 bg-card/50 p-12 text-center">
              <p className="text-muted-foreground">{t("noTransactions")}</p>
            </div>
          ) : (
            transactions.map((tx, i) => (
              <motion.div
                key={tx.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.03, duration: 0.3 }}
                className="rounded-xl border border-border/50 bg-card/80 px-5 py-4 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  {tx.amount >= 0 ? (
                    <div className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                      <ArrowUpRight className="h-4 w-4 text-emerald-400" />
                    </div>
                  ) : (
                    <div className="h-8 w-8 rounded-lg bg-red-500/10 flex items-center justify-center">
                      <ArrowDownRight className="h-4 w-4 text-red-400" />
                    </div>
                  )}
                  <div>
                    <p className="font-medium text-sm">{tx.type.replace(/_/g, " ")}</p>
                    {tx.description && (
                      <p className="text-xs text-muted-foreground">{tx.description}</p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {new Date(tx.createdAt).toLocaleDateString(locale, {
                        day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`font-bold ${tx.amount >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                    {tx.amount >= 0 ? "+" : ""}{tx.amount.toFixed(0)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t("balanceLabel")}: {tx.balanceAfter.toFixed(0)}
                  </p>
                </div>
              </motion.div>
            ))
          )}
        </div>
      )}
    </motion.div>
  );
}
