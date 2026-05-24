// Helpers to scrub API keys from strings before they hit the logger.
// Used in legacy routes (path carries the appApiKey as the first segment)
// and the indexer proxy (request line carries an upstream `apikey=` query
// parameter). Both expose real secrets when logged verbatim.

const QUERY_APIKEY_RE = /([?&](?:api[_-]?key|apikey)=)[^&\s]+/gi;
const PATH_APIKEY_RE = /^\/([^/?\s]+)(\/|$)/;
const REDACTED = "[REDACTED]";

/**
 * Redact `apikey=…` (and the common `api_key`, `api-key` variants) inside
 * any URL or HTTP request line. Returns the original input unchanged when
 * nothing was matched, so it is safe to wrap log fields unconditionally.
 */
export function redactApiKeyInQuery(input: string): string {
  if (!input) return input;
  return input.replace(QUERY_APIKEY_RE, `$1${REDACTED}`);
}

/**
 * Mask the first path segment of a Fastify request URL: legacy endpoints
 * use `/<apiKey>/<host>/api?…` where the very first segment is the user's
 * `appApiKey`. The minimum length guard avoids replacing routine path
 * segments like `/api`, `/login` that are obviously not secrets.
 */
export function redactApiKeyInPath(input: string): string {
  if (!input) return input;
  return input.replace(PATH_APIKEY_RE, (_match, seg: string, tail: string) => {
    if (seg.length < 8) return `/${seg}${tail}`;
    return `/${REDACTED}${tail}`;
  });
}

/**
 * Apply both path- and query-redaction to a single URL or request line.
 */
export function redactApiKey(input: string): string {
  return redactApiKeyInQuery(redactApiKeyInPath(input));
}
