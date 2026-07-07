import type { ReactNode } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import type { LucideIcon } from "lucide-react";
import {
  FileDown,
  FileText,
  QrCode,
  Store,
  Zap,
  Wallet,
  Languages,
  Palette,
  Coins,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { SiteHeader } from "@/components/site/Header";
import { InvoicePreview } from "@/components/invoice/InvoicePreview";
import { defaultInvoice } from "@/lib/invoice";
import { cn } from "@/lib/utils";

const SITE_URL = "https://craft-bill-ai.lovable.app";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Free Online Invoice Maker with AI Translation & QR Payments | Invoice Craft" },
      {
        name: "description",
        content:
          "Create professional e-invoices in seconds. AI translation into 100+ languages, custom branding, USD & Riel currency support, QR payments, and instant PDF export.",
      },
      {
        property: "og:title",
        content: "Free Online Invoice Maker with AI Translation & QR Payments | Invoice Craft",
      },
      {
        property: "og:description",
        content:
          "Create professional e-invoices in seconds. AI translation into 100+ languages, custom branding, USD & Riel currency support, QR payments, and instant PDF export.",
      },
      { property: "og:url", content: SITE_URL },
    ],
    links: [{ rel: "canonical", href: SITE_URL }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebApplication",
          name: "InvoiceCraft",
          url: SITE_URL,
          description:
            "Free invoice generator for freelancers and small businesses. Create professional invoices with custom branding, multi-currency support, and PDF export.",
          applicationCategory: "BusinessApplication",
          operatingSystem: "Any",
          offers: {
            "@type": "Offer",
            price: "0",
            priceCurrency: "USD",
          },
          featureList: [
            "Custom branding & logo upload",
            "Multi-currency (USD & KHR Riel)",
            "AI-powered translation (100+ languages)",
            "PDF & PNG export",
            "Payment QR code embedding",
            "Real-time invoice preview",
          ],
        }),
      },
    ],
  }),
  component: Landing,
});

const saveTime = [
  { icon: Store, label: "Small Businesses" },
  { icon: Zap, label: "Instant E-Invoices" },
  { icon: FileText, label: "Work Professional Documents" },
  { icon: Wallet, label: "Get Paid Faster" },
];

function FeatureRow({
  eyebrow,
  heading,
  desc,
  items,
  ctaLabel,
  reverse,
  children,
}: {
  eyebrow: string;
  heading: string;
  desc: string;
  items: { icon: LucideIcon; title: string; desc: string }[];
  ctaLabel: string;
  reverse?: boolean;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-10 md:gap-16",
        reverse ? "md:flex-row-reverse" : "md:flex-row",
      )}
    >
      <div className="flex-1">
        <p className="eyebrow">{eyebrow}</p>
        <h3 className="mt-3 text-[24px] font-bold leading-snug text-foreground md:text-[28px]">
          {heading}
        </h3>
        <p className="mt-4 text-[15px] leading-relaxed text-muted-foreground">{desc}</p>

        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {items.map((item) => (
            <div key={item.title} className="flex items-start gap-2.5">
              <item.icon className="mt-0.5 h-4 w-4 shrink-0 text-blue-900" aria-hidden="true" />
              <div>
                <p className="text-sm font-semibold text-foreground">{item.title}</p>
                <p className="mt-0.5 text-[13px] leading-snug text-muted-foreground">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <Button
          asChild
          size="sm"
          className="mt-6 rounded-full bg-blue-900 px-6 text-white hover:bg-blue-900/90"
        >
          <Link to="/builder">{ctaLabel}</Link>
        </Button>
      </div>
      <div className="w-full flex-1">{children}</div>
    </div>
  );
}

function BuyMeACoffee() {
  return (
    <a href="https://www.buymeacoffee.com/invoicecraft" target="_blank" rel="noopener noreferrer">
      <img
        src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png"
        alt="Buy Me a Coffee"
        style={{ height: 60, width: 217 }}
      />
    </a>
  );
}

function Landing() {
  const sample = defaultInvoice();
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main>
        {/* Hero */}
        <section className="bg-ink-canvas" aria-label="Hero">
          <div className="container mx-auto max-w-7xl px-6 pt-20 pb-16 md:pt-28 md:pb-20">
            <div className="flex flex-col items-center text-center">
              <h1 className="text-[34px] font-bold leading-[1.15] text-white max-w-2xl md:max-w-6xl md:text-[52px]">
                Instant e-invoices for small business
                <br />
                translated by AI, paid faster.
              </h1>
              <p className="mt-6 max-w-xl text-[16px] text-ink-subtext">
                InvoiceCraft brings billing, translation, and payment into one place, so small
                businesses spend less time invoicing and more time getting paid — in any language.
              </p>
              <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
                <Button
                  asChild
                  size="lg"
                  className="rounded-full bg-accent-lime px-8 text-blue-950 hover:bg-accent-lime/90"
                >
                  <Link to="/builder">Create your invoice for Free</Link>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="rounded-full border-ink-border/40 bg-transparent px-8 text-white hover:bg-white/10"
                >
                  <a href="#features">Explore features</a>
                </Button>
              </div>
            </div>

            {/* Floating product mockup */}
            <div className="relative mx-auto mt-14 max-w-3xl">
              <div className="rounded-3xl bg-ink-canvas-elevated p-6 md:p-10">
                <div className="mx-auto max-w-sm -rotate-2 rounded-2xl bg-white p-3">
                  <InvoicePreview data={sample} />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Save Time. Get Paid Faster. */}
        <section className="bg-background py-16 md:py-20" aria-label="Why InvoiceCraft">
          <div className="container mx-auto max-w-7xl px-6">
            <h2 className="text-center text-[28px] font-bold text-foreground md:text-[36px]">
              Save Time. Get Paid Faster.
            </h2>
            <div className="mt-12 grid grid-cols-2 gap-5 md:grid-cols-4">
              {saveTime.map((s) => (
                <div
                  key={s.label}
                  className="flex flex-col items-center gap-3 rounded-xl border border-border bg-surface p-6 text-center transition-smooth hover:border-blue-300"
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-blue-100">
                    <s.icon className="h-5 w-5 text-blue-900" aria-hidden="true" />
                  </div>
                  <p className="text-sm font-semibold text-foreground">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="bg-surface py-20 md:py-24" aria-label="Features">
          <div className="container mx-auto max-w-7xl px-6">
            <div className="mx-auto max-w-[600px] text-center">
              <p className="eyebrow">Everything you need</p>
              <h2 className="mt-3 text-[32px] font-bold leading-tight text-foreground md:text-[40px]">
                Built for the details that matter
              </h2>
              <p className="mt-4 text-[15px] text-muted-foreground">
                From local currency formatting to AI-powered translation, every invoicing feature is
                designed for fast, professional billing — no design or accounting skills required.
              </p>
            </div>

            <div className="mt-20 flex flex-col gap-20 md:mt-24 md:gap-28">
              <FeatureRow
                eyebrow="Translation & Branding"
                heading="Every invoice, in your brand and your client's language"
                desc="Upload your logo once and every invoice matches your identity. Flip any invoice into 100+ languages with one click — no retyping, no delays."
                items={[
                  {
                    icon: Languages,
                    title: "AI Translation",
                    desc: "Translate invoices into 100+ languages with one click — no manual retyping, no delays.",
                  },
                  {
                    icon: Palette,
                    title: "Custom Branding",
                    desc: "Upload your logo and tailor the look to your brand for a consistent, professional identity.",
                  },
                ]}
                ctaLabel="Explore branding"
              >
                <div className="aspect-square w-full rounded-2xl" style={{ backgroundColor: "#60adf9" }} />
              </FeatureRow>

              <FeatureRow
                eyebrow="Currency & Automation"
                heading="Built for real numbers, not just US dollars"
                desc="Native USD and Cambodian Riel formatting with correct symbol placement, and smart fields that auto-hide when empty — totals and tax calculate as you type."
                items={[
                  {
                    icon: Coins,
                    title: "USD & Riel (៛)",
                    desc: "Native KHR formatting — no decimals, proper symbol placement, built for Cambodian businesses.",
                  },
                  {
                    icon: Sparkles,
                    title: "Smart Fields",
                    desc: "Optional fields auto-hide. Real-time totals & tax calculated automatically as you type.",
                  },
                ]}
                ctaLabel="Explore currencies"
                reverse
              >
                <div className="aspect-square w-full rounded-2xl" style={{ backgroundColor: "#60adf9" }} />
              </FeatureRow>

              <FeatureRow
                eyebrow="Payments & Delivery"
                heading="From sent to paid, without the back-and-forth"
                desc="Embed a scannable payment QR code so clients can pay instantly, then export print-ready PDF or PNG files for email or messaging apps."
                items={[
                  {
                    icon: QrCode,
                    title: "Payment QR",
                    desc: "Embed scannable QR codes for instant client payment — scan and pay, no bank transfers needed.",
                  },
                  {
                    icon: FileDown,
                    title: "PDF & PNG Export",
                    desc: "Print-ready exports optimized for client delivery via email or messaging apps.",
                  },
                ]}
                ctaLabel="Explore payments"
              >
                <div className="aspect-square w-full rounded-2xl" style={{ backgroundColor: "#60adf9" }} />
              </FeatureRow>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="bg-ink-canvas py-20 md:py-24">
          <div className="container mx-auto max-w-7xl px-6 text-center">
            <h2 className="text-[32px] text-white md:text-[40px]">
              Send your first invoice in <em>under a minute</em>
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-[15px] text-ink-subtext">
              No accounts, no setup. Just craft, export, and get paid.
            </p>
            <Button
              asChild
              size="lg"
              className="mt-8 rounded-full bg-white px-8 text-blue-900 hover:bg-white/90"
            >
              <Link to="/builder">Open the builder</Link>
            </Button>
          </div>
        </section>
      </main>

      <footer className="border-t border-border bg-background py-8" role="contentinfo">
        <div className="container mx-auto max-w-7xl px-6 flex flex-col items-center gap-3 text-[13px] text-muted-foreground">
          <BuyMeACoffee />
          <span>© {new Date().getFullYear()} InvoiceCraft. Crafted with care.</span>
        </div>
      </footer>
    </div>
  );
}
