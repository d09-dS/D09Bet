import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { serialize, errorResponse, ApiError, requireRole, getDecimalSetting } from "@/lib/api-utils";
import { logAction } from "@/lib/audit";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const admin = await requireRole(req, "ADMIN");
    const { id } = await params;
    const body = await req.json();
    const { isActive } = body as { isActive: boolean };

    if (typeof isActive !== "boolean") throw new ApiError(400, "isActive must be a boolean");

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) throw new ApiError(404, "User not found");

    // If activating for the first time, allocate initial tokens
    const isFirstActivation = isActive && !user.isActive && Number(user.tokenBalance) === 0;

    const updated = await prisma.$transaction(async (tx) => {
      const data: Record<string, unknown> = { isActive };

      if (isFirstActivation) {
        const initialTokens = await getDecimalSetting("initial_tokens", 10);
        data.tokenBalance = initialTokens;

        await tx.tokenTransaction.create({
          data: {
            userId: id,
            type: "INITIAL_ALLOCATION",
            amount: initialTokens,
            balanceAfter: initialTokens,
            referenceType: "SYSTEM",
            description: "Initial token allocation on account approval",
          },
        });
      }

      const u = await tx.user.update({
        where: { id },
        data,
        select: { id: true, username: true, email: true, role: true, tokenBalance: true, avatarUrl: true, bio: true, locale: true, isActive: true, createdAt: true },
      });

      return u;
    });

    logAction(admin.id, isActive ? "ACTIVATE_USER" : "DEACTIVATE_USER", "User", id, { isActive });

    return NextResponse.json(serialize(updated));
  } catch (err) {
    return errorResponse(err);
  }
}
