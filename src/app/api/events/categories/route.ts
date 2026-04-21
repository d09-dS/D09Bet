import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { serialize, errorResponse } from "@/lib/api-utils";

export async function GET(_req: NextRequest) {
  try {
    const categories = await prisma.category.findMany({ orderBy: { sortOrder: "asc" } });
    const mapped = categories.map((c) => ({
      id: c.id, name: c.name, nameEn: c.nameEn, slug: c.slug,
      description: c.description, descriptionEn: c.descriptionEn, iconName: c.iconName, sortOrder: c.sortOrder,
    }));
    return NextResponse.json(serialize(mapped));
  } catch (err) {
    return errorResponse(err);
  }
}
