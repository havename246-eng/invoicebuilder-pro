/**
 * Clamps a user-supplied `?redirect=` value to an in-app path.
 *
 * The parameter reaches us from links and from Supabase's redirect chain, so it
 * must never be trusted: `https://evil.com` or the protocol-relative forms
 * `//evil.com` and `/\evil.com` would otherwise turn our login page into an
 * open redirect that lends our domain's credibility to a phishing page.
 */
export function safeRedirect(path: string | undefined | null, fallback = "/dashboard"): string {
  if (!path) return fallback;
  if (path[0] !== "/") return fallback;
  // Reject protocol-relative targets: both "//host" and "/\host".
  if (path[1] === "/" || path[1] === "\\") return fallback;
  return path;
}
