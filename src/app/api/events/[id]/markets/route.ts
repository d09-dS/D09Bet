import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { serialize, errorResponse, ApiError, requireRole } from "@/lib/api-utils";
import { MarketType } from "@/generated/prisma/client";
import { logAction } from "@/lib/audit";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: eventId } = await params;
    const user = await requireRole(req, "USER", "ADMIN");

    const event = await prisma.event.findFirst({ where: { id: eventId, deletedAt: null } });
    if (!event) throw new ApiError(404, "Event not found");
    if (!["DRAFT", "OPEN"].includes(event.status)) {
      throw new ApiError(400, `Cannot add markets to event with status ${event.status}`);
    }

    const body = await req.json();
    const { name, nameEn, type, marginFactor, virtualPool: vPool, sortOrder, outcomes } = body;

    if (!name) throw new ApiError(400, "name is required");
    if (!type) throw new ApiError(400, "type is required");
    if (!outcomes || !Array.isArray(outcomes) || outcomes.length < 2) {
      throw new ApiError(400, "At least 2 outcomes are required");
    }

    const resolvedMargin = marginFactor ?? 0.95;
    const resolvedPool = vPool ?? 100;

    // scaleFactor = 1 / Σ(1/initialOdds) — ensures formula reproduces
    // the admin-set initialOdds exactly at zero bets, regardless of overround.
    const sumInverseOdds = outcomes.reduce(
      (sum: number, o: { initialOdds: number }) => sum + 1 / o.initialOdds, 0,
    );
    const scaleFactor = 1 / sumInverseOdds;

    const market = await prisma.market.create({
      data: {
        eventId, name, nameEn: nameEn ?? null, type: type as MarketType,
        status: "OPEN", marginFactor: resolvedMargin, virtualPool: resolvedPool,
        oddsScaleFactor: scaleFactor,
        sortOrder: sortOrder ?? 0,
        outcomes: {
          create: outcomes.map(
            (o: { name: string; nameEn?: string; initialOdds: number; sortOrder?: number }, idx: number) => ({
              name: o.name, nameEn: o.nameEn ?? null,
              initialOdds: o.initialOdds, currentOdds: o.initialOdds,
              totalStaked: 0, virtualStaked: resolvedPool / o.initialOdds,
              logWeightSum: 0, betCount: 0, resultStatus: "PENDING", sortOrder: o.sortOrder ?? idx,
            }),
          ),
        },
      },
      include: { outcomes: true },
    });

    logAction(user.id, "CREATE_MARKET", "Market", market.id, { eventId, name, type, outcomeCount: outcomes.length });

    return NextResponse.json(serialize(market), { status: 201 });
  } catch (err) {
    return errorResponse(err);
  }
}
