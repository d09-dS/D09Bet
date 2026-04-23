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
    const { amount, reason } = body as { amount: number; reason?: string };

    if (typeof amount !== "number" || !isFinite(amount)) throw new ApiError(400, "amount must be a finite number");

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) throw new ApiError(404, "User not found");

    const newBalance = Number(user.tokenBalance) + amount;
    if (newBalance < 0) throw new ApiError(400, "Adjustment would result in negative balance");

    const updated = await prisma.$transaction(async (tx) => {
      const u = await tx.user.update({
        where: { id }, data: { tokenBalance: newBalance },
        select: { id: true, username: true, email: true, role: true, tokenBalance: true, avatarUrl: true, bio: true, locale: true, createdAt: true },
      });
      await tx.tokenTransaction.create({
        data: { userId: id, type: "ADMIN_ADJUSTMENT", amount, balanceAfter: newBalance, referenceType: "USER", referenceId: admin.id, description: reason ?? null, createdById: admin.id },
      });
      return u;
    });

    logAction(admin.id, "ADJUST_TOKENS", "User", id, { amount, reason: reason ?? null });

    return NextResponse.json(serialize(updated));
  } catch (err) {
    return errorResponse(err);
  }
}
