import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, Plus, Trash2, Upload } from "lucide-react";
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
  const update = <K extends keyof InvoiceData>(key: K, value: InvoiceData[K]) =>
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

  const handleImage = (key: ImageKey, file: File) => {
    const reader = new FileReader();
    reader.onload = () => update(key, reader.result as string);
    reader.readAsDataURL(file);
  };

  // The invoice draws the QR in a fixed square with object-fit: cover, so a
  // non-square image would be cropped and could cut off part of the code,
  // leaving it unscannable. Reject those rather than print a broken QR. A 2%
  // tolerance allows for a hand-cropped screenshot being a pixel or two off.
  const handleQrCode = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const src = reader.result as string;
      const img = new Image();
      img.onload = () => {
        const ratio = img.naturalWidth / img.naturalHeight;
        if (Math.abs(ratio - 1) > 0.02) {
          toast.error("QR code must be square", {
            description: `This image is ${img.naturalWidth}×${img.naturalHeight}px. Crop it to a 1:1 square around the code and upload again.`,
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
          <Field label="Custom header">
            <ComingSoonUpload value={data.customHeader} onClear={() => update("customHeader", null)} />
          </Field>
          <Field label="Custom footer">
            <ComingSoonUpload value={data.customFooter} onClear={() => update("customFooter", null)} />
          </Field>
        </div>
      </Section>

      {/* From */}
      <Section title="From" subtitle="Your business details" defaultOpen={false}>
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
              <Input
                placeholder="Qty"
                type="number"
                min="0"
                value={item.quantity}
                onChange={(e) => updateItem(item.id, { quantity: Number(e.target.value) })}
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
            <ImageUpload value={data.qrCode} onClear={() => update("qrCode", null)} onUpload={handleQrCode} label="Upload QR code" />
            <p className="text-xs text-muted-foreground">
              Must be a square image (1:1), cropped tight to the code, e.g. your KHQR.
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

// Placeholder for uploads that aren't available yet. If a value is already stored
// (autosaved from an earlier session), keep showing it with a Remove button so the
// user isn't stuck with an image they can no longer clear.
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

function ImageUpload({ value, onUpload, onClear, label }: { value: string | null; onUpload: (f: File) => void; onClear: () => void; label: string }) {
  return (
    <div className="flex items-center gap-3">
      {value ? (
        <div className="flex items-center gap-3">
          <img src={value} alt="" className="h-14 w-14 rounded-lg border border-border object-cover" />
          <Button variant="outline" size="sm" onClick={onClear}>Remove</Button>
        </div>
      ) : (
        <label className="flex h-14 flex-1 cursor-pointer items-center justify-center gap-2 rounded-[6px] border border-dashed border-border bg-surface text-sm text-muted-foreground transition-smooth hover:border-foreground hover:text-foreground">
          <Upload className="h-4 w-4" />
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
