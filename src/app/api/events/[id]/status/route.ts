import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { serialize, errorResponse, ApiError, requireRole } from "@/lib/api-utils";
import { EventStatus } from "@/generated/prisma/client";
import { logAction } from "@/lib/audit";

const VALID_TRANSITIONS: Record<string, EventStatus[]> = {
  DRAFT: ["OPEN", "CANCELED"],
  OPEN: ["CLOSED", "CANCELED"],
  CLOSED: ["SETTLED", "CANCELED"],
};

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const admin = await requireRole(req, "ADMIN");

    const { status } = (await req.json()) as { status: string };
    if (!status) throw new ApiError(400, "statusRequired");

    const event = await prisma.event.findFirst({
      where: { id, deletedAt: null },
      include: { category: { select: { name: true } } },
    });
    if (!event) throw new ApiError(404, "eventNotFound");

    const allowed = VALID_TRANSITIONS[event.status];
    if (!allowed || !allowed.includes(status as EventStatus)) {
      throw new ApiError(400, "invalidStatusTransition", undefined, { from: event.status, to: status });
    }

    const newStatus = status as EventStatus;

    // Prevent SETTLED unless every market has been settled
    if (newStatus === "SETTLED") {
      const markets = await prisma.market.findMany({ where: { eventId: id } });
      const unsettled = markets.filter((m) => m.status !== "SETTLED" && m.status !== "CANCELED");
      if (unsettled.length > 0) {
        throw new ApiError(400, "allMarketsSettledRequired");
      }
    }

    if (newStatus === "CANCELED") {
      const updated = await prisma.$transaction(async (tx) => {
        await tx.market.updateMany({ where: { eventId: id }, data: { status: "CANCELED" } });
        return tx.event.update({
          where: { id }, data: { status: newStatus },
          include: { category: true, markets: { include: { outcomes: true } } },
        });
      });
      logAction(admin.id, "CHANGE_EVENT_STATUS", "Event", id, {
        title: event.title, from: event.status, to: newStatus,
        categoryName: (event.category as { name: string } | null)?.name ?? null,
      });
      return NextResponse.json(serialize(updated));
    }

    const updated = await prisma.event.update({
      where: { id },
      data: {
        status: newStatus,
        // Automatically set startTime to now when the event is opened
        ...(newStatus === "OPEN" && !event.startTime ? { startTime: new Date() } : {}),
      },
      include: { category: true, markets: { include: { outcomes: true } } },
    });
    logAction(admin.id, "CHANGE_EVENT_STATUS", "Event", id, {
      title: event.title, from: event.status, to: newStatus,
      categoryName: (event.category as { name: string } | null)?.name ?? null,
    });
    return NextResponse.json(serialize(updated));
  } catch (err) {
    return errorResponse(err);
  }
}
