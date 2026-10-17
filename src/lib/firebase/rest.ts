import { importPKCS8, SignJWT } from "jose";

/**
 * Minimal Firebase Auth admin calls over REST, signed with a service account.
 *
 * The server runs on Cloudflare Workers, where firebase-admin (built on Node's
 * gRPC/http stack) doesn't run, so this talks to the Identity Toolkit API
 * directly with WebCrypto via jose. Also used by scripts/migrate-supabase-users.ts.
 */

export type ServiceAccount = {
  projectId: string;
  clientEmail: string;
  /** PEM. Env vars usually carry it with literal "\n" — normalised here. */
  privateKey: string;
};

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const SCOPES = [
  "https://www.googleapis.com/auth/identitytoolkit",
  "https://www.googleapis.com/auth/cloud-platform",
].join(" ");

let cached: { key: string; token: string; expiresAt: number } | null = null;

/** OAuth access token for the service account, cached until a minute before expiry. */
export async function getAccessToken(sa: ServiceAccount): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  if (cached && cached.key === sa.clientEmail && cached.expiresAt - 60 > now) return cached.token;

  const key = await importPKCS8(sa.privateKey.replace(/\\n/g, "\n"), "RS256");
  const assertion = await new SignJWT({ scope: SCOPES })
    .setProtectedHeader({ alg: "RS256", typ: "JWT" })
    .setIssuer(sa.clientEmail)
    .setSubject(sa.clientEmail)
    .setAudience(TOKEN_URL)
    .setIssuedAt(now)
    .setExpirationTime(now + 3600)
    .sign(key);

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });
  if (!res.ok) throw new Error(`Service account token request failed (${res.status})`);
  const body = (await res.json()) as { access_token: string; expires_in: number };
  cached = { key: sa.clientEmail, token: body.access_token, expiresAt: now + body.expires_in };
  return body.access_token;
}

/**
 * POST to an Identity Toolkit project endpoint: "accounts:lookup" for
 * /projects/{id}/accounts:lookup, or ":createSessionCookie" for the methods on
 * the project itself (/projects/{id}:createSessionCookie).
 */
export async function identityToolkit<T>(
  sa: ServiceAccount,
  method: string,
  body: unknown,
): Promise<T> {
  const token = await getAccessToken(sa);
  const sep = method.startsWith(":") ? "" : "/";
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/projects/${sa.projectId}${sep}${method}`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  );
  const json = (await res.json().catch(() => ({}))) as T & { error?: { message?: string } };
  if (!res.ok) throw new Error(json.error?.message ?? `${method} failed (${res.status})`);
  return json;
}
