/**
 * Coerce any thrown value into a human-readable string. Replaces the 18-fold
 * `err instanceof Error ? err.message : String(err)` pattern across the
 * codebase, including the ApiError-with-issues unpack used in the instance
 * dialog.
 *
 * The ApiError check is duck-typed (`name === "ApiError"` + `body` field)
 * rather than `instanceof`, so server-side modules can use this helper
 * without importing the client-only api-client module.
 */
export function describeError(err: unknown): string {
  if (err instanceof Error) {
    if (err.name === "ApiError" && "body" in err) {
      const fromIssues = describeApiIssues((err as { body: unknown }).body);
      if (fromIssues) return fromIssues;
    }
    return err.message;
  }
  return String(err);
}

function describeApiIssues(body: unknown): string | null {
  if (!body || typeof body !== "object" || !("issues" in body)) return null;
  const issues = (body as { issues?: { path?: unknown[]; message?: string }[] })
    .issues;
  if (!Array.isArray(issues) || issues.length === 0) return null;
  const formatted = issues
    .map((i) => {
      const field = Array.isArray(i.path) ? i.path.join(".") : "";
      return field ? `${field}: ${i.message}` : (i.message ?? "");
    })
    .filter(Boolean)
    .join("; ");
  return formatted.length > 0 ? formatted : null;
}

/**
 * Parse a server error body as returned by Fastify routes for the message
 * field only (no schema-issues unpack). Useful when the API contract puts the
 * upstream-rendered message in `body.message` and the call site wants to
 * prefer it over the generic `err.message`.
 */
export function extractErrorMessageOnly(body: unknown): string | null {
  if (body && typeof body === "object") {
    const obj = body as { message?: unknown };
    if (typeof obj.message === "string" && obj.message.length > 0)
      return obj.message;
  }
  return null;
}

/**
 * Parse a server error body for either `message` or `error` (string), falling
 * back to the body when it is itself a string. Returns "unknown" if neither
 * channel carried text.
 */
export function extractErrorMessage(body: unknown): string {
  if (body && typeof body === "object") {
    const obj = body as { message?: unknown; error?: unknown };
    if (typeof obj.message === "string" && obj.message.length > 0)
      return obj.message;
    if (typeof obj.error === "string" && obj.error.length > 0) return obj.error;
  }
  if (typeof body === "string" && body.length > 0) return body;
  return "unknown";
}

/**
 * Parse a server error body for the `error` code field used by the API
 * to signal well-known failure modes (e.g. "no_stored_creds", "csrf-invalid").
 */
export function extractErrorCode(body: unknown): string | null {
  if (body && typeof body === "object") {
    const obj = body as { error?: unknown };
    if (typeof obj.error === "string" && obj.error.length > 0) return obj.error;
  }
  return null;
}
