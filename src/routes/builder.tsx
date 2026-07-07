import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Download, FileImage, FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
      <SiteHeader />

      <div className="container mx-auto max-w-[1500px] px-6 py-8">
        {/* Toolbar */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-[28px]">Invoice Builder</h1>
            <p className="text-[15px] text-muted-foreground">Live preview · Auto-saved · Bilingual KH/EN</p>
          </div>
          <div className="flex gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="lg" className="rounded-full" disabled={!!exporting}>
                  {exporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                  Export
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem onClick={() => handleExport("png")} className="cursor-pointer">
                  <FileImage className="mr-2 h-4 w-4" /> Download as PNG
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport("pdf")} className="cursor-pointer">
                  <FileText className="mr-2 h-4 w-4" /> Export as PDF
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
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
    </div>
  );
}
