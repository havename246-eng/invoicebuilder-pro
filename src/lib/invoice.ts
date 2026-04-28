export type Currency = "USD" | "KHR";

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
  // Items
  items: LineItem[];
  taxRate: number;
  notes: string;
  currency: Currency;
  // Bank
  bankName: string;
  bankAccount: string;
  qrCode: string | null;
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
  clientName: "Lotus Hotel Co., Ltd.",
  clientEmail: "ap@lotushotel.com",
  clientAddress: "45 Riverside, Siem Reap",
  invoiceNumber: "INV-0042",
  issueDate: new Date().toISOString().slice(0, 10),
  dueDate: "",
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
});
