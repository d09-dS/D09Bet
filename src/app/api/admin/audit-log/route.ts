import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { serialize, errorResponse, requireRole, parsePagination, pageResponse } from "@/lib/api-utils";

export async function GET(req: NextRequest) {
  try {
    await requireRole(req, "ADMIN");
    const { page, size, skip, take } = parsePagination(req, 50);

    const [logs, total] = await Promise.all([
      prisma.adminAuditLog.findMany({
        orderBy: { createdAt: "desc" }, skip, take,
        include: { admin: { select: { id: true, username: true } } },
      }),
      prisma.adminAuditLog.count(),
    ]);

    return NextResponse.json(serialize(pageResponse(logs, total, page, size)));
  } catch (err) {
    return errorResponse(err);
  }
}
