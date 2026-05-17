import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { mockSession } = vi.hoisted(() => ({
  mockSession: {
    deleteMany: vi.fn(),
  },
}));

vi.mock("@/lib/db", () => ({
  prisma: { session: mockSession },
}));

import { SessionRetentionScheduler } from "@/server/auth/session-retention";

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
  mockSession.deleteMany.mockReset();
});

afterEach(() => {
  mockSession.deleteMany.mockReset();
});

describe("SessionRetentionScheduler", () => {
  it("runNow deletes expired rows and returns the count", async () => {
    mockSession.deleteMany.mockResolvedValueOnce({ count: 7 });
    const logger = makeLogger();
    const sched = new SessionRetentionScheduler({ logger: logger as never });

    const deleted = await sched.runNow();

    expect(deleted).toBe(7);
    expect(mockSession.deleteMany).toHaveBeenCalledOnce();
    const where = mockSession.deleteMany.mock.calls[0]?.[0]?.where as {
      expiresAt: { lt: Date };
    };
    expect(where.expiresAt.lt).toBeInstanceOf(Date);
    expect(logger.info).toHaveBeenCalledOnce();
  });

  it("logs nothing when no rows are deleted", async () => {
    mockSession.deleteMany.mockResolvedValueOnce({ count: 0 });
    const logger = makeLogger();
    const sched = new SessionRetentionScheduler({ logger: logger as never });
    await sched.runNow();
    expect(logger.info).not.toHaveBeenCalled();
  });

  it("logs an error and returns 0 on database failure", async () => {
    mockSession.deleteMany.mockRejectedValueOnce(new Error("conn lost"));
    const logger = makeLogger();
    const sched = new SessionRetentionScheduler({ logger: logger as never });

    const deleted = await sched.runNow();

    expect(deleted).toBe(0);
    expect(logger.error).toHaveBeenCalledOnce();
  });

  it("re-entry is blocked while a previous purge is still running", async () => {
    let resolveDelete!: (v: { count: number }) => void;
    mockSession.deleteMany.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveDelete = resolve;
      }),
    );
    const logger = makeLogger();
    const sched = new SessionRetentionScheduler({ logger: logger as never });

    const first = sched.runNow();
    const second = sched.runNow();

    resolveDelete({ count: 0 });
    const [a, b] = await Promise.all([first, second]);
    expect(a).toBe(0);
    expect(b).toBe(0);
    expect(mockSession.deleteMany).toHaveBeenCalledOnce();
  });

  it("stop() clears the timer without throwing", () => {
    const logger = makeLogger();
    const sched = new SessionRetentionScheduler({ logger: logger as never });
    sched.start();
    expect(() => sched.stop()).not.toThrow();
    // Calling stop again is a no-op.
    expect(() => sched.stop()).not.toThrow();
  });
});
