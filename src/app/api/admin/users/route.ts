import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { serialize, errorResponse, requireRole, parsePagination, pageResponse } from "@/lib/api-utils";

export async function GET(req: NextRequest) {
  try {
    await requireRole(req, "ADMIN");
    const { page, size, skip, take } = parsePagination(req, 20);

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        orderBy: { createdAt: "desc" }, skip, take,
        select: { id: true, username: true, email: true, role: true, tokenBalance: true, avatarUrl: true, bio: true, locale: true, isActive: true, createdAt: true },
      }),
      prisma.user.count(),
    ]);

    return NextResponse.json(serialize(pageResponse(users, total, page, size)));
  } catch (err) {
    return errorResponse(err);
  }
}
