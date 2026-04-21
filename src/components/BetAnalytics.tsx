"use client";

import { useTranslations, useLocale } from "next-intl";
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend,
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
} from "recharts";

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

interface Transaction {
  id: string;
  type: string;
  amount: number;
  balanceAfter: number;
  createdAt: string;
}

interface BetItem {
  id: string;
  stake: number;
  potentialWin: number;
  status: string;
  createdAt: string;
}

const PIE_COLORS = ["#10B981", "#EF4444", "#3B82F6", "#6B7280"];

export default function BetAnalytics({
  stats,
  transactions,
  bets,
}: {
  stats: BetStats | null;
  transactions: Transaction[];
  bets: BetItem[];
}) {
  const t = useTranslations("profile");
  const tBets = useTranslations("bets");
  const locale = useLocale();

  if (!stats || stats.totalBets === 0) {
    return (
      <div className="rounded-lg border border-border bg-card p-12 text-center">
        <p className="text-muted-foreground text-sm">{tBets("noBets")}</p>
      </div>
    );
  }

  /* Pie data */
  const pieData = [
    { name: tBets("won"), value: stats.wonBets },
    { name: tBets("lost"), value: stats.lostBets },
    { name: tBets("open"), value: stats.pendingBets },
    { name: tBets("void"), value: Math.max(0, stats.totalBets - stats.wonBets - stats.lostBets - stats.pendingBets) },
  ].filter((d) => d.value > 0);

  /* Balance over time from transactions */
  const balanceData = [...transactions]
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    .map((tx) => ({
      date: new Date(tx.createdAt).toLocaleDateString(locale, { day: "2-digit", month: "short" }),
      balance: tx.balanceAfter,
    }));

  /* Daily P&L from bets */
  const dailyPnl = new Map<string, number>();
  for (const bet of bets) {
    if (bet.status !== "WON" && bet.status !== "LOST") continue;
    const day = new Date(bet.createdAt).toLocaleDateString(locale, { day: "2-digit", month: "short" });
    const pnl = bet.status === "WON" ? bet.potentialWin - bet.stake : -bet.stake;
    dailyPnl.set(day, (dailyPnl.get(day) || 0) + pnl);
  }
  const pnlData = [...dailyPnl.entries()].map(([date, value]) => ({ date, pnl: Math.round(value) }));

  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2">
        {/* Bet Distribution Pie */}
        <div className="rounded-lg border border-border bg-card p-5">
          <h3 className="text-sm font-semibold mb-4">{t("totalBets")}</h3>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {pieData.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Key Numbers */}
        <div className="rounded-lg border border-border bg-card p-5 space-y-4">
          <h3 className="text-sm font-semibold mb-2">{t("totalProfit")}</h3>
          <div className="space-y-3">
            {[
              { label: t("totalBets"), value: String(stats.totalBets) },
              { label: t("winRate"), value: `${stats.winRate.toFixed(1)}%` },
              {
                label: t("totalProfit"),
                value: `${stats.profit >= 0 ? "+" : ""}${stats.profit.toFixed(0)}`,
                color: stats.profit >= 0 ? "text-emerald-500" : "text-red-500",
              },
              { label: t("staked"), value: stats.totalStaked.toFixed(0) },
              { label: t("wonAmount"), value: stats.totalWon.toFixed(0) },
            ].map((row) => (
              <div key={row.label} className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{row.label}</span>
                <span className={`font-semibold tabular-nums ${row.color || ""}`}>{row.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Balance History */}
      {balanceData.length > 1 && (
        <div className="rounded-lg border border-border bg-card p-5">
          <h3 className="text-sm font-semibold mb-4">{t("balance")}</h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={balanceData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <defs>
                  <linearGradient id="balFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#97bf0d" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#97bf0d" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Area type="monotone" dataKey="balance" stroke="#97bf0d" fill="url(#balFill)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
