import { useEffect, useRef, useState } from "react";
import footerBanner from "@/assets/footer-invoice.svg";
import {
  calcTotals,
  formatMoney,
  invoiceFontFamily,
  paperPxHeight,
  paperPxWidth,
  STATUS_STYLES,
  t,
  THEMES,
  type InvoiceData,
} from "@/lib/invoice";

export function InvoicePreview({ data }: { data: InvoiceData }) {
  const { subtotal, tax, total } = calcTotals(data.items, data.taxRate);
  const theme = THEMES[data.theme];
  const lang = data.language;
  const status = STATUS_STYLES[data.status];
  const widthPx = paperPxWidth(data.paperSize);
  const minHeightPx = paperPxHeight(data.paperSize);

  // Fit-to-container scaling so the true-size A4 page is readable on every screen.
  const wrapRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  // Load the chosen Google Font on demand (advanced settings) and inject its <link> once.
  useEffect(() => {
    if (!data.invoiceFont) return;
    const id = `google-font-${data.invoiceFont.replace(/\s+/g, "-")}`;
    if (document.getElementById(id)) return;
    const link = document.createElement("link");
    link.id = id;
    link.rel = "stylesheet";
    link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(data.invoiceFont)}:wght@400;500;600;700;800&display=swap`;
    document.head.appendChild(link);
  }, [data.invoiceFont]);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const update = () => {
      const available = el.clientWidth;
      const next = Math.min(1, available / widthPx);
      setScale(next > 0 ? next : 1);
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    window.addEventListener("resize", update);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", update);
    };
  }, [widthPx]);

  return (
    <div ref={wrapRef} className="w-full overflow-hidden">
      <div
        style={{
          width: `${widthPx * scale}px`,
          height: `${minHeightPx * scale}px`,
          marginInline: "auto",
        }}
      >
        <div
          id="invoice-preview"
          className="font-invoice shadow-elegant"
          style={{
            width: `${widthPx}px`,
            minHeight: `${minHeightPx}px`,
            background: theme.bg,
            color: theme.text,
            padding: "48px",
            boxSizing: "border-box",
            transform: `scale(${scale})`,
            transformOrigin: "top left",
            fontFamily: invoiceFontFamily(lang, data.invoiceFont),
            position: "relative",
          }}
        >
        {/* Custom header banner */}
        {data.customHeader && (
          <img
            src={data.customHeader}
            alt="Header"
            style={{ display: "block", width: "100%", height: "auto", objectFit: "contain", marginBottom: "24px", borderRadius: "8px" }}
          />
        )}

        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: "24px",
            paddingBottom: "20px",
            borderBottom: `1px solid ${theme.border}`,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            {data.logo ? (
              <img src={data.logo} alt="Logo" style={{ height: "56px", width: "56px", borderRadius: "10px", objectFit: "cover" }} />
            ) : (
              <div
                style={{
                  height: "56px",
                  width: "56px",
                  borderRadius: "10px",
                  background: theme.accent,
                  color: theme.bg,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 700,
                  fontSize: "20px",
                }}
              >
                {(data.senderName || "·").charAt(0)}
              </div>
            )}
            <div>
              <p style={{ fontWeight: 700, fontSize: "16px", margin: 0 }}>{data.senderName || "Your Company"}</p>
              {data.senderEmail && <p style={{ fontSize: "12px", color: theme.muted, margin: "2px 0 0" }}>{data.senderEmail}</p>}
              {data.senderAddress && <p style={{ fontSize: "12px", color: theme.muted, margin: "2px 0 0" }}>{data.senderAddress}</p>}
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <p style={{ fontSize: "28px", fontWeight: 800, letterSpacing: "-0.02em", color: theme.accent, margin: 0 }}>
              {t(lang, "invoice")}
            </p>
            <p style={{ fontSize: "12px", color: theme.muted, margin: "4px 0 0", fontFamily: "'JetBrains Mono', monospace" }}>
              {data.invoiceNumber}
            </p>
            <span
              style={{
                display: "inline-block",
                marginTop: "8px",
                padding: "4px 10px",
                borderRadius: "999px",
                background: status.bg,
                color: status.text,
                border: `1px solid ${status.ring}`,
                fontSize: "11px",
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              {t(lang, data.status)}
            </span>
          </div>
        </div>

        {/* Bill to */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: "20px", padding: "24px 0" }}>
          <div style={{ flex: "2 1 200px" }}>
            <p style={{ fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: theme.muted, margin: 0 }}>
              {t(lang, "billTo")}
            </p>
            <p style={{ marginTop: "8px", fontWeight: 600, fontSize: "14px" }}>{data.clientName || "—"}</p>
            {data.clientEmail && <p style={{ fontSize: "12px", color: theme.muted, margin: "2px 0 0" }}>{data.clientEmail}</p>}
            {data.clientAddress && <p style={{ fontSize: "12px", color: theme.muted, margin: "2px 0 0" }}>{data.clientAddress}</p>}
          </div>
          {data.issueDate && (
            <div style={{ flex: "1 1 120px" }}>
              <p style={{ fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: theme.muted, margin: 0 }}>
                {t(lang, "issued")}
              </p>
              <p style={{ marginTop: "8px", fontSize: "13px", fontFamily: "'JetBrains Mono', monospace" }}>{data.issueDate}</p>
            </div>
          )}
          {data.dueDate && (
            <div style={{ flex: "1 1 120px" }}>
              <p style={{ fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: theme.muted, margin: 0 }}>
                {t(lang, "due")}
              </p>
              <p style={{ marginTop: "8px", fontSize: "13px", fontFamily: "'JetBrains Mono', monospace" }}>{data.dueDate}</p>
            </div>
          )}
        </div>

        {/* Items */}
        <div style={{ borderRadius: "10px", overflow: "hidden", border: `1px solid ${theme.border}` }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
            <thead>
              <tr style={{ background: theme.tableHead, color: theme.muted, fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                <th style={{ padding: "10px 14px", textAlign: "left" }}>{t(lang, "description")}</th>
                <th style={{ padding: "10px 14px", textAlign: "right" }}>{t(lang, "qty")}</th>
                <th style={{ padding: "10px 14px", textAlign: "right" }}>{t(lang, "price")}</th>
                <th style={{ padding: "10px 14px", textAlign: "right" }}>{t(lang, "total")}</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((item) => (
                <tr key={item.id} style={{ borderTop: `1px solid ${theme.border}` }}>
                  <td style={{ padding: "12px 14px" }}>{item.description || "—"}</td>
                  <td style={{ padding: "12px 14px", textAlign: "right", fontFamily: "'JetBrains Mono', monospace" }}>{item.quantity}</td>
                  <td style={{ padding: "12px 14px", textAlign: "right", fontFamily: "'JetBrains Mono', monospace" }}>
                    {formatMoney(item.price, data.currency)}
                  </td>
                  <td style={{ padding: "12px 14px", textAlign: "right", fontFamily: "'JetBrains Mono', monospace", fontWeight: 600 }}>
                    {formatMoney(item.quantity * item.price, data.currency)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "16px", marginTop: "20px" }}>
          <div>
            {data.freeDelivery && (
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "6px 12px",
                  borderRadius: "999px",
                  background: theme.accent,
                  color: theme.bg,
                  fontSize: "12px",
                  fontWeight: 600,
                }}
              >
                ✓ {t(lang, "freeDelivery")}
              </span>
            )}
          </div>
          <div style={{ width: "260px", fontSize: "13px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", color: theme.muted, padding: "4px 0" }}>
              <span>{t(lang, "subtotal")}</span>
              <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>{formatMoney(subtotal, data.currency)}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", color: theme.muted, padding: "4px 0" }}>
              <span>{t(lang, "tax")} ({data.taxRate}%)</span>
              <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>{formatMoney(tax, data.currency)}</span>
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                borderTop: `1px solid ${theme.border}`,
                paddingTop: "10px",
                marginTop: "8px",
                fontSize: "16px",
                fontWeight: 700,
              }}
            >
              <span>{t(lang, "total")}</span>
              <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>{formatMoney(total, data.currency)}</span>
            </div>
          </div>
        </div>

        {/* Payment + notes */}
        {(data.bankName || data.bankAccount || data.qrCode || data.notes) && (
          <div
            style={{
              marginTop: "28px",
              paddingTop: "20px",
              borderTop: `1px solid ${theme.border}`,
              display: "flex",
              flexWrap: "wrap",
              justifyContent: "space-between",
              gap: "24px",
            }}
          >
            <div style={{ flex: "1 1 240px" }}>
              {(data.bankName || data.bankAccount) && (
                <>
                  <p style={{ fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: theme.muted, margin: 0 }}>
                    {t(lang, "payment")}
                  </p>
                  {data.bankName && <p style={{ marginTop: "6px", fontSize: "13px", fontWeight: 600 }}>{data.bankName}</p>}
                  {data.bankAccount && (
                    <p style={{ fontSize: "12px", color: theme.muted, fontFamily: "'JetBrains Mono', monospace", margin: "2px 0 0" }}>
                      {data.bankAccount}
                    </p>
                  )}
                </>
              )}
              {data.notes && (
                <>
                  <p style={{ marginTop: "16px", fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: theme.muted }}>
                    {t(lang, "notes")}
                  </p>
                  <p style={{ marginTop: "6px", fontSize: "12px", color: theme.muted }}>{data.notes}</p>
                </>
              )}
            </div>
            {data.qrCode && (
              <div>
                <img
                  src={data.qrCode}
                  alt="Payment QR"
                  style={{ height: "110px", width: "110px", borderRadius: "8px", border: `1px solid ${theme.border}`, objectFit: "cover" }}
                />
              </div>
            )}
          </div>
        )}

        {/* Custom footer */}
        {data.customFooter && (
          <img
            src={data.customFooter}
            alt="Footer"
            style={{ display: "block", width: "100%", height: "auto", objectFit: "contain", marginTop: "24px", borderRadius: "8px" }}
          />
        )}

        {/* Brand footer strip — pinned to the bottom edge of the sheet. The PDF
            export removes it from the capture and stamps it onto every page
            instead (see exportPDF), keyed off this data attribute. */}
        <img
          src={footerBanner}
          alt=""
          data-brand-footer=""
          style={{ position: "absolute", bottom: 0, left: 0, width: "100%", height: "auto", display: "block" }}
        />
        </div>
      </div>
    </div>
  );
}
