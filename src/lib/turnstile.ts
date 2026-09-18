const PLACEHOLDERS = ["YOUR_TURNSTILE_SITE_KEY", ""];

export const TURNSTILE_SITE_KEY = (import.meta.env.VITE_TURNSTILE_SITE_KEY ?? "") as string;

/**
 * Turnstile is optional in the same way Supabase is: without a site key the
 * auth forms still work, they just submit without a captcha token. That keeps
 * local development and preview deploys usable, and means a missing env var
 * degrades to "no captcha" rather than "nobody can sign in".
 *
 * The matching secret key lives in the Supabase dashboard (Authentication →
 * Attack Protection), never here — Supabase verifies the token server-side when
 * it receives the auth request.
 */
export const isTurnstileConfigured = !PLACEHOLDERS.includes(TURNSTILE_SITE_KEY);

export type TurnstileRenderOptions = {
  sitekey: string;
  callback: (token: string) => void;
  "expired-callback": () => void;
  "error-callback": () => void;
  "timeout-callback": () => void;
  theme?: "light" | "dark" | "auto";
  action?: string;
};

export type TurnstileApi = {
  render: (container: HTMLElement, options: TurnstileRenderOptions) => string;
  reset: (widgetId: string) => void;
  remove: (widgetId: string) => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
    __turnstileReady?: () => void;
  }
}

const SCRIPT_CALLBACK = "__turnstileReady";
const SCRIPT_SRC = `https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit&onload=${SCRIPT_CALLBACK}`;

let loader: Promise<TurnstileApi> | null = null;

/**
 * Loads Cloudflare's challenge script once per page and resolves with its API.
 *
 * Rendering is explicit rather than automatic: the widget has to mount into a
 * container React owns, and we need the returned widget id in order to reset it
 * between attempts. Tokens are single-use, so a form that doesn't reset after a
 * rejected submit would send a stale token and fail with "timeout-or-duplicate".
 */
export function loadTurnstile(): Promise<TurnstileApi> {
  if (loader) return loader;

  loader = new Promise<TurnstileApi>((resolve, reject) => {
    if (window.turnstile) {
      resolve(window.turnstile);
      return;
    }

    window[SCRIPT_CALLBACK] = () => {
      if (window.turnstile) resolve(window.turnstile);
      else reject(new Error("Turnstile loaded without exposing its API"));
    };

    const script = document.createElement("script");
    script.src = SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.onerror = () => reject(new Error("Failed to load Turnstile"));
    document.head.appendChild(script);
  });

  // Let a later mount retry after a network failure instead of caching the
  // rejection for the life of the page.
  loader.catch(() => {
    loader = null;
  });

  return loader;
}
