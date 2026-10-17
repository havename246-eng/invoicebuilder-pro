import { importX509, jwtVerify, type JWTPayload } from "jose";
import { identityToolkit, type ServiceAccount } from "./rest";

/**
 * Server-side Firebase Auth: verifying ID tokens and session cookies, minting
 * session cookies, and looking users up. Server functions only — this reads
 * the service account secret.
 */

export const SESSION_COOKIE = "__session";
/** Firebase's maximum session-cookie lifetime. */
export const SESSION_MAX_AGE_S = 14 * 24 * 60 * 60;

const ID_TOKEN_CERTS =
  "https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com";
const SESSION_CERTS = "https://www.googleapis.com/identitytoolkit/v3/relyingparty/publicKeys";

/**
 * The service account, from server-only env vars (never VITE_-prefixed, so
 * they're never bundled into the browser). Null when not configured.
 */
export function serviceAccount(): ServiceAccount | null {
  // The project id isn't secret: fall back to the public one Vite inlines at
  // build time, so production only needs the two real secrets below.
  const projectId =
    process.env.FIREBASE_PROJECT_ID ||
    process.env.VITE_FIREBASE_PROJECT_ID ||
    (import.meta.env.VITE_FIREBASE_PROJECT_ID as string | undefined);
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;
  if (!projectId || !clientEmail || !privateKey) return null;
  return { projectId, clientEmail, privateKey };
}

// Google rotates these signing certs; honour the Cache-Control max-age.
const certCache = new Map<string, { certs: Record<string, string>; expiresAt: number }>();

async function signingCerts(url: string): Promise<Record<string, string>> {
  const hit = certCache.get(url);
  if (hit && hit.expiresAt > Date.now()) return hit.certs;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Couldn't fetch Firebase signing keys (${res.status})`);
  const certs = (await res.json()) as Record<string, string>;
  const maxAge = Number(/max-age=(\d+)/.exec(res.headers.get("cache-control") ?? "")?.[1] ?? 3600);
  certCache.set(url, { certs, expiresAt: Date.now() + maxAge * 1000 });
  return certs;
}

async function verifyFirebaseJwt(
  jwt: string,
  certsUrl: string,
  issuer: string,
  projectId: string,
): Promise<JWTPayload> {
  const certs = await signingCerts(certsUrl);
  const { payload } = await jwtVerify(
    jwt,
    async (header) => {
      const pem = header.kid ? certs[header.kid] : undefined;
      if (!pem) throw new Error("Unknown signing key");
      return importX509(pem, "RS256");
    },
    { issuer, audience: projectId, algorithms: ["RS256"] },
  );
  if (!payload.sub) throw new Error("Token has no subject");
  return payload;
}

export type IdTokenClaims = JWTPayload & {
  email?: string;
  email_verified?: boolean;
  auth_time?: number;
  firebase?: { sign_in_provider?: string };
};

/** Verifies a Firebase ID token from the browser SDK. */
export function verifyIdToken(sa: ServiceAccount, idToken: string) {
  return verifyFirebaseJwt(
    idToken,
    ID_TOKEN_CERTS,
    `https://securetoken.google.com/${sa.projectId}`,
    sa.projectId,
  ) as Promise<IdTokenClaims>;
}

/** Verifies a session cookie minted by createSessionCookie. */
export function verifySessionCookie(sa: ServiceAccount, cookie: string) {
  return verifyFirebaseJwt(
    cookie,
    SESSION_CERTS,
    `https://session.firebase.google.com/${sa.projectId}`,
    sa.projectId,
  ) as Promise<IdTokenClaims>;
}

/** Exchanges a fresh ID token for a long-lived session cookie. */
export async function createSessionCookie(sa: ServiceAccount, idToken: string) {
  const { sessionCookie } = await identityToolkit<{ sessionCookie: string }>(
    sa,
    ":createSessionCookie",
    { idToken, validDuration: String(SESSION_MAX_AGE_S) },
  );
  return sessionCookie;
}

export type FirebaseUserRecord = {
  localId: string;
  email?: string;
  emailVerified?: boolean;
  displayName?: string;
  photoUrl?: string;
  passwordHash?: string;
  disabled?: boolean;
  /** Milliseconds since epoch, as a string. */
  createdAt?: string;
  /** Seconds since epoch, as a string: sessions issued before this are revoked. */
  validSince?: string;
  providerUserInfo?: { providerId: string; photoUrl?: string; displayName?: string }[];
};

/** The account's current record, or null if it no longer exists. */
export async function lookupUser(sa: ServiceAccount, uid: string) {
  const { users } = await identityToolkit<{ users?: FirebaseUserRecord[] }>(sa, "accounts:lookup", {
    localId: [uid],
  });
  return users?.[0] ?? null;
}

/** Invalidates every session and refresh token the user holds. */
export async function revokeSessions(sa: ServiceAccount, uid: string) {
  await identityToolkit(sa, "accounts:update", {
    localId: uid,
    validSince: String(Math.floor(Date.now() / 1000)),
  });
}
