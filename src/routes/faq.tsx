import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site/Header";
import { SITE_URL, absoluteUrl } from "@/lib/site-url";
import { faqs } from "@/lib/faq";

const PAGE_URL = absoluteUrl("/faq");

export const Route = createFileRoute("/faq")({
  head: () => ({
    meta: [
      { title: "Invoice Generator FAQ — Common Questions | InvoiceCraft" },
      {
        name: "description",
        content:
          "Answers to common questions about InvoiceCraft: pricing, whether you need an account, supported currencies, AI translation, export formats, and where your invoice data is stored.",
      },
      { property: "og:title", content: "Invoice Generator FAQ | InvoiceCraft" },
      {
        property: "og:description",
        content:
          "Pricing, accounts, currencies, AI translation, export formats, and data storage — answered.",
      },
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
              // The full question set lives on this page, so this is where the
              // FAQPage markup belongs — the homepage only previews a few.
              "@type": "FAQPage",
              "@id": `${PAGE_URL}#faqpage`,
              url: PAGE_URL,
              // Same array the accordion below renders from, so the markup
              // can't claim an answer a visitor can't read.
              mainEntity: faqs.map((f) => ({
                "@type": "Question",
                name: f.q,
                acceptedAnswer: { "@type": "Answer", text: f.a },
              })),
              isPartOf: { "@id": `${SITE_URL}/#website` },
              publisher: { "@id": `${SITE_URL}/#organization` },
            },
            {
              "@type": "BreadcrumbList",
              "@id": `${PAGE_URL}#breadcrumb`,
              itemListElement: [
                { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
                { "@type": "ListItem", position: 2, name: "FAQ", item: PAGE_URL },
              ],
            },
          ],
        }),
      },
    ],
  }),
  component: FaqPage,
});

function FaqPage() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader variant="light" />
      <main className="container mx-auto max-w-3xl px-4 py-16 sm:px-6 md:py-20">
        {/* Visible breadcrumb matching the BreadcrumbList above — the markup is
            meant to describe real navigation, not stand in for it. */}
        <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground">
          <ol className="flex items-center gap-2">
            <li>
              <Link to="/" className="transition-smooth hover:text-foreground">
                Home
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li className="text-foreground">FAQ</li>
          </ol>
        </nav>

        <p className="eyebrow mt-6">Help</p>
        <h1 className="mt-3 text-[32px] font-bold text-foreground md:text-[40px]">
          Invoice generator FAQ
        </h1>
        <p className="mt-4 text-[15px] leading-relaxed text-muted-foreground">
          Common questions about creating, translating, and exporting invoices with InvoiceCraft.
        </p>

        {/* Expanded rather than an accordion, on purpose. Radix unmounts closed
            AccordionContent, so a collapsed FAQ ships questions with no answers
            in the HTML — which would make the FAQPage markup above describe
            content no crawler (and no JS-less visitor) can actually read.
            Each question is a real <h2>, which also gives the page a heading
            outline matching the questions it targets. */}
        <div className="mt-10 space-y-8">
          {faqs.map((f) => (
            <section key={f.q}>
              <h2 className="text-[18px] font-semibold text-foreground">{f.q}</h2>
              <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">{f.a}</p>
            </section>
          ))}
        </div>

        <div className="mt-12 rounded-xl bg-surface p-6 text-center">
          <p className="text-[15px] text-muted-foreground">
            Still have a question? The fastest answer is usually to try it —{" "}
            <Link to="/builder" className="font-semibold text-blue-900 underline underline-offset-4">
              the builder is free and needs no account
            </Link>
            .
          </p>
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
