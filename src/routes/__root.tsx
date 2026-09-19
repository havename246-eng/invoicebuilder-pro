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
import { fetchUser, type AuthUser } from "@/lib/auth";
import { trackOAuthReturnFromHash } from "@/lib/analytics";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
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
  );
}

const SITE_URL = "https://craft-bill-ai.lovable.app";
const OG_IMAGE = `${SITE_URL}/og-image.png`;
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
      { name: "description", content: "Create professional invoices in seconds. Free invoice maker with custom branding, multi-currency (USD & KHR), AI translation, and one-click PDF export." },
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
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "InvoiceCraft — Free Invoice Generator" },
      { name: "twitter:description", content: "Create professional invoices in seconds. Custom branding, multi-currency, AI translation, and PDF export." },
      { name: "twitter:image", content: OG_IMAGE },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "canonical", href: SITE_URL },
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

  // Keeps this tab in step when the session changes elsewhere — a sign-out in
  // another tab, or a token refresh — by re-running beforeLoad.
  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED") {
        router.invalidate();
      }
    });

    return () => subscription.unsubscribe();
  }, [router]);

  return (
    <>
      <Outlet />
      <Toaster />
    </>
  );
}
