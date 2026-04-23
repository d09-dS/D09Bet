import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, errorResponse, ApiError } from "@/lib/api-utils";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const admin = await requireRole(req, "ADMIN");
    const { id } = await params;
    const notificationId = parseInt(id, 10);

    if (isNaN(notificationId)) {
      throw new ApiError(400, "Invalid notification ID");
    }

    const notification = await prisma.notification.findFirst({
      where: { id: notificationId, adminId: admin.id },
    });

    if (!notification) {
      throw new ApiError(404, "Notification not found");
    }

    await prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    return errorResponse(err);
  }
}
