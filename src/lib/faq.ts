/**
 * The site's FAQ, rendered on /faq and summarised on the homepage.
 *
 * Both render from this one array on purpose: structured data has to match what
 * a visitor can actually read on the page, and the fastest way for those to
 * drift apart is to maintain them separately.
 *
 * Answers describe what ships today — the builder needs no account, invoices
 * live in localStorage, and account-level saving isn't built yet (see
 * routes/dashboard.tsx). Keep them honest as that changes.
 */
export const faqs = [
  {
    q: "Is InvoiceCraft free to use?",
    a: "Yes. Building, customizing, and exporting invoices is free, and there's no watermark on what you export.",
  },
  {
    q: "Do I need an account to create an invoice?",
    a: "No. The invoice builder works straight away without signing up. Creating a free account is optional and only adds account features as they roll out.",
  },
  {
    q: "Which currencies does InvoiceCraft support?",
    a: "US dollars and Cambodian Riel (៛), each with the correct symbol placement and decimal handling for that currency, so totals read the way local clients expect.",
  },
  {
    q: "Can I send an invoice in another language?",
    a: "Yes. Built-in AI translation converts an invoice into over 100 languages in one click, and your layout, branding, and number formatting stay intact.",
  },
  {
    q: "What file formats can I export?",
    a: "Print-ready PDF and PNG. PDF suits email and accounting records, while PNG is easier to send through messaging apps like Telegram or WhatsApp.",
  },
  {
    q: "Where is my invoice data stored?",
    a: "In your own browser's local storage, on your device. Your invoice details, uploaded logo, and QR code are used to render the preview and the file you export.",
  },
  {
    q: "How do clients pay an invoice?",
    a: "You can embed a scannable payment QR code on the invoice, so a client pays from their banking app instead of retyping account numbers.",
  },
];
