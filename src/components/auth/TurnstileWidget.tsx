import type { Turnstile } from "@/hooks/use-turnstile";

/**
 * Renders the Cloudflare challenge for an auth form, or nothing at all when no
 * site key is configured.
 */
export function TurnstileWidget({ turnstile }: { turnstile: Turnstile }) {
  if (!turnstile.required) return null;

  return (
    <div className="space-y-2">
      <div ref={turnstile.containerRef} className="flex justify-center" />
      {turnstile.error && (
        <p role="alert" className="text-center text-xs text-destructive">
          {turnstile.error}
        </p>
      )}
    </div>
  );
}
