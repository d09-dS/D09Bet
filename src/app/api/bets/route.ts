import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { serialize, errorResponse, ApiError, requireRole, getDecimalSetting } from "@/lib/api-utils";
import { logAction } from "@/lib/audit";

export async function POST(req: NextRequest) {
  try {
    const user = await requireRole(req, "USER", "ADMIN");
    if (!user.isActive) throw new ApiError(403, "Account is deactivated");

    const body = await req.json();
    const { outcomeId, stake } = body as { outcomeId: string; stake: number };
    if (!outcomeId || stake == null) throw new ApiError(400, "outcomeId and stake are required");

    const outcome = await prisma.outcome.findUnique({
      where: { id: outcomeId },
      include: { market: { include: { event: true } } },
    });
    if (!outcome) throw new ApiError(404, "Outcome not found");
    if (outcome.market.status !== "OPEN") throw new ApiError(400, "Market is not open for betting");
    if (outcome.market.event.status !== "OPEN") throw new ApiError(400, "Event is not open for betting");

    // Second-precise endTime guard — no bets after event has ended
    if (outcome.market.event.endTime && new Date(outcome.market.event.endTime) <= new Date()) {
      throw new ApiError(400, "Event has ended");
    }

    const minStake = await getDecimalSetting("min_bet_stake", 0.5);
    const maxStake = await getDecimalSetting("max_bet_stake", 100);
    if (stake < minStake || stake > maxStake) {
      throw new ApiError(400, `Stake must be between ${minStake} and ${maxStake}`);
    }
    if (Number(user.tokenBalance) < stake) throw new ApiError(400, "Insufficient token balance");

    const potentialWin = Math.round(stake * Number(outcome.currentOdds) * 100) / 100;

    const bet = await prisma.bet.create({
      data: {
        userId: user.id, outcomeId,
        stake, oddsAtPlacement: outcome.currentOdds,
        potentialWin, status: "PENDING",
      },
    });

    // Token deduction with pessimistic locking
    const newBalance = await prisma.$transaction(async (tx) => {
      const [lockedUser] = await tx.$queryRawUnsafe<{ token_balance: number }[]>(
        "SELECT * FROM users WHERE id = $1::uuid FOR UPDATE", user.id,
      );
      if (Number(lockedUser.token_balance) < stake) throw new ApiError(400, "Insufficient token balance");

      const bal = Number(lockedUser.token_balance) - stake;
      await tx.user.update({ where: { id: user.id }, data: { tokenBalance: bal } });
      await tx.tokenTransaction.create({
        data: {
          userId: user.id, type: "BET_PLACED", amount: -stake,
          balanceAfter: bal, referenceType: "BET", referenceId: bet.id,
          description: "Bet placed",
        },
      });
      return bal;
    });

    // Update totalStaked + betCount for display/statistics (odds are now updated daily via cron)
    await prisma.outcome.update({
      where: { id: outcomeId },
      data: { totalStaked: { increment: stake }, betCount: { increment: 1 } },
    });

    logAction(user.id, "PLACE_BET", "Bet", bet.id, {
      eventTitle: outcome.market.event.title, outcomeName: outcome.name,
      stake, odds: Number(outcome.currentOdds), potentialWin,
    });

    return NextResponse.json(
      serialize({
        id: bet.id, eventTitle: outcome.market.event.title, marketName: outcome.market.name,
        outcomeName: outcome.name, stake: bet.stake, oddsAtPlacement: bet.oddsAtPlacement,
        potentialWin: bet.potentialWin, status: bet.status, settledAt: bet.settledAt, createdAt: bet.createdAt,
        newBalance,
      }),
      { status: 201 },
    );
  } catch (err) {
    return errorResponse(err);
  }
}
