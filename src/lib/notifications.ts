import { prisma } from "./prisma";
import { sendEmail } from "./email";

type NotificationType = "USER_REGISTERED" | "BET_PLACED" | "EVENT_CREATED" | "EVENT_SETTLED" | "SYSTEM";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || "http://localhost:3000";

interface CreateNotificationOptions {
  type: NotificationType;
  title: string;
  message: string;
  entityType?: string;
  entityId?: string;
}

/** Map notification types to the appropriate admin tab */
const TAB_MAP: Record<NotificationType, string> = {
  USER_REGISTERED: "users",
  BET_PLACED: "events",
  EVENT_CREATED: "events",
  EVENT_SETTLED: "events",
  SYSTEM: "settings",
};

/**
 * Create a notification for all admin users and optionally send emails.
 */
export async function notifyAdmins(opts: CreateNotificationOptions) {
  const admins = await prisma.user.findMany({
    where: { role: "ADMIN", isActive: true, deletedAt: null },
    select: { id: true, email: true },
  });

  if (admins.length === 0) return;

  // Create in-app notifications for all admins
  await prisma.notification.createMany({
    data: admins.map((admin) => ({
      type: opts.type,
      title: opts.title,
      message: opts.message,
      entityType: opts.entityType ?? null,
      entityId: opts.entityId ?? null,
      adminId: admin.id,
    })),
  });

  // Send email to all admins
  const adminEmails = admins.map((a) => a.email);
  const tab = TAB_MAP[opts.type] || "events";

  try {
    const result = await sendEmail({
      to: adminEmails,
      subject: `[dotBet] ${opts.title}`,
      html: buildNotificationEmail(opts.title, opts.message, tab),
    });

    // If daily limit was reached, create an in-app warning for all admins
    if (result.limitReached) {
      await prisma.notification.createMany({
        data: admins.map((admin) => ({
          type: "SYSTEM" as const,
          title: "E-Mail-Limit erreicht",
          message: "Das tägliche E-Mail-Limit (90/100) wurde erreicht. Weitere Benachrichtigungen werden nur noch in der App angezeigt.",
          adminId: admin.id,
        })),
      });
    }
  } catch (err) {
    console.error("[Notification] Email error:", err);
  }
}

function buildNotificationEmail(title: string, message: string, tab: string): string {
  const adminUrl = `${APP_URL}/admin?tab=${tab}`;

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
      <div style="max-width:480px;margin:40px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
        <div style="background:#18181b;padding:24px 32px;">
          <h1 style="margin:0;color:#fff;font-size:18px;font-weight:600;">dotBet Admin</h1>
        </div>
        <div style="padding:32px;">
          <h2 style="margin:0 0 12px;font-size:16px;color:#18181b;">${title}</h2>
          <p style="margin:0 0 24px;color:#52525b;font-size:14px;line-height:1.6;">${message}</p>
          <a href="${adminUrl}"
             style="display:inline-block;background:#18181b;color:#fff;padding:10px 24px;border-radius:8px;text-decoration:none;font-size:14px;font-weight:500;">
            Admin-Panel &ouml;ffnen
          </a>
        </div>
        <div style="padding:16px 32px;background:#fafafa;border-top:1px solid #e4e4e7;">
          <p style="margin:0;color:#a1a1aa;font-size:12px;">Diese E-Mail wurde automatisch von dotBet gesendet.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}
