import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, serialize, parsePagination, pageResponse, errorResponse } from "@/lib/api-utils";

export async function GET(req: NextRequest) {
  try {
    const admin = await requireRole(req, "ADMIN");
    const { skip, take, page, size } = parsePagination(req, 20);

    const unreadOnly = req.nextUrl.searchParams.get("unreadOnly") === "true";

    const where = {
      adminId: admin.id,
      ...(unreadOnly ? { isRead: false } : {}),
    };

    const [notifications, total] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take,
      }),
      prisma.notification.count({ where }),
    ]);

    return NextResponse.json(
      serialize(pageResponse(notifications, total, page, size)),
    );
  } catch (err) {
    return errorResponse(err);
  }
}

// Mark all notifications as read
export async function PATCH(req: NextRequest) {
  try {
    const admin = await requireRole(req, "ADMIN");

    await prisma.notification.updateMany({
      where: { adminId: admin.id, isRead: false },
      data: { isRead: true },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    return errorResponse(err);
  }
}
