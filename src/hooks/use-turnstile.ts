import { useCallback, useEffect, useRef, useState } from "react";
import {
  TURNSTILE_SITE_KEY,
  type TurnstileApi,
  isTurnstileConfigured,
  loadTurnstile,
} from "@/lib/turnstile";

export type Turnstile = {
  /** Attach to the element the widget should render into. */
  containerRef: (node: HTMLDivElement | null) => void;
  /** False when no site key is configured — the form should hide the widget. */
  required: boolean;
  /** The single-use token to hand to Supabase, or null if there isn't one yet. */
  token: string | null;
  /** True when the form may be submitted: either no captcha, or one solved. */
  solved: boolean;
  /** Set when the challenge script couldn't load or the widget errored. */
  error: string | null;
  /** Clears the solved token and re-arms the widget for another attempt. */
  reset: () => void;
};

/**
 * Renders a Cloudflare Turnstile widget and tracks its token.
 *
 * Call `reset()` after any rejected submit: Turnstile tokens are single-use, so
 * reusing one turns a simple "wrong password" into a confusing captcha failure.
 *
 * The container is tracked as state rather than a plain ref so the widget is
 * rebuilt if the form unmounts and returns — signup swaps the form out for a
 * "check your email" panel and back again, which would otherwise leave an empty
 * container and no way to ever solve the challenge.
 *
 * @param action Labels the widget in Cloudflare's analytics, e.g. "login".
 */
export function useTurnstile(action: string): Turnstile {
  const [container, setContainer] = useState<HTMLDivElement | null>(null);
  const apiRef = useRef<TurnstileApi | null>(null);
  const widgetIdRef = useRef<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isTurnstileConfigured || !container) return;

    let cancelled = false;

    loadTurnstile()
      .then((api) => {
        if (cancelled) return;
        apiRef.current = api;
        widgetIdRef.current = api.render(container, {
          sitekey: TURNSTILE_SITE_KEY,
          action,
          callback: (value) => {
            setToken(value);
            setError(null);
          },
          // Tokens expire after ~5 minutes; drop ours so a slow form doesn't
          // submit one the server will reject.
          "expired-callback": () => setToken(null),
          "timeout-callback": () => setToken(null),
          "error-callback": () => {
            setToken(null);
            setError("The verification challenge failed. Reload the page and try again.");
          },
        });
      })
      .catch(() => {
        if (cancelled) return;
        setError("Couldn't load the verification challenge. Check your connection or ad blocker.");
      });

    return () => {
      cancelled = true;
      const api = apiRef.current;
      const widgetId = widgetIdRef.current;
      if (api && widgetId) api.remove(widgetId);
      apiRef.current = null;
      widgetIdRef.current = null;
      // A rebuilt widget starts unsolved; don't carry a dead token across.
      setToken(null);
    };
  }, [container, action]);

  const reset = useCallback(() => {
    setToken(null);
    const api = apiRef.current;
    const widgetId = widgetIdRef.current;
    if (api && widgetId) api.reset(widgetId);
  }, []);

  return {
    containerRef: setContainer,
    required: isTurnstileConfigured,
    token,
    solved: !isTurnstileConfigured || token !== null,
    error,
    reset,
  };
}
