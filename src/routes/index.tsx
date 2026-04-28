import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Languages, Palette, FileDown, Coins, Sparkles, QrCode, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SiteHeader } from "@/components/site/Header";
import { InvoicePreview } from "@/components/invoice/InvoicePreview";
import { defaultInvoice } from "@/lib/invoice";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "InvoiceCraft — Beautiful invoices in seconds" },
      { name: "description", content: "Professional, multilingual e-invoices with custom branding, KHR/USD support, and one-click PDF export." },
      { property: "og:title", content: "InvoiceCraft — Beautiful invoices in seconds" },
      { property: "og:description", content: "Professional invoices with AI translation, branding, and KHR/USD support." },
    ],
  }),
  component: Landing,
});

const features = [
  { icon: Languages, title: "AI Translation", desc: "Translate invoices into 100+ languages with one click." },
  { icon: Palette, title: "Custom Branding", desc: "Upload your logo and tailor the look to your brand." },
  { icon: Coins, title: "USD & Riel (៛)", desc: "Native KHR formatting — no decimals, proper symbol." },
  { icon: QrCode, title: "Payment QR", desc: "Embed scannable QR codes for instant client payment." },
  { icon: FileDown, title: "PDF & PNG export", desc: "Print-ready exports optimized for client delivery." },
  { icon: Sparkles, title: "Smart fields", desc: "Optional fields auto-hide. Real-time totals & tax." },
];

function Landing() {
  const sample = defaultInvoice();
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-hero">
        <div className="absolute inset-0 grid-pattern opacity-40" />
        <div className="container relative mx-auto max-w-7xl px-6 py-20 md:py-28">
          <div className="grid items-center gap-16 lg:grid-cols-[1.05fr_1fr]">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-border bg-surface/60 px-3 py-1 text-xs text-muted-foreground backdrop-blur">
                <Sparkles className="h-3 w-3 text-primary-glow" />
                AI-powered invoicing for modern teams
              </div>
              <h1 className="mt-6 font-display text-5xl font-bold leading-[1.05] tracking-tight md:text-7xl">
                Invoices that look <span className="text-gradient">crafted</span>, not generated.
              </h1>
              <p className="mt-6 max-w-xl text-lg text-muted-foreground">
                InvoiceCraft is the fastest way to send beautiful, branded e-invoices.
                Multi-currency, multilingual, and ready for the modern web.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Button asChild size="lg" className="bg-gradient-primary shadow-glow hover:opacity-90">
                  <Link to="/builder">
                    Create your invoice <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline">
                  <a href="#features">Explore features</a>
                </Button>
              </div>
              <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
                {["No sign-up", "USD & ៛ Riel", "PDF + PNG export"].map((t) => (
                  <div key={t} className="flex items-center gap-1.5">
                    <Check className="h-4 w-4 text-success" /> {t}
                  </div>
                ))}
              </div>
            </div>

            <div className="relative animate-float">
              <div className="absolute -inset-8 rounded-3xl bg-gradient-primary opacity-20 blur-3xl" />
              <div className="relative scale-[0.85] origin-top">
                <InvoicePreview data={sample} />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="container mx-auto max-w-7xl px-6 py-24">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-medium text-primary-glow">Everything you need</p>
          <h2 className="mt-3 font-display text-4xl font-bold tracking-tight md:text-5xl">
            Built for the details that matter
          </h2>
          <p className="mt-4 text-muted-foreground">
            From local currency formatting to AI translation, every feature is tuned for professional billing.
          </p>
        </div>

        <div className="mt-14 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div key={f.title} className="group relative overflow-hidden rounded-2xl border border-border bg-gradient-card p-6 shadow-card transition-smooth hover:border-primary/50 hover:shadow-glow">
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-primary shadow-glow">
                <f.icon className="h-5 w-5 text-primary-foreground" />
              </div>
              <h3 className="font-display text-lg font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="container mx-auto max-w-7xl px-6 pb-24">
        <div className="relative overflow-hidden rounded-3xl border border-border bg-gradient-card p-12 text-center shadow-elegant md:p-16">
          <div className="absolute inset-0 grid-pattern opacity-30" />
          <div className="relative">
            <h2 className="font-display text-4xl font-bold tracking-tight md:text-5xl">
              Send your first invoice in <span className="text-gradient">under a minute</span>
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
              No accounts, no setup. Just craft, export, and get paid.
            </p>
            <Button asChild size="lg" className="mt-8 bg-gradient-primary shadow-glow hover:opacity-90">
              <Link to="/builder">
                Open the builder <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <footer className="border-t border-border/50 py-8">
        <div className="container mx-auto max-w-7xl px-6 text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} InvoiceCraft. Crafted with care.
        </div>
      </footer>
    </div>
  );
}
