import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { SiteHeader } from "@/components/site/Header";
import { SITE_URL, absoluteUrl } from "@/lib/site-url";

const PAGE_URL = absoluteUrl("/about");

// Kept under ~60 and ~155 characters so search results show them uncut.
const TITLE = "About InvoiceCraft — Free Invoice Maker for Cambodia";
const DESCRIPTION =
  "Free online invoice maker built in Phnom Penh for freelancers and small businesses. Invoices in Khmer and English, USD and Riel, with a payment QR.";

const capabilities = [
  {
    title: "Create invoices in under a minute",
    desc: "Fill in the form, watch the live preview, and export. Subtotal, tax and total calculate as you type.",
  },
  {
    title: "Invoice labels in five languages",
    desc: "Switch an invoice's labels between English, Khmer, Chinese, Japanese and Korean in one click, and the matching font changes with them. Your line items and notes stay exactly as you typed them.",
  },
  {
    title: "Local currencies, formatted correctly",
    desc: "US dollars and Cambodian Riel (៛), plus Chinese Yuan, Japanese Yen and Korean Won, each with the right symbol placement and decimals.",
  },
  {
    title: "Get paid from a phone",
    desc: "Add your KHQR or bank QR code to the invoice so clients can pay straight from their banking app.",
  },
  {
    title: "Look professional",
    desc: "Upload your logo once and it appears on every invoice.",
  },
  {
    title: "Send it your way",
    desc: "Download a print-ready PDF or PNG, or share it to a Telegram chat.",
  },
];

const audiences = [
  "Freelancers: designers, developers, photographers and consultants",
  "Cafés, shops and restaurants",
  "Agencies and small service businesses",
  "Anyone who bills clients in Cambodia or the region",
];

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:url", content: PAGE_URL },
    ],
    links: [{ rel: "canonical", href: PAGE_URL }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "AboutPage",
              "@id": `${PAGE_URL}#aboutpage`,
              url: PAGE_URL,
              name: "About InvoiceCraft",
              description: DESCRIPTION,
              inLanguage: "en",
              // Points at the Organization the homepage already declares,
              // rather than a second copy that could drift from it.
              about: { "@id": `${SITE_URL}/#organization` },
              isPartOf: { "@id": `${SITE_URL}/#website` },
            },
            {
              "@type": "BreadcrumbList",
              "@id": `${PAGE_URL}#breadcrumb`,
              itemListElement: [
                { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
                { "@type": "ListItem", position: 2, name: "About", item: PAGE_URL },
              ],
            },
          ],
        }),
      },
    ],
  }),
  component: AboutPage,
});

function AboutPage() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader variant="light" />
      <main className="container mx-auto max-w-3xl px-4 py-16 sm:px-6 md:py-20">
        <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground">
          <ol className="flex items-center gap-2">
            <li>
              <Link to="/" className="transition-smooth hover:text-foreground">
                Home
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li className="text-foreground">About</li>
          </ol>
        </nav>

        <p className="eyebrow mt-6">About</p>
        <h1 className="mt-3 text-[32px] font-bold text-foreground md:text-[40px]">
          About InvoiceCraft
        </h1>
        <p className="mt-4 text-[17px] font-semibold text-foreground">
          Invoicing made simple for small businesses in Cambodia
        </p>
        <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">
          InvoiceCraft is a free online invoice generator for freelancers, shops and small teams in
          Cambodia and across Asia. Create a professional invoice with labels in Khmer, English,
          Chinese, Japanese or Korean, bill in US dollars or Cambodian Riel (៛), and add your KHQR
          code so clients can pay you faster. You don't need accounting software or design skills.
        </p>

        <div className="mt-12 space-y-12 text-[15px] leading-relaxed">
          <section>
            <h2 className="text-[22px] font-bold text-foreground">Why we built InvoiceCraft</h2>
            <p className="mt-3 text-muted-foreground">
              Most invoice tools are made for Western businesses. They work in one language and one
              currency, and they don't fit the way people in Cambodia actually get paid. Small
              business owners here often bill in both dollars and Riel, send invoices over Telegram,
              and get paid through banking apps like ABA or ACLEDA.
            </p>
            <p className="mt-3 text-muted-foreground">
              We built InvoiceCraft in Phnom Penh to fit that reality, so small businesses spend
              less time on paperwork and more time getting paid.
            </p>
          </section>

          <section>
            <h2 className="text-[22px] font-bold text-foreground">
              What you can do with InvoiceCraft
            </h2>
            <ul className="mt-4 space-y-4">
              {capabilities.map((c) => (
                <li key={c.title}>
                  <h3 className="font-semibold text-foreground">{c.title}</h3>
                  <p className="mt-1 text-muted-foreground">{c.desc}</p>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-muted-foreground">
              See them in action in the{" "}
              <Link
                to="/"
                hash="features"
                className="font-semibold text-blue-900 underline underline-offset-4"
              >
                feature tour
              </Link>
              .
            </p>
          </section>

          <section>
            <h2 className="text-[22px] font-bold text-foreground">Who InvoiceCraft is for</h2>
            <ul className="mt-3 list-disc space-y-1.5 pl-5 text-muted-foreground">
              {audiences.map((a) => (
                <li key={a}>{a}</li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="text-[22px] font-bold text-foreground">Our mission</h2>
            <p className="mt-3 text-muted-foreground">
              To give every small business in Cambodia professional invoicing that's free and works
              in the languages and currencies they actually use.
            </p>
          </section>

          <section>
            <h2 className="text-[22px] font-bold text-foreground">Made in Phnom Penh</h2>
            <p className="mt-3 text-muted-foreground">
              InvoiceCraft is designed and built in Phnom Penh. Have a question first? Most answers
              are in the{" "}
              <Link to="/faq" className="font-semibold text-blue-900 underline underline-offset-4">
                FAQ
              </Link>
              .
            </p>
          </section>
        </div>

        <div className="mt-14 rounded-xl bg-surface p-8 text-center">
          <p className="text-[17px] font-semibold text-foreground">
            Ready to send your first invoice?
          </p>
          <p className="mt-2 text-[15px] text-muted-foreground">Free, and no sign-up needed.</p>
          <Button
            asChild
            size="lg"
            className="mt-6 rounded-full bg-blue-900 px-8 shadow-none text-white hover:bg-blue-900/90"
          >
            <Link to="/builder">Create your free invoice</Link>
          </Button>
        </div>
      </main>
    </div>
  );
}
