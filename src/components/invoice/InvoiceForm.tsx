import { useEffect, useRef, useState } from "react";
import { Link, useRouteContext } from "@tanstack/react-router";
import { Check, ChevronDown, CloudUpload, Loader2, Palette, Pencil, Plus, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  currencyDecimals,
  currencySymbol,
  formatAmount,
  GOOGLE_FONTS,
  SCRIPT_FONTS,
  THEMES,
  type Currency,
  type GoogleFont,
  type InvoiceData,
  type InvoiceLanguage,
  type InvoiceStatus,
  type InvoiceTheme,
  type LineItem,
  type PaperSize,
} from "@/lib/invoice";
import { trackEvent } from "@/lib/analytics";
import {
  connectDrive,
  disconnectDrive,
  DriveNotConnectedError,
  isDriveConfigured,
  loadProfileFromDrive,
  preloadGoogle,
  saveProfileToDrive,
  type BusinessProfile,
  type LoadedProfile,
} from "@/lib/google-drive";
import { driveStatusFn } from "@/lib/drive-sync";

const DEFAULT_FONT_VALUE = "__default__";

// Option labels, also passed to <SelectValue> as its text. Radix only learns an
// option's label once the dropdown's items have mounted in the browser, so a
// bare <SelectValue /> renders empty on the server and the field pops into
// place after load, nudging the whole form.
const LANGUAGE_LABELS: Record<InvoiceLanguage, string> = {
  en: "English",
  km: "ខ្មែរ (Khmer)",
  zh: "中文 (Chinese)",
  ja: "日本語 (Japanese)",
  ko: "한국어 (Korean)",
};
const PAPER_LABELS: Record<PaperSize, string> = {
  A4: "A4 (210 × 297 mm)",
  Letter: "Letter (8.5 × 11 in)",
  A5: "A5 (148 × 210 mm)",
  Legal: "Legal (8.5 × 14 in)",
};
const STATUS_LABELS: Record<InvoiceStatus, string> = {
  draft: "Draft",
  unpaid: "Unpaid",
  partial: "Partial",
  paid: "Paid",
  void: "Void",
};
const CURRENCY_LABELS: Record<Currency, string> = {
  USD: "USD ($)",
  KHR: "Riel (៛)",
  CNY: "Yuan (CN¥)",
  JPY: "Yen (¥)",
  KRW: "Won (₩)",
};

const BANKS = ["ACLEDA Bank", "ABA Bank", "Vattanac Bank", "Canadia Bank", "Wing Bank"];
const CUSTOM_BANK_VALUE = "__custom__";

interface Props {
  data: InvoiceData;
  onChange: (data: InvoiceData) => void;
}

type ImageKey = "logo" | "qrCode" | "customHeader" | "customFooter";

// Smallest side accepted for an uploaded payment QR (see handleQrCode).
const QR_MIN_PX = 500;

// Custom header and footer both run full-bleed across the paper: 794px wide on
// A4, 816px on Letter/Legal. Exports render at 2×, so 1632px wide stays sharp
// on every paper size. A custom footer replaces the "Powered by InvoiceCraft"
// strip and, in PDFs, repeats at the bottom of every page.
const BANNER = {
  recommendedW: 1632,
  recommendedH: 272,
  // Below this it's blurry even on screen.
  minW: 800,
  // Height is auto, so a squarish image would eat a third of the page. 3:1 caps
  // it at roughly 265px tall on A4.
  minRatio: 3,
  // Drafts live in localStorage (~5MB, and saving there fails silently once
  // full). A data URL is ~1.33× the file, so 1MB leaves room for header, footer,
  // logo and QR together.
  maxMB: 1,
};

// One-tap messages for the Notes field, written to the invoice's customer.
// Choosing one replaces the notes.
const QUICK_NOTES = [
  {
    label: "Thank you",
    text: "Thank you for choosing us! We truly appreciate your support.",
  },
  {
    label: "Due on receipt",
    text: "Kindly settle this invoice upon receipt. Thank you for your support!",
  },
  {
    label: "Due in 7 days",
    text: "Kindly settle this invoice within 7 days. Thank you for your support!",
  },
  {
    label: "Due in 14 days",
    text: "Kindly settle this invoice within 14 days. Thank you for your support!",
  },
  {
    label: "Pay by QR",
    text: "Please scan the QR code to pay and send us your receipt on Telegram. Thank you!",
  },
  {
    label: "50% deposit",
    text: "Please pay a 50% deposit so we can get started. The remaining balance is due on completion.",
  },
  {
    label: "See you again",
    text: "It was a pleasure working with you. We look forward to serving you again!",
  },
];

export function InvoiceForm({ data, onChange }: Props) {
  // Saved business details show as a summary until the user chooses to edit.
  const [editingSender, setEditingSender] = useState(false);
  const hasSenderInfo = Boolean(
    data.senderName.trim() || data.senderEmail.trim() || data.senderAddress.trim() || data.logo,
  );

  const update =<K extends keyof InvoiceData>(key: K, value: InvoiceData[K]) =>
    onChange({ ...data, [key]: value });

  const updateItem = (id: string, patch: Partial<LineItem>) =>
    onChange({ ...data, items: data.items.map((i) => (i.id === id ? { ...i, ...patch } : i)) });

  const addItem = () =>
    onChange({
      ...data,
      items: [...data.items, { id: crypto.randomUUID(), description: "", quantity: 1, price: 0 }],
    });

  const removeItem = (id: string) =>
    onChange({ ...data, items: data.items.filter((i) => i.id !== id) });

  const brandingUploads = useBrandingUploads();

  // Custom header/footer: enforce the BANNER limits before storing.
  const handleBanner = (key: "customHeader" | "customFooter", file: File) => {
    const name = key === "customHeader" ? "Header" : "Footer";
    if (file.size > BANNER.maxMB * 1024 * 1024) {
      toast.error(`${name} image is too large`, {
        description: `It's ${(file.size / 1024 / 1024).toFixed(1)}MB. Use one under ${BANNER.maxMB}MB — try exporting as JPG or at ${BANNER.recommendedW}px wide.`,
      });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const src = reader.result as string;
      const img = new Image();
      img.onload = () => {
        const { naturalWidth: w, naturalHeight: h } = img;
        if (w < BANNER.minW) {
          toast.error(`${name} image is too small`, {
            description: `It's ${w}px wide. Use at least ${BANNER.minW}px (${BANNER.recommendedW}px is best) so it stays sharp.`,
          });
          return;
        }
        if (w / h < BANNER.minRatio) {
          toast.error(`${name} image is too tall`, {
            description: `It's ${w}×${h}px. Make it at least ${BANNER.minRatio}× wider than tall, like ${BANNER.recommendedW}×${BANNER.recommendedH}px.`,
          });
          return;
        }
        update(key, src);
      };
      img.onerror = () => toast.error("Couldn't read that image", { description: "Try a PNG or JPG." });
      img.src = src;
    };
    reader.readAsDataURL(file);
  };

  const handleImage = (key: ImageKey, file: File) => {
    const reader = new FileReader();
    reader.onload = () => update(key, reader.result as string);
    reader.readAsDataURL(file);
  };

  // The invoice draws the QR in a fixed square with object-fit: cover, so a
  // non-square image would be cropped and could cut off part of the code,
  // leaving it unscannable. Reject those rather than print a broken QR. A 2%
  // tolerance allows for a hand-cropped screenshot being a pixel or two off.
  // It must also be at least 500×500px: the invoice prints it at 160px and
  // exports at 2×, and a smaller source blurs the modules enough to hurt
  // scanning. Larger squares are fine.
  const handleQrCode = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const src = reader.result as string;
      const img = new Image();
      img.onload = () => {
        const { naturalWidth: w, naturalHeight: h } = img;
        if (Math.abs(w / h - 1) > 0.02) {
          toast.error("QR code must be square", {
            description: `This image is ${w}×${h}px. Crop it to a square around the code, at least ${QR_MIN_PX}×${QR_MIN_PX}px, and upload again.`,
          });
          return;
        }
        if (Math.min(w, h) < QR_MIN_PX) {
          toast.error("QR code is too small", {
            description: `This image is ${w}×${h}px. Use one at least ${QR_MIN_PX}×${QR_MIN_PX}px so it stays sharp enough to scan.`,
          });
          return;
        }
        update("qrCode", src);
      };
      img.onerror = () => toast.error("Couldn't read that image", { description: "Try a PNG or JPG." });
      img.src = src;
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-6">
      {/* Customization */}
      <Section title="Customize" subtitle="Theme, language & paper size">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Language">
            <Select
              value={data.language}
              onValueChange={(v) => {
                const language = v as InvoiceLanguage;
                if (language === data.language) return;
                onChange({ ...data, language, invoiceFont: SCRIPT_FONTS[language] ?? null });
                trackEvent("invoice_translated", { language });
              }}
            >
              <SelectTrigger>
                <SelectValue>{LANGUAGE_LABELS[data.language]}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {Object.entries(LANGUAGE_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Paper size">
            <Select value={data.paperSize} onValueChange={(v) => update("paperSize", v as PaperSize)}>
              <SelectTrigger>
                <SelectValue>{PAPER_LABELS[data.paperSize]}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {Object.entries(PAPER_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Theme" className="sm:col-span-2">
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
              {(Object.keys(THEMES) as InvoiceTheme[]).map((key) => {
                const th = THEMES[key];
                const active = data.theme === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => update("theme", key)}
                    aria-pressed={active}
                    className="group text-left"
                  >
                    {/* A miniature invoice in the theme's own colours: accent
                        bar, title and detail lines, then the table header. */}
                    <div
                      className={`relative h-16 overflow-hidden rounded-lg transition-smooth ${
                        active
                          ? "ring-2 ring-blue-900 ring-offset-2"
                          : "ring-1 ring-border group-hover:ring-foreground/30"
                      }`}
                      style={{ background: th.bg }}
                    >
                      <div className="h-1" style={{ background: th.accent }} />
                      <div className="flex flex-col gap-1.5 p-2.5">
                        <div className="h-1.5 w-1/2 rounded-full" style={{ background: th.text }} />
                        <div className="h-1 w-1/3 rounded-full opacity-60" style={{ background: th.muted }} />
                        <div
                          className="mt-0.5 h-2.5 rounded-sm"
                          style={{ background: th.tableHead, boxShadow: `inset 0 0 0 1px ${th.border}` }}
                        />
                      </div>
                      {active && (
                        <span className="absolute right-1.5 top-2 flex h-4 w-4 items-center justify-center rounded-full bg-blue-900 text-white">
                          <Check className="h-2.5 w-2.5" strokeWidth={3} aria-hidden="true" />
                        </span>
                      )}
                    </div>
                    <p
                      className={`mt-2 text-[11px] leading-tight ${
                        active ? "font-medium text-foreground" : "text-muted-foreground"
                      }`}
                    >
                      {th.name}
                    </p>
                  </button>
                );
              })}
            </div>
          </Field>
          <Field label="Paper color" className="sm:col-span-2">
            {brandingUploads ? (
              <PaperColorPicker
                value={data.paperColor}
                themePaper={THEMES[data.theme].bg}
                onChange={(c) => update("paperColor", c)}
              />
            ) : (
              <ComingSoonPaperColor value={data.paperColor} onReset={() => update("paperColor", null)} />
            )}
          </Field>
          <Field label="Custom header">
            {brandingUploads ? (
              <ImageUpload value={data.customHeader} onClear={() => update("customHeader", null)} onUpload={(f) => handleBanner("customHeader", f)} label="Upload header" />
            ) : (
              <ComingSoonUpload value={data.customHeader} onClear={() => update("customHeader", null)} />
            )}
          </Field>
          <Field label="Custom footer">
            {brandingUploads ? (
              <ImageUpload value={data.customFooter} onClear={() => update("customFooter", null)} onUpload={(f) => handleBanner("customFooter", f)} label="Upload footer" />
            ) : (
              <ComingSoonUpload value={data.customFooter} onClear={() => update("customFooter", null)} />
            )}
          </Field>
          {brandingUploads && (
            <p className="text-xs text-muted-foreground sm:col-span-2">
              {BANNER.recommendedW} × {BANNER.recommendedH}px · PNG or JPG · max {BANNER.maxMB}MB
            </p>
          )}
        </div>
      </Section>

      {/* From */}
      <Section title="From" subtitle="Your business details" defaultOpen={hasSenderInfo}>
        {hasSenderInfo && !editingSender ? (
          <SenderSummary
            name={data.senderName}
            email={data.senderEmail}
            address={data.senderAddress}
            logo={data.logo}
            onEdit={() => setEditingSender(true)}
          />
        ) : (
          // Any interaction keeps the form open, so typing the first letter of
          // a new company name doesn't flip the section into its summary.
          <div onFocusCapture={() => setEditingSender(true)}>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Company name">
                <Input placeholder="Your Company Ltd." value={data.senderName} onChange={(e) => update("senderName", e.target.value)} />
              </Field>
              <Field label="Email">
                <Input type="email" placeholder="billing@yourcompany.com" value={data.senderEmail} onChange={(e) => update("senderEmail", e.target.value)} />
              </Field>
              <Field label="Address (optional)" className="sm:col-span-2">
                <Input placeholder="123 Main St, City" value={data.senderAddress} onChange={(e) => update("senderAddress", e.target.value)} />
              </Field>
              <Field label="Logo (optional)" className="sm:col-span-2">
                <ImageUpload value={data.logo} onClear={() => update("logo", null)} onUpload={(f) => handleImage("logo", f)} label="Upload logo" />
              </Field>
            </div>
            {hasSenderInfo && (
              <div className="mt-5 flex justify-end">
                <Button type="button" variant="secondary" size="sm" className="shadow-none" onClick={() => setEditingSender(false)}>
                  Done
                </Button>
              </div>
            )}
          </div>
        )}
        {isDriveConfigured && (
          <DriveProfileSync
            profile={{
              senderName: data.senderName,
              senderEmail: data.senderEmail,
              senderAddress: data.senderAddress,
              logo: data.logo,
              bankName: data.bankName,
              bankAccount: data.bankAccount,
              qrCode: data.qrCode,
            }}
            onLoad={(p) =>
              onChange({
                ...data,
                senderName: p.senderName,
                senderEmail: p.senderEmail,
                senderAddress: p.senderAddress,
                logo: p.logo,
                // Absent from files saved before payment details were synced.
                bankName: p.bankName ?? data.bankName,
                bankAccount: p.bankAccount ?? data.bankAccount,
                qrCode: p.qrCode !== undefined ? p.qrCode : data.qrCode,
              })
            }
          />
        )}
      </Section>

      {/* Bill to */}
      <Section title="Bill to" subtitle="Client details" defaultOpen={false}>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Client name">
            <Input placeholder="Client company or name" value={data.clientName} onChange={(e) => update("clientName", e.target.value)} />
          </Field>
          <Field label="Email (optional)">
            <Input type="email" placeholder="client@email.com" value={data.clientEmail} onChange={(e) => update("clientEmail", e.target.value)} />
          </Field>
          <Field label="Address (optional)" className="sm:col-span-2">
            <Input placeholder="Client address" value={data.clientAddress} onChange={(e) => update("clientAddress", e.target.value)} />
          </Field>
        </div>
      </Section>

      {/* Details */}
      <Section title="Invoice details" defaultOpen={false}>
        <div className="grid gap-5 sm:grid-cols-3">
          <Field label="Invoice #">
            <Input placeholder="INV-0001" value={data.invoiceNumber} onChange={(e) => update("invoiceNumber", e.target.value)} />
          </Field>
          <Field label="Status">
            <Select value={data.status} onValueChange={(v) => update("status", v as InvoiceStatus)}>
              <SelectTrigger>
                <SelectValue>{STATUS_LABELS[data.status]}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {Object.entries(STATUS_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Currency">
            <Select value={data.currency} onValueChange={(v) => update("currency", v as Currency)}>
              <SelectTrigger>
                <SelectValue>{CURRENCY_LABELS[data.currency]}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {Object.entries(CURRENCY_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Issue date">
            <Input type="date" value={data.issueDate} onChange={(e) => update("issueDate", e.target.value)} />
          </Field>
          <Field label="Due date (optional)">
            <Input type="date" value={data.dueDate} onChange={(e) => update("dueDate", e.target.value)} />
          </Field>
          <Field label="Tax rate (%)">
            {/* A zero rate shows as an empty field with a "0" placeholder, so
                typing starts a fresh number instead of landing after a "0"
                (which gave "010"). Focus also selects any existing rate, so a
                new one replaces it. */}
            <Input
              type="number"
              inputMode="decimal"
              min="0"
              max="100"
              step="0.01"
              placeholder="0"
              value={data.taxRate === 0 ? "" : data.taxRate}
              onFocus={(e) => e.target.select()}
              onChange={(e) => update("taxRate", Number(e.target.value))}
            />
          </Field>
        </div>

        <div className="mt-5 flex items-center justify-between border-t border-border pt-5">
          <div>
            <p className="text-sm font-medium">Free Delivery tag</p>
            <p className="text-xs text-muted-foreground">Show a "Free Delivery" badge on the invoice.</p>
          </div>
          <Switch checked={data.freeDelivery} onCheckedChange={(v) => update("freeDelivery", v)} />
        </div>
      </Section>

      {/* Items */}
      <Section title="Line items" subtitle="What you're charging for" defaultOpen={false}>
        <div className="space-y-4">
          <div className="divide-y divide-border rounded-xl border border-border">
          {data.items.map((item) => (
            <div key={item.id} className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-[1fr_72px_150px_auto] sm:items-center">
              <Input
                placeholder="Description"
                value={item.description}
                onChange={(e) => updateItem(item.id, { description: e.target.value })}
                className="col-span-2 sm:col-span-1"
              />
              <QuantityInput
                value={item.quantity}
                onChange={(quantity) => updateItem(item.id, { quantity })}
              />
              <PriceInput
                value={item.price}
                currency={data.currency}
                onChange={(price) => updateItem(item.id, { price })}
              />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => removeItem(item.id)}
                className="col-span-2 justify-self-end text-muted-foreground hover:text-destructive sm:col-span-1 sm:justify-self-auto"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          </div>
          <Button variant="outline" onClick={addItem} className="w-full border-dashed">
            <Plus className="mr-2 h-4 w-4" /> Add item
          </Button>
        </div>
      </Section>

      {/* Payment */}
      <Section title="Payment" subtitle="Bank info & QR code (optional)" defaultOpen={false}>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Bank name">
            <BankNameField value={data.bankName} onChange={(v) => update("bankName", v)} />
          </Field>
          <Field label="Account number">
            <Input placeholder="e.g. 000 123 456" value={data.bankAccount} onChange={(e) => update("bankAccount", e.target.value)} />
          </Field>
          <Field label="Payment QR (optional)" className="sm:col-span-2">
            <ImageUpload value={data.qrCode} onClear={() => update("qrCode", null)} onUpload={handleQrCode} label="Upload QR code" square />
            <p className="text-xs text-muted-foreground">
              Square image, at least {QR_MIN_PX} × {QR_MIN_PX}px, cropped tight to the code, e.g.
              your KHQR.
            </p>
          </Field>
          <Field label="Notes" className="sm:col-span-2">
            <Textarea rows={3} placeholder="Thank you for your business. Payment due within 14 days." value={data.notes} onChange={(e) => update("notes", e.target.value)} />
            <div className="flex flex-wrap gap-2" role="group" aria-label="Quick notes">
              {QUICK_NOTES.map((note) => {
                const active = data.notes === note.text;
                return (
                  <button
                    key={note.label}
                    type="button"
                    onClick={() => update("notes", note.text)}
                    aria-pressed={active}
                    title={note.text}
                    className={`rounded-full border px-3 py-1 text-xs transition-smooth ${
                      active
                        ? "border-blue-900 bg-blue-900 text-white"
                        : "border-border bg-surface text-muted-foreground hover:border-foreground/30 hover:text-foreground"
                    }`}
                  >
                    {note.label}
                  </button>
                );
              })}
            </div>
          </Field>
        </div>
      </Section>

      {/* Advanced settings */}
      <Section title="Advanced settings" subtitle="Fine-tune typography" defaultOpen={false}>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Invoice font">
            <Select
              value={data.invoiceFont ?? DEFAULT_FONT_VALUE}
              onValueChange={(v) => update("invoiceFont", v === DEFAULT_FONT_VALUE ? null : (v as GoogleFont))}
            >
              <SelectTrigger>
                <SelectValue>{data.invoiceFont ?? "Default (Rethink Sans)"}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={DEFAULT_FONT_VALUE}>Default (Rethink Sans)</SelectItem>
                {GOOGLE_FONTS.map((font) => (
                  <SelectItem key={font} value={font} style={{ fontFamily: `'${font}', sans-serif` }}>
                    {font}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Loaded from Google Fonts and applied to the invoice preview. Auto-set to a popular
              font for the chosen Language above — pick a different one here to override it.
            </p>
          </Field>
        </div>
      </Section>
    </div>
  );
}

/** Saved business details at a glance, listing only the fields that are filled in. */
function SenderSummary({
  name,
  email,
  address,
  logo,
  onEdit,
}: {
  name: string;
  email: string;
  address: string;
  logo: string | null;
  onEdit: () => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex min-w-0 items-start gap-4">
        {logo && (
          <img src={logo} alt="" className="h-12 w-12 shrink-0 rounded-lg border border-border object-contain" />
        )}
        <div className="min-w-0 space-y-1 text-sm">
          {name && <p className="font-semibold text-foreground">{name}</p>}
          {email && <p className="break-words text-muted-foreground">{email}</p>}
          {address && <p className="break-words text-muted-foreground">{address}</p>}
        </div>
      </div>
      <Button type="button" variant="outline" size="sm" className="shrink-0 gap-1.5 shadow-none" onClick={onEdit}>
        <Pencil className="h-3.5 w-3.5" />
        Edit
      </Button>
    </div>
  );
}

function Section({
  title,
  subtitle,
  children,
  defaultOpen = true,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  // Saved data arrives after mount (local draft, then Drive), so a section that
  // should start open may only learn that later. Open when defaultOpen turns
  // true, unless the user has toggled the section themselves. Never auto-close:
  // clearing every field mid-edit mustn't collapse the card under them.
  const touched = useRef(false);
  useEffect(() => {
    if (defaultOpen && !touched.current) setOpen(true);
  }, [defaultOpen]);
  // Only animate the height while an actual open/close toggle is in flight — if the
  // transition classes stayed on permanently, any unrelated content resize inside
  // (e.g. a conditional field appearing) would get caught by the same
  // grid-template-rows transition and bounce the whole card for no reason.
  const [isToggling, setIsToggling] = useState(false);
  const toggleTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (toggleTimeoutRef.current) clearTimeout(toggleTimeoutRef.current);
  }, []);

  const toggle = () => {
    touched.current = true;
    setOpen((o) => !o);
    setIsToggling(true);
    if (toggleTimeoutRef.current) clearTimeout(toggleTimeoutRef.current);
    toggleTimeoutRef.current = setTimeout(() => setIsToggling(false), 720);
  };

  return (
    <section className="rounded-2xl bg-surface shadow-card">
      <button
        type="button"
        onClick={toggle}
        className="flex w-full items-center justify-between gap-4 p-4 text-left sm:p-7"
        aria-expanded={open}
      >
        <div>
          <h2 className="text-base font-bold">{title}</h2>
          {subtitle && <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>}
        </div>
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-50">
          <ChevronDown
            className={`h-4 w-4 text-blue-900 transition-transform duration-700 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${open ? "rotate-180" : ""}`}
          />
        </span>
      </button>
      <div
        className={`grid min-w-0 ${open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"} ${isToggling ? "transition-[grid-template-rows] duration-700 ease-[cubic-bezier(0.34,1.56,0.64,1)]" : ""}`}
      >
        <div className="min-w-0 overflow-hidden">
          <div className="px-4 pb-4 sm:px-7 sm:pb-7">{children}</div>
        </div>
      </div>
    </section>
  );
}

function BankNameField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const isPreset = BANKS.includes(value);
  const [customMode, setCustomMode] = useState(() => value !== "" && !isPreset);
  const [customText, setCustomText] = useState(() => (!isPreset ? value : ""));

  return (
    <div className="space-y-2">
      <Select
        value={customMode ? CUSTOM_BANK_VALUE : isPreset ? value : ""}
        onValueChange={(v) => {
          if (v === CUSTOM_BANK_VALUE) {
            // Don't touch the stored bank name yet — switching to "Other" shouldn't blank
            // it out (and ripple into the live preview) until the user actually types something.
            setCustomMode(true);
          } else {
            setCustomMode(false);
            onChange(v);
          }
        }}
      >
        <SelectTrigger>
          <SelectValue placeholder="Select a bank" />
        </SelectTrigger>
        <SelectContent>
          {BANKS.map((bank) => (
            <SelectItem key={bank} value={bank}>
              {bank}
            </SelectItem>
          ))}
          <SelectItem value={CUSTOM_BANK_VALUE}>Other (type manually)</SelectItem>
        </SelectContent>
      </Select>
      {customMode && (
        <Input
          placeholder="Enter bank name"
          value={customText}
          onChange={(e) => {
            setCustomText(e.target.value);
            onChange(e.target.value);
          }}
        />
      )}
    </div>
  );
}

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    // Radix Select server-renders a hidden native <select> after its trigger,
    // which hydration removes. Until then space-y gives the trigger an 8px
    // bottom margin, so cancel it while that hidden select is the last child.
    <div
      className={`space-y-2 [&>:has(+select[aria-hidden]:last-child)]:mb-0 ${className ?? ""}`}
    >
      <Label className="eyebrow">{label}</Label>
      {children}
    </div>
  );
}

// Ready-made paper colours: soft tints that read well with dark text, then a few
// dark papers that switch the invoice to light text (see resolveTheme).
const PAPER_PRESETS = [
  "#ffffff", // white
  "#fbf8f1", // cream
  "#f1f5f9", // cool grey
  "#eff6ff", // sky
  "#ecfdf5", // mint
  "#fef9c3", // butter
  "#fff1e6", // peach
  "#fdf2f8", // blush
  "#f5f3ff", // lavender
  "#1e293b", // slate
  "#172554", // navy
  "#14532d", // forest
];

/**
 * Paper colour for the invoice. "Theme" (null) keeps the selected theme's own
 * paper; a preset or the custom picker replaces it, and the invoice's text,
 * lines and table shading adapt so it stays readable (resolveTheme).
 */
function PaperColorPicker({
  value,
  themePaper,
  onChange,
}: {
  value: string | null;
  themePaper: string;
  onChange: (color: string | null) => void;
}) {
  const current = value ?? themePaper;
  const selected = value?.toLowerCase() ?? null;
  const isPreset = selected !== null && PAPER_PRESETS.includes(selected);
  const swatch = (on: boolean) =>
    `relative flex h-8 w-8 items-center justify-center rounded-full ring-1 ring-black/15 transition-smooth ${
      on ? "outline outline-2 outline-offset-2 outline-blue-900" : "hover:scale-110"
    }`;

  return (
    <div className="flex flex-wrap items-center gap-2.5">
      <button
        type="button"
        onClick={() => onChange(null)}
        aria-pressed={value === null}
        title="Theme's own paper"
        className={`flex h-8 items-center gap-1.5 rounded-full border px-3 text-xs transition-smooth ${
          value === null
            ? "border-blue-900 bg-blue-900 text-white"
            : "border-border text-muted-foreground hover:text-foreground"
        }`}
      >
        <span className="h-3 w-3 rounded-full ring-1 ring-black/20" style={{ background: themePaper }} />
        Theme
      </button>
      {PAPER_PRESETS.map((c) => (
        <button
          key={c}
          type="button"
          onClick={() => onChange(c)}
          aria-pressed={selected === c}
          aria-label={`Paper ${c}`}
          className={swatch(selected === c)}
          style={{ background: c }}
        />
      ))}
      {/* Any colour: the native picker, shown as a rainbow swatch until a
          custom colour is chosen, then as that colour. */}
      <label
        className={`${swatch(value !== null && !isPreset)} cursor-pointer overflow-hidden`}
        style={{
          background:
            value !== null && !isPreset
              ? value
              : "conic-gradient(#ef4444, #eab308, #22c55e, #06b6d4, #3b82f6, #a855f7, #ef4444)",
        }}
        title="Pick any colour"
      >
        <input
          type="color"
          value={current}
          onChange={(e) => onChange(e.target.value)}
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          aria-label="Pick any paper colour"
        />
      </label>
    </div>
  );
}

const BRANDING_TEST_KEY = "invoicecraft:test-branding";

/**
 * Paper colour and custom header/footer uploads are "Coming soon"
 * everywhere, local dev included. Unlock them for testing by visiting /builder?test=branding once
 * (remembered in this browser; ?test=off clears it). The preview and export already handle the images either way.
 */
function useBrandingUploads() {
  const [enabled, setEnabled] = useState(false);
  useEffect(() => {
    try {
      const flag = new URLSearchParams(window.location.search).get("test");
      if (flag === "branding") localStorage.setItem(BRANDING_TEST_KEY, "1");
      if (flag === "off") localStorage.removeItem(BRANDING_TEST_KEY);
      if (localStorage.getItem(BRANDING_TEST_KEY) === "1") setEnabled(true);
      else if (flag === "off") setEnabled(false);
    } catch {
      /* storage blocked: stay "Coming soon" */
    }
  }, []);
  return enabled;
}

// Placeholder for uploads that aren't available yet. If a value is already stored
// (autosaved from an earlier session), keep showing it with a Remove button so the
// user isn't stuck with an image they can no longer clear.
/**
 * Keeps the From and Payment details in sync with the signed-in user's own
 * Google Drive (hidden app folder). Connect once per device; after that the
 * details load when the builder opens and save shortly after each change.
 */
function DriveProfileSync({
  profile,
  onLoad,
}: {
  profile: BusinessProfile;
  onLoad: (profile: LoadedProfile) => void;
}) {
  const { user } = useRouteContext({ from: "__root__" });
  type Status = "checking" | "unavailable" | "disconnected" | "connecting" | "syncing" | "synced" | "error";
  const [status, setStatus] = useState<Status>("checking");
  const [syncedAt, setSyncedAt] = useState<Date | null>(null);

  const json = JSON.stringify(profile);
  // The latest values, for the async load to merge against.
  const latest = useRef(profile);
  latest.current = profile;
  // What Drive holds as far as we know; null until the first load finishes,
  // which also keeps empty defaults from overwriting Drive before then.
  const baseline = useRef<string | null>(null);

  const markSynced = (savedJson: string) => {
    baseline.current = savedJson;
    setSyncedAt(new Date());
    setStatus("synced");
  };

  const handleError = (e: unknown) => {
    if (e instanceof DriveNotConnectedError) {
      baseline.current = null;
      setStatus("disconnected");
    } else {
      setStatus("error");
    }
  };

  // Pull from Drive; if there's nothing there yet, push what's on screen.
  async function initialSync() {
    setStatus("syncing");
    try {
      const saved = await loadProfileFromDrive();
      if (!saved) {
        const current = latest.current;
        await saveProfileToDrive(current);
        markSynced(JSON.stringify(current));
        return;
      }
      const cur = latest.current;
      const merged: BusinessProfile = {
        senderName: saved.senderName,
        senderEmail: saved.senderEmail,
        senderAddress: saved.senderAddress,
        logo: saved.logo,
        // Absent from files saved before payment details were synced.
        bankName: saved.bankName ?? cur.bankName,
        bankAccount: saved.bankAccount ?? cur.bankAccount,
        qrCode: saved.qrCode !== undefined ? saved.qrCode : cur.qrCode,
      };
      onLoad(merged);
      markSynced(JSON.stringify(merged));
    } catch (e) {
      handleError(e);
    }
  }

  // On open (and on sign-in): connected on this device? Then load.
  useEffect(() => {
    if (!user) return;
    preloadGoogle();
    let cancelled = false;
    driveStatusFn().then(
      (s) => {
        if (cancelled) return;
        if (!s.available) setStatus("unavailable");
        else if (!s.connected) setStatus("disconnected");
        else void initialSync();
      },
      () => !cancelled && setStatus("error"),
    );
    return () => {
      cancelled = true;
    };
    // initialSync reads refs; re-run only when the account changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // Save 1.5s after the last change, once the first load has finished.
  useEffect(() => {
    if (baseline.current === null || json === baseline.current) return;
    const timer = setTimeout(async () => {
      setStatus("syncing");
      try {
        await saveProfileToDrive(JSON.parse(json) as BusinessProfile);
        markSynced(json);
      } catch (e) {
        handleError(e);
      }
    }, 1500);
    return () => clearTimeout(timer);
  }, [json]);

  async function connect() {
    setStatus("connecting");
    try {
      await connectDrive();
      await initialSync();
      toast.success("Google Drive connected — your details will sync automatically");
    } catch (e) {
      setStatus("disconnected");
      toast.error(e instanceof Error ? e.message : "Couldn't connect to Google Drive.");
    }
  }

  async function disconnect() {
    await disconnectDrive();
    baseline.current = null;
    setSyncedAt(null);
    setStatus("disconnected");
    toast.success("Google Drive sync turned off on this device");
  }

  const time = syncedAt?.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const description = !user
    ? "Sign in to sync your business and payment details to your own Google Drive."
    : {
        checking: "Checking your Google Drive connection…",
        unavailable: "Google Drive sync isn't available right now.",
        disconnected: "Connect once to keep your business and payment details synced to your own Drive on every device.",
        connecting: "Waiting for Google…",
        syncing: "Syncing…",
        synced: `Synced${time ? ` at ${time}` : ""} · updates automatically as you type.`,
        error: "Couldn't reach Google Drive. Your changes are still saved on this device.",
      }[status];

  return (
    <div className="mt-5 flex flex-col gap-3 border-t border-border pt-5 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="flex items-center gap-1.5 text-sm font-medium text-foreground">
          Google Drive sync
          {user && status === "synced" && <Check className="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" />}
          {user && (status === "syncing" || status === "checking") && (
            <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" aria-hidden="true" />
          )}
        </p>
        <p className="text-xs text-muted-foreground" aria-live="polite">
          {description}
        </p>
      </div>
      <div className="flex shrink-0 gap-2">
        {!user ? (
          <Button asChild type="button" variant="outline" size="sm">
            <Link to="/login" search={{ redirect: "/builder" }}>
              Sign in
            </Link>
          </Button>
        ) : status === "disconnected" || status === "connecting" ? (
          <Button type="button" size="sm" onClick={connect} disabled={status === "connecting"}>
            {status === "connecting" ? (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
            ) : (
              <CloudUpload className="mr-1.5 h-4 w-4" />
            )}
            Connect Google Drive
          </Button>
        ) : status === "error" ? (
          <Button type="button" variant="outline" size="sm" onClick={() => void initialSync()}>
            Retry
          </Button>
        ) : status === "synced" || status === "syncing" ? (
          <Button type="button" variant="ghost" size="sm" onClick={disconnect} className="text-muted-foreground">
            Turn off
          </Button>
        ) : null}
      </div>
    </div>
  );
}

// Paper colour is "Coming soon" alongside the branding uploads (same test
// switch). A colour picked before it was locked keeps showing, with a way back
// to the theme's own paper.
function ComingSoonPaperColor({ value, onReset }: { value: string | null; onReset: () => void }) {
  if (value) {
    return (
      <div className="flex items-center gap-3">
        <span className="h-8 w-8 rounded-full ring-1 ring-black/15" style={{ background: value }} />
        <Button variant="outline" size="sm" onClick={onReset}>Reset to theme</Button>
      </div>
    );
  }
  return (
    <div className="flex h-14 w-full cursor-not-allowed items-center justify-center gap-2 rounded-[6px] border border-dashed border-border bg-muted/40 text-sm text-muted-foreground opacity-60">
      <Palette className="h-4 w-4" />
      Coming soon
    </div>
  );
}

function ComingSoonUpload({ value, onClear }: { value: string | null; onClear: () => void }) {
  if (value) {
    return (
      <div className="flex items-center gap-3">
        <img src={value} alt="" className="h-14 w-14 rounded-lg border border-border object-cover" />
        <Button variant="outline" size="sm" onClick={onClear}>Remove</Button>
      </div>
    );
  }
  return (
    <div className="flex h-14 w-full cursor-not-allowed items-center justify-center gap-2 rounded-[6px] border border-dashed border-border bg-muted/40 text-sm text-muted-foreground opacity-60">
      <Upload className="h-4 w-4" />
      Coming soon
    </div>
  );
}

/**
 * Price field that formats for the invoice's currency. Unfocused it shows the
 * amount with thousands separators and the currency's decimals (100,000 or
 * 1,000.00) after the symbol. Focused it switches to the bare number so typing
 * isn't fought by commas being inserted mid-edit. The stored value is always
 * the raw number; it's rounded to the currency's precision only on blur, and
 * changing currency never converts it.
 */
function PriceInput({
  value,
  currency,
  onChange,
}: {
  value: number;
  currency: Currency;
  onChange: (value: number) => void;
}) {
  // The text being typed while focused; null when showing the formatted value.
  const [draft, setDraft] = useState<string | null>(null);
  const decimals = currencyDecimals(currency);
  const symbol = currencySymbol(currency);

  const display = draft ?? (value === 0 ? "" : formatAmount(value, currency));

  const handleChange = (raw: string) => {
    // Accept pasted "1,000" by dropping separators, then allow only digits and,
    // for currencies with cents, one decimal point with up to that many places.
    const text = raw.replace(/,/g, "");
    const pattern = decimals > 0 ? new RegExp(`^\\d*(\\.\\d{0,${decimals}})?$`) : /^\d*$/;
    if (!pattern.test(text)) return;
    setDraft(text);
    onChange(text === "" || text === "." ? 0 : Number(text));
  };

  return (
    <div className="relative">
      <span
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground"
        aria-hidden="true"
      >
        {symbol}
      </span>
      <Input
        type="text"
        inputMode={decimals > 0 ? "decimal" : "numeric"}
        placeholder="0"
        aria-label={`Price (${currency})`}
        value={display}
        style={{ paddingLeft: `calc(1rem + ${symbol.length}ch)` }}
        onFocus={(e) => {
          setDraft(value === 0 ? "" : String(value));
          // Select after React re-renders the unformatted text.
          const el = e.target;
          requestAnimationFrame(() => el.select());
        }}
        onChange={(e) => handleChange(e.target.value)}
        onBlur={() => {
          const factor = 10 ** decimals;
          const rounded = Math.round(value * factor) / factor;
          if (rounded !== value) onChange(rounded);
          setDraft(null);
        }}
      />
    </div>
  );
}

/**
 * Quantity field that behaves like PriceInput: plain text rather than a number
 * spinner, the current value selected on focus so typing replaces it, and an
 * empty box allowed mid-edit instead of snapping back to 0. Accepts up to two
 * decimal places for things like 1.5 hours.
 */
function QuantityInput({
  value,
  onChange,
}: {
  value: number;
  onChange: (value: number) => void;
}) {
  // The text being typed while focused; null when showing the stored value.
  const [draft, setDraft] = useState<string | null>(null);

  const display = draft ?? (value === 0 ? "" : String(value));

  const handleChange = (raw: string) => {
    const text = raw.replace(/,/g, "");
    if (!/^\d*(\.\d{0,2})?$/.test(text)) return;
    setDraft(text);
    onChange(text === "" || text === "." ? 0 : Number(text));
  };

  return (
    <Input
      type="text"
      inputMode="decimal"
      placeholder="Qty"
      aria-label="Quantity"
      value={display}
      onFocus={(e) => {
        setDraft(value === 0 ? "" : String(value));
        // Select after React re-renders the draft text.
        const el = e.target;
        requestAnimationFrame(() => el.select());
      }}
      onChange={(e) => handleChange(e.target.value)}
      onBlur={() => setDraft(null)}
    />
  );
}

function ImageUpload({
  value,
  onUpload,
  onClear,
  label,
  square = false,
}: {
  value: string | null;
  onUpload: (f: File) => void;
  onClear: () => void;
  label: string;
  /** Square drop zone and preview, matching an image that must be 1:1 (the QR). */
  square?: boolean;
}) {
  return (
    <div className="flex items-center gap-3">
      {value ? (
        <div className="flex items-center gap-3">
          <img
            src={value}
            alt=""
            className={`rounded-lg border border-border object-cover ${square ? "h-32 w-32" : "h-14 w-14"}`}
          />
          <Button variant="outline" size="sm" onClick={onClear}>Remove</Button>
        </div>
      ) : (
        <label
          className={`flex cursor-pointer items-center justify-center gap-2 rounded-[6px] border border-dashed border-border bg-surface text-sm text-muted-foreground transition-smooth hover:border-foreground hover:text-foreground ${
            square ? "h-32 w-32 flex-col px-3 text-center text-xs" : "h-14 flex-1"
          }`}
        >
          <Upload className={square ? "h-5 w-5" : "h-4 w-4"} />
          {label}
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              // Reset so picking the same file again (say, after a rejected
              // upload) still fires onChange.
              e.target.value = "";
              if (file) onUpload(file);
            }}
          />
        </label>
      )}
    </div>
  );
}
