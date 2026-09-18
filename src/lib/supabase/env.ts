const PLACEHOLDERS = ["YOUR_SUPABASE_URL", "YOUR_SUPABASE_ANON_KEY", ""];

export const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL ?? "") as string;
// Supabase's dashboard now calls this the "publishable" key; older projects and
// docs call it the "anon" key. Accept either variable name so a copied snippet
// doesn't silently leave auth unconfigured.
export const SUPABASE_ANON_KEY = (import.meta.env.VITE_SUPABASE_ANON_KEY ??
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ??
  "") as string;

/**
 * The app is fully usable without Supabase configured — the invoice builder is
 * public. Auth surfaces check this and explain themselves instead of crashing
 * the whole site on a missing env var.
 */
export const isSupabaseConfigured =
  !PLACEHOLDERS.includes(SUPABASE_URL) && !PLACEHOLDERS.includes(SUPABASE_ANON_KEY);

export const SUPABASE_SETUP_MESSAGE =
  "Supabase isn't configured yet. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env.local and restart the dev server.";
