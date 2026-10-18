import { createServerFn } from "@tanstack/react-start";
import { deleteCookie, getCookie, setCookie } from "@tanstack/react-start/server";
import { DRIVE_COOKIE, cookieOptions, isSameOrigin, sessionAccount } from "./session.server";

/**
 * Keeps a signed-in user's Google Drive connected on this device so their
 * From/Payment details sync automatically, with no click per visit.
 *
 * Connecting (once per device) trades a Google authorization code for a
 * refresh token. That token is encrypted with AES-256-GCM under a key only the
 * server holds and stored in an httpOnly cookie on the user's own device, bound
 * to their uid — there's no database. On each sync the server swaps it for a
 * short-lived access token limited to the hidden Drive app-data folder; the
 * browser then talks to Drive directly, so profile data never passes through
 * this server.
 */

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive.appdata";
/** Matches Google's refresh-token lifetime when unused for six months. */
const DRIVE_COOKIE_MAX_AGE_S = 180 * 24 * 60 * 60;

function oauthClient() {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const key = process.env.DRIVE_TOKEN_KEY;
  if (!clientId || !clientSecret || !key) return null;
  return { clientId, clientSecret, key };
}

const b64url = {
  encode: (bytes: Uint8Array) =>
    btoa(String.fromCharCode(...bytes))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, ""),
  decode: (s: string) =>
    Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0)),
};

async function aesKey(base64Key: string) {
  const raw = Uint8Array.from(atob(base64Key), (c) => c.charCodeAt(0));
  if (raw.length !== 32) throw new Error("DRIVE_TOKEN_KEY must be 32 bytes, base64-encoded");
  return crypto.subtle.importKey("raw", raw, "AES-GCM", false, ["encrypt", "decrypt"]);
}

type Grant = { uid: string; refreshToken: string };

async function seal(key: string, grant: Grant): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const data = new TextEncoder().encode(JSON.stringify(grant));
  const ct = new Uint8Array(
    await crypto.subtle.encrypt({ name: "AES-GCM", iv }, await aesKey(key), data),
  );
  const out = new Uint8Array(iv.length + ct.length);
  out.set(iv);
  out.set(ct, iv.length);
  return b64url.encode(out);
}

async function unseal(key: string, sealed: string): Promise<Grant | null> {
  try {
    const bytes = b64url.decode(sealed);
    const pt = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: bytes.slice(0, 12) },
      await aesKey(key),
      bytes.slice(12),
    );
    return JSON.parse(new TextDecoder().decode(pt)) as Grant;
  } catch {
    return null;
  }
}

/** This device's grant, if it belongs to the signed-in user. */
async function currentGrant(key: string, uid: string): Promise<Grant | null> {
  const sealed = getCookie(DRIVE_COOKIE);
  if (!sealed) return null;
  const grant = await unseal(key, sealed);
  // A grant from a different account (shared computer) is never used.
  return grant && grant.uid === uid ? grant : null;
}

async function tokenRequest(params: Record<string, string>) {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(params),
  });
  return {
    ok: res.ok,
    body: (await res.json().catch(() => ({}))) as {
      access_token?: string;
      expires_in?: number;
      refresh_token?: string;
      scope?: string;
      error?: string;
    },
  };
}

/** Whether Drive sync can run: signed in, configured, and connected on this device. */
export const driveStatusFn = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ available: boolean; connected: boolean }> => {
    const client = oauthClient();
    const account = client ? await sessionAccount() : null;
    if (!client || !account) return { available: false, connected: false };
    return { available: true, connected: !!(await currentGrant(client.key, account.localId)) };
  },
);

/** Exchanges the code from Google's consent popup and stores the sealed grant. */
export const driveConnectFn = createServerFn({ method: "POST" })
  .inputValidator((code: string) => code)
  .handler(async ({ data: code }): Promise<{ ok: boolean; error?: string }> => {
    if (!isSameOrigin()) return { ok: false, error: "Request blocked." };
    const client = oauthClient();
    const account = client ? await sessionAccount() : null;
    if (!client || !account) return { ok: false, error: "Sign in to sync with Google Drive." };

    const { ok, body } = await tokenRequest({
      grant_type: "authorization_code",
      code,
      client_id: client.clientId,
      client_secret: client.clientSecret,
      // GIS popup codes are exchanged with this fixed redirect URI.
      redirect_uri: "postmessage",
    });
    if (!ok || !body.refresh_token) {
      return { ok: false, error: "Google didn't grant ongoing Drive access. Please try again." };
    }
    if (!body.scope?.split(" ").includes(DRIVE_SCOPE)) {
      return { ok: false, error: "Allow access to InvoiceCraft's Drive folder to turn on sync." };
    }

    const sealed = await seal(client.key, {
      uid: account.localId,
      refreshToken: body.refresh_token,
    });
    setCookie(DRIVE_COOKIE, sealed, { ...cookieOptions, maxAge: DRIVE_COOKIE_MAX_AGE_S });
    return { ok: true };
  });

/**
 * A short-lived Drive access token (app-data folder only) for the browser.
 * POST so it's never cached. Clears the grant if Google has revoked it.
 */
export const driveTokenFn = createServerFn({ method: "POST" }).handler(
  async (): Promise<{
    accessToken?: string;
    expiresIn?: number;
    /** Space-separated scopes this token carries. */
    scope?: string;
    connected: boolean;
  }> => {
    if (!isSameOrigin()) return { connected: false };
    const client = oauthClient();
    const account = client ? await sessionAccount() : null;
    if (!client || !account) return { connected: false };
    const grant = await currentGrant(client.key, account.localId);
    if (!grant) return { connected: false };

    const { ok, body } = await tokenRequest({
      grant_type: "refresh_token",
      refresh_token: grant.refreshToken,
      client_id: client.clientId,
      client_secret: client.clientSecret,
    });
    if (!ok || !body.access_token) {
      // Revoked in their Google Account, or expired: forget it.
      if (body.error === "invalid_grant") deleteCookie(DRIVE_COOKIE, cookieOptions);
      return { connected: false };
    }
    return {
      accessToken: body.access_token,
      expiresIn: body.expires_in,
      scope: body.scope,
      connected: true,
    };
  },
);

/**
 * Stops syncing on this device by forgetting its grant. Deliberately doesn't
 * revoke at Google: that would cut off every device the user has connected.
 * Full revocation is in their Google Account (see the Privacy Notice).
 */
export const driveDisconnectFn = createServerFn({ method: "POST" }).handler(async () => {
  if (!isSameOrigin()) return { ok: false };
  deleteCookie(DRIVE_COOKIE, cookieOptions);
  return { ok: true };
});
