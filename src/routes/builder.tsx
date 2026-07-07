import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Download, FileImage, FileText, Loader2 } from "lucide-react";
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
  const [exportType, setExportType] = useState<"png" | "pdf">("pdf");
  const highlightRef = useRef<HTMLDivElement>(null);
  const pngBtnRef = useRef<HTMLButtonElement>(null);
  const pdfBtnRef = useRef<HTMLButtonElement>(null);
  const mountedRef = useRef(false);

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
    const tId = toast.loading(kind === "png" ? "Generating PNG…" : "Generating PDF…");
    try {
      if (kind === "png") {
        await exportPNG(el, data.invoiceNumber, data.clientName, data.paperSize);
        toast.success("PNG downloaded", { id: tId });
      } else {
        await exportPDF(el, data.invoiceNumber, data.clientName, data.paperSize);
        toast.success("PDF downloaded", { id: tId });
      }
    } catch (e) {
      console.error("[export]", e);
      const msg = e instanceof Error ? e.message : "Unknown error";
      const hint = /image|cors|tainted/i.test(msg)
        ? "An uploaded image may be blocking the export. Try re-uploading the logo or QR code."
        : "Please try again. If it keeps failing, refresh the page.";
      toast.error("Export failed", { id: tId, description: `${msg} — ${hint}` });
    } finally {
      setExporting(null);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader variant="light" />

      <div className="container mx-auto max-w-[1500px] px-6 py-8 pb-36">
        {/* Toolbar */}
        <div className="mb-6">
          <h1 className="text-[28px]">Invoice Builder</h1>
          <p className="text-[15px] text-muted-foreground">Live preview · Auto-saved · Bilingual KH/EN</p>
        </div>

        {/* Split */}
        <div className="grid gap-8 lg:grid-cols-2">
          <div className="no-print">
            <InvoiceForm data={data} onChange={setData} />
          </div>
          <div className="lg:sticky lg:top-24 lg:self-start">
            <InvoicePreview data={data} />
          </div>
        </div>
      </div>

      {/* Floating export pill */}
      <div className="no-print fixed inset-x-0 bottom-6 z-40 flex justify-center px-4">
        <div className="flex items-center gap-2.5 rounded-full border border-border bg-white/95 p-2.5 shadow-lg backdrop-blur-md">
          <div className="relative flex items-center gap-1.5 rounded-full bg-muted p-1.5">
            <div
              ref={highlightRef}
              className="absolute inset-y-1.5 left-0 rounded-full bg-white shadow-sm"
              aria-hidden="true"
            />
            <button
              ref={pngBtnRef}
              type="button"
              onClick={() => setExportType("png")}
              className={cn(
                "relative z-10 flex items-center gap-2 rounded-full px-5 py-3 text-base font-medium transition-smooth",
                exportType === "png" ? "text-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              <FileImage className="h-5 w-5" /> PNG
            </button>
            <button
              ref={pdfBtnRef}
              type="button"
              onClick={() => setExportType("pdf")}
              className={cn(
                "relative z-10 flex items-center gap-2 rounded-full px-5 py-3 text-base font-medium transition-smooth",
                exportType === "pdf" ? "text-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              <FileText className="h-5 w-5" /> PDF
            </button>
          </div>
          <Button
            size="lg"
            className="h-auto rounded-full bg-accent-lime px-7 py-3 text-base text-blue-950 hover:bg-accent-lime/90"
            disabled={!!exporting}
            onClick={() => handleExport(exportType)}
          >
            {exporting ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Download className="mr-2 h-5 w-5" />}
            Export
          </Button>
        </div>
      </div>
    </div>
  );
}
