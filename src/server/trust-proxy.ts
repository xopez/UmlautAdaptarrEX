// Parses the `TRUST_PROXY` env var into a Fastify-compatible value.
//   - Unset / empty            → `false` (don't trust X-Forwarded-* at all)
//   - "true"                   → `true`  (trust any hop; opt-in for trusted networks only)
//   - integer                  → number of hops to trust (e.g. "1" = direct reverse proxy)
//   - "loopback"               → built-in shorthand
//   - comma-separated CIDRs/IPs → trust list (e.g. "127.0.0.1,::1,10.0.0.0/8")
//
// Default is `loopback` — safe baseline that trusts XFF only when the request
// arrived via 127.0.0.1/::1, blocking external XFF spoofing while still working
// behind a same-host reverse proxy. Override via env when fronted by an
// external proxy (e.g. Traefik on a different IP).
export type TrustProxyValue = boolean | number | string | string[];

export function parseTrustProxy(raw: string | undefined): TrustProxyValue {
  const value = (raw ?? "loopback").trim();
  if (value === "" || value === "false") return false;
  if (value === "true") return true;
  if (/^\d+$/.test(value)) return parseInt(value, 10);
  if (value.includes(",")) {
    return value
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return value;
}
