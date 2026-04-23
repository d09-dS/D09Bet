import { Resend } from "resend";
import { prisma } from "./prisma";

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || "dotBet <noreply@dotbet.app>";
const DAILY_EMAIL_LIMIT = 90;

interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
}

/**
 * Check how many emails were sent today and whether the limit is reached.
 */
async function getDailyEmailCount(): Promise<number> {
  const setting = await prisma.systemSetting.findUnique({
    where: { key: "daily_email_count" },
  });

  if (!setting) return 0;

  const lastReset = setting.updatedAt ? new Date(setting.updatedAt) : new Date(0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Reset counter if it's a new day
  if (lastReset < today) {
    await prisma.systemSetting.upsert({
      where: { key: "daily_email_count" },
      update: { value: "0", updatedAt: new Date() },
      create: { key: "daily_email_count", value: "0", description: "Number of emails sent today (auto-managed)", dataType: "number" },
    });
    return 0;
  }

  return parseInt(setting.value, 10) || 0;
}

async function incrementDailyEmailCount(): Promise<void> {
  const current = await getDailyEmailCount();
  await prisma.systemSetting.upsert({
    where: { key: "daily_email_count" },
    update: { value: String(current + 1), updatedAt: new Date() },
    create: { key: "daily_email_count", value: "1", description: "Number of emails sent today (auto-managed)", dataType: "number" },
  });
}

export async function sendEmail({ to, subject, html }: SendEmailOptions): Promise<{ sent: boolean; limitReached?: boolean }> {
  if (!resend) {
    console.warn("[Email] RESEND_API_KEY not configured – skipping email");
    return { sent: false };
  }

  // Check daily limit
  const count = await getDailyEmailCount();
  if (count >= DAILY_EMAIL_LIMIT) {
    console.warn(`[Email] Daily limit reached (${count}/${DAILY_EMAIL_LIMIT}) – skipping email`);
    return { sent: false, limitReached: true };
  }

  try {
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
    });

    if (error) {
      console.error("[Email] Failed to send:", error);
      return { sent: false };
    }

    await incrementDailyEmailCount();
    return { sent: true };
  } catch (err) {
    console.error("[Email] Error:", err);
    return { sent: false };
  }
}
