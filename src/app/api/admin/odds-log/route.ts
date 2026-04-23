import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { serialize, errorResponse, requireRole, parsePagination, pageResponse } from "@/lib/api-utils";
import { Prisma } from "@/generated/prisma/client";

export async function GET(req: NextRequest) {
  try {
    await requireRole(req, "ADMIN");
    const { page, size, skip, take } = parsePagination(req, 50);

    const eventId = req.nextUrl.searchParams.get("eventId");

    const where: Prisma.OddsHistoryWhereInput = {};
    if (eventId) {
      where.outcome = { market: { eventId } };
    }

    const [logs, total] = await Promise.all([
      prisma.oddsHistory.findMany({
        where,
        orderBy: { changedAt: "desc" },
        skip,
        take,
        include: {
          outcome: {
            select: {
              name: true,
              nameEn: true,
              market: {
                select: {
                  name: true,
                  nameEn: true,
                  event: {
                    select: { id: true, title: true, titleEn: true },
                  },
                },
              },
            },
          },
          changedBy: { select: { username: true } },
        },
      }),
      prisma.oddsHistory.count({ where }),
    ]);

    const mapped = logs.map((l) => ({
      id: l.id,
      eventId: l.outcome.market.event.id,
      eventTitle: l.outcome.market.event.title,
      marketName: l.outcome.market.name,
      outcomeName: l.outcome.name,
      oldOdds: l.oldOdds,
      newOdds: l.newOdds,
      triggerType: l.triggerType,
      changedBy: l.changedBy?.username ?? null,
      changedAt: l.changedAt,
    }));

    return NextResponse.json(serialize(pageResponse(mapped, total, page, size)));
  } catch (err) {
    return errorResponse(err);
  }
}
