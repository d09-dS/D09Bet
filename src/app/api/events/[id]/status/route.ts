import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { serialize, errorResponse, ApiError, requireRole } from "@/lib/api-utils";
import { EventStatus } from "@/generated/prisma/client";

const VALID_TRANSITIONS: Record<string, EventStatus[]> = {
  DRAFT: ["SCHEDULED", "CANCELED"],
  SCHEDULED: ["OPEN", "CANCELED"],
  OPEN: ["CLOSED", "CANCELED"],
  CLOSED: ["SETTLED", "CANCELED"],
};

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    await requireRole(req, "MODERATOR", "ADMIN");

    const { status } = (await req.json()) as { status: string };
    if (!status) throw new ApiError(400, "status is required");

    const event = await prisma.event.findFirst({ where: { id, deletedAt: null } });
    if (!event) throw new ApiError(404, "Event not found");

    const allowed = VALID_TRANSITIONS[event.status];
    if (!allowed || !allowed.includes(status as EventStatus)) {
      throw new ApiError(400, `Cannot transition from ${event.status} to ${status}`);
    }

    const newStatus = status as EventStatus;

    // Prevent SETTLED unless every market has been settled
    if (newStatus === "SETTLED") {
      const markets = await prisma.market.findMany({ where: { eventId: id } });
      const unsettled = markets.filter((m) => m.status !== "SETTLED" && m.status !== "CANCELED");
      if (unsettled.length > 0) {
        throw new ApiError(400, "All markets must be settled before the event can be marked as SETTLED");
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
      return NextResponse.json(serialize(updated));
    }

    const updated = await prisma.event.update({
      where: { id }, data: { status: newStatus },
      include: { category: true, markets: { include: { outcomes: true } } },
    });
    return NextResponse.json(serialize(updated));
  } catch (err) {
    return errorResponse(err);
  }
}
