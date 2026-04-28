import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Download, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SiteHeader } from "@/components/site/Header";
import { InvoiceForm } from "@/components/invoice/InvoiceForm";
import { InvoicePreview } from "@/components/invoice/InvoicePreview";
import { defaultInvoice, type InvoiceData } from "@/lib/invoice";

export const Route = createFileRoute("/builder")({
  head: () => ({
    meta: [
      { title: "Builder — InvoiceCraft" },
      { name: "description", content: "Craft a beautiful invoice with live preview, multi-currency, and one-click export." },
    ],
  }),
  component: Builder,
});

const STORAGE_KEY = "invoicecraft:data";

function Builder() {
  const [data, setData] = useState<InvoiceData>(defaultInvoice);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setData(JSON.parse(saved));
    } catch {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {}
  }, [data]);

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      <div className="container mx-auto max-w-[1400px] px-4 py-8 md:px-6">
        {/* Toolbar */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl font-bold tracking-tight">Invoice Builder</h1>
            <p className="text-sm text-muted-foreground">Live preview updates as you type. Auto-saved locally.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => window.print()}>
              <Printer className="mr-2 h-4 w-4" /> Print
            </Button>
            <Button className="bg-gradient-primary shadow-glow hover:opacity-90" onClick={() => window.print()}>
              <Download className="mr-2 h-4 w-4" /> Export PDF
            </Button>
          </div>
        </div>

        {/* Split */}
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
          <div className="no-print">
            <InvoiceForm data={data} onChange={setData} />
          </div>
          <div className="lg:sticky lg:top-24 lg:self-start">
            <div id="print-area">
              <InvoicePreview data={data} />
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @media print {
          .no-print, header { display: none !important; }
          body { background: white !important; }
          #print-area { box-shadow: none !important; }
        }
      `}</style>
    </div>
  );
}
