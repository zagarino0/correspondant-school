import type { PrismaClient } from "@prisma/client";

import { env } from "../config/env.js";
import { createSmsProvider, type SmsProvider } from "./sms.provider.js";

const MADAGASCAR_MOBILE_E164 = /^\+2613[0-9]\d{7}$/;

export type SmsNotificationInput = {
  recipientId: string;
  studentId?: string | null;
  parentSummonsId?: string | null;
  announcementId?: string | null;
  type: "SUMMONS" | "ANNOUNCEMENT";
  phone?: string | null;
  message: string;
};

export function normalizeMadagascarMobile(phone?: string | null): string | null {
  if (!phone) return null;

  const compact = phone.trim().replace(/[\s().-]/g, "");

  let normalized = compact;
  if (/^0\d{9}$/.test(compact)) {
    normalized = `+261${compact.slice(1)}`;
  } else if (/^2613\d{8}$/.test(compact)) {
    normalized = `+${compact}`;
  } else if (/^\+2613\d{8}$/.test(compact)) {
    normalized = compact;
  }

  return MADAGASCAR_MOBILE_E164.test(normalized) ? normalized : null;
}

export async function enqueueSmsNotification(
  prisma: PrismaClient,
  input: SmsNotificationInput,
): Promise<void> {
  const normalizedPhone = normalizeMadagascarMobile(input.phone);

  const shouldSend = env.SMS_ENABLED && normalizedPhone;

  await prisma.smsNotification.create({
    data: {
      recipientId: input.recipientId,
      studentId: input.studentId ?? null,
      parentSummonsId: input.parentSummonsId ?? null,
      announcementId: input.announcementId ?? null,
      type: input.type,
      status: shouldSend ? "PENDING" : "SKIPPED",
      provider: env.SMS_PROVIDER,
      recipientPhone: normalizedPhone ?? input.phone?.trim() ?? "",
      message: input.message.slice(0, 1200),
      error: !normalizedPhone
        ? "NO_VALID_MADAGASCAR_MOBILE"
        : !env.SMS_ENABLED
          ? "SMS_DISABLED"
          : null,
      nextAttemptAt: new Date(),
    },
  });
}

async function processOne(
  prisma: PrismaClient,
  provider: SmsProvider,
  id: string,
): Promise<void> {
  const claim = await prisma.smsNotification.updateMany({
    where: {
      id,
      status: {
        in: ["PENDING", "FAILED"],
      },
      nextAttemptAt: {
        lte: new Date(),
      },
    },
    data: {
      status: "SENDING",
      attempts: {
        increment: 1,
      },
      lastAttemptAt: new Date(),
    },
  });

  if (claim.count === 0) return;

  const notification = await prisma.smsNotification.findUnique({
    where: { id },
  });

  if (!notification) return;

  try {
    const result = await provider.send({
      to: notification.recipientPhone,
      message: notification.message,
    });

    await prisma.smsNotification.update({
      where: { id },
      data: {
        status: "SENT",
        provider: provider.name,
        providerMessageId: result.providerMessageId ?? null,
        sentAt: new Date(),
        error: null,
        nextAttemptAt: new Date(),
      },
    });
  } catch (error) {
    const attempts = notification.attempts;
    const exhausted = attempts >= env.SMS_MAX_ATTEMPTS;
    const nextAttemptAt = exhausted
      ? new Date()
      : new Date(
          Date.now() +
            env.SMS_RETRY_BASE_DELAY_MS * Math.pow(2, Math.max(0, attempts - 1)),
        );

    await prisma.smsNotification.update({
      where: { id },
      data: {
        status: exhausted ? "FAILED" : "PENDING",
        error: error instanceof Error ? error.message.slice(0, 1000) : String(error).slice(0, 1000),
        nextAttemptAt,
      },
    });
  }
}

export async function processSmsQueue(
  prisma: PrismaClient,
  provider: SmsProvider,
): Promise<void> {
  const staleBefore = new Date(Date.now() - 10 * 60 * 1000);

  await prisma.smsNotification.updateMany({
    where: {
      status: "SENDING",
      lastAttemptAt: {
        lt: staleBefore,
      },
    },
    data: {
      status: "PENDING",
      nextAttemptAt: new Date(),
    },
  });

  const notifications = await prisma.smsNotification.findMany({
    where: {
      status: "PENDING",
      nextAttemptAt: {
        lte: new Date(),
      },
    },
    orderBy: {
      createdAt: "asc",
    },
    take: 10,
    select: {
      id: true,
    },
  });

  for (const notification of notifications) {
    await processOne(prisma, provider, notification.id);
  }
}

export function startSmsWorker(prisma: PrismaClient): () => void {
  if (!env.SMS_ENABLED) {
    return () => undefined;
  }

  const provider = createSmsProvider();
  let running = false;

  const tick = async () => {
    if (running) return;
    running = true;

    try {
      await processSmsQueue(prisma, provider);
    } catch (error) {
      console.error("[SMS worker] queue processing failed:", error);
    } finally {
      running = false;
    }
  };

  void tick();
  const timer = setInterval(() => {
    void tick();
  }, env.SMS_WORKER_INTERVAL_MS);

  return () => clearInterval(timer);
}

export function buildSummonsSmsMessage(input: {
  studentFirstName: string;
  studentLastName: string;
  reason: string;
  scheduledAt?: Date | null;
}): string {
  const appointment = input.scheduledAt
    ? new Intl.DateTimeFormat("fr-FR", {
        timeZone: "Indian/Antananarivo",
        dateStyle: "short",
        timeStyle: "short",
      }).format(input.scheduledAt)
    : "à confirmer";

  return [
    "Correspondant - Convocation parent",
    `Élève : ${input.studentFirstName} ${input.studentLastName}`,
    `Motif : ${input.reason}`,
    `Rendez-vous : ${appointment}`,
    "Consultez l'application Correspondant pour les détails.",
  ].join(". ");
}
