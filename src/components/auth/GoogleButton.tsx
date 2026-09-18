import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { SUPABASE_SETUP_MESSAGE } from "@/lib/supabase/env";

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
 * Starts Google's OAuth flow. Supabase bounces the user back to /auth/callback
 * with a PKCE code, which that route exchanges for a session.
 */
export function GoogleButton({
  redirectTo = "/dashboard",
  label,
}: {
  redirectTo?: string;
  label: string;
}) {
  const [loading, setLoading] = useState(false);

  async function signInWithGoogle() {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      toast.error(SUPABASE_SETUP_MESSAGE);
      return;
    }

    setLoading(true);
    const callback = new URL("/auth/callback", window.location.origin);
    callback.searchParams.set("redirect", redirectTo);

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: callback.toString() },
    });

    // On success the browser navigates away, so this only runs on failure.
    if (error) {
      setLoading(false);
      toast.error(error.message);
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
      {loading ? "Redirecting…" : label}
    </Button>
  );
}
