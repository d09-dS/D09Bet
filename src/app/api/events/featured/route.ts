import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { serialize, errorResponse } from "@/lib/api-utils";

export async function GET(_req: NextRequest) {
  try {
    const events = await prisma.event.findMany({
      where: { isFeatured: true, status: "OPEN", deletedAt: null },
      include: { category: true },
      orderBy: { createdAt: "desc" },
    });

    const mapped = events.map((e) => ({
      id: e.id, title: e.title, titleEn: e.titleEn, description: e.description,
      descriptionEn: e.descriptionEn,
      category: e.category ? { id: e.category.id, name: e.category.name, nameEn: e.category.nameEn, slug: e.category.slug, iconName: e.category.iconName } : null,
      status: e.status, startTime: e.startTime, endTime: e.endTime, imageUrl: e.imageUrl, isFeatured: e.isFeatured, createdAt: e.createdAt,
    }));

    return NextResponse.json(serialize(mapped));
  } catch (err) {
    return errorResponse(err);
  }
}
