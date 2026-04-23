import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { serialize, errorResponse, ApiError, requireRole } from "@/lib/api-utils";
import { logAction } from "@/lib/audit";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ key: string }> },
) {
  try {
    const admin = await requireRole(req, "ADMIN");
    const { key } = await params;
    const body = await req.json();
    const { value } = body as { value: string };

    if (typeof value !== "string") throw new ApiError(400, "value must be a string");

    const existing = await prisma.systemSetting.findUnique({ where: { key } });
    if (!existing) throw new ApiError(404, "Setting not found");

    const updated = await prisma.systemSetting.update({
      where: { key }, data: { value, updatedBy: admin.id },
    });

    logAction(admin.id, "UPDATE_SETTING", "SystemSetting", null, { key, value });

    return NextResponse.json(serialize(updated));
  } catch (err) {
    return errorResponse(err);
  }
}
