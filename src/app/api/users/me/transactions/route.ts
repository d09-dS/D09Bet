import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { serialize, errorResponse, requireAuth, parsePagination, pageResponse } from "@/lib/api-utils";

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    const { page, size, skip, take } = parsePagination(req, 20);

    const [transactions, total] = await Promise.all([
      prisma.tokenTransaction.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
        skip,
        take,
      }),
      prisma.tokenTransaction.count({ where: { userId: user.id } }),
    ]);

    return NextResponse.json(serialize(pageResponse(transactions, total, page, size)));
  } catch (err) {
    return errorResponse(err);
  }
}
