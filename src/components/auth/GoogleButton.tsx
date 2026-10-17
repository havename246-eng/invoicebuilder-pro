import { useState } from "react";
import { useNavigate, useRouter } from "@tanstack/react-router";
import { GoogleAuthProvider, getAdditionalUserInfo, signInWithPopup, signOut } from "firebase/auth";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { authErrorMessage, getFirebaseAuth, startSession } from "@/lib/firebase/client";
import { FIREBASE_SETUP_MESSAGE } from "@/lib/firebase/env";
import { trackEvent } from "@/lib/analytics";

function GoogleMark() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.52 12.27c0-.79-.07-1.54-.2-2.27H12v4.51h6.47a5.53 5.53 0 0 1-2.4 3.63v3h3.87c2.27-2.09 3.58-5.17 3.58-8.87Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.96-1.08 7.94-2.91l-3.87-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.28v3.09A12 12 0 0 0 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.27 14.29a7.2 7.2 0 0 1 0-4.58V6.62H1.28a12 12 0 0 0 0 10.76l3.99-3.09Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.43-3.43C17.95 1.19 15.23 0 12 0A12 12 0 0 0 1.28 6.62l3.99 3.09C6.22 6.86 8.87 4.75 12 4.75Z"
      />
    </svg>
  );
}

/**
 * Google sign-in through Firebase's popup. The popup keeps this page alive, so
 * the session cookie is made and the user sent on from here — no callback
 * route. (Firebase's redirect flow breaks in browsers that partition
 * third-party storage unless the auth domain is this site's own.)
 */
export function GoogleButton({
  redirectTo = "/dashboard",
  label,
}: {
  redirectTo?: string;
  label: string;
}) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const navigate = useNavigate();

  async function signInWithGoogle() {
    const auth = getFirebaseAuth();
    if (!auth) {
      toast.error(FIREBASE_SETUP_MESSAGE);
      return;
    }

    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: "select_account" });
      const credential = await signInWithPopup(auth, provider);

      const session = await startSession(credential.user);
      if (!session.ok) {
        await signOut(auth);
        throw new Error(session.error);
      }

      const isNewUser = getAdditionalUserInfo(credential)?.isNewUser ?? false;
      trackEvent(isNewUser ? "sign_up" : "login", { method: "google" });

      await router.invalidate();
      navigate({ to: redirectTo });
    } catch (error) {
      setLoading(false);
      const message =
        error instanceof Error && !(error as { code?: string }).code && error.message
          ? error.message
          : authErrorMessage(error);
      toast.error(message);
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      className="w-full gap-2 rounded-lg"
      onClick={signInWithGoogle}
      disabled={loading}
    >
      <GoogleMark />
      {loading ? "Signing in…" : label}
    </Button>
  );
}
