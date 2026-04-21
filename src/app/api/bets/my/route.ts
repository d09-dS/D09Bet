import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { serialize, errorResponse, requireAuth, parsePagination, pageResponse } from "@/lib/api-utils";

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    const { page, size, skip, take } = parsePagination(req, 20);

    const [bets, total] = await Promise.all([
      prisma.bet.findMany({
        where: { userId: user.id }, orderBy: { createdAt: "desc" }, skip, take,
        include: { outcome: { include: { market: { include: { event: { select: { title: true } } } } } } },
      }),
      prisma.bet.count({ where: { userId: user.id } }),
    ]);

    const content = bets.map((b) => ({
      id: b.id, eventTitle: b.outcome.market.event.title, marketName: b.outcome.market.name,
      outcomeName: b.outcome.name, stake: b.stake, oddsAtPlacement: b.oddsAtPlacement,
      potentialWin: b.potentialWin, status: b.status, settledAt: b.settledAt, createdAt: b.createdAt,
    }));

    return NextResponse.json(serialize(pageResponse(content, total, page, size)));
  } catch (err) {
    return errorResponse(err);
  }
}
