import type { FastifyReply, FastifyRequest } from "fastify";
import { nanoid } from "nanoid";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/auth/password";
import {
  createSession,
  SESSION_COOKIE,
  SESSION_TTL_MS,
} from "@/lib/auth/session";
import { CSRF_COOKIE } from "@/lib/auth/csrf";
import { loadSetting } from "@/lib/setting-helpers";
import { isVaultToken, resolveVaultToken } from "@/server/prowlarr-key-vault";
import type { SetupInput } from "@/schemas/auth";
import { InstallProxySchema } from "@/schemas/prowlarr";
import { installUmlautProxy } from "@/arr/prowlarr";
import { getAppState } from "@/server/state";
import { getPlugin } from "@/domain/plugins";
import { parseOrReply } from "./_helpers";
import { arrayToCsv } from "./instances-crud";
import { csrfCookieOptions, sessionCookieOptions } from "./_auth-cookies";

type ProwlarrInstance = NonNullable<SetupInput["prowlarrInstances"]>[number];
type PluginSelection = NonNullable<SetupInput["plugins"]>[number];

interface ProxyInstallOutcome {
  ok: boolean;
  error?: string;
}

// Validate that no enabled non-DE plugin slips through without a TMDB key.
// Without this guard the wizard would silently produce empty variations.
// Returns true if validation passed, false if a 422 response was already sent.
function validateTmdbForPlugins(
  data: SetupInput,
  reply: FastifyReply,
): boolean {
  const tmdbProvided = !!data.tmdbApiKey?.trim();
  if (!data.plugins?.length || tmdbProvided) return true;
  const blocked = data.plugins
    .filter((p) => p.enabled)
    .map((p) => getPlugin(p.id))
    .filter(
      (p): p is NonNullable<typeof p> => p !== undefined && p.language !== "de",
    );
  if (blocked.length === 0) return true;
  reply.code(422).send({
    error: "tmdb_required",
    languages: Array.from(new Set(blocked.map((p) => p.language))),
    message:
      "Selected non-German language plugins need a TMDB v3 API key, provide one in step 1 or deselect those plugins.",
  });
  return false;
}

async function persistInitialSettings(
  data: SetupInput,
  apiKey: string,
): Promise<void> {
  // Wizard default = "proxy" (recommended). Anyone who doesn't pick a mode
  // in setup (e.g. older SDK clients) gets the recommended value. The DB
  // default "both" only applies to migrations *without* a fresh setup run,
  // so existing installations don't silently lose functionality.
  const operationMode = data.operationMode ?? "proxy";
  const fields = {
    appApiKey: apiKey,
    tmdbApiKey: data.tmdbApiKey ?? null,
    proxyUsername: data.proxyUsername,
    proxyPassword: data.proxyPassword,
    operationMode,
    setupComplete: true,
  };
  await prisma.setting.upsert({
    where: { id: 1 },
    update: fields,
    create: { id: 1, ...fields },
  });
}

async function persistPluginSelections(
  plugins: PluginSelection[],
): Promise<void> {
  for (const p of plugins) {
    if (!getPlugin(p.id)) continue;
    await prisma.plugin.upsert({
      where: { id: p.id },
      create: { id: p.id, enabled: p.enabled },
      update: { enabled: p.enabled },
    });
  }
}

// Returns null on success, or a Fastify reply payload to short-circuit the
// caller when a vault token has expired (the user must re-run the preview).
async function importProwlarrInstances(
  instances: ProwlarrInstance[],
  reply: FastifyReply,
): Promise<{ aborted: true } | { aborted: false }> {
  for (const inst of instances) {
    // Resolve a vault token back to the real key. Reject expired or
    // unknown tokens, we'd otherwise persist the literal sentinel
    // string as the apiKey, which silently breaks the import.
    let resolvedKey = inst.apiKey;
    if (isVaultToken(resolvedKey)) {
      const real = resolveVaultToken(resolvedKey);
      if (!real) {
        reply.code(409).send({
          error: "stale_preview",
          message:
            "Prowlarr application keys have expired. Reload the preview and re-submit.",
        });
        return { aborted: true };
      }
      resolvedKey = real;
    }
    await prisma.arrInstance.upsert({
      where: { type_name: { type: inst.type, name: inst.name } },
      create: {
        type: inst.type,
        name: inst.name,
        host: inst.host,
        apiKey: resolvedKey,
        enabled: inst.enabled,
        // Otherwise the order chosen in the wizard never reaches the DB and
        // the first sync fails with "No title provider could be built", even
        // though the UI shows everything correctly thanks to its fallback.
        providerOrder: arrayToCsv(inst.providerOrder),
      },
      update: {
        host: inst.host,
        apiKey: resolvedKey,
        enabled: inst.enabled,
      },
    });
  }
  return { aborted: false };
}

async function maybeInstallProxyInProwlarr(
  data: SetupInput,
  req: FastifyRequest,
): Promise<ProxyInstallOutcome | null> {
  if (!data.installProxyInProwlarr) return null;
  const stored = await loadSetting();
  if (!stored?.prowlarrHost || !stored?.prowlarrApiKey) {
    return { ok: false, error: "no_stored_creds" };
  }
  const result = await installUmlautProxy(
    {
      prowlarrHost: stored.prowlarrHost,
      prowlarrApiKey: stored.prowlarrApiKey,
      host: data.installProxyInProwlarr.host,
      port: stored.proxyPort,
      username: data.proxyUsername,
      password: data.proxyPassword,
      userAgent: getAppState().settings.userAgent,
    },
    req.log,
  );
  return result.ok ? { ok: true } : { ok: false, error: result.error };
}

function setSessionCookies(
  reply: FastifyReply,
  req: FastifyRequest,
  sessionId: string,
): string {
  reply.setCookie(
    SESSION_COOKIE,
    sessionId,
    sessionCookieOptions(req, SESSION_TTL_MS),
  );
  // `reply.generateCsrf()` sets the signed httpOnly `_csrf` secret cookie
  // and returns the JS-readable token. The token is duplicated into
  // `ua-csrf` (non-httpOnly) so the SPA can keep copying it into the
  // x-csrf-token header without a client-side refactor.
  const csrf = reply.generateCsrf();
  reply.setCookie(CSRF_COOKIE, csrf, csrfCookieOptions(req));
  return csrf;
}

export async function handleSetupSubmit(
  data: SetupInput,
  req: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  if (
    data.installProxyInProwlarr &&
    !parseOrReply(data.installProxyInProwlarr, InstallProxySchema, reply)
  ) {
    return;
  }

  if (!validateTmdbForPlugins(data, reply)) return;

  const existingUser = await prisma.adminUser.findFirst();
  if (existingUser) {
    reply.code(409).send({ error: "user-already-exists" });
    return;
  }

  const passwordHash = await hashPassword(data.password);
  const user = await prisma.adminUser.create({
    data: { username: data.username, passwordHash },
  });

  await persistInitialSettings(data, nanoid(32));

  if (data.plugins?.length) {
    await persistPluginSelections(data.plugins);
  }

  if (data.prowlarrInstances?.length) {
    const result = await importProwlarrInstances(data.prowlarrInstances, reply);
    if (result.aborted) return;
  }

  await getAppState().reloadSettings();

  const proxyInstall = await maybeInstallProxyInProwlarr(data, req);

  req.log.info(
    {
      username: user.username,
      userId: user.id,
      importedInstances: data.prowlarrInstances?.length ?? 0,
      proxyInstall: proxyInstall?.ok ?? null,
      ip: req.ip,
    },
    "setup completed",
  );

  const session = await createSession(user.id);
  const csrf = setSessionCookies(reply, req, session.id);

  reply.send({ ok: true, csrf, proxyInstall });
}
