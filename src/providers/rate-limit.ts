// Per-host start-spacing limiter for title-provider HTTP calls.
//
// The naive "remember the last fetch timestamp" pattern races under
// parallelism: when several callers invoke wait() in the same tick they all
// read the same lastFetch value, all compute the same wait, and all start
// in lockstep, leaking the rate budget. This implementation uses a per-host
// promise chain: each call queues a "slot" that resolves minIntervalMs after
// it acquired its turn, so the *next* caller can only proceed minIntervalMs
// later. Only the START of each request is rate-limited; in-flight requests
// themselves may overlap, which is the whole point of bulk parallelism.
export class HostRateLimiter {
  private readonly chain = new Map<string, Promise<void>>();

  constructor(private readonly minIntervalMs: number = 1000) {}

  async wait(host: string): Promise<void> {
    const prev = this.chain.get(host) ?? Promise.resolve();
    let release: () => void = () => {};
    const slot = new Promise<void>((r) => {
      release = r;
    });
    this.chain.set(host, slot);
    await prev;
    if (this.minIntervalMs > 0) {
      setTimeout(release, this.minIntervalMs);
    } else {
      release();
    }
  }
}
