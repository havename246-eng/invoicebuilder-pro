import { createServerFn } from "@tanstack/react-start";
import { deleteCookie, getCookie, setCookie } from "@tanstack/react-start/server";
import {
  SESSION_COOKIE,
  SESSION_MAX_AGE_S,
  createSessionCookie,
  lookupUser,
  revokeSessions,
  serviceAccount,
  verifyIdToken,
  verifySessionCookie,
  type FirebaseUserRecord,
} from "./firebase/server";

export type AuthUser = {
  id: string;
  email: string | null;
  name: string | null;
  avatarUrl: string | null;
  /** "email" when the account has a password, otherwise its OAuth provider ("google"). */
  provider: string;
  emailConfirmed: boolean;
  createdAt: string | null;
};

function toAuthUser(u: FirebaseUserRecord): AuthUser {
  const google = u.providerUserInfo?.find((p) => p.providerId === "google.com");
  const hasPassword =
    !!u.passwordHash || !!u.providerUserInfo?.some((p) => p.providerId === "password");
  const createdMs = Number(u.createdAt);

  return {
    id: u.localId,
    email: u.email ?? null,
    name: u.displayName ?? google?.displayName ?? null,
    avatarUrl: u.photoUrl ?? google?.photoUrl ?? null,
    provider: hasPassword || !google ? "email" : "google",
    emailConfirmed: Boolean(u.emailVerified),
    createdAt: Number.isFinite(createdMs) ? new Date(createdMs).toISOString() : null,
  };
}

const cookieOptions = {
  httpOnly: true,
  secure: true,
  sameSite: "lax" as const,
  path: "/",
};

/**
 * Resolves the signed-in user from the session cookie. The cookie's signature
 * is checked locally, then the account is looked up so the header and route
 * guards see current details (a renamed profile, a confirmed email) and a
 * disabled or revoked account is treated as signed out.
 */
export const fetchUser = createServerFn({ method: "GET" }).handler(
  async (): Promise<AuthUser | null> => {
    const sa = serviceAccount();
    const cookie = getCookie(SESSION_COOKIE);
    if (!sa || !cookie) return null;

    try {
      const claims = await verifySessionCookie(sa, cookie);
      const record = await lookupUser(sa, claims.sub!);
      if (!record || record.disabled) return null;
      // Sessions issued before the account's revocation time are dead.
      if (record.validSince && (claims.auth_time ?? 0) < Number(record.validSince)) return null;
      return toAuthUser(record);
    } catch {
      return null;
    }
  },
);

/**
 * Turns a just-issued Firebase ID token into the httpOnly session cookie.
 *
 * Only a token from a sign-in in the last five minutes is accepted, so a
 * leaked older token can't be upgraded into a two-week session. Password
 * accounts must have confirmed their email first, matching the old Supabase
 * behaviour; Google accounts arrive verified.
 */
export const createSessionFn = createServerFn({ method: "POST" })
  .inputValidator((idToken: string) => idToken)
  .handler(async ({ data: idToken }): Promise<{ ok: boolean; error?: string }> => {
    const sa = serviceAccount();
    if (!sa) return { ok: false, error: "Sign-in isn't configured on the server yet." };

    try {
      const claims = await verifyIdToken(sa, idToken);
      const authAgeS = Date.now() / 1000 - (claims.auth_time ?? 0);
      if (authAgeS > 5 * 60) return { ok: false, error: "Please sign in again." };
      if (!claims.email_verified) {
        return { ok: false, error: "Confirm your email address before signing in." };
      }

      const session = await createSessionCookie(sa, idToken);
      setCookie(SESSION_COOKIE, session, { ...cookieOptions, maxAge: SESSION_MAX_AGE_S });
      return { ok: true };
    } catch {
      return { ok: false, error: "Couldn't start your session. Please try again." };
    }
  });

/**
 * Clears the session cookie and revokes the account's sessions, so a copy of
 * the cookie taken before sign-out stops working too.
 */
export const signOutFn = createServerFn({ method: "POST" }).handler(async () => {
  const sa = serviceAccount();
  const cookie = getCookie(SESSION_COOKIE);
  deleteCookie(SESSION_COOKIE, cookieOptions);

  if (sa && cookie) {
    try {
      const claims = await verifySessionCookie(sa, cookie);
      await revokeSessions(sa, claims.sub!);
    } catch {
      // Already invalid — nothing to revoke.
    }
  }
  return { ok: true };
});
