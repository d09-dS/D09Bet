import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logAction } from "@/lib/audit";

/**
 * Cron endpoint that automatically closes expired events.
 *
 * - Finds all OPEN events whose endTime has passed.
 * - Sets their status to CLOSED.
 * - Locks all associated open markets so no new bets can be placed.
 *
 * Secured via CRON_SECRET header check.
 * Intended to be called every 5 minutes by Vercel Cron (or external cron service).
 */
export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    console.error("[cron/close-expired] CRON_SECRET not configured");
    return NextResponse.json({ error: "Cron not configured" }, { status: 503 });
  }
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const now = new Date();

    const expiredEvents = await prisma.event.findMany({
      where: {
        status: { in: ["OPEN"] },
        endTime: { lte: now },
        deletedAt: null,
      },
      select: { id: true, title: true },
    });

    if (expiredEvents.length === 0) {
      return NextResponse.json({ closed: 0 });
    }

    const eventIds = expiredEvents.map((e) => e.id);

    await prisma.$transaction(async (tx) => {
      // Close all expired events
      await tx.event.updateMany({
        where: { id: { in: eventIds } },
        data: { status: "CLOSED" },
      });

      // Lock all open markets belonging to these events
      await tx.market.updateMany({
        where: {
          eventId: { in: eventIds },
          status: "OPEN",
        },
        data: { status: "LOCKED" },
      });
    });

    console.log(`[cron/close-expired] Closed ${expiredEvents.length} events: ${expiredEvents.map((e) => e.title).join(", ")}`);

    // Audit log for each closed event
    for (const event of expiredEvents) {
      logAction(null, "AUTO_CLOSE_EVENT", "Event", event.id, {
        title: event.title,
        reason: "endTime expired",
      });
    }

    return NextResponse.json({
      closed: expiredEvents.length,
      events: expiredEvents.map((e) => ({ id: e.id, title: e.title })),
    });
  } catch (err) {
    console.error("[cron/close-expired] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
