import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { serialize, errorResponse, ApiError } from "@/lib/api-utils";
import { generateAccessToken, generateRefreshToken, verifyToken } from "@/lib/jwt";
import { checkRateLimit } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  try {
    const rateLimited = await checkRateLimit(req, "refresh");
    if (rateLimited) return rateLimited;

    const body = await req.json();
    const { refreshToken: token } = body;

    if (!token) throw new ApiError(400, "Refresh token is required");

    const payload = await verifyToken(token);
    if (!payload || payload.type !== "refresh") {
      throw new ApiError(401, "Invalid or expired refresh token");
    }

    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user || !user.isActive) throw new ApiError(401, "User not found or inactive");

    const [accessToken, refreshToken] = await Promise.all([
      generateAccessToken(user.id, user.username, user.role),
      generateRefreshToken(user.id, user.username, user.role),
    ]);

    return NextResponse.json(
      serialize({
        userId: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        tokenBalance: user.tokenBalance,
        bonusAwarded: null,
        accessToken,
        refreshToken,
      }),
    );
  } catch (err) {
    return errorResponse(err);
  }
}
