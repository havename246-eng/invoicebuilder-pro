import { useEffect } from "react";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  HeadContent,
  Scripts,
  useRouter,
} from "@tanstack/react-router";
import { Toaster } from "@/components/ui/sonner";
import { SiteHeader } from "@/components/site/Header";
import { fetchUser, type AuthUser } from "@/lib/auth";
import { trackOAuthReturnFromHash } from "@/lib/analytics";
import { onAuthStateChanged } from "firebase/auth";
import { getFirebaseAuth } from "@/lib/firebase/client";
import { SITE_URL, absoluteUrl } from "@/lib/site-url";

import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader variant="light" />
      <div className="flex flex-1 items-center justify-center px-4">
        <div className="max-w-md text-center">
          <h1 className="text-7xl font-bold text-foreground">404</h1>
          <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            The page you're looking for doesn't exist or has been moved.
          </p>
          <div className="mt-6">
            <Link
              to="/"
              className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Go home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

const OG_IMAGE = absoluteUrl("/og-image.png");
const GA_MEASUREMENT_ID = "G-DC6G1487CL";

export type RouterContext = {
  user: AuthUser | null;
};

export const Route = createRootRouteWithContext<RouterContext>()({
  // Resolved once per navigation and handed down to every route, so guards and
  // the header read the same server-verified user.
  beforeLoad: async () => ({ user: await fetchUser() }),
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "InvoiceCraft — Free Invoice Generator for Freelancers" },
      { name: "description", content: "Free invoice maker with custom branding, multi-currency (USD, Riel, Yuan, Yen, Won), Khmer and CJK invoice rendering, and one-click PDF export." },
      { name: "author", content: "InvoiceCraft" },
      { name: "robots", content: "index, follow" },
      { property: "og:site_name", content: "InvoiceCraft" },
      { property: "og:type", content: "website" },
      { property: "og:url", content: SITE_URL },
      { property: "og:title", content: "InvoiceCraft — Free Invoice Generator for Freelancers" },
      { property: "og:description", content: "Create professional invoices in seconds. Custom branding, multi-currency, AI translation, and PDF export." },
      { property: "og:image", content: OG_IMAGE },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { property: "og:image:alt", content: "InvoiceCraft — free online invoice maker" },
      { property: "og:locale", content: "en_US" },
      // No twitter:title/description: X falls back to og:title/og:description,
      // which each route overrides. Root-level copies were never overridden, so
      // every page shared the homepage's card text.
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: OG_IMAGE },
      { name: "twitter:image:alt", content: "InvoiceCraft — free online invoice maker" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      // No canonical here on purpose. Router merges root links with the route's
      // rather than replacing them, so a canonical at this level emitted a
      // second, conflicting one on every page that declares its own — and
      // Google discards all of them when it sees more than one. Each route owns
      // its canonical; see src/lib/site-url.ts.
      // .ico first for the browsers that only read that one; the SVG wins
      // wherever it's understood, so the tab icon stays sharp at any density.
      { rel: "icon", href: "/favicon.ico", sizes: "32x32" },
      { rel: "icon", type: "image/svg+xml", href: "/icon.svg" },
      { rel: "apple-touch-icon", href: "/apple-touch-icon.png" },
    ],
    // Rendered into <head> by <HeadContent /> below. The inline snippet defines
    // window.gtag synchronously, so events queue into dataLayer even before the
    // async library finishes loading.
    scripts: [
      { src: `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`, async: true },
      {
        children: [
          "window.dataLayer = window.dataLayer || [];",
          "function gtag(){dataLayer.push(arguments);}",
          "gtag('js', new Date());",
          `gtag('config', '${GA_MEASUREMENT_ID}');`,
        ].join("\n"),
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const router = useRouter();

  // Google sign-in lands here from a server-side redirect carrying its analytics
  // marker in the URL fragment — see trackOAuthReturnFromHash for why.
  useEffect(() => {
    trackOAuthReturnFromHash();
  }, []);

  // Keeps this tab in step when the session changes elsewhere — a sign-in or
  // sign-out in another tab — by re-running beforeLoad. Firebase syncs its
  // state across tabs; the first callback just reports the restored state.
  useEffect(() => {
    const auth = getFirebaseAuth();
    if (!auth) return;

    let first = true;
    return onAuthStateChanged(auth, () => {
      if (first) {
        first = false;
        return;
      }
      router.invalidate();
    });
  }, [router]);

  return (
    <>
      <Outlet />
      <Toaster />
    </>
  );
}
