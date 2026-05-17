export class HostRateLimiter {
    private lastFetch = new Map<string, number>();

    constructor(private readonly minIntervalMs: number = 1000) {
    }

    async wait(host: string): Promise<void> {
        const last = this.lastFetch.get(host);
        if (last !== undefined) {
            const wait = last + this.minIntervalMs - Date.now();
            if (wait > 0) await new Promise((r) => setTimeout(r, wait));
        }
        this.lastFetch.set(host, Date.now());
    }
}
