import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { z } from "zod";
import { AlertTriangle } from "lucide-react";
import { AuthShell } from "@/components/auth/AuthShell";
import { Button } from "@/components/ui/button";
import { exchangeCodeFn, verifyOtpFn } from "@/lib/auth";
import { safeRedirect } from "@/lib/safe-redirect";
import { oauthEventHash } from "@/lib/analytics";
import { noIndexHead } from "@/lib/site-url";

/**
 * Single landing point for every link Supabase sends a user back through:
 * Google OAuth (`?code=`), and emailed one-time tokens for signup confirmation
 * and password recovery (`?token_hash=&type=`).
 *
 * The exchange runs in the loader — i.e. server-side on this full page load —
 * so the session cookies are written before anything renders.
 */
export const Route = createFileRoute("/auth/callback")({
  head: () => noIndexHead("Signing you in | InvoiceCraft"),
  validateSearch: z.object({
    code: z.string().optional().catch(undefined),
    token_hash: z.string().optional().catch(undefined),
    type: z.string().optional().catch(undefined),
    redirect: z.string().optional().catch(undefined),
    error: z.string().optional().catch(undefined),
    error_description: z.string().optional().catch(undefined),
  }),
  loaderDeps: ({ search }) => search,
  loader: async ({ deps }) => {
    // Supabase reports a refused/expired link by query param, not by failing.
    if (deps.error || deps.error_description) {
      return { error: deps.error_description ?? deps.error ?? "Authentication failed." };
    }

    // A recovery link must land on the form that sets a new password, never on
    // the post-login destination.
    const destination = deps.type === "recovery" ? "/reset-password" : safeRedirect(deps.redirect);

    if (deps.code) {
      const result = await exchangeCodeFn({ data: deps.code });
      if (!result.ok) return { error: result.error ?? "Could not complete sign-in." };
      // This loader runs server-side and redirects, so no client JS runs here to
      // report the sign-in to analytics. Hand the event to the destination page
      // as a URL fragment, which the root component fires and strips on arrival.
      throw redirect({
        to: destination,
        hash: oauthEventHash(result.isNewUser ? "sign_up" : "login"),
      });
    }

    if (deps.token_hash && deps.type) {
      const result = await verifyOtpFn({
        data: { tokenHash: deps.token_hash, type: deps.type },
      });
      if (!result.ok) return { error: result.error ?? "That link is invalid or has expired." };
      throw redirect({ to: destination });
    }

    return { error: "This link is missing its verification token." };
  },
  component: CallbackPage,
});

function CallbackPage() {
  // Reaching the component at all means the loader returned instead of
  // redirecting, so there is always an error to explain.
  const { error } = Route.useLoaderData();

  return (
    <AuthShell
      title="Sign-in link problem"
      subtitle="We couldn't finish signing you in."
      footer={
        <Link to="/" className="font-medium text-primary hover:underline">
          Back to home
        </Link>
      }
    >
      <div className="flex flex-col items-center gap-4 py-2 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
          <AlertTriangle className="h-6 w-6 text-destructive" />
        </div>
        <p className="text-sm text-muted-foreground">{error}</p>
        <div className="flex w-full flex-col gap-2">
          <Button asChild className="w-full rounded-lg">
            <Link to="/login">Back to sign in</Link>
          </Button>
          <Button asChild variant="outline" className="w-full rounded-lg">
            <Link to="/forgot-password">Request a new link</Link>
          </Button>
        </div>
      </div>
    </AuthShell>
  );
}
