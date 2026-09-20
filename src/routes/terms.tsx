import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site/Header";

const SITE_URL = "https://craft-bill-ai.lovable.app";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms and Conditions | InvoiceCraft" },
      {
        name: "description",
        content:
          "The terms you agree to when using InvoiceCraft — what the tool does, what you're responsible for, and the limits of the service.",
      },
      { property: "og:url", content: `${SITE_URL}/terms` },
    ],
    links: [{ rel: "canonical", href: `${SITE_URL}/terms` }],
  }),
  component: TermsAndConditions,
});

function TermsAndConditions() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader variant="light" />
      <main className="container mx-auto max-w-3xl px-4 py-16 sm:px-6 md:py-20">
        <p className="eyebrow">Legal</p>
        <h1 className="mt-3 text-[32px] font-bold text-foreground md:text-[40px]">
          Terms and Conditions
        </h1>
        <p className="mt-4 text-sm text-muted-foreground">
          Last updated {new Date().getFullYear()}
        </p>

        <div className="mt-10 space-y-8 text-[15px] leading-relaxed text-foreground">
          <section>
            <h2 className="text-lg font-semibold">Agreeing to these terms</h2>
            <p className="mt-2 text-muted-foreground">
              By using InvoiceCraft you accept these terms. If you don't agree with them, please
              don't use the service.
            </p>
          </section>
          <section>
            <h2 className="text-lg font-semibold">What InvoiceCraft is</h2>
            <p className="mt-2 text-muted-foreground">
              InvoiceCraft is a free tool for building and exporting invoices. You don't need an
              account to use the builder. Your invoice is assembled in your browser and saved to
              local storage on your own device — we don't keep a copy on a server, so we can't
              recover it for you.
            </p>
          </section>
          <section>
            <h2 className="text-lg font-semibold">Your account</h2>
            <p className="mt-2 text-muted-foreground">
              Accounts are optional. If you create one with an email address or through Google,
              you're responsible for keeping your login details secure and for activity that happens
              under your account. We may suspend an account that's being used in breach of these
              terms.
            </p>
          </section>
          <section>
            <h2 className="text-lg font-semibold">Your invoices are yours</h2>
            <p className="mt-2 text-muted-foreground">
              You keep every right to the content you enter — your business details, your clients'
              details, your line items, and any logo or QR code you upload. You're responsible for
              that content being accurate and lawful, and for meeting whatever invoicing, tax, and
              record-keeping rules apply where you operate.
            </p>
          </section>
          <section>
            <h2 className="text-lg font-semibold">Not professional advice</h2>
            <p className="mt-2 text-muted-foreground">
              InvoiceCraft formats documents. It doesn't provide tax, accounting, or legal advice.
              Subtotals, tax, and totals are calculated from the numbers and tax rate you type in,
              so check every figure before you send an invoice to a client.
            </p>
          </section>
          <section>
            <h2 className="text-lg font-semibold">Acceptable use</h2>
            <p className="mt-2 text-muted-foreground">
              Don't use InvoiceCraft to create fraudulent or misleading invoices, to impersonate
              another business or person, to break the law, or to disrupt the service or the people
              using it.
            </p>
          </section>
          <section>
            <h2 className="text-lg font-semibold">Availability and your data</h2>
            <p className="mt-2 text-muted-foreground">
              The service is provided free and as-is. We don't guarantee it will always be
              available, and features may change or be withdrawn. Because your invoices live in your
              browser's local storage, clearing your browser data, using private browsing, or
              switching device will lose them — keep your own copies of anything you need, such as
              the PDF or PNG you export.
            </p>
          </section>
          <section>
            <h2 className="text-lg font-semibold">Paid features</h2>
            <p className="mt-2 text-muted-foreground">
              Everything currently offered is free, and there is no paid plan at the moment. If paid
              features are introduced later, separate terms will cover them and nothing in this
              document commits you to a charge.
            </p>
          </section>
          <section>
            <h2 className="text-lg font-semibold">Limits of our liability</h2>
            <p className="mt-2 text-muted-foreground">
              To the fullest extent the law allows, InvoiceCraft is provided without warranties of
              any kind, and we aren't liable for losses arising from your use of it — including lost
              invoice data, missed payments, or mistakes in a document you send to a client.
            </p>
          </section>
          <section>
            <h2 className="text-lg font-semibold">Changes to these terms</h2>
            <p className="mt-2 text-muted-foreground">
              We may update these terms as the service changes. The date above shows when they were
              last revised, and continuing to use InvoiceCraft after a change means you accept the
              revised version.
            </p>
          </section>
          <section>
            <h2 className="text-lg font-semibold">Contact</h2>
            <p className="mt-2 text-muted-foreground">
              Questions about these terms? The contact details in our{" "}
              <Link to="/privacy" className="text-blue-900 underline underline-offset-2">
                Privacy Notice
              </Link>{" "}
              apply here too.
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
