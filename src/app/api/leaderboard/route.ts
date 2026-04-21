import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { errorResponse } from "@/lib/api-utils";

export async function GET(req: NextRequest) {
  try {
    const limitParam = req.nextUrl.searchParams.get("limit");
    const limit = Math.min(100, Math.max(1, Number(limitParam) || 50));

    const rows: Array<{
      user_id: string;
      username: string;
      avatar_url: string | null;
      total_bets: bigint;
      profit: number;
      win_rate: number;
    }> = await prisma.$queryRawUnsafe(
      `SELECT u.id::text AS user_id, u.username, u.avatar_url,
              COUNT(b.id) AS total_bets,
              COALESCE(SUM(CASE WHEN b.status = 'WON' THEN b.potential_win ELSE 0 END), 0)
                - COALESCE(SUM(b.stake), 0) AS profit,
              CASE WHEN SUM(CASE WHEN b.status IN ('WON','LOST') THEN 1 ELSE 0 END) > 0
                   THEN ROUND(SUM(CASE WHEN b.status = 'WON' THEN 1.0 ELSE 0 END)
                     / SUM(CASE WHEN b.status IN ('WON','LOST') THEN 1.0 ELSE 0 END) * 100, 1)
                   ELSE 0 END AS win_rate
       FROM users u JOIN bets b ON b.user_id = u.id
       GROUP BY u.id, u.username, u.avatar_url
       ORDER BY profit DESC LIMIT $1`,
      limit,
    );

    const leaderboard = rows.map((row, index) => ({
      rank: index + 1,
      userId: row.user_id,
      username: row.username,
      avatarUrl: row.avatar_url,
      profit: Number(row.profit),
      totalBets: Number(row.total_bets),
      winRate: Number(row.win_rate),
    }));

    return NextResponse.json(leaderboard);
  } catch (err) {
    return errorResponse(err);
  }
}
