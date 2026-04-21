"use client";

import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { useTranslations, useLocale } from "next-intl";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp } from "lucide-react";
import {
  ComposedChart, Line, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from "recharts";

interface OddsHistoryEntry {
  outcomeId: string;
  outcomeName: string;
  oldOdds: number;
  newOdds: number;
  changedAt: string;
}

interface ChartPoint {
  time: string;
  timestamp: number;
  [outcomeName: string]: string | number;
}

interface OutcomeInfo {
  name: string;
  initialOdds: number;
  currentOdds: number;
}

const COLORS = ["#5ce0d2", "#e84e8a", "#f59e0b", "#8b5cf6", "#10b981", "#ef4444", "#3b82f6", "#ec4899"];

/* ── Custom single-series Tooltip ─────────────────────────── */
function SingleSeriesTooltip({
  active,
  payload,
  label,
  hoveredSeries,
}: {
  active?: boolean;
  payload?: Array<{ dataKey?: string; name?: string; value?: number; stroke?: string; color?: string }>;
  label?: string;
  hoveredSeries: string | null;
}) {
  if (!active || !payload?.length) return null;

  // Deduplicate Area + Line entries sharing the same dataKey
  const seen = new Set<string>();
  const unique = payload.filter((p) => {
    const key = String(p.dataKey ?? "");
    if (seen.has(key) || p.value == null) return false;
    seen.add(key);
    return true;
  });
  if (unique.length === 0) return null;

  const items = hoveredSeries ? unique.filter((p) => p.dataKey === hoveredSeries) : unique;
  const display = items.length > 0 ? items : unique.slice(0, 1);

  return (
    <div
      style={{
        backgroundColor: "hsl(var(--card))",
        border: "1px solid hsl(var(--border))",
        borderRadius: 8,
        padding: "8px 12px",
        fontSize: 12,
      }}
    >
      <p style={{ color: "hsl(var(--muted-foreground))", marginBottom: 4 }}>{label}</p>
      {display.map((entry) => (
        <div
          key={String(entry.dataKey)}
          style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2, color: entry.stroke || entry.color }}
        >
          <span
            style={{
              width: 8, height: 8, borderRadius: "50%", flexShrink: 0,
              backgroundColor: entry.stroke || entry.color,
            }}
          />
          <span>{entry.name}:</span>
          <span style={{ fontWeight: 600 }}>{Number(entry.value).toFixed(2)}x</span>
        </div>
      ))}
    </div>
  );
}

/* ── Main component ───────────────────────────────────────── */
export default function OddsChart({
  marketId,
  marketName,
  outcomes,
}: {
  marketId: string;
  marketName: string;
  outcomes?: OutcomeInfo[];
}) {
  const t = useTranslations("odds");
  const locale = useLocale();
  const [data, setData] = useState<ChartPoint[]>([]);
  const [outcomeNames, setOutcomeNames] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [hoveredSeries, setHoveredSeries] = useState<string | null>(null);

  const outcomesRef = useRef(outcomes);
  outcomesRef.current = outcomes;
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const hoveredRef = useRef<string | null>(null);

  /* Y-value range for cursor-proximity calculation */
  const { yMin, yMax } = useMemo(() => {
    let min = Infinity;
    let max = -Infinity;
    for (const pt of data) {
      for (const name of outcomeNames) {
        const v = pt[name];
        if (typeof v === "number") {
          if (v < min) min = v;
          if (v > max) max = v;
        }
      }
    }
    return { yMin: min === Infinity ? 0 : min, yMax: max === -Infinity ? 1 : max };
  }, [data, outcomeNames]);

  /* Determine closest line to cursor via mouse-Y proximity */
  const handleChartMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!chartContainerRef.current || outcomeNames.length <= 1) return;
      const rect = chartContainerRef.current.getBoundingClientRect();
      // Approximate chart drawing area (excluding axes / margins)
      const chartTop = rect.top + 25;
      const chartBottom = rect.bottom - 35;
      const chartHeight = chartBottom - chartTop;
      if (chartHeight <= 0) return;

      const normY = Math.max(0, Math.min(1, (e.clientY - chartTop) / chartHeight));
      const estimatedValue = yMax - normY * (yMax - yMin);

      // Find the outcome line closest to estimatedValue using the latest data point
      const latest = data[data.length - 1];
      if (!latest) return;

      let closest: string | null = null;
      let minDist = Infinity;
      for (const name of outcomeNames) {
        const v = latest[name];
        if (typeof v === "number") {
          const dist = Math.abs(v - estimatedValue);
          if (dist < minDist) { minDist = dist; closest = name; }
        }
      }

      if (closest !== hoveredRef.current) {
        hoveredRef.current = closest;
        setHoveredSeries(closest);
      }
    },
    [data, outcomeNames, yMin, yMax],
  );

  const handleChartMouseLeave = useCallback(() => {
    hoveredRef.current = null;
    setHoveredSeries(null);
  }, []);

  /* ── Data loading ─────────────────────────────────────── */
  const loadHistory = useCallback(async () => {
    setLoading(true);
    try {
      const entries = await api.get<OddsHistoryEntry[]>(`/odds-history/market/${marketId}`);
      const oc = outcomesRef.current;

      const allNames =
        oc && oc.length > 0
          ? oc.map((o) => o.name)
          : entries && entries.length > 0
            ? [...new Set(entries.map((e) => e.outcomeName))]
            : [];
      setOutcomeNames(allNames);

      const points: ChartPoint[] = [];

      // 1) Initial odds as the first data point
      if (oc && oc.length > 0) {
        const earliest =
          entries && entries.length > 0
            ? new Date(entries[0].changedAt).getTime() - 60_000
            : Date.now() - 3_600_000;
        const d = new Date(earliest);
        const startPoint: ChartPoint = {
          time: d.toLocaleString(locale, { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }),
          timestamp: earliest,
        };
        for (const o of oc) startPoint[o.name] = o.initialOdds;
        points.push(startPoint);
      }

      // 2) History entries
      if (entries && entries.length > 0) {
        const grouped = new Map<string, ChartPoint>();
        for (const entry of entries) {
          const ts = new Date(entry.changedAt);
          const key = ts.toISOString();
          if (!grouped.has(key)) {
            grouped.set(key, {
              time: ts.toLocaleString(locale, { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }),
              timestamp: ts.getTime(),
            });
          }
          grouped.get(key)![entry.outcomeName] = entry.newOdds;
        }

        const lastKnown: Record<string, number> = {};
        if (oc) for (const o of oc) lastKnown[o.name] = o.initialOdds;

        const sorted = [...grouped.values()].sort((a, b) => a.timestamp - b.timestamp);
        for (const pt of sorted) {
          for (const name of allNames) {
            if (pt[name] != null) {
              lastKnown[name] = pt[name] as number;
            } else if (lastKnown[name] != null) {
              pt[name] = lastKnown[name];
            }
          }
        }
        points.push(...sorted);
      }

      // 3) Current odds as the "now" endpoint
      if (oc && oc.length > 0 && points.length > 0) {
        const last = points[points.length - 1].timestamp;
        const now = Date.now();
        if (now - last > 60_000) {
          const nowPoint: ChartPoint = {
            time: new Date(now).toLocaleString(locale, { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }),
            timestamp: now,
          };
          for (const o of oc) nowPoint[o.name] = o.currentOdds;
          points.push(nowPoint);
        }
      }

      setData(points);
    } catch {
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [marketId, locale]);

  useEffect(() => { loadHistory(); }, [loadHistory]);

  if (loading) return <div className="h-48 bg-muted rounded-lg animate-pulse" />;
  if (data.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-primary" />
          {t("historyTitle", { name: marketName })}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div
          ref={chartContainerRef}
          className="h-72 w-full"
          onMouseMove={handleChartMouseMove}
          onMouseLeave={handleChartMouseLeave}
        >
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <defs>
                {outcomeNames.map((name, i) => (
                  <linearGradient key={name} id={`odds-grad-${i}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={COLORS[i % COLORS.length]} stopOpacity={0.15} />
                    <stop offset="95%" stopColor={COLORS[i % COLORS.length]} stopOpacity={0} />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis
                dataKey="time"
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                interval="preserveStartEnd"
              />
              <YAxis
                domain={["auto", "auto"]}
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                tickFormatter={(v: number) => `${v.toFixed(2)}x`}
                width={52}
              />
              <Tooltip
                content={<SingleSeriesTooltip hoveredSeries={hoveredSeries} />}
                cursor={{ stroke: "hsl(var(--muted-foreground))", strokeDasharray: "4 4" }}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              {/* Gradient fill areas (behind lines) */}
              {outcomeNames.map((name, i) => (
                <Area
                  key={`area-${name}`}
                  type="stepAfter"
                  dataKey={name}
                  stroke="none"
                  fill={`url(#odds-grad-${i})`}
                  fillOpacity={hoveredSeries === null || hoveredSeries === name ? 1 : 0.1}
                  connectNulls
                  animationDuration={1200}
                  animationEasing="ease-in-out"
                  legendType="none"
                />
              ))}
              {/* Step lines */}
              {outcomeNames.map((name, i) => (
                <Line
                  key={name}
                  type="stepAfter"
                  dataKey={name}
                  stroke={COLORS[i % COLORS.length]}
                  strokeWidth={hoveredSeries === name ? 3 : 2}
                  strokeOpacity={hoveredSeries === null || hoveredSeries === name ? 1 : 0.25}
                  dot={false}
                  activeDot={
                    hoveredSeries === null || hoveredSeries === name
                      ? { r: 5, strokeWidth: 2, fill: "hsl(var(--card))" }
                      : false
                  }
                  connectNulls
                  animationDuration={1200}
                  animationEasing="ease-in-out"
                />
              ))}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
