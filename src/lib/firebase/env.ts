const PLACEHOLDERS = ["YOUR_FIREBASE_API_KEY", "YOUR_FIREBASE_PROJECT_ID", ""];

/**
 * Firebase web config. All of these are public by design — Firebase's own
 * docs ship them in page source; access is controlled by Auth and the
 * authorized-domains list, not by keeping them secret.
 */
export const FIREBASE_CONFIG = {
  apiKey: (import.meta.env.VITE_FIREBASE_API_KEY ?? "") as string,
  authDomain: (import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ?? "") as string,
  projectId: (import.meta.env.VITE_FIREBASE_PROJECT_ID ?? "") as string,
  appId: (import.meta.env.VITE_FIREBASE_APP_ID ?? "") as string,
};

/**
 * The app is fully usable without Firebase configured — the invoice builder is
 * public. Auth surfaces check this and explain themselves instead of crashing
 * the whole site on a missing env var.
 */
export const isFirebaseConfigured =
  !PLACEHOLDERS.includes(FIREBASE_CONFIG.apiKey) &&
  !PLACEHOLDERS.includes(FIREBASE_CONFIG.projectId) &&
  FIREBASE_CONFIG.authDomain !== "";

export const FIREBASE_SETUP_MESSAGE =
  "Firebase isn't configured yet. Add the VITE_FIREBASE_* values to .env.local and restart the dev server.";
