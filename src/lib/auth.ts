import { createServerFn } from "@tanstack/react-start";
import { getSupabaseServerClient } from "./supabase/server";

export type AuthUser = {
  id: string;
  email: string | null;
  name: string | null;
  avatarUrl: string | null;
  /** "email", "google", … — how this account signs in. */
  provider: string;
  emailConfirmed: boolean;
  createdAt: string | null;
};

function toAuthUser(user: {
  id: string;
  email?: string | null;
  created_at?: string | null;
  email_confirmed_at?: string | null;
  confirmed_at?: string | null;
  app_metadata?: Record<string, unknown> | null;
  user_metadata?: Record<string, unknown> | null;
}): AuthUser {
  const meta = user.user_metadata ?? {};
  const name = (meta.full_name ?? meta.name ?? null) as string | null;
  const avatarUrl = (meta.avatar_url ?? meta.picture ?? null) as string | null;
  const provider = ((user.app_metadata ?? {}).provider as string | undefined) ?? "email";

  return {
    id: user.id,
    email: user.email ?? null,
    name,
    avatarUrl,
    provider,
    emailConfirmed: Boolean(user.email_confirmed_at ?? user.confirmed_at),
    createdAt: user.created_at ?? null,
  };
}

/**
 * Resolves the signed-in user from request cookies. Uses getUser() rather than
 * getSession() — getUser() revalidates the JWT against Supabase, so a forged or
 * stale cookie can't be used to satisfy a route guard.
 */
export const fetchUser = createServerFn({ method: "GET" }).handler(
  async (): Promise<AuthUser | null> => {
    const supabase = getSupabaseServerClient();
    if (!supabase) return null;

    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) return null;

    return toAuthUser(data.user);
  },
);

/** Clears the session cookies server-side. */
export const signOutFn = createServerFn({ method: "POST" }).handler(async () => {
  const supabase = getSupabaseServerClient();
  if (!supabase) return { ok: true };

  await supabase.auth.signOut();
  return { ok: true };
});

/**
 * Exchanges a PKCE `?code=` (Google OAuth) for a session, writing the session
 * cookies onto the response.
 */
export const exchangeCodeFn = createServerFn({ method: "POST" })
  .inputValidator((code: string) => code)
  .handler(async ({ data: code }): Promise<{ ok: boolean; error?: string }> => {
    const supabase = getSupabaseServerClient();
    if (!supabase) return { ok: false, error: "Supabase is not configured." };

    const { error } = await supabase.auth.exchangeCodeForSession(code);
    return error ? { ok: false, error: error.message } : { ok: true };
  });

/**
 * Verifies an emailed one-time token (signup confirmation, password recovery)
 * and establishes the session.
 */
export const verifyOtpFn = createServerFn({ method: "POST" })
  .inputValidator((input: { tokenHash: string; type: string }) => input)
  .handler(async ({ data }): Promise<{ ok: boolean; error?: string }> => {
    const supabase = getSupabaseServerClient();
    if (!supabase) return { ok: false, error: "Supabase is not configured." };

    const { error } = await supabase.auth.verifyOtp({
      token_hash: data.tokenHash,
      type: data.type as "signup" | "recovery" | "email_change" | "invite" | "magiclink",
    });

    return error ? { ok: false, error: error.message } : { ok: true };
  });
