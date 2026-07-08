import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site/Header";

const SITE_URL = "https://craft-bill-ai.lovable.app";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Notice | InvoiceCraft" },
      {
        name: "description",
        content: "How InvoiceCraft handles your data — no accounts, no server-side storage, invoices stay on your device.",
      },
      { property: "og:url", content: `${SITE_URL}/privacy` },
    ],
    links: [{ rel: "canonical", href: `${SITE_URL}/privacy` }],
  }),
  component: PrivacyNotice,
});

function PrivacyNotice() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader variant="light" />
      <main className="container mx-auto max-w-3xl px-4 py-16 sm:px-6 md:py-20">
        <p className="eyebrow">Legal</p>
        <h1 className="mt-3 text-[32px] font-bold text-foreground md:text-[40px]">Privacy Notice</h1>
        <p className="mt-4 text-sm text-muted-foreground">Last updated {new Date().getFullYear()}</p>

        <div className="mt-10 space-y-8 text-[15px] leading-relaxed text-foreground">
          <section>
            <h2 className="text-lg font-semibold">No accounts, no server-side storage</h2>
            <p className="mt-2 text-muted-foreground">
              InvoiceCraft doesn't require sign-up, and we don't operate a backend that stores your
              invoices. Everything you type — company details, client details, line items, uploaded
              logo, and QR code — is saved only in your browser's local storage on your own device.
            </p>
          </section>
          <section>
            <h2 className="text-lg font-semibold">Uploaded images</h2>
            <p className="mt-2 text-muted-foreground">
              Logos and QR codes you upload are converted to a local data format in your browser and
              never leave your device. They're used only to render your invoice preview and export.
            </p>
          </section>
          <section>
            <h2 className="text-lg font-semibold">No tracking or analytics</h2>
            <p className="mt-2 text-muted-foreground">
              We don't run analytics, advertising, or third-party trackers on this site. See our{" "}
              <Link to="/cookies" className="text-blue-900 underline underline-offset-2">
                Cookie Policy
              </Link>{" "}
              for details.
            </p>
          </section>
          <section>
            <h2 className="text-lg font-semibold">Contact</h2>
            <p className="mt-2 text-muted-foreground">
              Questions about this notice? Reach out via the{" "}
              <a
                href="https://www.buymeacoffee.com/invoicecraft"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-900 underline underline-offset-2"
              >
                Buy Me a Coffee
              </a>{" "}
              page.
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
