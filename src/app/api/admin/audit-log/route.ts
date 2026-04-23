import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { serialize, errorResponse, requireRole, parsePagination, pageResponse } from "@/lib/api-utils";
import { Prisma } from "@/generated/prisma/client";

export async function GET(req: NextRequest) {
  try {
    await requireRole(req, "ADMIN");
    const { page, size, skip, take } = parsePagination(req, 50);

    const action = req.nextUrl.searchParams.get("action");
    const category = req.nextUrl.searchParams.get("category");
    const where: Prisma.AdminAuditLogWhereInput = {};
    if (action) {
      const actions = action.split(",");
      where.action = actions.length === 1 ? actions[0] : { in: actions };
    }
    if (category) {
      // Find all event IDs belonging to this category, then filter audit logs by those
      const eventsInCategory = await prisma.event.findMany({
        where: { category: { name: category }, deletedAt: null },
        select: { id: true },
      });
      const eventIds = eventsInCategory.map((e) => e.id);
      where.entityType = "Event";
      where.entityId = { in: eventIds };
    }

    const [logs, total] = await Promise.all([
      prisma.adminAuditLog.findMany({
        where, orderBy: { createdAt: "desc" }, skip, take,
        include: { admin: { select: { id: true, username: true } } },
      }),
      prisma.adminAuditLog.count({ where }),
    ]);

    // Enrich Event entries with event title if not in details
    const eventIds = logs
      .filter((l) => l.entityType === "Event" && l.entityId)
      .map((l) => l.entityId as string);
    const eventMap: Record<string, string> = {};
    if (eventIds.length > 0) {
      const events = await prisma.event.findMany({
        where: { id: { in: eventIds } },
        select: { id: true, title: true },
      });
      events.forEach((e) => { eventMap[e.id] = e.title; });
    }

    const enriched = logs.map((l) => ({
      ...l,
      eventTitle: l.entityId ? (eventMap[l.entityId] ?? null) : null,
    }));

    return NextResponse.json(serialize(pageResponse(enriched, total, page, size)));
  } catch (err) {
    return errorResponse(err);
  }
}
