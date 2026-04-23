import { NextRequest, NextResponse } from "next/server";
import { serialize, errorResponse, requireRole } from "@/lib/api-utils";
import { prisma } from "@/lib/prisma";
import { logAction } from "@/lib/audit";

export async function GET(req: NextRequest) {
  try {
    const user = await requireRole(req, "USER", "ADMIN");
    return NextResponse.json(
      serialize({
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        tokenBalance: user.tokenBalance,
        avatarUrl: user.avatarUrl,
        bio: user.bio,
        locale: user.locale,
        createdAt: user.createdAt,
      }),
    );
  } catch (err) {
    return errorResponse(err);
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = await requireRole(req, "USER", "ADMIN");
    const body = await req.json();
    const { bio, avatarUrl, locale } = body;

    const data: Record<string, unknown> = {};
    if (bio !== undefined) data.bio = bio;
    if (avatarUrl !== undefined) data.avatarUrl = avatarUrl;
    if (locale !== undefined) data.locale = locale;

    const updated = await prisma.user.update({ where: { id: user.id }, data });

    logAction(user.id, "UPDATE_PROFILE", "User", user.id, data);

    return NextResponse.json(
      serialize({
        id: updated.id,
        username: updated.username,
        email: updated.email,
        role: updated.role,
        tokenBalance: updated.tokenBalance,
        avatarUrl: updated.avatarUrl,
        bio: updated.bio,
        locale: updated.locale,
        createdAt: updated.createdAt,
      }),
    );
  } catch (err) {
    return errorResponse(err);
  }
}
