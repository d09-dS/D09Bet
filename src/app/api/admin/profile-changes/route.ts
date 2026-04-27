import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { serialize, errorResponse, requireRole } from "@/lib/api-utils";

export async function GET(req: NextRequest) {
  try {
    await requireRole(req, "ADMIN");

    const statusFilter = req.nextUrl.searchParams.get("status") || "PENDING";

    const changes = await prisma.pendingProfileChange.findMany({
      where: { status: statusFilter as "PENDING" | "APPROVED" | "REJECTED" },
      include: {
        user: { select: { username: true, email: true, bio: true, avatarUrl: true, locale: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return NextResponse.json(serialize(changes));
  } catch (err) {
    return errorResponse(err);
  }
}
