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

export const Route = createFileRoute("/builder")({
  head: () => ({
    meta: [
      { title: "Builder — InvoiceCraft" },
      { name: "description", content: "Craft a beautiful invoice with live preview, themes, bilingual KH/EN, and one-click PDF/PNG export." },
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

      <div className="container mx-auto max-w-[1500px] px-4 py-8 md:px-6">
        {/* Toolbar */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl">Invoice Builder</h1>
            <p className="text-sm text-muted-foreground">Live preview · Auto-saved · Bilingual KH/EN</p>
          </div>
          <div className="flex gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button className="rounded-[6px] bg-primary text-primary-foreground hover:opacity-90" disabled={!!exporting}>
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
        <div className="grid gap-8 lg:grid-cols-[minmax(0,460px)_minmax(0,1fr)]">
          <div className="no-print rounded-lg bg-panel p-4">
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
