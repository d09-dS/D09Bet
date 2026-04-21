import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { serialize, errorResponse, requireRole } from "@/lib/api-utils";

export async function GET(req: NextRequest) {
  try {
    await requireRole(req, "ADMIN");
    const settings = await prisma.systemSetting.findMany();
    return NextResponse.json(serialize(settings));
  } catch (err) {
    return errorResponse(err);
  }
}
