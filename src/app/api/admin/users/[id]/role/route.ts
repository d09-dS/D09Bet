import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { serialize, errorResponse, ApiError, requireRole } from "@/lib/api-utils";
import { logAction } from "@/lib/audit";

const VALID_ROLES = ["GUEST", "USER", "ADMIN"] as const;
type RoleValue = (typeof VALID_ROLES)[number];

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const admin = await requireRole(req, "ADMIN");
    const { id } = await params;
    const body = await req.json();
    const { role } = body as { role: string };

    if (!role || !VALID_ROLES.includes(role as RoleValue)) {
      throw new ApiError(400, "invalidRole");
    }

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) throw new ApiError(404, "userNotFound");

    const updated = await prisma.user.update({
      where: { id }, data: { role: role as RoleValue },
      select: { id: true, username: true, email: true, role: true, tokenBalance: true, avatarUrl: true, bio: true, locale: true, createdAt: true },
    });

    logAction(admin.id, "CHANGE_ROLE", "User", id, { newRole: role });

    return NextResponse.json(serialize(updated));
  } catch (err) {
    return errorResponse(err);
  }
}
