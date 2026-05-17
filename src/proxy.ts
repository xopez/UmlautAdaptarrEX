import { type NextRequest, NextResponse } from "next/server";

// Single source of truth for "are we still in the setup wizard?".
// Runs before every page render and short-circuits the user back to /setup
// until the wizard finishes.
//
// Why a proxy instead of per-layout fetches: /login, /, /dashboard, and
// the static /setup page each have different layouts; a proxy covers
// them uniformly without sprinkling redirect calls into every entry point.
//
// We deliberately scope the matcher to page routes only. Static assets,
// _next chunks, and the /api proxy paths handled by `next.config.ts`
// rewrites bypass this proxy so we don't pay a Fastify roundtrip per
// asset request.

const API_UPSTREAM = process.env.API_UPSTREAM ?? "http://127.0.0.1:5005";

export async function proxy(req: NextRequest): Promise<NextResponse> {
  const { pathname } = req.nextUrl;

  let setupComplete = false;
  try {
    const res = await fetch(`${API_UPSTREAM}/api/auth/setup-status`, {
      cache: "no-store",
    });
    if (res.ok) {
      const body = (await res.json()) as { setupComplete?: boolean };
      setupComplete = body.setupComplete === true;
    }
  } catch {
    // Fastify unreachable (e.g. boot race): let the request through so the
    // user sees Next's normal error path instead of a redirect loop.
    return NextResponse.next();
  }

  if (!setupComplete && pathname !== "/setup") {
    const url = req.nextUrl.clone();
    url.pathname = "/setup";
    url.search = "";
    return NextResponse.redirect(url);
  }
  if (setupComplete && pathname === "/setup") {
    const url = req.nextUrl.clone();
    url.pathname = "/dashboard";
    url.search = "";
    return NextResponse.redirect(url);
  }

  // Expose the pathname to downstream Server Components so a server-side
  // 401 (e.g. expired admin session) can redirect to /login with a working
  // `next` param.
  const headers = new Headers(req.headers);
  headers.set("x-pathname", pathname);
  return NextResponse.next({ request: { headers } });
}

export const config = {
  matcher: [
    // Skip API rewrites, Next internals, and static assets. Everything else
    // is a page route that should respect the setup gate.
    "/((?!api/|_next/|brand/|favicon\\.ico).*)",
  ],
};
