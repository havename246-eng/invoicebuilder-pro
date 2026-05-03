import { createFileRoute, Link } from "@tanstack/react-router";
import { Languages, Palette, FileDown, Coins, QrCode, Sparkles } from "lucide-react";
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
      <section className="bg-background">
        <div className="container mx-auto max-w-7xl px-6 py-20 md:py-28">
          <div className="grid items-center gap-16 lg:grid-cols-[1.05fr_1fr]">
            <div>
              <p className="eyebrow">Invoice tool for modern freelancers</p>
              <h1 className="mt-5 text-[44px] leading-[1.1] md:text-[52px]">
                Invoices that look <em>crafted</em>, not generated.
              </h1>
              <p className="mt-6 max-w-xl text-[15px] text-muted-foreground">
                InvoiceCraft is the fastest way to send beautiful, branded e-invoices.
                Multi-currency, multilingual, and ready for the modern web.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Button asChild size="lg" className="rounded-[6px] bg-primary text-primary-foreground hover:opacity-90">
                  <Link to="/builder">Create your invoice</Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="rounded-[6px] border-[#C8C4BE] text-foreground">
                  <a href="#features">Explore features</a>
                </Button>
              </div>
              <p className="mt-8 text-sm text-muted-foreground">
                No sign-up · USD & ៛ Riel · PDF + PNG export
              </p>
            </div>

            <div className="relative">
              <div className="relative scale-[0.85] origin-top">
                <InvoicePreview data={sample} />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="bg-surface py-20 md:py-24">
        <div className="container mx-auto max-w-7xl px-6">
          <div className="mx-auto max-w-2xl text-center">
            <p className="eyebrow">Everything you need</p>
            <h2 className="mt-3 text-[32px] md:text-[36px]">
              Built for the details that matter
            </h2>
            <p className="mt-4 text-[15px] text-muted-foreground">
              From local currency formatting to AI translation, every feature is tuned for professional billing.
            </p>
          </div>

          <div className="mt-14 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <div
                key={f.title}
                className="rounded-lg border border-border bg-surface p-6 transition-smooth hover:shadow-[0_2px_12px_rgba(0,0,0,0.06)]"
              >
                <f.icon className="mb-4 h-5 w-5 text-foreground" />
                <h3 className="text-sm font-semibold text-foreground">{f.title}</h3>
                <p className="mt-2 text-[13px] text-muted-foreground">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-[#1A1916] py-20 md:py-24">
        <div className="container mx-auto max-w-7xl px-6 text-center">
          <h2 className="text-[32px] text-white md:text-[40px]">
            Send your first invoice in <em>under a minute</em>
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-[15px] text-white/55">
            No accounts, no setup. Just craft, export, and get paid.
          </p>
          <Button asChild size="lg" className="mt-8 rounded-[6px] bg-white text-[#1A1916] hover:bg-white/90">
            <Link to="/builder">Open the builder</Link>
          </Button>
        </div>
      </section>

      <footer className="border-t border-border bg-background py-8">
        <div className="container mx-auto max-w-7xl px-6 text-center text-[13px] text-muted-foreground">
          © {new Date().getFullYear()} InvoiceCraft. Crafted with care.
        </div>
      </footer>
    </div>
  );
}
