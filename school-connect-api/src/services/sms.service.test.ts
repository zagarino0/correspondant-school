import { describe, expect, it, vi } from "vitest";

vi.mock("../config/env.js", () => ({
  env: {
    SMS_ENABLED: true,
    SMS_PROVIDER: "stub",
    SMS_MAX_ATTEMPTS: 3,
    SMS_RETRY_BASE_DELAY_MS: 0,
    SMS_WORKER_INTERVAL_MS: 15_000,
  },
}));

import { enqueueSmsNotification, processSmsQueue } from "./sms.service.js";
import type { SmsProvider } from "./sms.provider.js";

type SmsRow = {
  id: string;
  status: "PENDING" | "SENDING" | "SENT" | "FAILED" | "SKIPPED";
  attempts: number;
  nextAttemptAt: Date;
  lastAttemptAt: Date | null;
  recipientPhone: string;
  message: string;
  provider: string;
  providerMessageId: string | null;
  sentAt: Date | null;
  error: string | null;
};

function createFakePrisma(rows: SmsRow[]) {
  const updates: Array<{ status?: SmsRow["status"] }> = [];

  return {
    updates,
    smsNotification: {
      create: vi.fn(async ({ data }: { data: Partial<SmsRow> }) => {
        const row: SmsRow = {
          id: `sms-${rows.length + 1}`,
          attempts: 0,
          lastAttemptAt: null,
          providerMessageId: null,
          sentAt: null,
          ...data,
        } as SmsRow;
        rows.push(row);
        return row;
      }),
      updateMany: vi.fn(async ({ where, data }: any) => {
        const row = rows.find((item) => {
          if (where.id && item.id !== where.id) return false;
          if (where.status === "PENDING" && item.status !== "PENDING") return false;
          if (where.status?.in && !where.status.in.includes(item.status)) return false;
          if (where.nextAttemptAt?.lte && item.nextAttemptAt > where.nextAttemptAt.lte) return false;
          if (where.lastAttemptAt?.lt && (!item.lastAttemptAt || item.lastAttemptAt >= where.lastAttemptAt.lt)) return false;
          return true;
        });

        if (!row) return { count: 0 };

        if (data.status) {
          row.status = data.status;
          updates.push({ status: data.status });
        }
        if (data.attempts?.increment) row.attempts += data.attempts.increment;
        if (data.lastAttemptAt) row.lastAttemptAt = data.lastAttemptAt;
        if (data.nextAttemptAt) row.nextAttemptAt = data.nextAttemptAt;
        return { count: 1 };
      }),
      findUnique: vi.fn(async ({ where }: any) => rows.find((item) => item.id === where.id) ?? null),
      findMany: vi.fn(async ({ where }: any) =>
        rows
          .filter((item) =>
            item.status === where.status &&
            item.nextAttemptAt <= where.nextAttemptAt.lte,
          )
          .map((item) => ({ id: item.id })),
      ),
      update: vi.fn(async ({ where, data }: any) => {
        const row = rows.find((item) => item.id === where.id);
        if (!row) throw new Error("SMS row not found");
        Object.assign(row, data);
        return row;
      }),
    },
  };
}

function makeRow(overrides: Partial<SmsRow> = {}): SmsRow {
  return {
    id: "sms-1",
    status: "PENDING",
    attempts: 0,
    nextAttemptAt: new Date(0),
    lastAttemptAt: null,
    recipientPhone: "+261321234567",
    message: "Test SMS",
    provider: "stub",
    providerMessageId: null,
    sentAt: null,
    error: null,
    ...overrides,
  };
}

describe("SMS queue lifecycle", () => {
  it("transitions PENDING -> SENDING -> SENT", async () => {
    const rows = [makeRow()];
    const prisma = createFakePrisma(rows);
    const provider: SmsProvider = {
      name: "stub",
      send: vi.fn(async () => ({ providerMessageId: "provider-1" })),
    };

    await processSmsQueue(prisma as never, provider);

    expect(provider.send).toHaveBeenCalledOnce();
    expect(prisma.updates.map((item) => item.status)).toContain("SENDING");
    expect(rows[0]?.status).toBe("SENT");
    expect(rows[0]?.providerMessageId).toBe("provider-1");
    expect(rows[0]?.sentAt).toBeInstanceOf(Date);
  });

  it("creates PENDING for an enabled valid Madagascar mobile", async () => {
    const rows: SmsRow[] = [];
    const prisma = createFakePrisma(rows);

    await enqueueSmsNotification(prisma as never, {
      recipientId: "parent-1",
      studentId: "student-1",
      parentSummonsId: "summons-1",
      type: "SUMMONS",
      phone: "032 12 34 567",
      message: "Convocation",
    });

    expect(rows[0]?.status).toBe("PENDING");
    expect(rows[0]?.recipientPhone).toBe("+261321234567");
    expect(rows[0]?.parentSummonsId).toBe("summons-1");
  });

  it("retries transient failures and then reaches SENT", async () => {
    const rows = [makeRow()];
    const prisma = createFakePrisma(rows);
    const provider: SmsProvider = {
      name: "stub",
      send: vi
        .fn()
        .mockRejectedValueOnce(new Error("temporary provider error"))
        .mockResolvedValueOnce({ providerMessageId: "provider-2" }),
    };

    await processSmsQueue(prisma as never, provider);
    expect(rows[0]?.status).toBe("PENDING");
    expect(rows[0]?.attempts).toBe(1);

    await processSmsQueue(prisma as never, provider);
    expect(provider.send).toHaveBeenCalledTimes(2);
    expect(rows[0]?.status).toBe("SENT");
    expect(rows[0]?.attempts).toBe(2);
  });

  it("reaches FAILED after the maximum attempts and never retries FAILED", async () => {
    const rows = [makeRow()];
    const prisma = createFakePrisma(rows);
    const provider: SmsProvider = {
      name: "stub",
      send: vi.fn(async () => {
        throw new Error("provider unavailable");
      }),
    };

    await processSmsQueue(prisma as never, provider);
    await processSmsQueue(prisma as never, provider);
    await processSmsQueue(prisma as never, provider);

    expect(provider.send).toHaveBeenCalledTimes(3);
    expect(rows[0]?.status).toBe("FAILED");
    expect(rows[0]?.attempts).toBe(3);

    await processSmsQueue(prisma as never, provider);
    expect(provider.send).toHaveBeenCalledTimes(3);
    expect(rows[0]?.status).toBe("FAILED");
  });

  it("creates SKIPPED when the parent has no valid Madagascar mobile", async () => {
    const rows: SmsRow[] = [];
    const prisma = createFakePrisma(rows);

    await enqueueSmsNotification(prisma as never, {
      recipientId: "parent-1",
      studentId: "student-1",
      parentSummonsId: "summons-1",
      type: "SUMMONS",
      phone: "invalid",
      message: "Convocation",
    });

    expect(rows[0]?.status).toBe("SKIPPED");
    expect(rows[0]?.error).toBe("NO_VALID_MADAGASCAR_MOBILE");
  });
});
