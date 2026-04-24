import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { serialize, errorResponse, ApiError, requireRole } from "@/lib/api-utils";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const event = await prisma.event.findFirst({
      where: { id, deletedAt: null },
      include: {
        category: true,
        createdBy: { select: { username: true } },
        markets: { include: { outcomes: { orderBy: { sortOrder: "asc" } } }, orderBy: { sortOrder: "asc" } },
      },
    });
    if (!event) throw new ApiError(404, "eventNotFound");

    const mapped = {
      id: event.id, title: event.title, titleEn: event.titleEn,
      description: event.description, descriptionEn: event.descriptionEn,
      category: event.category ? { id: event.category.id, name: event.category.name, nameEn: event.category.nameEn, slug: event.category.slug, iconName: event.category.iconName } : null,
      status: event.status, startTime: event.startTime, endTime: event.endTime, imageUrl: event.imageUrl, isFeatured: event.isFeatured,
      createdByUsername: event.createdBy?.username ?? null,
      markets: event.markets.map((m) => ({
        id: m.id, name: m.name, nameEn: m.nameEn, type: m.type, status: m.status, marginFactor: m.marginFactor, sortOrder: m.sortOrder,
        outcomes: m.outcomes.map((o) => ({
          id: o.id, name: o.name, nameEn: o.nameEn, initialOdds: o.initialOdds, currentOdds: o.currentOdds, totalStaked: o.totalStaked, resultStatus: o.resultStatus,
        })),
      })),
      createdAt: event.createdAt, updatedAt: event.updatedAt,
    };
    return NextResponse.json(serialize(mapped));
  } catch (err) {
    return errorResponse(err);
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    await requireRole(req, "ADMIN");
    const body = await req.json();

    const data: Record<string, unknown> = {};
    if (body.title !== undefined) data.title = body.title;
    if (body.titleEn !== undefined) data.titleEn = body.titleEn;
    if (body.description !== undefined) data.description = body.description;
    if (body.descriptionEn !== undefined) data.descriptionEn = body.descriptionEn;
    if (body.categoryId !== undefined) data.categoryId = body.categoryId ? Number(body.categoryId) : null;
    if (body.startTime !== undefined) data.startTime = body.startTime ? new Date(body.startTime) : null;
    if (body.endTime !== undefined) data.endTime = body.endTime ? new Date(body.endTime) : null;
    if (body.imageUrl !== undefined) data.imageUrl = body.imageUrl;
    if (body.isFeatured !== undefined) data.isFeatured = body.isFeatured;

    // Validate endTime > startTime (considering both new and existing values)
    const existing = await prisma.event.findFirst({ where: { id, deletedAt: null } });
    if (!existing) throw new ApiError(404, "eventNotFound");
    const effectiveStart = data.startTime !== undefined ? data.startTime as Date | null : existing.startTime;
    const effectiveEnd = data.endTime !== undefined ? data.endTime as Date | null : existing.endTime;
    if (effectiveStart && effectiveEnd && effectiveEnd <= effectiveStart) {
      throw new ApiError(400, "endTimeAfterStart");
    }

    const event = await prisma.event.update({
      where: { id }, data,
      include: { category: true, markets: { include: { outcomes: true } } },
    });
    return NextResponse.json(serialize(event));
  } catch (err) {
    return errorResponse(err);
  }
}
