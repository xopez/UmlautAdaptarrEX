import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { mockLog, mockState } = vi.hoisted(() => ({
  mockLog: {
    deleteMany: vi.fn(),
  },
  mockState: {
    settings: { logRetentionDays: 14 },
  },
}));

vi.mock("@/lib/db", () => ({
  prisma: { logEntry: mockLog },
}));

vi.mock("@/server/state", () => ({
  getAppState: () => mockState,
}));

import { LogRetentionScheduler } from "@/server/logging/retention";

interface MockLogger {
  info: ReturnType<typeof vi.fn>;
  warn: ReturnType<typeof vi.fn>;
  error: ReturnType<typeof vi.fn>;
  debug: ReturnType<typeof vi.fn>;
  fatal: ReturnType<typeof vi.fn>;
  trace: ReturnType<typeof vi.fn>;
}

function makeLogger(): MockLogger {
  return {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    fatal: vi.fn(),
    trace: vi.fn(),
  };
}

beforeEach(() => {
  mockLog.deleteMany.mockReset();
  mockState.settings.logRetentionDays = 14;
});

afterEach(() => {
  mockLog.deleteMany.mockReset();
});

describe("LogRetentionScheduler", () => {
  it("deletes log rows older than the retention window from settings", async () => {
    mockState.settings.logRetentionDays = 7;
    mockLog.deleteMany.mockResolvedValueOnce({ count: 3 });

    const logger = makeLogger();
    const sched = new LogRetentionScheduler({ logger: logger as never });

    const before = Date.now();
    await sched.runNow();
    const after = Date.now();

    expect(mockLog.deleteMany).toHaveBeenCalledOnce();
    const cutoff = (
      mockLog.deleteMany.mock.calls[0]?.[0] as {
        where: { createdAt: { lt: Date } };
      }
    ).where.createdAt.lt;
    expect(cutoff).toBeInstanceOf(Date);

    const expectedFloor = before - 7 * 24 * 60 * 60 * 1000;
    const expectedCeil = after - 7 * 24 * 60 * 60 * 1000;
    expect(cutoff.getTime()).toBeGreaterThanOrEqual(expectedFloor - 100);
    expect(cutoff.getTime()).toBeLessThanOrEqual(expectedCeil + 100);

    expect(logger.info).toHaveBeenCalledOnce();
  });

  it("does not log when nothing was deleted", async () => {
    mockLog.deleteMany.mockResolvedValueOnce({ count: 0 });
    const logger = makeLogger();
    const sched = new LogRetentionScheduler({ logger: logger as never });
    await sched.runNow();
    expect(logger.info).not.toHaveBeenCalled();
  });

  it("logs an error and returns 0 on failure", async () => {
    mockLog.deleteMany.mockRejectedValueOnce(new Error("io"));
    const logger = makeLogger();
    const sched = new LogRetentionScheduler({ logger: logger as never });
    expect(await sched.runNow()).toBe(0);
    expect(logger.error).toHaveBeenCalledOnce();
  });

  it("stop() is safe before start()", () => {
    const logger = makeLogger();
    const sched = new LogRetentionScheduler({ logger: logger as never });
    expect(() => sched.stop()).not.toThrow();
  });
});
