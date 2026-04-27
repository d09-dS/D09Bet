import { NextRequest, NextResponse } from "next/server";
import { serialize, errorResponse, requireRole } from "@/lib/api-utils";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { logAction } from "@/lib/audit";
import { notifyAdmins } from "@/lib/notifications";

export async function GET(req: NextRequest) {
  try {
    const user = await requireRole(req, "USER", "ADMIN");

    const pendingChange = await prisma.pendingProfileChange.findFirst({
      where: { userId: user.id, status: "PENDING" },
      orderBy: { createdAt: "desc" },
    });

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
        pendingChange: pendingChange
          ? { id: pendingChange.id, changes: pendingChange.changes, createdAt: pendingChange.createdAt }
          : null,
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

    const changes: Record<string, unknown> = {};
    if (bio !== undefined) changes.bio = bio;
    if (avatarUrl !== undefined) changes.avatarUrl = avatarUrl;
    if (locale !== undefined) changes.locale = locale;

    if (Object.keys(changes).length === 0) {
      return NextResponse.json(serialize({ id: user.id, pending: false }));
    }

    await prisma.pendingProfileChange.updateMany({
      where: { userId: user.id, status: "PENDING" },
      data: { status: "REJECTED" },
    });

    const pending = await prisma.pendingProfileChange.create({
      data: { userId: user.id, changes: changes as Prisma.InputJsonValue },
    });

    logAction(user.id, "REQUEST_PROFILE_CHANGE", "User", user.id, changes);

    notifyAdmins({
      type: "PROFILE_CHANGE_REQUESTED",
      title: `Profile change request: ${user.username}`,
      message: `${user.username} has requested profile changes: ${Object.keys(changes).join(", ")}`,
      entityType: "USER",
      entityId: user.id,
    }).catch(() => {});

    return NextResponse.json(
      serialize({ id: pending.id, pending: true, changes: pending.changes }),
      { status: 201 },
    );
  } catch (err) {
    return errorResponse(err);
  }
}
