/**
 * Google Analytics 4 event reporting.
 *
 * The gtag snippet is rendered into the document head by the root route, so
 * `window.gtag` exists from the first parse of the page — the inline config
 * script defines it synchronously and queues into `dataLayer` until the async
 * gtag.js library catches up. It is still absent during SSR, and on any load
 * where the tag is blocked, so every call is guarded rather than assumed.
 *
 * Never pass personal data as an event parameter: no email addresses, phone
 * numbers, names, or invoice amounts. Parameters are for low-cardinality facts
 * about the action itself (which format, which language, which button).
 */

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

export function trackEvent(name: string, params: Record<string, unknown> = {}) {
  if (typeof window !== "undefined" && window.gtag) {
    window.gtag("event", name, params);
  }
}

// ───────── Google OAuth return ─────────

const OAUTH_HASH_PREFIX = "ga-oauth-";

type OAuthEvent = "sign_up" | "login";

/**
 * Google sign-in completes inside a server-side loader that immediately
 * redirects (see routes/auth.callback.tsx), so no client JS ever runs on the
 * callback route to report it. The loader tags its redirect with this fragment
 * instead, and the destination page fires the event on arrival.
 *
 * A fragment is never sent to the server and never has to satisfy a route's
 * `validateSearch`, so this works for every possible post-login destination.
 */
export function oauthEventHash(event: OAuthEvent) {
  return `${OAUTH_HASH_PREFIX}${event}`;
}

/** Fires and clears the marker left by {@link oauthEventHash}, if present. */
export function trackOAuthReturnFromHash() {
  if (typeof window === "undefined") return;

  const hash = window.location.hash.replace(/^#/, "");
  if (!hash.startsWith(OAUTH_HASH_PREFIX)) return;

  const event = hash.slice(OAUTH_HASH_PREFIX.length);
  if (event !== "sign_up" && event !== "login") return;

  // Strip the marker before reporting, so a reload — or a second effect pass —
  // can't count the same sign-in twice.
  window.history.replaceState(null, "", window.location.pathname + window.location.search);
  trackEvent(event, { method: "google" });
}
