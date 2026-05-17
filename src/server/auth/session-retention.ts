import { prisma } from "@/lib/db";
import type { AppLogger } from "@/server/logging/logger";

const FIRST_TICK_MS = 60_000;
const INTERVAL_MS = 6 * 60 * 60 * 1000;

interface SessionRetentionOptions {
  logger: AppLogger;
}

// Periodically removes expired sessions so the table doesn't grow unbounded.
// `getSession()` already lazily deletes expired rows on read, but sessions for
// users who never come back leak until restart without this sweep.
export class SessionRetentionScheduler {
  private timer: NodeJS.Timeout | null = null;
  private running = false;

  constructor(private readonly opts: SessionRetentionOptions) {}

  start(): void {
    this.timer = setTimeout(() => this.tick(), FIRST_TICK_MS);
  }

  stop(): void {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
  }

  async runNow(): Promise<number> {
    return this.purge();
  }

  private async tick(): Promise<void> {
    await this.purge();
    this.timer = setTimeout(() => this.tick(), INTERVAL_MS);
  }

  private async purge(): Promise<number> {
    if (this.running) return 0;
    this.running = true;
    try {
      const result = await prisma.session.deleteMany({
        where: { expiresAt: { lt: new Date() } },
      });
      if (result.count > 0) {
        this.opts.logger.info(
          { deleted: result.count },
          "expired sessions cleaned up",
        );
      }
      return result.count;
    } catch (err) {
      this.opts.logger.error({ err }, "session retention cleanup failed");
      return 0;
    } finally {
      this.running = false;
    }
  }
}
