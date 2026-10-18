import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site/Header";
import { absoluteUrl } from "@/lib/site-url";

const PAGE_URL = absoluteUrl("/cookies");

export const Route = createFileRoute("/cookies")({
  head: () => ({
    meta: [
      { title: "Cookie Policy | InvoiceCraft" },
      {
        name: "description",
        content: "The cookies InvoiceCraft uses — Google Analytics and sign-in — and how to opt out.",
      },
      { property: "og:title", content: "Cookie Policy | InvoiceCraft" },
      {
        property: "og:description",
        content: "The cookies InvoiceCraft uses — Google Analytics and sign-in — and how to opt out.",
      },
      { property: "og:url", content: PAGE_URL },
    ],
    links: [{ rel: "canonical", href: PAGE_URL }],
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
            <h2 className="text-lg font-semibold">Analytics cookies</h2>
            <p className="mt-2 text-muted-foreground">
              We use Google Analytics to see how the site is used. It sets first-party cookies
              (named <code>_ga</code> and <code>_ga_*</code>) that tell visits apart and last up
              to two years. They don't contain your name, email or invoice details. We don't use
              advertising cookies. You can block or delete these cookies in your browser settings,
              or opt out with Google's{" "}
              <a
                href="https://tools.google.com/dlpage/gaoptout"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-900 underline underline-offset-2"
              >
                Analytics opt-out add-on
              </a>
              .
            </p>
          </section>
          <section>
            <h2 className="text-lg font-semibold">Sign-in cookies</h2>
            <p className="mt-2 text-muted-foreground">
              When you sign in, we set a secure session cookie that keeps you logged in. If you
              connect Google Drive, a second secure cookie holds an encrypted Google permission so
              your details can sync. Both are needed for those features to work and are removed
              when you sign out.
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
              If we change the cookies we use, we'll update this page. See our{" "}
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
