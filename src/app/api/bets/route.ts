import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { serialize, errorResponse, ApiError, requireRole, getDecimalSetting } from "@/lib/api-utils";

export async function POST(req: NextRequest) {
  try {
    const user = await requireRole(req, "USER", "MODERATOR", "ADMIN");
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

    // Odds Engine: log-weighted recalculation (inside transaction for atomicity)
    const logWeight = Math.log(1 + stake);
    const minBets = await getDecimalSetting("min_bets_for_dynamic_odds", 5);

    await prisma.$transaction(async (tx) => {
      // Update totalStaked (for display) + logWeightSum + betCount
      await tx.outcome.update({
        where: { id: outcomeId },
        data: { totalStaked: { increment: stake }, logWeightSum: { increment: logWeight }, betCount: { increment: 1 } },
      });

      const allOutcomes = await tx.outcome.findMany({ where: { marketId: outcome.marketId } });
      const totalBetCount = allOutcomes.reduce((sum, o) => sum + o.betCount, 0);

      // Only recalculate odds once enough bets exist for meaningful data
      if (totalBetCount >= minBets) {
        const scaleFactor = Number(outcome.market.oddsScaleFactor);

        // effectiveStaked = virtualStaked + logWeightSum
        const effectivePool = allOutcomes.reduce(
          (sum, o) => sum + Number(o.virtualStaked) + Number(o.logWeightSum), 0,
        );

        for (const o of allOutcomes) {
          const effective = Number(o.virtualStaked) + Number(o.logWeightSum);
          let newOdds = effective <= 0 ? 100.0 : scaleFactor * effectivePool / effective;
          newOdds = Math.round(Math.min(100.0, Math.max(1.01, newOdds)) * 100) / 100;
          const oldOdds = Number(o.currentOdds);

          if (newOdds !== oldOdds) {
            await tx.outcome.update({ where: { id: o.id }, data: { currentOdds: newOdds } });
            await tx.oddsHistory.create({
              data: { outcomeId: o.id, oldOdds, newOdds, triggerType: "BET_PLACED", changedById: user.id },
            });
          }
        }
      }
      // Before threshold: odds stay at initialOdds (no recalculation)
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
