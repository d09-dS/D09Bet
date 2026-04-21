import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { serialize, errorResponse } from "@/lib/api-utils";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ marketId: string }> },
) {
  try {
    const { marketId } = await params;
    const records = await prisma.oddsHistory.findMany({
      where: { outcome: { marketId } },
      orderBy: { changedAt: "asc" },
      include: { outcome: { select: { id: true, name: true } } },
    });

    const data = records.map((r) => ({
      outcomeId: r.outcome.id, outcomeName: r.outcome.name,
      oldOdds: r.oldOdds, newOdds: r.newOdds, changedAt: r.changedAt,
    }));
    return NextResponse.json(serialize(data));
  } catch (err) {
    return errorResponse(err);
  }
}
