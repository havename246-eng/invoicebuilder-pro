import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Check, CloudUpload, Download, FileImage, FilePlus2, FileText, Loader2 } from "lucide-react";
import gsap from "gsap";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { SiteHeader } from "@/components/site/Header";
import { InvoiceForm } from "@/components/invoice/InvoiceForm";
import { InvoicePreview } from "@/components/invoice/InvoicePreview";
import { TelegramLogo } from "@/components/invoice/TelegramLogo";
import {
  DRAFT_STORAGE_KEY,
  defaultInvoice,
  nextInvoiceNumber,
  type InvoiceData,
} from "@/lib/invoice";
import {
  connectDrive,
  DriveNotConnectedError,
  DriveScopeMissingError,
  isDriveConnected,
  onDriveConnectionChange,
  pdfViewUrl,
  saveInvoiceToDrive,
} from "@/lib/google-drive";
import {
  buildInvoiceFile,
  canSaveToPhotos,
  downloadInvoiceFile,
  hapticBuzz,
  saveToPhotos,
} from "@/lib/export";
import {
  openTab,
  sendInvoiceToTelegram,
  telegramLink,
  telegramStrings,
  type ShareFormat,
} from "@/lib/shareToTelegram";
import { trackEvent } from "@/lib/analytics";
import { absoluteUrl } from "@/lib/site-url";

const BUILDER_URL = absoluteUrl("/builder");

export const Route = createFileRoute("/builder")({
  head: () => ({
    meta: [
      { title: "Invoice Builder — Create & Export Invoices | InvoiceCraft" },
      { name: "description", content: "Build invoices with live preview, custom branding, Khmer and CJK rendering, multi-currency formatting, and one-click PDF or PNG export. Free, no sign-up." },
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

function Builder() {
  const [data, setData] = useState<InvoiceData>(defaultInvoice);
  const [exporting, setExporting] = useState<null | "png" | "pdf">(null);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportDone, setExportDone] = useState(false);
  const [exportType, setExportType] = useState<"png" | "pdf">("pdf");
  // The Telegram file, rendered ahead of time — see the pre-generation effect.
  // Carries its format so a toggle change can never send the wrong one.
  const [shareFile, setShareFile] = useState<{ file: File; format: ShareFormat } | null>(null);
  const [preparingShare, setPreparingShare] = useState(false);
  const highlightRef = useRef<HTMLDivElement>(null);
  const pngBtnRef = useRef<HTMLButtonElement>(null);
  const pdfBtnRef = useRef<HTMLButtonElement>(null);
  const mountedRef = useRef(false);
  // Until GSAP has placed the sliding highlight, the selected format button
  // draws its own pill, so the toggle doesn't load empty and then pop in.
  const [highlightPlaced, setHighlightPlaced] = useState(false);
  const progressFillRef = useRef<HTMLSpanElement>(null);
  const checkRef = useRef<SVGSVGElement>(null);
  const createdReportedRef = useRef(false);
  const [driveConnected, setDriveConnected] = useState(false);
  const [savingToDrive, setSavingToDrive] = useState(false);

  // Drive connected on this device? Then exports also save to it, and the
  // pill gets a manual "Save to Drive" button.
  useEffect(() => {
    let alive = true;
    isDriveConnected().then((c) => alive && setDriveConnected(c));
    const off = onDriveConnectionChange(setDriveConnected);
    return () => {
      alive = false;
      off();
    };
  }, []);

  // Invoices aren't persisted anywhere yet (see the dashboard), so there's no
  // save to hang "created" off. The first edit the visitor makes to the blank
  // invoice is the moment one comes into existence, and it's the funnel step
  // between clicking a CTA and exporting. Restoring a saved draft below goes
  // through setData directly and deliberately doesn't count as creating one.
  const handleInvoiceChange = (next: InvoiceData) => {
    setData(next);
    if (!createdReportedRef.current) {
      createdReportedRef.current = true;
      trackEvent("invoice_created");
    }
  };

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
      setHighlightPlaced(true);
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
      const saved = localStorage.getItem(DRAFT_STORAGE_KEY);
      if (saved) setData({ ...defaultInvoice(), ...JSON.parse(saved) });
    } catch {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(data));
    } catch {}
  }, [data]);

  /**
   * The one render path for the invoice file. Export downloads what it returns
   * and the Telegram action shares it, so both always produce identical output.
   * Returns a File — a Blob subclass — so Export keeps its usual filename.
   */
  const generateInvoiceFile = useCallback(
    async (format: ShareFormat, onProgress?: (pct: number) => void): Promise<File> => {
      const el = document.getElementById("invoice-preview");
      if (!el) throw new Error("Preview not ready");
      return buildInvoiceFile(el, data, format, onProgress);
    },
    [data],
  );

  /**
   * Saves this invoice to the user's Google Drive (PDF in My Drive, data for
   * My invoices). Runs after every export when Drive is connected, and from
   * the pill's Drive button. `pdf` reuses an export's PDF instead of
   * rendering again. A missing or outdated Drive grant never fails the export:
   * the toast offers Reconnect, which is a click, so Google's popup may open.
   */
  const saveToDrive = async (pdf?: Blob) => {
    setSavingToDrive(true);
    const tId = toast.loading("Saving to Google Drive…");
    try {
      const file = pdf ?? (await generateInvoiceFile("pdf"));
      const { pdfFileId } = await saveInvoiceToDrive(data, file);
      toast.success("Saved to Drive", {
        id: tId,
        action: { label: "View", onClick: () => window.open(pdfViewUrl(pdfFileId), "_blank", "noopener") },
      });
    } catch (e) {
      const needsConnect = e instanceof DriveNotConnectedError || e instanceof DriveScopeMissingError;
      toast.error(needsConnect ? "Not saved to Drive" : "Couldn't save to Drive", {
        id: tId,
        description: needsConnect
          ? e instanceof DriveScopeMissingError
            ? "Allow InvoiceCraft to save invoice files in your Drive."
            : "Google Drive is disconnected on this device."
          : e instanceof Error
            ? e.message
            : undefined,
        action: needsConnect
          ? {
              label: "Reconnect",
              onClick: () =>
                void connectDrive().then(
                  () => saveToDrive(pdf),
                  (err) => toast.error(err instanceof Error ? err.message : "Couldn't connect to Google Drive."),
                ),
            }
          : { label: "Retry", onClick: () => void saveToDrive(pdf) },
      });
    } finally {
      setSavingToDrive(false);
    }
  };

  /**
   * Starts the next invoice: new id (so it's saved to Drive as a separate
   * invoice), next number, today's date, no client or items. Keeps the From
   * and Payment details and the look.
   */
  const startNewInvoice = () => {
    const fresh = defaultInvoice();
    setData({
      ...data,
      invoiceId: fresh.invoiceId,
      invoiceNumber: nextInvoiceNumber(data.invoiceNumber),
      issueDate: fresh.issueDate,
      dueDate: "",
      status: "draft",
      clientName: "",
      clientEmail: "",
      clientAddress: "",
      items: fresh.items,
      notes: fresh.notes,
    });
    toast.success("New invoice started", { description: "Your business and payment details are kept." });
  };

  const handleExport = async (kind: "png" | "pdf") => {
    if (!document.getElementById("invoice-preview")) {
      toast.error("Preview not ready", { description: "Please wait a moment and try again." });
      return;
    }
    hapticBuzz();

    // iPhone/iPad: hand the pre-rendered PNG to the share sheet, whose "Save
    // Image" puts it in Photos. Must happen before any await (see saveToPhotos).
    const ready = shareFile?.format === "png" ? shareFile.file : null;
    if (kind === "png" && ready && canSaveToPhotos(ready)) {
      try {
        if (await saveToPhotos(ready)) {
          trackEvent("invoice_downloaded", { format: kind, method: "photos" });
          if (driveConnected) void saveToDrive();
        }
        return;
      } catch (e) {
        // Safari refused the share (e.g. activation expired) — render and offer it below.
        console.warn("[export] share sheet unavailable", e);
      }
    }

    setExporting(kind);
    setExportProgress(0);
    setExportDone(false);
    const tId = toast.loading(kind === "png" ? "Generating PNG…" : "Generating PDF…");
    try {
      const file = await generateInvoiceFile(kind, setExportProgress);
      if (canSaveToPhotos(file)) {
        // The tap's activation is spent by the render; this button is a fresh tap.
        toast.success("PNG ready", {
          id: tId,
          description: "Tap Save to Photos, then choose “Save Image”.",
          action: {
            label: "Save to Photos",
            onClick: () => void saveToPhotos(file).catch(() => downloadInvoiceFile(file)),
          },
          duration: 15000,
        });
        trackEvent("invoice_downloaded", { format: kind, method: "photos_prompt" });
      } else {
        downloadInvoiceFile(file);
        toast.success(kind === "png" ? "PNG downloaded" : "PDF downloaded", {
          id: tId,
          description:
            kind === "png" && /Android/i.test(navigator.userAgent)
              ? "Find it in your Gallery or Google Photos under Downloads."
              : undefined,
        });
        trackEvent("invoice_downloaded", { format: kind });
      }
      setExportDone(true);
      // Exporting is when an invoice counts as created: keep a copy in Drive.
      if (driveConnected) void saveToDrive(kind === "pdf" ? file : undefined);
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

  /**
   * Pre-render the Telegram file before anyone taps the button.
   *
   * SAFARI: navigator.share() must run while the tap's user activation is still
   * live, and rendering a PDF takes long enough to spend it — Safari then rejects
   * the share outright. So the file is built here, in the background, 500ms
   * after the invoice or the PNG/PDF toggle stops changing, and the click
   * handler only ever hands over a Blob that already exists.
   *
   * The previous file is dropped the moment anything changes, which disables the
   * button until a fresh one is ready — sharing an outdated invoice is worse
   * than waiting half a second. Skipped during an Export, which renders anyway.
   */
  useEffect(() => {
    if (exporting) return;
    let cancelled = false;
    setShareFile(null);
    setPreparingShare(true);
    const timer = setTimeout(async () => {
      try {
        // No progress callback: this runs silently and must not drive the
        // Export button's progress fill.
        const file = await generateInvoiceFile(exportType);
        if (!cancelled) setShareFile({ file, format: exportType });
      } catch (e) {
        if (!cancelled) console.error("[telegram-prepare]", e);
      } finally {
        if (!cancelled) setPreparingShare(false);
      }
    }, 500);
    return () => {
      // A newer edit superseded this run; its result would be stale.
      cancelled = true;
      clearTimeout(timer);
    };
  }, [generateInvoiceFile, exportType, exporting]);

  const tg = telegramStrings(data.language);

  /**
   * Hands the invoice file to Telegram: attached via the share sheet on
   * phones, pasted from the clipboard (PNG) or downloaded (PDF) into Telegram
   * Web on computers.
   */
  const handleTelegramShare = async () => {
    // SAFARI: share() and clipboard writes only work during the tap, so this
    // uses the file the effect above rendered ahead of time.
    if (!shareFile || shareFile.format !== exportType) {
      toast.error(tg.shareFailed);
      return;
    }
    const message = tg.message(data.invoiceNumber);
    const { method, fileName, opened } = await sendInvoiceToTelegram({
      file: shareFile.file,
      message,
    });
    if (method === "cancelled") return;
    if (method !== "share_sheet") {
      const text = method === "clipboard" ? tg.pasteToast() : tg.attachToast(fileName);
      // A pop-up blocker refused Telegram: a fresh tap on the toast opens it.
      toast.success(
        text,
        opened
          ? undefined
          : {
              action: { label: tg.openTelegram, onClick: () => openTab(telegramLink(message)) },
              duration: 15000,
            },
      );
    }
    trackEvent("invoice_shared", { channel: "telegram", format: shareFile.format, method });
  };

  return (
    <>
    <div className="min-h-screen bg-background">
      <SiteHeader variant="light" />

      <div className="container mx-auto max-w-[1500px] px-4 py-6 pb-48 sm:px-6 sm:py-8 sm:pb-56">
        {/* Toolbar */}
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-[22px] sm:text-[28px]">Invoice Builder</h1>
            <p className="text-sm text-muted-foreground sm:text-[15px]">Live preview · Auto-saved · Bilingual KH/EN</p>
          </div>
          <Button type="button" variant="outline" size="sm" className="shrink-0 gap-1.5 rounded-full" onClick={startNewInvoice}>
            <FilePlus2 className="h-4 w-4" />
            New invoice
          </Button>
        </div>

        {/* Split */}
        <div className="grid min-w-0 gap-6 lg:grid-cols-2 lg:gap-8">
          <div className="no-print min-w-0">
            <InvoiceForm data={data} onChange={handleInvoiceChange} />
          </div>
          <div className="min-w-0 lg:sticky lg:top-24">
            <InvoicePreview data={data} editing />
          </div>
        </div>
      </div>
    </div>

      {/* Floating export pill — kept outside the overflow-x-hidden wrapper above, since an
          ancestor with non-visible overflow clips position:fixed descendants as the page
          scrolls (a well-known CSS gotcha). */}
      <div className="no-print fixed inset-x-0 bottom-4 z-40 flex justify-center px-3 sm:bottom-6 sm:px-4">
        <div className="flex items-center gap-1.5 rounded-full bg-white/95 p-1.5 shadow-lg backdrop-blur-md sm:gap-2.5 sm:p-2.5">
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
                exportType === "png" && !highlightPlaced && "bg-white shadow-sm",
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
                exportType === "pdf" && !highlightPlaced && "bg-white shadow-sm",
              )}
            >
              <FileText className="h-4 w-4 sm:h-5 sm:w-5" />
              <span className="hidden sm:inline">PDF</span>
            </button>
          </div>
          {/* Icon-only on every screen size: the Telegram mark is the label. */}
          <button
            type="button"
            className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-smooth hover:scale-105 hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 sm:h-12 sm:w-12"
            disabled={!!exporting || preparingShare || !shareFile}
            onClick={handleTelegramShare}
            aria-label={preparingShare ? tg.preparing : tg.sendViaTelegram}
            title={tg.sendViaTelegram}
            aria-busy={preparingShare}
          >
            <TelegramLogo className="h-full w-full" />
            {preparingShare && (
              <span className="absolute inset-0 flex items-center justify-center rounded-full bg-[#229ED9]">
                <Loader2 className="h-4 w-4 animate-spin text-white sm:h-5 sm:w-5" aria-hidden="true" />
              </span>
            )}
          </button>
          {driveConnected && (
            <button
              type="button"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-foreground transition-smooth hover:bg-muted/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 sm:h-12 sm:w-12"
              disabled={!!exporting || savingToDrive}
              onClick={() => void saveToDrive()}
              aria-label="Save invoice to Google Drive"
              title="Save invoice to Google Drive"
            >
              {savingToDrive ? (
                <Loader2 className="h-4 w-4 animate-spin sm:h-5 sm:w-5" aria-hidden="true" />
              ) : (
                <CloudUpload className="h-4 w-4 sm:h-5 sm:w-5" aria-hidden="true" />
              )}
            </button>
          )}
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
