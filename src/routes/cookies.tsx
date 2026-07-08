import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site/Header";

const SITE_URL = "https://craft-bill-ai.lovable.app";

export const Route = createFileRoute("/cookies")({
  head: () => ({
    meta: [
      { title: "Cookie Policy | InvoiceCraft" },
      {
        name: "description",
        content: "InvoiceCraft doesn't use tracking or advertising cookies — here's what we actually store.",
      },
      { property: "og:url", content: `${SITE_URL}/cookies` },
    ],
    links: [{ rel: "canonical", href: `${SITE_URL}/cookies` }],
  }),
  component: CookiePolicy,
});

function CookiePolicy() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader variant="light" />
      <main className="container mx-auto max-w-3xl px-4 py-16 sm:px-6 md:py-20">
        <p className="eyebrow">Legal</p>
        <h1 className="mt-3 text-[32px] font-bold text-foreground md:text-[40px]">Cookie Policy</h1>
        <p className="mt-4 text-sm text-muted-foreground">Last updated {new Date().getFullYear()}</p>

        <div className="mt-10 space-y-8 text-[15px] leading-relaxed text-foreground">
          <section>
            <h2 className="text-lg font-semibold">We don't use tracking cookies</h2>
            <p className="mt-2 text-muted-foreground">
              InvoiceCraft doesn't set advertising, analytics, or third-party tracking cookies. We
              don't run any analytics platform on this site.
            </p>
          </section>
          <section>
            <h2 className="text-lg font-semibold">Local storage, not cookies</h2>
            <p className="mt-2 text-muted-foreground">
              To auto-save your in-progress invoice between visits, we use your browser's local
              storage — a different mechanism from cookies. It isn't sent to any server and stays on
              your device until you clear your browser data.
            </p>
          </section>
          <section>
            <h2 className="text-lg font-semibold">Changes to this policy</h2>
            <p className="mt-2 text-muted-foreground">
              If that ever changes (e.g. we add optional analytics), we'll update this page. See our{" "}
              <Link to="/privacy" className="text-blue-900 underline underline-offset-2">
                Privacy Notice
              </Link>{" "}
              for how we handle your invoice data.
            </p>
          </section>
        </div>

        <Link
          to="/"
          className="mt-12 inline-block text-sm text-muted-foreground transition-smooth hover:text-foreground"
        >
          ← Back to home
        </Link>
      </main>
    </div>
  );
}
