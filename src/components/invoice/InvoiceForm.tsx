import { Plus, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { InvoiceData, LineItem, Currency } from "@/lib/invoice";

interface Props {
  data: InvoiceData;
  onChange: (data: InvoiceData) => void;
}

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

  const handleImage = (key: "logo" | "qrCode", file: File) => {
    const reader = new FileReader();
    reader.onload = () => update(key, reader.result as string);
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-8">
      {/* Section: From */}
      <Section title="From" subtitle="Your business details">
        <div className="grid gap-4 sm:grid-cols-2">
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

      {/* Section: Bill to */}
      <Section title="Bill to" subtitle="Client details">
        <div className="grid gap-4 sm:grid-cols-2">
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

      {/* Section: Details */}
      <Section title="Invoice details">
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Invoice #">
            <Input value={data.invoiceNumber} onChange={(e) => update("invoiceNumber", e.target.value)} />
          </Field>
          <Field label="Issue date">
            <Input type="date" value={data.issueDate} onChange={(e) => update("issueDate", e.target.value)} />
          </Field>
          <Field label="Due date (optional)">
            <Input type="date" value={data.dueDate} onChange={(e) => update("dueDate", e.target.value)} />
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
          <Field label="Tax rate (%)">
            <Input type="number" min="0" value={data.taxRate} onChange={(e) => update("taxRate", Number(e.target.value))} />
          </Field>
        </div>
      </Section>

      {/* Section: Items */}
      <Section title="Line items" subtitle="What you're charging for">
        <div className="space-y-3">
          {data.items.map((item) => (
            <div key={item.id} className="grid gap-2 rounded-xl border border-border bg-surface p-3 sm:grid-cols-[1fr_80px_120px_auto]">
              <Input placeholder="Description" value={item.description} onChange={(e) => updateItem(item.id, { description: e.target.value })} />
              <Input type="number" min="0" value={item.quantity} onChange={(e) => updateItem(item.id, { quantity: Number(e.target.value) })} />
              <Input type="number" min="0" step="0.01" value={item.price} onChange={(e) => updateItem(item.id, { price: Number(e.target.value) })} />
              <Button variant="ghost" size="icon" onClick={() => removeItem(item.id)} className="text-muted-foreground hover:text-destructive">
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <Button variant="outline" onClick={addItem} className="w-full border-dashed">
            <Plus className="mr-2 h-4 w-4" /> Add item
          </Button>
        </div>
      </Section>

      {/* Section: Payment */}
      <Section title="Payment" subtitle="Bank info & QR code (optional)">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Bank name">
            <Input value={data.bankName} onChange={(e) => update("bankName", e.target.value)} />
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
    </div>
  );
}

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-border bg-gradient-card p-6 shadow-card">
      <div className="mb-5">
        <h3 className="font-display text-base font-semibold">{title}</h3>
        {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
      </div>
      {children}
    </section>
  );
}

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`space-y-1.5 ${className ?? ""}`}>
      <Label className="text-xs text-muted-foreground">{label}</Label>
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
        <label className="flex h-14 flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-surface text-sm text-muted-foreground transition-smooth hover:border-primary hover:text-foreground">
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
