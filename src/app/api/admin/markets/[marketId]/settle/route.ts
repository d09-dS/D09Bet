import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { errorResponse, ApiError, requireRole } from "@/lib/api-utils";
import { logAction } from "@/lib/audit";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ marketId: string }> },
) {
  try {
    const admin = await requireRole(req, "ADMIN");
    const { marketId } = await params;
    const body = await req.json();
    const { winningOutcomeId } = body as { winningOutcomeId: string };

    if (!winningOutcomeId) throw new ApiError(400, "winningOutcomeId is required");

    const market = await prisma.market.findUnique({ where: { id: marketId } });
    if (!market) throw new ApiError(404, "Market not found");
    if (market.status === "SETTLED") throw new ApiError(400, "Market has already been settled");
    if (market.status !== "OPEN" && market.status !== "LOCKED") throw new ApiError(400, "Market must be OPEN or LOCKED to settle");

    const outcomes = await prisma.outcome.findMany({ where: { marketId }, orderBy: { sortOrder: "asc" } });
    if (!outcomes.find((o) => o.id === winningOutcomeId)) {
      throw new ApiError(400, "Winning outcome not found in this market");
    }

    await prisma.$transaction(async (tx) => {
      for (const outcome of outcomes) {
        await tx.outcome.update({
          where: { id: outcome.id },
          data: { resultStatus: outcome.id === winningOutcomeId ? "WON" : "LOST" },
        });
      }
      await tx.market.update({ where: { id: marketId }, data: { status: "SETTLED" } });

      const bets = await tx.bet.findMany({
        where: { outcome: { marketId }, status: "PENDING" },
        include: { outcome: true },
      });
      const now = new Date();

      for (const bet of bets) {
        if (bet.outcomeId === winningOutcomeId) {
          await tx.bet.update({ where: { id: bet.id }, data: { status: "WON", settledAt: now } });
          const user = await tx.user.update({
            where: { id: bet.userId },
            data: { tokenBalance: { increment: bet.potentialWin } },
          });
          await tx.tokenTransaction.create({
            data: {
              userId: bet.userId, type: "BET_WON", amount: bet.potentialWin,
              balanceAfter: Number(user.tokenBalance),
              referenceType: "BET", referenceId: bet.id, description: "Bet won",
            },
          });
        } else {
          await tx.bet.update({ where: { id: bet.id }, data: { status: "LOST", settledAt: now } });
        }
      }

    });

    logAction(admin.id, "SETTLE_MARKET", "Market", marketId, { winningOutcomeId });

    return new NextResponse(null, { status: 204 });
  } catch (err) {
    return errorResponse(err);
  }
}
