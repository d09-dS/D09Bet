import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { serialize, errorResponse, ApiError, requireRole, parsePagination, pageResponse } from "@/lib/api-utils";
import { EventStatus, Prisma } from "@/generated/prisma/client";
import { notifyAdmins } from "@/lib/notifications";
import { logAction } from "@/lib/audit";

export async function GET(req: NextRequest) {
  try {
    const { page, size, skip, take } = parsePagination(req, 12);
    const url = req.nextUrl;

    const status = url.searchParams.get("status") as EventStatus | null;
    const categoryId = url.searchParams.get("categoryId");
    const search = url.searchParams.get("search");

    const where: Prisma.EventWhereInput = { deletedAt: null };
    if (status) where.status = status;
    if (categoryId) where.categoryId = Number(categoryId);
    if (search) where.title = { contains: search, mode: "insensitive" };

    const includeMarkets = url.searchParams.get("include") === "markets";

    const include: Record<string, unknown> = { category: true };
    if (includeMarkets) {
      include.markets = { include: { outcomes: { orderBy: { sortOrder: "asc" } } }, orderBy: { sortOrder: "asc" } };
    }

    const [events, total] = await Promise.all([
      prisma.event.findMany({ where, include, orderBy: { createdAt: "desc" }, skip, take }),
      prisma.event.count({ where }),
    ]);

    const mapped = events.map((e: Record<string, unknown>) => {
      const base: Record<string, unknown> = {
        id: e.id, title: e.title, titleEn: e.titleEn, description: e.description,
        descriptionEn: e.descriptionEn,
        category: e.category ? { id: (e.category as Record<string, unknown>).id, name: (e.category as Record<string, unknown>).name, nameEn: (e.category as Record<string, unknown>).nameEn, slug: (e.category as Record<string, unknown>).slug, iconName: (e.category as Record<string, unknown>).iconName } : null,
        status: e.status, startTime: e.startTime, endTime: e.endTime, imageUrl: e.imageUrl, isFeatured: e.isFeatured, createdAt: e.createdAt,
      };
      if (includeMarkets && Array.isArray(e.markets)) {
        base.markets = (e.markets as Record<string, unknown>[]).map((m) => ({
          id: m.id, name: m.name, nameEn: m.nameEn, type: m.type, status: m.status, marginFactor: m.marginFactor, sortOrder: m.sortOrder,
          outcomes: (m.outcomes as Record<string, unknown>[]).map((o) => ({
            id: o.id, name: o.name, nameEn: o.nameEn, initialOdds: o.initialOdds, currentOdds: o.currentOdds, totalStaked: o.totalStaked, resultStatus: o.resultStatus,
          })),
        }));
      }
      return base;
    });

    return NextResponse.json(serialize(pageResponse(mapped, total, page, size)));
  } catch (err) {
    return errorResponse(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireRole(req, "USER", "ADMIN");
    const body = await req.json();
    const { title, titleEn, description, descriptionEn, categoryId, endTime, imageUrl, isFeatured } = body;

    if (!title) throw new ApiError(400, "titleRequired");

    const parsedEnd = endTime ? new Date(endTime) : null;

    const event = await prisma.event.create({
      data: {
        title, titleEn: titleEn ?? null, description: description ?? null,
        descriptionEn: descriptionEn ?? null,
        categoryId: categoryId ? Number(categoryId) : null,
        status: "DRAFT", visibility: "PUBLIC",
        startTime: null,
        endTime: parsedEnd,
        imageUrl: imageUrl ?? null, isFeatured: isFeatured ?? false,
        createdById: user.id,
      },
      include: { category: true, markets: { include: { outcomes: true } } },
    });

    // Notify admins when a non-admin user creates an event
    if (user.role !== "ADMIN") {
      notifyAdmins({
        type: "EVENT_CREATED",
        title: "Neue Wette zur Prüfung",
        message: `Benutzer "${user.username}" hat eine Wette erstellt: "${event.title}" — bitte prüfen und freigeben.`,
        entityType: "EVENT",
        entityId: event.id,
      }).catch((err) => console.error("[Event] Notification error:", err));
    }

    logAction(user.id, "CREATE_EVENT", "Event", event.id, {
      title: event.title,
      status: "DRAFT",
      categoryName: (event.category as { name: string } | null)?.name ?? null,
    });

    return NextResponse.json(serialize(event), { status: 201 });
  } catch (err) {
    return errorResponse(err);
  }
}
