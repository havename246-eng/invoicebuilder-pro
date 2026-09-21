import { useEffect, useRef } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import gsap from "gsap";
import { FileText, Store, Zap, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { SiteHeader } from "@/components/site/Header";
// PRICING-HIDDEN: restore this import together with the <PricingSection /> render below.
// import { PricingSection } from "@/components/site/Pricing";
import { InvoicePreview } from "@/components/invoice/InvoicePreview";
import { defaultInvoice, type InvoiceData } from "@/lib/invoice";
import { trackEvent } from "@/lib/analytics";
import { cn } from "@/lib/utils";
import { SITE_URL, absoluteUrl } from "@/lib/site-url";
import { faqs } from "@/lib/faq";
import logoLight from "@/assets/Logo-light.svg";
import footerOverlayPattern from "@/assets/footer-overlay-pattern.svg";
import bannerTranslation from "@/assets/banners/ai-translation.png";
import bannerBranding from "@/assets/banners/custom-branding.png";
import bannerCurrency from "@/assets/banners/multi-currency.png";
import bannerSmartFields from "@/assets/banners/smart-fields.png";
import bannerPaymentQr from "@/assets/banners/payment-qr.png";
import bannerExport from "@/assets/banners/export.png";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Free Online Invoice Maker with AI Translation & QR Payments | InvoiceCraft" },
      {
        name: "description",
        content:
          "Create professional invoices in seconds. Render them in English, Khmer, Chinese, Japanese or Korean, with USD and Riel formatting, QR payments and PDF export.",
      },
      {
        property: "og:title",
        content: "Free Online Invoice Maker with AI Translation & QR Payments | InvoiceCraft",
      },
      {
        property: "og:description",
        content:
          "Create professional invoices in seconds. Render them in English, Khmer, Chinese, Japanese or Korean, with USD and Riel formatting, QR payments and PDF export.",
      },
      { property: "og:url", content: SITE_URL },
    ],
    links: [{ rel: "canonical", href: SITE_URL }],
    // One @graph rather than several loose blocks: the @id references let the
    // three entities point at each other, so search engines read one brand with
    // a site and an app rather than three unrelated things that share a name.
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "Organization",
              "@id": `${SITE_URL}/#organization`,
              name: "InvoiceCraft",
              url: SITE_URL,
              // 180x180, comfortably over Google's 112x112 floor for a logo.
              logo: {
                "@type": "ImageObject",
                url: absoluteUrl("/apple-touch-icon.png"),
                width: 180,
                height: 180,
              },
              description:
                "InvoiceCraft is a free online invoice generator for freelancers and small businesses, with AI translation, multi-currency support, and instant PDF export.",
              // No sameAs: it should list social profiles this brand actually
              // controls, and inventing them is worse than omitting the field.
            },
            {
              "@type": "WebSite",
              "@id": `${SITE_URL}/#website`,
              name: "InvoiceCraft",
              url: SITE_URL,
              publisher: { "@id": `${SITE_URL}/#organization` },
              inLanguage: "en",
              // No potentialAction/SearchAction — the site has no search.
            },
            {
              "@type": "WebApplication",
              "@id": `${SITE_URL}/#webapp`,
              name: "InvoiceCraft",
              url: SITE_URL,
              publisher: { "@id": `${SITE_URL}/#organization` },
              description:
                "Free invoice generator for freelancers and small businesses. Create professional invoices with custom branding, multi-currency support, and PDF export.",
              applicationCategory: "BusinessApplication",
              operatingSystem: "Any",
              browserRequirements: "Requires JavaScript.",
              offers: {
                "@type": "Offer",
                price: "0",
                priceCurrency: "USD",
              },
              featureList: [
                "Custom branding & logo upload",
                "Multi-currency (USD, KHR Riel, CNY, JPY, KRW)",
                "Invoice rendering in English, Khmer, Chinese, Japanese and Korean",
                "PDF & PNG export",
                "Payment QR code embedding",
                "Real-time invoice preview",
              ],
            },
            // FAQPage lives on /faq, not here. The homepage shows only a
            // preview of the questions, and FAQPage markup has to match the
            // full set of answers on the page carrying it.
          ],
        }),
      },
    ],
  }),
  component: Landing,
});

/** How many questions the homepage previews before linking out to /faq. */
const HOMEPAGE_FAQ_COUNT = 4;

const saveTime = [
  { icon: Store, label: "Small Businesses" },
  { icon: Zap, label: "Instant E-Invoices" },
  { icon: FileText, label: "Work Professional Documents" },
  { icon: Wallet, label: "Get Paid Faster" },
];

const features = [
  {
    banner: bannerTranslation,
    width: 1423,
    height: 1166,
    eyebrow: "AI Translation",
    heading: "Every invoice, translated instantly",
    desc: "Switch an invoice between English, Khmer, Chinese, Japanese and Korean in one click. Labels and the matching script font swap automatically; your layout stays put.",
    cta: "Explore AI translation",
  },
  {
    banner: bannerBranding,
    width: 1423,
    height: 1167,
    eyebrow: "Custom Branding",
    heading: "Every invoice, unmistakably yours",
    desc: "Upload your logo once and every invoice matches your identity — consistent, professional, and instantly recognizable to your clients.",
    cta: "Explore branding",
  },
  {
    banner: bannerCurrency,
    width: 1423,
    height: 1167,
    eyebrow: "Multi-Currency",
    heading: "Built for real numbers, not just US dollars",
    desc: "Native USD and Cambodian Riel (៛) formatting, plus Yuan, Yen and Won — correct symbol placement and decimal rules for each, built for how local businesses actually invoice.",
    cta: "Explore currencies",
  },
  {
    banner: bannerSmartFields,
    width: 1423,
    height: 1167,
    eyebrow: "Smart Fields",
    heading: "Less typing, fewer mistakes",
    desc: "Optional fields auto-hide when empty, and totals, tax, and line-item math calculate live as you type — nothing to double-check by hand.",
    cta: "Explore smart fields",
  },
  {
    banner: bannerPaymentQr,
    width: 1422,
    height: 1167,
    eyebrow: "Payment QR",
    heading: "From sent to paid, without the back-and-forth",
    desc: "Embed a scannable payment QR code so clients can pay instantly from their banking app — no manual transfers, no chasing payments.",
    cta: "Explore payment QR",
  },
  {
    banner: bannerExport,
    width: 1423,
    height: 1167,
    eyebrow: "Export",
    heading: "Client-ready files in one click",
    desc: "Export print-ready PDF or PNG files optimized for email, messaging apps, or printing — pixel-perfect every time.",
    cta: "Explore export",
  },
];

const audiences = [
  "Solo Freelancers",
  "Small Businesses",
  "Consultants",
  "Agencies",
  "Contractors",
  "Creators & Influencers",
  "Tutors & Coaches",
  "Designers & Developers",
  "Photographers & Videographers",
  "Lawyers & Accountants",
];

function Landing() {
  const sample: InvoiceData = {
    ...defaultInvoice(),
    senderName: "Acme Studio",
    senderEmail: "billing@acme.studio",
    senderAddress: "123 Main St, Phnom Penh",
    clientName: "Lotus Hotel",
    clientEmail: "ap@lotushotel.com",
    clientAddress: "45 Riverside, Siem Reap",
    invoiceNumber: "INV-0042",
    status: "paid",
    items: [
      { id: "1", description: "Brand identity design", quantity: 1, price: 1800 },
      { id: "2", description: "Website redesign (5 pages)", quantity: 5, price: 420 },
      { id: "3", description: "Photography retouching", quantity: 12, price: 35 },
    ],
    taxRate: 10,
    notes: "Thank you for your business. Payment due within 14 days.",
    bankName: "ABA Bank",
    bankAccount: "000 123 456",
  };
  const sampleMidnight: InvoiceData = {
    ...defaultInvoice(),
    theme: "midnight",
    senderName: "Mekong Digital",
    senderEmail: "hello@mekongdigital.co",
    senderAddress: "Street 240, Phnom Penh",
    clientName: "Angkor Coffee Co.",
    clientEmail: "finance@angkorcoffee.com",
    clientAddress: "Old Market, Siem Reap",
    invoiceNumber: "INV-0117",
    status: "unpaid",
    items: [
      { id: "1", description: "Social media campaign", quantity: 1, price: 950 },
      { id: "2", description: "Product photography", quantity: 8, price: 60 },
      { id: "3", description: "Monthly SEO retainer", quantity: 3, price: 300 },
    ],
    taxRate: 10,
    notes: "Payment due within 30 days.",
    bankName: "ACLEDA Bank",
    bankAccount: "111 222 333",
  };
  const sampleEmerald: InvoiceData = {
    ...defaultInvoice(),
    theme: "emerald",
    senderName: "Green Garden Cafe",
    senderEmail: "orders@greengarden.kh",
    senderAddress: "Wat Bo Road, Siem Reap",
    clientName: "Sunrise Bakery",
    clientEmail: "acc@sunrisebakery.com",
    clientAddress: "Kandal Market, Phnom Penh",
    invoiceNumber: "INV-0203",
    status: "partial",
    items: [
      { id: "1", description: "Catering — staff party", quantity: 1, price: 640 },
      { id: "2", description: "Cold brew (case of 24)", quantity: 4, price: 55 },
      { id: "3", description: "Pastry platter", quantity: 6, price: 28 },
    ],
    taxRate: 10,
    notes: "50% deposit received — balance due on delivery.",
    bankName: "Wing Bank",
    bankAccount: "555 666 777",
  };
  const rotatingWordRef = useRef<HTMLSpanElement>(null);
  const mainRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = rotatingWordRef.current;
    if (!el) return;

    el.textContent = audiences[0];
    let i = 0;

    const tl = gsap.timeline({ repeat: -1 });
    audiences.forEach(() => {
      tl.to(el, { opacity: 0, y: -10, duration: 0.4, ease: "power2.in", delay: 1.3 }).call(() => {
        i = (i + 1) % audiences.length;
        el.textContent = audiences[i];
      });
      tl.fromTo(el, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.4, ease: "power2.out" });
    });

    return () => {
      tl.kill();
    };
  }, []);

  // Fade/slide reveal for text, images & cards as they enter view — scoped to <main> only,
  // so the sticky top nav (rendered outside this ref) is never touched.
  //
  // Uses IntersectionObserver rather than GSAP ScrollTrigger: ScrollTrigger pre-computes pixel
  // trigger positions from total page height, and late-loading content (fonts, the invoice
  // mockup's own resize logic) can shift that height afterward and leave a section's trigger
  // permanently miscalculated — which is exactly what caused "Save Time" and the closing CTA to
  // stay stuck invisible. IntersectionObserver has no such pre-calculation to go stale.
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const root = mainRef.current;
    if (!root) return;

    const targets = Array.from(root.querySelectorAll<HTMLElement>(".reveal-group, .reveal-row"));
    if (!targets.length) return;

    const reveal = (el: HTMLElement) => {
      const items = el.classList.contains("reveal-group")
        ? el.querySelectorAll<HTMLElement>(".reveal-item")
        : null;
      gsap.to(items && items.length ? items : el, {
        opacity: 1,
        y: 0,
        duration: 0.7,
        ease: "power2.out",
        stagger: 0.12,
        clearProps: "opacity,transform",
      });
    };

    // Anything already on screen at mount (e.g. the hero) just renders visible — no
    // hide-then-reveal flash, and one less thing that depends on JS timing to work.
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          reveal(entry.target as HTMLElement);
          io.unobserve(entry.target);
        });
      },
      { threshold: 0.1, rootMargin: "0px 0px -8% 0px" },
    );

    targets.forEach((el) => {
      const rect = el.getBoundingClientRect();
      const alreadyVisible = rect.top < window.innerHeight && rect.bottom > 0;
      if (alreadyVisible) return;

      const items = el.classList.contains("reveal-group")
        ? el.querySelectorAll<HTMLElement>(".reveal-item")
        : null;
      gsap.set(items && items.length ? items : el, { opacity: 0, y: 28 });
      io.observe(el);
    });

    return () => io.disconnect();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main ref={mainRef}>
        {/* Hero */}
        {/* overflow-x-clip lets the fanned invoice mockups spill toward the viewport edge
            without horizontal scrollbars (clip, unlike hidden, creates no scroll container) */}
        <section className="overflow-x-clip bg-ink-canvas" aria-label="Hero">
          <div className="reveal-group container mx-auto max-w-7xl px-4 sm:px-6 pt-20 pb-16 md:pt-28 md:pb-20">
            <div className="flex flex-col items-center text-center">
              <h1 className="reveal-item text-[34px] font-bold leading-[1.15] text-white max-w-2xl md:max-w-6xl md:text-[52px]">
                Free invoice generator for small business
                <br />
                translated by AI, paid faster.
              </h1>
              <p className="reveal-item mt-6 max-w-xl text-[16px] text-ink-subtext">
                InvoiceCraft brings billing, translation, and payment into one place, so small
                businesses spend less time invoicing and more time getting paid — in any language.
              </p>
              <div className="reveal-item mt-8 flex flex-wrap items-center justify-center gap-4">
                <Button
                  asChild
                  size="lg"
                  className="h-12 rounded-full bg-accent-lime px-9 text-base text-blue-950 hover:bg-accent-lime/90"
                >
                  <Link to="/builder" onClick={() => trackEvent("cta_click", { location: "hero" })}>
                    Create your invoice for Free
                  </Link>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="h-12 rounded-full border-ink-border/40 bg-transparent px-9 text-base text-white hover:bg-white/10"
                >
                  <a href="#features">Explore features</a>
                </Button>
              </div>
            </div>

            {/* Floating product mockups — symmetric card fan that opens wider on hover */}
            <div className="reveal-item relative mx-auto mt-14 max-w-4xl">
              <div className="px-6 pb-16 pt-2 sm:pb-24">
                <div className="group relative mx-auto aspect-[7/10] w-4/5 max-w-sm sm:w-full">
                  {/* Left — midnight */}
                  <div className="absolute inset-x-0 top-0 origin-bottom -translate-x-6 -rotate-6 overflow-hidden rounded-lg shadow-xl transition-transform duration-700 ease-[cubic-bezier(0.34,1.56,0.64,1)] sm:-translate-x-14 sm:rotate-[-8deg] sm:group-hover:-translate-x-28 sm:group-hover:rotate-[-14deg]">
                    <InvoicePreview data={sampleMidnight} />
                  </div>
                  {/* Right — lime */}
                  <div className="absolute inset-x-0 top-0 origin-bottom translate-x-6 rotate-6 overflow-hidden rounded-lg shadow-xl transition-transform duration-700 ease-[cubic-bezier(0.34,1.56,0.64,1)] sm:translate-x-14 sm:rotate-[8deg] sm:group-hover:translate-x-28 sm:group-hover:rotate-[14deg]">
                    <InvoicePreview data={sampleEmerald} />
                  </div>
                  {/* Front — classic */}
                  <div className="absolute inset-x-0 top-0 overflow-hidden rounded-lg shadow-xl transition-transform duration-700 ease-[cubic-bezier(0.34,1.56,0.64,1)] sm:group-hover:-translate-y-2">
                    <InvoicePreview data={sample} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Save Time. Get Paid Faster. */}
        <section className="bg-background py-16 md:py-20" aria-label="Why InvoiceCraft">
          <div className="reveal-group container mx-auto max-w-7xl px-4 sm:px-6">
            <h2 className="reveal-item text-center text-[28px] font-bold text-foreground md:text-[36px]">
              Save Time. Get Paid Faster.
            </h2>
            <div className="mt-12 grid grid-cols-2 gap-5 md:grid-cols-4">
              {saveTime.map((s) => (
                <div
                  key={s.label}
                  className="reveal-item flex flex-col items-center gap-3 rounded-xl bg-surface p-6 text-center shadow-card transition-smooth hover:shadow-card-hover"
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
          <div className="container mx-auto max-w-7xl px-4 sm:px-6">
            <div className="reveal-row mx-auto max-w-[600px] text-center">
              <p className="eyebrow">Everything you need</p>
              <h2 className="mt-3 text-[32px] font-bold leading-tight text-foreground md:text-[40px]">
                Built for the details that matter
              </h2>
              <p className="mt-4 text-[15px] text-muted-foreground">
                From local currency formatting to AI-powered translation, every invoicing feature is
                designed for fast, professional billing — no design or accounting skills required.
              </p>
            </div>

            <div className="mt-16 flex flex-col gap-16 md:mt-20 md:gap-24">
              {features.map((f, i) => (
                <div
                  key={f.eyebrow}
                  className={cn(
                    "reveal-row flex flex-col items-center gap-10 md:gap-16",
                    i % 2 === 1 ? "md:flex-row-reverse" : "md:flex-row",
                  )}
                >
                  <div className="flex-1">
                    <p className="eyebrow">{f.eyebrow}</p>
                    <h3 className="mt-3 text-[24px] font-bold leading-snug text-foreground md:text-[28px]">
                      {f.heading}
                    </h3>
                    <p className="mt-4 text-[15px] leading-relaxed text-muted-foreground">{f.desc}</p>
                    <Button
                      asChild
                      size="lg"
                      className="mt-6 rounded-full bg-blue-900 px-6 text-white hover:bg-blue-900/90"
                    >
                      <Link to="/builder">{f.cta}</Link>
                    </Button>
                  </div>
                  <div className="w-full flex-1">
                    {/* Intrinsic width/height let the browser reserve the box
                        before the PNG arrives; without them these six lazy
                        images each shift the section on load (CLS). */}
                    <img
                      src={f.banner}
                      alt={`${f.eyebrow} illustration`}
                      className="mx-auto w-full max-w-[500px]"
                      width={f.width}
                      height={f.height}
                      loading="lazy"
                      decoding="async"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Audiences */}
        <section className="bg-background py-16 md:py-20" aria-label="Who it's for">
          <div className="container mx-auto max-w-7xl px-4 sm:px-6">
            <h2 className="sr-only">We build with passion for {audiences.join(", ")}.</h2>
            <div
              className="reveal-group mx-auto flex min-h-[6rem] max-w-3xl flex-col items-center gap-3 text-center font-bold text-foreground md:min-h-[7rem]"
              aria-hidden="true"
            >
              <span className="text-[28px] md:text-[36px]">We Build with Passion for</span>
              <span
                ref={rotatingWordRef}
                className="inline-block whitespace-nowrap rounded-full bg-accent-lime px-6 py-2 text-[clamp(1rem,4vw,1.5rem)] text-blue-950"
              />
            </div>
          </div>
        </section>

        {/* FAQ preview. Deliberately a subset: /faq carries the full list and
            the FAQPage markup, so this doesn't duplicate that page wholesale. */}
        <section id="faq" className="bg-surface py-16 md:py-20" aria-label="Frequently asked questions">
          <div className="reveal-group container mx-auto max-w-3xl px-4 sm:px-6">
            <h2 className="reveal-item text-center text-[28px] font-bold text-foreground md:text-[36px]">
              Frequently asked questions
            </h2>
            <p className="reveal-item mx-auto mt-3 max-w-xl text-center text-[15px] text-muted-foreground">
              Everything you need to know before sending your first invoice.
            </p>
            {/* Collapsible for scanning, but every answer ships in the HTML —
                crawlers and AI summarizers read it whether or not it's open. */}
            <Accordion type="single" collapsible className="reveal-item mt-8 w-full">
              {faqs.slice(0, HOMEPAGE_FAQ_COUNT).map((f, i) => (
                <AccordionItem key={f.q} value={`faq-${i}`}>
                  <AccordionTrigger className="text-left text-[16px] font-semibold text-foreground">
                    {f.q}
                  </AccordionTrigger>
                  <AccordionContent className="text-[15px] leading-relaxed text-muted-foreground">
                    {f.a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
            <p className="reveal-item mt-8 text-center text-[15px] text-muted-foreground">
              <Link to="/faq" className="font-semibold text-blue-900 underline underline-offset-4">
                See all {faqs.length} questions
              </Link>
            </p>
          </div>
        </section>

        {/* PRICING-HIDDEN: hidden until payment integration lands. The component in
            components/site/Pricing.tsx is untouched — uncomment this and its import
            to bring the section back. */}
        {/* <PricingSection /> */}

        {/* CTA */}
        <section className="bg-ink-canvas py-12 md:py-16">
          <div className="container mx-auto max-w-7xl px-4 sm:px-6 text-center">
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

      <footer className="overflow-hidden bg-ink-canvas pt-12" role="contentinfo">
        <div className="container mx-auto max-w-7xl border-t-[3px] border-blue-500 px-4 pt-8 sm:px-6">
          <div className="flex flex-col items-center gap-10 text-center md:flex-row md:items-start md:justify-between md:text-left">
            {/* Logo + copyright */}
            <div className="flex flex-col items-center gap-3 md:items-start">
              <img src={logoLight} alt="InvoiceCraft" className="h-9 w-auto" width="92" height="40" />
              <p className="text-[13px] text-ink-subtext">
                © {new Date().getFullYear()} InvoiceCraft. Crafted with care.
              </p>
            </div>

            {/* Page links */}
            <div className="flex flex-col items-center gap-3 md:items-start">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-subtext">
                Page link
              </p>
              <nav className="flex flex-col items-center gap-3 text-sm md:items-start" aria-label="Footer navigation">
                <Link to="/" className="text-ink-subtext transition-smooth hover:text-white">
                  Home
                </Link>
                <Link to="/builder" className="text-ink-subtext transition-smooth hover:text-white">
                  Builder
                </Link>
                <a href="#features" className="text-ink-subtext transition-smooth hover:text-white">
                  Features
                </a>
                <Link to="/faq" className="text-ink-subtext transition-smooth hover:text-white">
                  FAQ
                </Link>
                {/* PRICING-HIDDEN: restore alongside the nav links in Header.tsx. */}
                {/* <a href="#pricing" className="text-ink-subtext transition-smooth hover:text-white">
                  Pricing
                </a> */}
              </nav>
            </div>

            {/* Legal */}
            <div className="flex flex-col items-center gap-3 md:items-start">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-subtext">
                Legal
              </p>
              <nav className="flex flex-col items-center gap-3 text-sm md:items-start" aria-label="Legal">
                <Link to="/privacy" className="text-ink-subtext transition-smooth hover:text-white">
                  Privacy Notice
                </Link>
                <Link to="/cookies" className="text-ink-subtext transition-smooth hover:text-white">
                  Cookie Policy
                </Link>
                <Link to="/terms" className="text-ink-subtext transition-smooth hover:text-white">
                  Terms and Conditions
                </Link>
              </nav>
            </div>
          </div>
        </div>

        <div
          className="mt-10 h-16 w-full sm:h-20"
          style={{
            backgroundImage: `url(${footerOverlayPattern})`,
            backgroundRepeat: "repeat-x",
            backgroundSize: "auto 100%",
          }}
          aria-hidden="true"
        />
      </footer>
    </div>
  );
}
