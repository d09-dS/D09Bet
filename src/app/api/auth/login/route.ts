import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import {
  serialize,
  errorResponse,
  ApiError,
  getDecimalSetting,
  getBooleanSetting,
} from "@/lib/api-utils";
import { generateAccessToken, generateRefreshToken } from "@/lib/jwt";
import { logAction } from "@/lib/audit";
import { checkRateLimit } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  try {
    const rateLimited = await checkRateLimit(req, "login");
    if (rateLimited) return rateLimited;

    const body = await req.json();
    const { username, password } = body;

    if (!username || !password) {
      throw new ApiError(400, "Username and password are required");
    }

    const user = await prisma.user.findUnique({ where: { username } });
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      throw new ApiError(401, "Invalid username or password");
    }
    if (!user.isActive) {
      throw new ApiError(403, "Your account is pending approval. An admin needs to activate your account.");
    }

    // Daily bonus
    let bonusAwarded: number | null = null;
    const dailyBonusEnabled = await getBooleanSetting("daily_bonus_enabled", true);

    if (dailyBonusEnabled) {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const lastLogin = user.lastLoginAt;
      const alreadyClaimed =
        lastLogin !== null &&
        new Date(lastLogin.getFullYear(), lastLogin.getMonth(), lastLogin.getDate()).getTime() === today.getTime();

      if (!alreadyClaimed) {
        const bonusAmount = await getDecimalSetting("daily_bonus_amount", 2);
        const newBalance = Number(user.tokenBalance) + bonusAmount;

        await prisma.user.update({
          where: { id: user.id },
          data: { tokenBalance: newBalance, lastLoginAt: now },
        });
        await prisma.tokenTransaction.create({
          data: {
            userId: user.id,
            type: "DAILY_BONUS",
            amount: bonusAmount,
            balanceAfter: newBalance,
            referenceType: "SYSTEM",
            description: "Daily login bonus",
          },
        });
        bonusAwarded = bonusAmount;
      }
    }

    const freshUser = await prisma.user.findUnique({ where: { id: user.id } });
    if (!freshUser) throw new ApiError(404, "User not found");

    logAction(freshUser.id, "USER_LOGIN", "User", freshUser.id, { username: freshUser.username });

    const [accessToken, refreshToken] = await Promise.all([
      generateAccessToken(freshUser.id, freshUser.username, freshUser.role),
      generateRefreshToken(freshUser.id, freshUser.username, freshUser.role),
    ]);

    return NextResponse.json(
      serialize({
        userId: freshUser.id,
        username: freshUser.username,
        email: freshUser.email,
        role: freshUser.role,
        tokenBalance: freshUser.tokenBalance,
        bonusAwarded,
        accessToken,
        refreshToken,
      }),
    );
  } catch (err) {
    return errorResponse(err);
  }
}
