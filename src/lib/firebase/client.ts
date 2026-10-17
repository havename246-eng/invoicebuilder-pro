import { getApps, initializeApp } from "firebase/app";
import { getAuth, type Auth, type User } from "firebase/auth";
import { createSessionFn } from "@/lib/auth";
import { FIREBASE_CONFIG, isFirebaseConfigured } from "./env";

let auth: Auth | null = null;

/**
 * Browser-side Firebase Auth. Firebase keeps its own copy of the session in
 * IndexedDB (needed for account changes like a new password); the server reads
 * the httpOnly session cookie made by {@link startSession}.
 *
 * Returns null when Firebase env vars are absent, or on the server.
 */
export function getFirebaseAuth(): Auth | null {
  if (!isFirebaseConfigured || typeof window === "undefined") return null;
  if (!auth) {
    const app = getApps()[0] ?? initializeApp(FIREBASE_CONFIG);
    auth = getAuth(app);
  }
  return auth;
}

/**
 * The browser's signed-in Firebase user, once Firebase has restored it from
 * storage. Account changes (name, email, password) go through this. Null if
 * the browser's copy is gone (storage cleared) even though the server cookie
 * is still valid — callers ask the user to sign in again.
 */
export async function currentFirebaseUser(): Promise<User | null> {
  const auth = getFirebaseAuth();
  if (!auth) return null;
  await auth.authStateReady();
  return auth.currentUser;
}

/** Hands a just-signed-in user's ID token to the server for a session cookie. */
export async function startSession(user: User): Promise<{ ok: boolean; error?: string }> {
  const idToken = await user.getIdToken(true);
  return createSessionFn({ data: idToken });
}

/** Where emailed links (confirm email, reset password, change email) land. */
export function actionCodeSettings(continuePath = "/login") {
  return { url: new URL(continuePath, window.location.origin).toString() };
}

/**
 * Plain-language messages for Firebase Auth error codes. Wrong password and
 * unknown account share one message, so the form can't be used to find out
 * which emails are registered.
 */
export function authErrorMessage(error: unknown): string {
  const code = (error as { code?: string })?.code ?? "";
  switch (code) {
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
    case "auth/invalid-login-credentials":
      return "Incorrect email or password.";
    case "auth/email-already-in-use":
      return "An account with this email already exists. Try signing in instead.";
    case "auth/invalid-email":
      return "Enter a valid email address.";
    case "auth/weak-password":
      return "Choose a stronger password (at least 8 characters).";
    case "auth/too-many-requests":
      return "Too many attempts. Wait a few minutes and try again.";
    case "auth/user-disabled":
      return "This account has been disabled.";
    case "auth/requires-recent-login":
      return "For security, sign out and sign in again, then retry.";
    case "auth/popup-blocked":
      return "Your browser blocked the Google window. Allow pop-ups for this site and try again.";
    case "auth/popup-closed-by-user":
    case "auth/cancelled-popup-request":
      return "Google sign-in was cancelled.";
    case "auth/expired-action-code":
      return "This link has expired. Request a new one.";
    case "auth/invalid-action-code":
      return "This link is invalid or has already been used.";
    case "auth/network-request-failed":
      return "Network error. Check your connection and try again.";
    case "auth/credential-already-in-use":
    case "auth/provider-already-linked":
      return "This account already has a password. Use \"Update password\" instead.";
    default:
      return "Something went wrong. Please try again.";
  }
}
