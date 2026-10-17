import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { AlertTriangle, BadgeCheck, Loader2 } from "lucide-react";
import { applyActionCode, checkActionCode } from "firebase/auth";
import { AuthShell } from "@/components/auth/AuthShell";
import { Button } from "@/components/ui/button";
import { authErrorMessage, getFirebaseAuth } from "@/lib/firebase/client";
import { FIREBASE_SETUP_MESSAGE } from "@/lib/firebase/env";
import { safeRedirect } from "@/lib/safe-redirect";
import { noIndexHead } from "@/lib/site-url";

/**
 * Landing point for every link Firebase emails: confirm a new account
 * (verifyEmail), reset a password (resetPassword), confirm or undo an email
 * change (verifyAndChangeEmail, recoverEmail). Set this page as the custom
 * action URL in Firebase → Authentication → Templates.
 *
 * The one-time code is applied in the browser with the Firebase SDK, so this
 * renders a status and does the work in an effect.
 */
export const Route = createFileRoute("/auth/callback")({
  head: () => noIndexHead("Confirming your link | InvoiceCraft"),
  validateSearch: z.object({
    mode: z.string().optional().catch(undefined),
    oobCode: z.string().optional().catch(undefined),
    continueUrl: z.string().optional().catch(undefined),
  }),
  component: CallbackPage,
});

type State =
  | { status: "working" }
  | { status: "done"; title: string; message: string; next: string; nextLabel: string }
  | { status: "error"; message: string };

/** continueUrl is an absolute URL on our own origin; reduce it to a safe path. */
function continuePath(continueUrl: string | undefined, fallback: string) {
  if (!continueUrl) return fallback;
  try {
    const url = new URL(continueUrl);
    if (url.origin !== window.location.origin) return fallback;
    return safeRedirect(url.pathname + url.search, fallback);
  } catch {
    return fallback;
  }
}

function CallbackPage() {
  const { mode, oobCode, continueUrl } = Route.useSearch();
  const navigate = useNavigate();
  const [state, setState] = useState<State>({ status: "working" });

  useEffect(() => {
    const auth = getFirebaseAuth();
    if (!auth) {
      setState({ status: "error", message: FIREBASE_SETUP_MESSAGE });
      return;
    }
    if (!mode || !oobCode) {
      setState({ status: "error", message: "This link is missing its verification code." });
      return;
    }

    // A reset link goes to the form that sets the new password; the code is
    // only spent there, when the new password is submitted.
    if (mode === "resetPassword") {
      navigate({ to: "/reset-password", search: { oobCode }, replace: true });
      return;
    }

    (async () => {
      try {
        if (mode === "verifyEmail") {
          await applyActionCode(auth, oobCode);
          setState({
            status: "done",
            title: "Email confirmed",
            message: "Your account is ready. Sign in to get started.",
            next: continuePath(continueUrl, "/login"),
            nextLabel: "Sign in",
          });
        } else if (mode === "verifyAndChangeEmail") {
          await applyActionCode(auth, oobCode);
          setState({
            status: "done",
            title: "Email changed",
            message: "Sign in again with your new email address.",
            next: "/login",
            nextLabel: "Sign in",
          });
        } else if (mode === "recoverEmail") {
          // Undoes an email change the owner didn't make.
          const info = await checkActionCode(auth, oobCode);
          await applyActionCode(auth, oobCode);
          setState({
            status: "done",
            title: "Email restored",
            message: `Your sign-in email is back to ${info.data.email ?? "your previous address"}. If you didn't request the change, reset your password now.`,
            next: "/forgot-password",
            nextLabel: "Reset password",
          });
        } else {
          setState({ status: "error", message: "This link isn't one we recognise." });
        }
      } catch (error) {
        setState({ status: "error", message: authErrorMessage(error) });
      }
    })();
  }, [mode, oobCode, continueUrl, navigate]);

  if (state.status === "working") {
    return (
      <AuthShell title="One moment" subtitle="Checking your link…">
        <div className="flex justify-center py-4">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </AuthShell>
    );
  }

  if (state.status === "done") {
    return (
      <AuthShell title={state.title} subtitle={state.message}>
        <div className="flex flex-col items-center gap-4 py-2 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50">
            <BadgeCheck className="h-6 w-6 text-emerald-600" />
          </div>
          <Button asChild className="w-full rounded-lg">
            <Link to={state.next}>{state.nextLabel}</Link>
          </Button>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Link problem"
      subtitle="We couldn't use this link."
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
        <p className="text-sm text-muted-foreground">{state.message}</p>
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
