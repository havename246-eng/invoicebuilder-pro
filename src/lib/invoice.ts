export type Currency = "USD" | "KHR" | "CNY" | "JPY" | "KRW";
export type InvoiceStatus = "draft" | "unpaid" | "partial" | "paid" | "void";
export type InvoiceLanguage = "en" | "km" | "zh" | "ja" | "ko";
export type InvoiceTheme = "midnight" | "classic" | "minimal" | "emerald" | "sunset";
export type PaperSize = "A4" | "Letter" | "A5" | "Legal";

// ───────── Google Fonts (loaded on demand for the invoice preview) ─────────
export const GOOGLE_FONTS = [
  "Inter",
  "Poppins",
  "Roboto",
  "Montserrat",
  "Playfair Display",
  "Lora",
  "Merriweather",
  "Work Sans",
  "Open Sans",
  "Nunito",
  // Popular script-specific fonts — also used to auto-select the Invoice font
  // when the invoice language changes (see SCRIPT_FONTS below).
  "Kantumruy Pro",
  "Noto Sans SC",
  "Noto Sans JP",
  "Noto Sans KR",
] as const;
export type GoogleFont = (typeof GOOGLE_FONTS)[number];

// The most popular Google Font for each non-English invoice language — none of the
// Latin GOOGLE_FONTS or the Rethink Sans brand font cover Khmer/CJK glyphs. Also used
// to auto-select the "Invoice font" advanced setting when the language changes.
export const SCRIPT_FONTS: Partial<Record<InvoiceLanguage, GoogleFont>> = {
  km: "Kantumruy Pro",
  zh: "Noto Sans SC",
  ja: "Noto Sans JP",
  ko: "Noto Sans KR",
};

export const invoiceFontFamily = (lang: InvoiceLanguage, customFont: GoogleFont | null) => {
  const scriptFont = SCRIPT_FONTS[lang];
  const stack = [customFont, "Rethink Sans", "Noto Sans", scriptFont, "system-ui", "sans-serif"].filter(
    (f): f is string => !!f,
  );
  return [...new Set(stack)].map((f) => (f === "system-ui" || f === "sans-serif" ? f : `'${f}'`)).join(", ");
};

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
  // Advanced
  invoiceFont: GoogleFont | null;
}

// Riel, yen, and won are zero-decimal currencies; CN¥ distinguishes yuan from yen.
const CURRENCY_FORMATS: Record<Currency, { symbol: string; decimals: number }> = {
  USD: { symbol: "$", decimals: 2 },
  KHR: { symbol: "៛", decimals: 0 },
  CNY: { symbol: "CN¥", decimals: 2 },
  JPY: { symbol: "¥", decimals: 0 },
  KRW: { symbol: "₩", decimals: 0 },
};

export const formatMoney = (amount: number, currency: Currency) => {
  const { symbol, decimals } = CURRENCY_FORMATS[currency];
  return `${symbol}${amount.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;
};

export const calcTotals = (items: LineItem[], taxRate: number) => {
  const subtotal = items.reduce((s, i) => s + i.quantity * i.price, 0);
  const tax = subtotal * (taxRate / 100);
  const total = subtotal + tax;
  return { subtotal, tax, total };
};

export const defaultInvoice = (): InvoiceData => ({
  senderName: "",
  senderEmail: "",
  senderAddress: "",
  logo: null,
  clientName: "",
  clientEmail: "",
  clientAddress: "",
  invoiceNumber: "INV-0001",
  issueDate: new Date().toISOString().slice(0, 10),
  dueDate: "",
  status: "draft",
  items: [{ id: "1", description: "", quantity: 1, price: 0 }],
  taxRate: 0,
  notes: "",
  currency: "USD",
  bankName: "",
  bankAccount: "",
  qrCode: null,
  language: "en",
  theme: "classic",
  paperSize: "A4",
  customHeader: null,
  customFooter: null,
  freeDelivery: false,
  invoiceFont: null,
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
  zh: {
    invoice: "发票",
    billTo: "客户",
    issued: "开票日期",
    due: "到期日",
    status: "状态",
    description: "描述",
    qty: "数量",
    price: "单价",
    total: "总计",
    subtotal: "小计",
    tax: "税费",
    payment: "付款方式",
    notes: "备注",
    freeDelivery: "免费配送",
    draft: "草稿",
    unpaid: "未付款",
    partial: "部分付款",
    paid: "已付款",
    void: "作废",
    thankYou: "感谢您的惠顾。",
  },
  ja: {
    invoice: "請求書",
    billTo: "請求先",
    issued: "発行日",
    due: "支払期限",
    status: "ステータス",
    description: "内容",
    qty: "数量",
    price: "単価",
    total: "合計",
    subtotal: "小計",
    tax: "税金",
    payment: "お支払い",
    notes: "備考",
    freeDelivery: "送料無料",
    draft: "下書き",
    unpaid: "未払い",
    partial: "一部支払い済み",
    paid: "支払い済み",
    void: "無効",
    thankYou: "ご利用ありがとうございます。",
  },
  ko: {
    invoice: "청구서",
    billTo: "청구 대상",
    issued: "발행일",
    due: "마감일",
    status: "상태",
    description: "설명",
    qty: "수량",
    price: "단가",
    total: "합계",
    subtotal: "소계",
    tax: "세금",
    payment: "결제 정보",
    notes: "비고",
    freeDelivery: "무료 배송",
    draft: "초안",
    unpaid: "미결제",
    partial: "부분 결제",
    paid: "결제 완료",
    void: "무효",
    thankYou: "이용해 주셔서 감사합니다.",
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
