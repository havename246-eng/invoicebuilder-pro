import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Check, Download, FileImage, FileText } from "lucide-react";
import gsap from "gsap";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { SiteHeader } from "@/components/site/Header";
import { InvoiceForm } from "@/components/invoice/InvoiceForm";
import { InvoicePreview } from "@/components/invoice/InvoicePreview";
import { defaultInvoice, type InvoiceData } from "@/lib/invoice";
import { exportPDF, exportPNG } from "@/lib/export";

const BUILDER_URL = "https://craft-bill-ai.lovable.app/builder";

export const Route = createFileRoute("/builder")({
  head: () => ({
    meta: [
      { title: "Invoice Builder — Create & Export Invoices | InvoiceCraft" },
      { name: "description", content: "Build beautiful invoices with live preview, custom branding, bilingual KH/EN support, multi-currency formatting, and one-click PDF/PNG export. Free, no sign-up required." },
      { property: "og:title", content: "Invoice Builder — InvoiceCraft" },
      { property: "og:description", content: "Build and export professional invoices with live preview, custom branding, and multi-currency support." },
      { property: "og:url", content: BUILDER_URL },
    ],
    links: [
      { rel: "canonical", href: BUILDER_URL },
    ],
  }),
  component: Builder,
});

const STORAGE_KEY = "invoicecraft:data:v2";

function Builder() {
  const [data, setData] = useState<InvoiceData>(defaultInvoice);
  const [exporting, setExporting] = useState<null | "png" | "pdf">(null);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportDone, setExportDone] = useState(false);
  const [exportType, setExportType] = useState<"png" | "pdf">("pdf");
  const highlightRef = useRef<HTMLDivElement>(null);
  const pngBtnRef = useRef<HTMLButtonElement>(null);
  const pdfBtnRef = useRef<HTMLButtonElement>(null);
  const mountedRef = useRef(false);
  const progressFillRef = useRef<HTMLSpanElement>(null);
  const checkRef = useRef<SVGSVGElement>(null);

  const setProgressFillRef = (el: HTMLSpanElement | null) => {
    progressFillRef.current = el;
    if (el) gsap.set(el, { width: "0%" });
  };

  useEffect(() => {
    if (!progressFillRef.current) return;
    gsap.to(progressFillRef.current, {
      width: `${exportDone ? 100 : exportProgress}%`,
      duration: 0.8,
      ease: "power2.out",
    });
  }, [exportProgress, exportDone]);

  useEffect(() => {
    if (!exportDone || !checkRef.current) return;
    gsap.fromTo(
      checkRef.current,
      { scale: 0, opacity: 0, rotate: -45 },
      { scale: 1, opacity: 1, rotate: 0, duration: 0.55, ease: "back.out(1.7)" },
    );
  }, [exportDone]);

  useEffect(() => {
    const target = exportType === "png" ? pngBtnRef.current : pdfBtnRef.current;
    const highlight = highlightRef.current;
    if (!target || !highlight) return;
    const vars = { x: target.offsetLeft, width: target.offsetWidth };
    if (!mountedRef.current) {
      gsap.set(highlight, vars);
      mountedRef.current = true;
    } else {
      gsap.to(highlight, { ...vars, duration: 0.35, ease: "power3.out" });
    }
  }, [exportType]);

  useEffect(() => {
    const onResize = () => {
      const target = exportType === "png" ? pngBtnRef.current : pdfBtnRef.current;
      const highlight = highlightRef.current;
      if (!target || !highlight) return;
      gsap.set(highlight, { x: target.offsetLeft, width: target.offsetWidth });
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [exportType]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setData({ ...defaultInvoice(), ...JSON.parse(saved) });
    } catch {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {}
  }, [data]);

  const handleExport = async (kind: "png" | "pdf") => {
    const el = document.getElementById("invoice-preview");
    if (!el) {
      toast.error("Preview not ready", { description: "Please wait a moment and try again." });
      return;
    }
    setExporting(kind);
    setExportProgress(0);
    setExportDone(false);
    const tId = toast.loading(kind === "png" ? "Generating PNG…" : "Generating PDF…");
    try {
      if (kind === "png") {
        await exportPNG(el, data.invoiceNumber, data.clientName, data.paperSize, setExportProgress);
        toast.success("PNG downloaded", { id: tId });
      } else {
        await exportPDF(el, data.invoiceNumber, data.clientName, data.paperSize, setExportProgress);
        toast.success("PDF downloaded", { id: tId });
      }
      setExportDone(true);
      await new Promise((r) => setTimeout(r, 1300));
    } catch (e) {
      console.error("[export]", e);
      const msg =
        e instanceof Error
          ? e.message
          : e instanceof Event
            ? `A resource failed to load (${e.type})`
            : typeof e === "string"
              ? e
              : "Unknown error";
      const hint = /image|cors|tainted/i.test(msg)
        ? "An uploaded image may be blocking the export. Try re-uploading the logo or QR code."
        : "Please try again. If it keeps failing, refresh the page.";
      toast.error("Export failed", { id: tId, description: `${msg} — ${hint}` });
    } finally {
      setExporting(null);
      setExportProgress(0);
      setExportDone(false);
    }
  };

  return (
    <>
    <div className="min-h-screen bg-background">
      <SiteHeader variant="light" />

      <div className="container mx-auto max-w-[1500px] px-4 py-6 pb-48 sm:px-6 sm:py-8 sm:pb-56">
        {/* Toolbar */}
        <div className="mb-6">
          <h1 className="text-[22px] sm:text-[28px]">Invoice Builder</h1>
          <p className="text-sm text-muted-foreground sm:text-[15px]">Live preview · Auto-saved · Bilingual KH/EN</p>
        </div>

        {/* Split */}
        <div className="grid min-w-0 gap-6 lg:grid-cols-2 lg:gap-8">
          <div className="no-print min-w-0">
            <InvoiceForm data={data} onChange={setData} />
          </div>
          <div className="min-w-0 lg:sticky lg:top-24">
            <InvoicePreview data={data} />
          </div>
        </div>
      </div>
    </div>

      {/* Floating export pill — kept outside the overflow-x-hidden wrapper above, since an
          ancestor with non-visible overflow clips position:fixed descendants as the page
          scrolls (a well-known CSS gotcha). */}
      <div className="no-print fixed inset-x-0 bottom-4 z-40 flex justify-center px-3 sm:bottom-6 sm:px-4">
        <div className="flex items-center gap-1.5 rounded-full border border-border bg-white/95 p-1.5 shadow-lg backdrop-blur-md sm:gap-2.5 sm:p-2.5">
          <div className="relative flex items-center gap-1 rounded-full bg-muted p-1 sm:gap-1.5 sm:p-1.5">
            <div
              ref={highlightRef}
              className="absolute inset-y-1 left-0 rounded-full bg-white shadow-sm sm:inset-y-1.5"
              aria-hidden="true"
            />
            <button
              ref={pngBtnRef}
              type="button"
              onClick={() => setExportType("png")}
              className={cn(
                "relative z-10 flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium transition-smooth sm:gap-2 sm:px-5 sm:py-3 sm:text-base",
                exportType === "png" ? "text-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              <FileImage className="h-4 w-4 sm:h-5 sm:w-5" />
              <span className="hidden sm:inline">PNG</span>
            </button>
            <button
              ref={pdfBtnRef}
              type="button"
              onClick={() => setExportType("pdf")}
              className={cn(
                "relative z-10 flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium transition-smooth sm:gap-2 sm:px-5 sm:py-3 sm:text-base",
                exportType === "pdf" ? "text-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              <FileText className="h-4 w-4 sm:h-5 sm:w-5" />
              <span className="hidden sm:inline">PDF</span>
            </button>
          </div>
          <Button
            size="lg"
            className="relative h-auto w-[92px] justify-center overflow-hidden rounded-full bg-accent-lime px-4 py-2 text-sm text-blue-950 hover:bg-accent-lime/90 sm:w-[148px] sm:px-7 sm:py-3 sm:text-base"
            disabled={!!exporting}
            onClick={() => handleExport(exportType)}
          >
            {exporting && (
              <span ref={setProgressFillRef} className="absolute inset-y-0 left-0 bg-blue-950/15" aria-hidden="true" />
            )}
            <span className="relative z-10 flex items-center">
              {exportDone ? (
                <Check ref={checkRef} className="mr-1.5 h-4 w-4 sm:mr-2 sm:h-5 sm:w-5" />
              ) : (
                <Download className="mr-1.5 h-4 w-4 sm:mr-2 sm:h-5 sm:w-5" />
              )}
              {exportDone ? "Done" : "Export"}
            </span>
          </Button>
        </div>
      </div>
    </>
  );
}
