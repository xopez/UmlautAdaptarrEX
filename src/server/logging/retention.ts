import {prisma} from "@/lib/db";
import type {AppLogger} from "./logger";
import {getAppState} from "@/server/state";

const FIRST_TICK_MS = 60_000;
const INTERVAL_MS = 6 * 60 * 60 * 1000;

interface LogRetentionOptions {
    logger: AppLogger;
}

// Retention days are read live from settings on each tick so UI changes apply
// without a restart.
export class LogRetentionScheduler {
    private timer: NodeJS.Timeout | null = null;
    private running = false;

    constructor(private readonly opts: LogRetentionOptions) {
    }

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
            const days = getAppState().settings.logRetentionDays;
            const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
            const result = await prisma.logEntry.deleteMany({
                where: {createdAt: {lt: cutoff}},
            });
            if (result.count > 0) {
                this.opts.logger.info(
                    {deleted: result.count, retentionDays: days},
                    "log retention cleanup",
                );
            }
            return result.count;
        } catch (err) {
            this.opts.logger.error({err}, "log retention cleanup failed");
            return 0;
        } finally {
            this.running = false;
        }
    }
}
