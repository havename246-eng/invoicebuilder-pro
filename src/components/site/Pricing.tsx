import { useState } from "react";
import { Link, useRouteContext } from "@tanstack/react-router";
import { Check, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const freeFeatures = [
  "Unlimited invoices, no account required",
  "USD & Riel formatting, auto-calculated totals & tax",
  "AI translation",
  "Payment QR code",
  "PDF/PNG export",
  "InvoiceCraft label shown in the invoice footer",
];

const proFeatures = [
  { title: "No InvoiceCraft label", desc: "clean, white-label invoices" },
  { title: "Custom header branding", desc: "your logo and business identity at the top" },
  { title: "Custom footer branding", desc: "your own tagline, message, or brand mark at the bottom" },
];

export function PricingSection() {
  const { user } = useRouteContext({ from: "__root__" });
  const [billing, setBilling] = useState<"monthly" | "yearly">("yearly");
  const yearly = billing === "yearly";

  return (
    <section id="pricing" className="bg-background py-20 md:py-24" aria-label="Pricing">
      <div className="container mx-auto max-w-7xl px-4 sm:px-6">
        <div className="reveal-row mx-auto max-w-[600px] text-center">
          <p className="eyebrow">Pricing</p>
          <h2 className="mt-3 text-[32px] font-bold leading-tight text-foreground md:text-[40px]">
            Upgrade your plan
          </h2>
          <p className="mt-4 text-[15px] text-muted-foreground">
            Start free, forever. Go Pro when you want every invoice to carry your brand — and only
            your brand.
          </p>

          <div
            className="mt-8 inline-flex items-center gap-1 rounded-full bg-muted p-1 sm:gap-1.5 sm:p-1.5"
            role="group"
            aria-label="Billing period"
          >
            <button
              type="button"
              onClick={() => setBilling("monthly")}
              aria-pressed={!yearly}
              className={cn(
                "rounded-full px-5 py-2 text-sm font-medium transition-smooth",
                !yearly ? "bg-blue-900 text-white" : "text-muted-foreground hover:text-foreground",
              )}
            >
              Monthly
            </button>
            <button
              type="button"
              onClick={() => setBilling("yearly")}
              aria-pressed={yearly}
              className={cn(
                "flex items-center gap-2 rounded-full px-5 py-2 text-sm font-medium transition-smooth",
                yearly ? "bg-blue-900 text-white" : "text-muted-foreground hover:text-foreground",
              )}
            >
              Yearly
              <span className="rounded-full bg-accent-lime px-2 py-0.5 text-[10px] font-semibold text-blue-950">
                Save 35%
              </span>
            </button>
          </div>
        </div>

        <div className="reveal-group mx-auto mt-12 grid max-w-4xl items-stretch gap-6 md:mt-16 md:grid-cols-2">
          {/* Free */}
          <div className="reveal-item flex flex-col rounded-2xl bg-surface p-6 shadow-card transition-smooth hover:-translate-y-0.5 hover:shadow-lg sm:p-8">
            <h3 className="text-lg font-bold text-foreground">Free</h3>
            <p className="mt-1 text-sm text-muted-foreground">Everything you need to invoice today</p>

            <div className="mt-6">
              <div className="flex items-baseline gap-1.5">
                <span className="text-[40px] font-bold leading-none text-foreground">$0</span>
                <span className="text-sm text-muted-foreground">/ forever</span>
              </div>
              <p className="mt-2 text-[13px] text-muted-foreground">No account, no card, no catch</p>
            </div>

            <ul className="mt-8 flex flex-col gap-3.5 text-sm text-foreground">
              {freeFeatures.map((f) => (
                <li key={f} className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-100">
                    <Check className="h-3 w-3 text-blue-900" aria-hidden="true" />
                  </span>
                  {f}
                </li>
              ))}
            </ul>

            <div className="mt-auto pt-8">
              <Button
                asChild
                size="lg"
                variant="outline"
                className="w-full rounded-full border-blue-900/25 text-blue-900 hover:bg-blue-50 hover:text-blue-900"
              >
                <Link to="/builder">Start invoicing free</Link>
              </Button>
            </div>
          </div>

          {/* Pro */}
          <div className="reveal-item relative flex flex-col rounded-2xl bg-ink-canvas p-6 shadow-card transition-smooth hover:-translate-y-0.5 hover:shadow-xl sm:p-8">
            <span className="absolute -top-3.5 left-1/2 flex -translate-x-1/2 items-center gap-1.5 whitespace-nowrap rounded-full bg-accent-lime px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-blue-950">
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              Recommended
            </span>

            <h3 className="text-lg font-bold text-white">Pro</h3>
            <p className="mt-1 text-sm text-ink-subtext">Make every invoice 100% yours</p>

            <div className="mt-6">
              <div className="flex items-baseline gap-1.5">
                <span className="text-[40px] font-bold leading-none text-white">
                  {yearly ? "$39" : "$4.99"}
                </span>
                <span className="text-sm text-ink-subtext">{yearly ? "/ year" : "/ month"}</span>
              </div>
              <p className="mt-2 text-[13px] text-ink-subtext">
                {yearly ? "That's about $3.25/mo — save 35%" : "Or $39/yr and save 35%"}
              </p>
            </div>

            <p className="mt-8 text-sm font-semibold text-white">Everything in Free, plus:</p>
            <ul className="mt-3.5 flex flex-col gap-3.5 text-sm">
              {proFeatures.map((f) => (
                <li key={f.title} className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent-lime/15">
                    <Check className="h-3 w-3 text-accent-lime" aria-hidden="true" />
                  </span>
                  <span className="text-ink-subtext">
                    <strong className="font-semibold text-white">{f.title}</strong> — {f.desc}
                  </span>
                </li>
              ))}
            </ul>

            <div className="mt-auto pt-8">
              <Button
                asChild
                size="lg"
                className="w-full rounded-full bg-accent-lime text-blue-950 hover:bg-accent-lime/90"
              >
                {/* Upgrading starts with an account. Someone already signed in
                    has no signup step left, so send them to their dashboard. */}
                {user ? (
                  <Link to="/dashboard">Upgrade to Pro</Link>
                ) : (
                  <Link to="/signup" search={{ redirect: "/dashboard" }}>
                    Upgrade to Pro
                  </Link>
                )}
              </Button>
              <p className="mt-3 text-center text-xs text-ink-subtext">Cancel anytime.</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
