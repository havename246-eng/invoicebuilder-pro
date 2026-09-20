/**
 * The site's canonical origin — the one place the public domain is written down.
 *
 * Every canonical tag, og:url, and JSON-LD `url` in the app resolves through
 * here, so moving the site to a new domain is a one-line change rather than a
 * hunt through six route files (which is how the old copies drifted apart).
 *
 * No trailing slash: `absoluteUrl` builds paths by concatenation and a trailing
 * slash here would emit "//builder".
 */
export const SITE_URL = "https://www.invoicecraft.site";

/**
 * Absolute URL for a site-relative path, for use in canonical/og:url tags.
 *
 * Search engines treat "/builder" and "/builder/" as separate URLs, so the
 * path is passed through untouched — callers own the exact shape they want
 * indexed. The root path is special-cased to the bare origin, because
 * `${SITE_URL}/` and `${SITE_URL}` would otherwise be two canonicals for the
 * same page.
 */
export function absoluteUrl(path = "/"): string {
  if (path === "/" || path === "") return SITE_URL;
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

/**
 * Head block for a page that should never appear in search results.
 *
 * Sign-in, account, and callback routes have nothing to offer a searcher and
 * the callback carries a single-use `?code=`. robots.txt disallows them too,
 * but that only stops crawling — a disallowed URL can still be indexed from an
 * inbound link, and a crawler that can't fetch the page never sees this tag.
 * Belt and braces is the standard play here.
 *
 * `nofollow` rides along because these pages link only to each other and to
 * signed-in surfaces; there's no link equity worth passing on.
 *
 * Deliberately emits no canonical: without one these routes used to inherit the
 * root's, which pointed every sign-in URL at the homepage.
 */
export function noIndexHead(title: string) {
  return {
    meta: [{ title }, { name: "robots", content: "noindex, nofollow" }],
  };
}
