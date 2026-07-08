import { useEffect, useRef, useState } from "react";
import { ChevronDown, Plus, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  GOOGLE_FONTS,
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

const DEFAULT_FONT_VALUE = "__default__";

const BANKS = ["ACLEDA Bank", "ABA Bank", "Vattanac Bank", "Canadia Bank", "Wing Bank"];
const CUSTOM_BANK_VALUE = "__custom__";

interface Props {
  data: InvoiceData;
  onChange: (data: InvoiceData) => void;
}

type ImageKey = "logo" | "qrCode" | "customHeader" | "customFooter";

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

  return (
    <div className="space-y-6">
      {/* Customization */}
      <Section title="Customize" subtitle="Theme, language & paper size">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Language">
            <Select value={data.language} onValueChange={(v) => update("language", v as InvoiceLanguage)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="km">ខ្មែរ (Khmer)</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Paper size">
            <Select value={data.paperSize} onValueChange={(v) => update("paperSize", v as PaperSize)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="A4">A4 (210 × 297 mm)</SelectItem>
                <SelectItem value="Letter">Letter (8.5 × 11 in)</SelectItem>
                <SelectItem value="A5">A5 (148 × 210 mm)</SelectItem>
                <SelectItem value="Legal">Legal (8.5 × 14 in)</SelectItem>
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
                    className={`group rounded-lg border p-2.5 text-left transition-smooth ${
                      active ? "border-foreground ring-2 ring-foreground/20" : "border-border hover:border-foreground/30"
                    }`}
                  >
                    <div className="flex h-12 items-center justify-center rounded-md" style={{ background: th.bg, border: `1px solid ${th.border}` }}>
                      <div className="h-6 w-6 rounded" style={{ background: th.accent }} />
                    </div>
                    <p className="mt-2 truncate text-[10px] text-muted-foreground">{th.name}</p>
                  </button>
                );
              })}
            </div>
          </Field>
          <Field label="Custom header (optional)">
            <ImageUpload value={data.customHeader} onClear={() => update("customHeader", null)} onUpload={(f) => handleImage("customHeader", f)} label="Upload header" />
          </Field>
          <Field label="Custom footer (optional)">
            <ImageUpload value={data.customFooter} onClear={() => update("customFooter", null)} onUpload={(f) => handleImage("customFooter", f)} label="Upload footer" />
          </Field>
        </div>
      </Section>

      {/* From */}
      <Section title="From" subtitle="Your business details" defaultOpen={false}>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Company name">
            <Input value={data.senderName} onChange={(e) => update("senderName", e.target.value)} />
          </Field>
          <Field label="Email">
            <Input type="email" value={data.senderEmail} onChange={(e) => update("senderEmail", e.target.value)} />
          </Field>
          <Field label="Address (optional)" className="sm:col-span-2">
            <Input value={data.senderAddress} onChange={(e) => update("senderAddress", e.target.value)} />
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
            <Input value={data.clientName} onChange={(e) => update("clientName", e.target.value)} />
          </Field>
          <Field label="Email (optional)">
            <Input type="email" value={data.clientEmail} onChange={(e) => update("clientEmail", e.target.value)} />
          </Field>
          <Field label="Address (optional)" className="sm:col-span-2">
            <Input value={data.clientAddress} onChange={(e) => update("clientAddress", e.target.value)} />
          </Field>
        </div>
      </Section>

      {/* Details */}
      <Section title="Invoice details" defaultOpen={false}>
        <div className="grid gap-5 sm:grid-cols-3">
          <Field label="Invoice #">
            <Input value={data.invoiceNumber} onChange={(e) => update("invoiceNumber", e.target.value)} />
          </Field>
          <Field label="Status">
            <Select value={data.status} onValueChange={(v) => update("status", v as InvoiceStatus)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="unpaid">Unpaid</SelectItem>
                <SelectItem value="partial">Partial</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="void">Void</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Currency">
            <Select value={data.currency} onValueChange={(v) => update("currency", v as Currency)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="USD">USD ($)</SelectItem>
                <SelectItem value="KHR">Riel (៛)</SelectItem>
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
            <Input type="number" min="0" value={data.taxRate} onChange={(e) => update("taxRate", Number(e.target.value))} />
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
            <div key={item.id} className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-[1fr_80px_120px_auto] sm:items-center">
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
              <Input
                placeholder="Price"
                type="number"
                min="0"
                step="0.01"
                value={item.price}
                onChange={(e) => updateItem(item.id, { price: Number(e.target.value) })}
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
            <Input value={data.bankAccount} onChange={(e) => update("bankAccount", e.target.value)} />
          </Field>
          <Field label="Payment QR (optional)" className="sm:col-span-2">
            <ImageUpload value={data.qrCode} onClear={() => update("qrCode", null)} onUpload={(f) => handleImage("qrCode", f)} label="Upload QR code" />
          </Field>
          <Field label="Notes" className="sm:col-span-2">
            <Textarea rows={3} value={data.notes} onChange={(e) => update("notes", e.target.value)} />
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
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={DEFAULT_FONT_VALUE}>Default (Rethink Sans)</SelectItem>
                {GOOGLE_FONTS.map((font) => (
                  <SelectItem key={font} value={font} style={{ fontFamily: `'${font}', sans-serif` }}>
                    {font}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">Loaded from Google Fonts and applied to the invoice preview.</p>
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
    <div className={`space-y-2 ${className ?? ""}`}>
      <Label className="eyebrow">{label}</Label>
      {children}
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
            onChange={(e) => e.target.files?.[0] && onUpload(e.target.files[0])}
          />
        </label>
      )}
    </div>
  );
}
