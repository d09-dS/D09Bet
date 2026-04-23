import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getDecimalSetting } from "@/lib/api-utils";
import { logAction } from "@/lib/audit";

/**
 * Cron endpoint that adjusts odds daily for all open markets.
 *
 * Logic:
 * - For each open market, the outcome with the lowest initialOdds (the
 *   favourite) has its currentOdds decreased by a configurable percentage.
 * - All other outcomes have their currentOdds increased by the same percentage.
 * - The favourite's currentOdds will never drop below 1.10.
 * - Idempotent: skips markets that already received a DAILY_CRON update today.
 *
 * Secured via CRON_SECRET header check.
 * Intended to be called once per day at midnight (UTC) by Vercel Cron.
 */
export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    console.error("[cron/daily-odds] CRON_SECRET not configured");
    return NextResponse.json({ error: "Cron not configured" }, { status: 503 });
  }
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const changePct = await getDecimalSetting("daily_odds_change_percent", 5);
    const decreaseFactor = 1 - changePct / 100; // e.g. 0.95
    const increaseFactor = 1 + changePct / 100; // e.g. 1.05
    const MIN_ODDS = 1.1;

    // Find all open markets with their outcomes
    const openMarkets = await prisma.market.findMany({
      where: { status: "OPEN" },
      include: {
        outcomes: { orderBy: { sortOrder: "asc" } },
      },
    });

    if (openMarkets.length === 0) {
      return NextResponse.json({ updated: 0 });
    }

    // Determine today's date boundaries (UTC) for idempotency check
    const now = new Date();
    const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

    let updatedMarkets = 0;

    for (const market of openMarkets) {
      if (market.outcomes.length < 2) continue;

      // Idempotency: skip if any DAILY_CRON entry exists for this market today
      const alreadyRan = await prisma.oddsHistory.findFirst({
        where: {
          triggerType: "DAILY_CRON",
          outcomeId: { in: market.outcomes.map((o) => o.id) },
          changedAt: { gte: todayStart, lt: todayEnd },
        },
      });
      if (alreadyRan) continue;

      // Find the favourite: outcome with the lowest initialOdds
      const favourite = market.outcomes.reduce((min, o) =>
        Number(o.initialOdds) < Number(min.initialOdds) ? o : min,
      );

      await prisma.$transaction(async (tx) => {
        for (const outcome of market.outcomes) {
          const oldOdds = Number(outcome.currentOdds);
          let newOdds: number;

          if (outcome.id === favourite.id) {
            // Favourite: decrease odds (floor at MIN_ODDS)
            newOdds = Math.max(MIN_ODDS, oldOdds * decreaseFactor);
          } else {
            // Other outcomes: increase odds
            newOdds = oldOdds * increaseFactor;
          }

          // Round to 2 decimal places
          newOdds = Math.round(newOdds * 100) / 100;

          if (newOdds !== oldOdds) {
            await tx.outcome.update({
              where: { id: outcome.id },
              data: { currentOdds: newOdds },
            });
            await tx.oddsHistory.create({
              data: {
                outcomeId: outcome.id,
                oldOdds,
                newOdds,
                triggerType: "DAILY_CRON",
              },
            });
          }
        }
      });

      updatedMarkets++;

      logAction(null, "AUTO_ADJUST_ODDS", "Market", market.id, {
        marketName: market.name,
        eventId: market.eventId,
        outcomesUpdated: market.outcomes.length,
        changePct,
      });
    }

    console.log(`[cron/daily-odds] Updated odds for ${updatedMarkets} markets`);

    return NextResponse.json({
      updated: updatedMarkets,
      skipped: openMarkets.length - updatedMarkets,
      changePct,
    });
  } catch (err) {
    console.error("[cron/daily-odds] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
