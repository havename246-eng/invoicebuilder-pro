import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site/Header";
import { absoluteUrl } from "@/lib/site-url";

const PAGE_URL = absoluteUrl("/privacy");

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Notice | InvoiceCraft" },
      {
        name: "description",
        content: "How InvoiceCraft handles your data — no accounts, no server-side storage, invoices stay on your device.",
      },
      { property: "og:title", content: "Privacy Notice | InvoiceCraft" },
      {
        property: "og:description",
        content: "How InvoiceCraft handles your data — no accounts, no server-side storage, invoices stay on your device.",
      },
      { property: "og:url", content: PAGE_URL },
    ],
    links: [{ rel: "canonical", href: PAGE_URL }],
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
              never leave your device, unless you choose to save your business details to Google
              Drive (below). They're used only to render your invoice preview and export.
            </p>
          </section>
          <section>
            <h2 className="text-lg font-semibold">Optional: Google Drive</h2>
            <p className="mt-2 text-muted-foreground">
              If you're signed in and choose "Connect Google Drive" in the builder, we ask Google
              for permission to use a private app folder in your own Google Drive (the{" "}
              <code>drive.appdata</code> scope). We keep one file there with your business and
              payment details — business name, email, address, logo, bank name, account number and
              payment QR — and keep it in sync automatically while you edit, on every device you
              connect. We can't see any other files in your Drive, and your details never pass
              through our servers: your browser talks to Google directly. To sync without asking you
              each visit, an encrypted Google permission is stored in a secure cookie on your own
              device; it can only reach that app folder. Choosing "Turn off" or signing out removes
              it from the device, and you can revoke InvoiceCraft's access entirely from your Google
              Account under Security → Third-party apps with account access.
            </p>
            <p className="mt-2 text-muted-foreground">
              With Drive connected, each invoice you export is also saved to your Drive: a PDF in a
              visible <strong>InvoiceCraft / Invoices</strong> folder that you own and can open,
              share or delete, and a copy of the invoice data in the private app folder so the{" "}
              <strong>My invoices</strong> page can list and reopen it. For this we use the{" "}
              <code>drive.file</code> scope, which only reaches files InvoiceCraft itself created
              — never your other documents. Deleting an invoice in My invoices removes both files.
            </p>
            <p className="mt-2 text-muted-foreground">
              InvoiceCraft's use of information received from Google APIs adheres to the{" "}
              <a
                href="https://developers.google.com/terms/api-services-user-data-policy"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-900 underline underline-offset-2"
              >
                Google API Services User Data Policy
              </a>
              , including the Limited Use requirements.
            </p>
          </section>
          <section>
            <h2 className="text-lg font-semibold">Analytics</h2>
            <p className="mt-2 text-muted-foreground">
              We use Google Analytics to understand how InvoiceCraft is used, so we can improve it.
              It collects standard usage information — pages visited, approximate location, device
              and browser type — and a few in-app actions, such as creating, downloading or sharing
              an invoice, signing up and logging in. We never send the contents of your invoices,
              your name, email address or any amounts to Google Analytics. Google processes this
              data under its own{" "}
              <a
                href="https://policies.google.com/privacy"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-900 underline underline-offset-2"
              >
                Privacy Policy
              </a>
              , and you can opt out with Google's{" "}
              <a
                href="https://tools.google.com/dlpage/gaoptout"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-900 underline underline-offset-2"
              >
                browser add-on
              </a>{" "}
              or by blocking analytics in your browser. We don't run advertising or sell your data.
              See our{" "}
              <Link to="/cookies" className="text-blue-900 underline underline-offset-2">
                Cookie Policy
              </Link>{" "}
              for the cookies this uses.
            </p>
          </section>
          <section>
            <h2 className="text-lg font-semibold">Contact</h2>
            <p className="mt-2 text-muted-foreground">
              Questions about this notice? Email us at{" "}
              <a
                href="mailto:invoicecraftkh@gmail.com"
                className="text-blue-900 underline underline-offset-2"
              >
                invoicecraftkh@gmail.com
              </a>
              .
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
