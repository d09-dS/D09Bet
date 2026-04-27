import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { serialize, errorResponse, ApiError, requireRole } from "@/lib/api-utils";
import { logAction } from "@/lib/audit";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const admin = await requireRole(req, "ADMIN");
    const { id } = await params;
    const body = await req.json();
    const { action } = body as { action: "approve" | "reject" };

    if (action !== "approve" && action !== "reject") {
      throw new ApiError(400, "action must be 'approve' or 'reject'");
    }

    const change = await prisma.pendingProfileChange.findUnique({
      where: { id },
      include: { user: { select: { id: true, username: true } } },
    });
    if (!change) throw new ApiError(404, "Pending change not found");
    if (change.status !== "PENDING") throw new ApiError(409, "Change already reviewed");

    if (action === "approve") {
      const changes = change.changes as Record<string, unknown>;

      await prisma.$transaction([
        prisma.user.update({
          where: { id: change.userId },
          data: changes,
        }),
        prisma.pendingProfileChange.update({
          where: { id },
          data: { status: "APPROVED", reviewedBy: admin.id, reviewedAt: new Date() },
        }),
      ]);

      logAction(admin.id, "APPROVE_PROFILE_CHANGE", "User", change.userId, {
        changeId: id,
        changes,
        username: change.user.username,
      });
    } else {
      await prisma.pendingProfileChange.update({
        where: { id },
        data: { status: "REJECTED", reviewedBy: admin.id, reviewedAt: new Date() },
      });

      logAction(admin.id, "REJECT_PROFILE_CHANGE", "User", change.userId, {
        changeId: id,
        username: change.user.username,
      });
    }

    const updated = await prisma.pendingProfileChange.findUnique({
      where: { id },
      include: { user: { select: { username: true, email: true } } },
    });

    return NextResponse.json(serialize(updated));
  } catch (err) {
    return errorResponse(err);
  }
}
