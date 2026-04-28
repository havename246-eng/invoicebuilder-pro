export type Currency = "USD" | "KHR";
export type InvoiceStatus = "draft" | "unpaid" | "partial" | "paid" | "void";
export type InvoiceLanguage = "en" | "km";
export type InvoiceTheme = "midnight" | "classic" | "minimal" | "emerald" | "sunset";
export type PaperSize = "A4" | "Letter" | "A5" | "Legal";

export interface LineItem {
  id: string;
  description: string;
  quantity: number;
  price: number;
}

export interface InvoiceData {
  // Sender
  senderName: string;
  senderEmail: string;
  senderAddress: string;
  logo: string | null;
  // Client
  clientName: string;
  clientEmail: string;
  clientAddress: string;
  // Meta
  invoiceNumber: string;
  issueDate: string;
  dueDate: string;
  status: InvoiceStatus;
  // Items
  items: LineItem[];
  taxRate: number;
  notes: string;
  currency: Currency;
  // Bank
  bankName: string;
  bankAccount: string;
  qrCode: string | null;
  // Customization
  language: InvoiceLanguage;
  theme: InvoiceTheme;
  paperSize: PaperSize;
  customHeader: string | null;
  customFooter: string | null;
  freeDelivery: boolean;
}

export const formatMoney = (amount: number, currency: Currency) => {
  if (currency === "KHR") {
    return `៛${Math.round(amount).toLocaleString("en-US")}`;
  }
  return `$${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export const calcTotals = (items: LineItem[], taxRate: number) => {
  const subtotal = items.reduce((s, i) => s + i.quantity * i.price, 0);
  const tax = subtotal * (taxRate / 100);
  const total = subtotal + tax;
  return { subtotal, tax, total };
};

export const defaultInvoice = (): InvoiceData => ({
  senderName: "Acme Studio",
  senderEmail: "billing@acme.studio",
  senderAddress: "123 Main St, Phnom Penh",
  logo: null,
  clientName: "Lotus Hotel",
  clientEmail: "ap@lotushotel.com",
  clientAddress: "45 Riverside, Siem Reap",
  invoiceNumber: "INV-0042",
  issueDate: new Date().toISOString().slice(0, 10),
  dueDate: "",
  status: "unpaid",
  items: [
    { id: "1", description: "Brand identity design", quantity: 1, price: 1800 },
    { id: "2", description: "Website redesign (5 pages)", quantity: 5, price: 420 },
    { id: "3", description: "Photography retouching", quantity: 12, price: 35 },
  ],
  taxRate: 10,
  notes: "Thank you for your business. Payment due within 14 days.",
  currency: "USD",
  bankName: "ABA Bank",
  bankAccount: "000 123 456",
  qrCode: null,
  language: "en",
  theme: "classic",
  paperSize: "A4",
  customHeader: null,
  customFooter: null,
  freeDelivery: false,
});

// ───────── i18n ─────────
export const I18N: Record<InvoiceLanguage, Record<string, string>> = {
  en: {
    invoice: "INVOICE",
    billTo: "Bill to",
    issued: "Issued",
    due: "Due",
    status: "Status",
    description: "Description",
    qty: "Qty",
    price: "Price",
    total: "Total",
    subtotal: "Subtotal",
    tax: "Tax",
    payment: "Payment",
    notes: "Notes",
    freeDelivery: "Free Delivery",
    draft: "Draft",
    unpaid: "Unpaid",
    partial: "Partial",
    paid: "Paid",
    void: "Void",
    thankYou: "Thank you for your business.",
  },
  km: {
    invoice: "វិក្កយបត្រ",
    billTo: "ចេញវិក្កយបត្រជូន",
    issued: "ថ្ងៃចេញ",
    due: "ថ្ងៃផុតកំណត់",
    status: "ស្ថានភាព",
    description: "ការពិពណ៌នា",
    qty: "ចំនួន",
    price: "តម្លៃ",
    total: "សរុប",
    subtotal: "សរុបរង",
    tax: "ពន្ធ",
    payment: "ការទូទាត់",
    notes: "កំណត់ចំណាំ",
    freeDelivery: "ដឹកជញ្ជូនឥតគិតថ្លៃ",
    draft: "ព្រាង",
    unpaid: "មិនទាន់បង់",
    partial: "បង់ខ្លះ",
    paid: "បង់រួច",
    void: "លុបចោល",
    thankYou: "សូមអរគុណចំពោះអាជីវកម្មរបស់អ្នក។",
  },
};

export const t = (lang: InvoiceLanguage, key: string) => I18N[lang][key] ?? key;

// ───────── Paper sizes (mm) ─────────
export const PAPER_DIMENSIONS: Record<PaperSize, { w: number; h: number }> = {
  A4: { w: 210, h: 297 },
  Letter: { w: 216, h: 279 },
  A5: { w: 148, h: 210 },
  Legal: { w: 216, h: 356 },
};

// CSS pixel widths at 96dpi (for live preview width)
export const paperPxWidth = (size: PaperSize) => Math.round((PAPER_DIMENSIONS[size].w / 25.4) * 96);
export const paperPxHeight = (size: PaperSize) => Math.round((PAPER_DIMENSIONS[size].h / 25.4) * 96);

// ───────── Themes ─────────
export interface ThemeStyle {
  name: string;
  bg: string;
  text: string;
  muted: string;
  accent: string;
  border: string;
  tableHead: string;
}

export const THEMES: Record<InvoiceTheme, ThemeStyle> = {
  classic: {
    name: "Classic White",
    bg: "#ffffff",
    text: "#0f172a",
    muted: "#64748b",
    accent: "#0f172a",
    border: "#e2e8f0",
    tableHead: "#f8fafc",
  },
  minimal: {
    name: "Minimal Paper",
    bg: "#fafaf7",
    text: "#1c1917",
    muted: "#78716c",
    accent: "#1c1917",
    border: "#e7e5e4",
    tableHead: "#f5f5f4",
  },
  midnight: {
    name: "Midnight Indigo",
    bg: "#0f172a",
    text: "#f1f5f9",
    muted: "#94a3b8",
    accent: "#818cf8",
    border: "#1e293b",
    tableHead: "#1e293b",
  },
  emerald: {
    name: "Emerald Prestige",
    bg: "#ffffff",
    text: "#064e3b",
    muted: "#6b7280",
    accent: "#059669",
    border: "#d1fae5",
    tableHead: "#ecfdf5",
  },
  sunset: {
    name: "Sunset Warm",
    bg: "#fff7ed",
    text: "#431407",
    muted: "#9a3412",
    accent: "#ea580c",
    border: "#fed7aa",
    tableHead: "#ffedd5",
  },
};

export const STATUS_STYLES: Record<InvoiceStatus, { bg: string; text: string; ring: string }> = {
  draft: { bg: "#f1f5f9", text: "#475569", ring: "#cbd5e1" },
  unpaid: { bg: "#fef3c7", text: "#92400e", ring: "#fcd34d" },
  partial: { bg: "#dbeafe", text: "#1e40af", ring: "#93c5fd" },
  paid: { bg: "#d1fae5", text: "#065f46", ring: "#6ee7b7" },
  void: { bg: "#fee2e2", text: "#991b1b", ring: "#fca5a5" },
};
