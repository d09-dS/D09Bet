import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { serialize, errorResponse, ApiError } from "@/lib/api-utils";
import { notifyAdmins } from "@/lib/notifications";
import { logAction } from "@/lib/audit";
import { checkRateLimit } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  try {
    const rateLimited = await checkRateLimit(req, "register");
    if (rateLimited) return rateLimited;

    const body = await req.json();
    const { username, email, password } = body;

    const fieldErrors: Record<string, string> = {};

    if (!username || typeof username !== "string" || username.length < 3 || username.length > 50) {
      fieldErrors.username = "Username must be between 3 and 50 characters";
    }
    if (!email || typeof email !== "string" || !email.includes("@")) {
      fieldErrors.email = "A valid email is required";
    }
    if (!password || typeof password !== "string" || password.length < 6 || password.length > 100) {
      fieldErrors.password = "Password must be between 6 and 100 characters";
    }
    if (Object.keys(fieldErrors).length > 0) {
      throw new ApiError(400, "Validation failed", fieldErrors);
    }

    const existing = await prisma.user.findFirst({
      where: { OR: [{ username: username.trim() }, { email: email.trim().toLowerCase() }] },
    });
    if (existing) {
      if (existing.username === username.trim()) {
        throw new ApiError(400, "Username already exists", { username: "Username already exists" });
      }
      throw new ApiError(400, "Email already exists", { email: "Email already exists" });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    // New users are inactive until an admin approves them
    const newUser = await prisma.user.create({
      data: {
        username: username.trim(),
        email: email.trim().toLowerCase(),
        passwordHash,
        isActive: false,
      },
    });

    // Notify admins about the new registration (fire-and-forget)
    notifyAdmins({
      type: "USER_REGISTERED",
      title: "Neue Registrierung",
      message: `Benutzer "${newUser.username}" (${newUser.email}) hat sich registriert und wartet auf Freischaltung.`,
      entityType: "USER",
      entityId: newUser.id,
    }).catch((err) => console.error("[Register] Notification error:", err));

    logAction(newUser.id, "USER_REGISTERED", "User", newUser.id, { username: newUser.username, email: newUser.email });

    return NextResponse.json(
      serialize({ message: "Registration successful. An admin must approve your account before you can log in." }),
      { status: 201 },
    );
  } catch (err) {
    return errorResponse(err);
  }
}
