import { getCookie, getRequestHeader, getRequestUrl } from "@tanstack/react-start/server";
import {
  SESSION_COOKIE,
  lookupUser,
  serviceAccount,
  verifySessionCookie,
  type FirebaseUserRecord,
} from "./firebase/server";

/**
 * Server-only request helpers shared by the auth and Drive-sync server
 * functions. Kept out of auth.ts, which the browser also imports for its
 * server-function stubs.
 */

/**
 * True when a state-changing request came from a page on this site. Browsers
 * always send Origin on a cross-site POST and can't be made to forge it, so
 * this stops another website from silently signing a visitor into the
 * attacker's account ("login CSRF") or signing them out.
 */
export function isSameOrigin(): boolean {
  const origin = getRequestHeader("origin");
  return !!origin && origin === getRequestUrl().origin;
}

/** Holds this device's encrypted Google Drive grant (see drive-sync.ts). */
export const DRIVE_COOKIE = "__drive";

export const cookieOptions = {
  httpOnly: true,
  secure: true,
  sameSite: "lax" as const,
  path: "/",
};

/**
 * The signed-in account behind this request's session cookie, or null.
 * Server-side only; shared by fetchUser and the Drive sync functions.
 */
export async function sessionAccount(): Promise<FirebaseUserRecord | null> {
  const sa = serviceAccount();
  const cookie = getCookie(SESSION_COOKIE);
  if (!sa || !cookie) return null;

  try {
    const claims = await verifySessionCookie(sa, cookie);
    const record = await lookupUser(sa, claims.sub!);
    if (!record || record.disabled) return null;
    // Sessions issued before the account's revocation time are dead.
    if (record.validSince && (claims.auth_time ?? 0) < Number(record.validSince)) return null;
    return record;
  } catch {
    return null;
  }
}
