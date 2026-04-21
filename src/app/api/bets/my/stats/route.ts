import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { serialize, errorResponse, requireAuth } from "@/lib/api-utils";

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    const bets = await prisma.bet.findMany({ where: { userId: user.id } });

    const totalBets = bets.length;
    const wonBets = bets.filter((b) => b.status === "WON").length;
    const lostBets = bets.filter((b) => b.status === "LOST").length;
    const pendingBets = bets.filter((b) => b.status === "PENDING").length;
    const totalStaked = bets.reduce((sum, b) => sum + Number(b.stake), 0);
    const totalWon = bets.filter((b) => b.status === "WON").reduce((sum, b) => sum + Number(b.potentialWin), 0);
    const profit = totalWon - totalStaked;
    const settled = wonBets + lostBets;
    const winRate = settled > 0 ? Math.round((wonBets / settled) * 1000) / 10 : 0;

    return NextResponse.json(serialize({ totalBets, wonBets, lostBets, pendingBets, totalStaked, totalWon, profit, winRate }));
  } catch (err) {
    return errorResponse(err);
  }
}
