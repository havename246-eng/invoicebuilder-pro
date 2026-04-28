import { toPng } from "html-to-image";
import jsPDF from "jspdf";
import { PAPER_DIMENSIONS, paperPxWidth, type PaperSize } from "./invoice";

const safe = (s: string) =>
  (s || "invoice")
    .replace(/[^\w\-]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "") || "invoice";

/**
 * Render the invoice into a PNG data URL. We clone into an off-screen sandbox
 * with a forced white background and no transforms so:
 *  - inherited OKLCH/oklab tokens from the page don't break parsing
 *  - the responsive scale() on the live preview doesn't distort the capture
 */
async function renderDataUrl(sourceEl: HTMLElement, paperSize: PaperSize): Promise<string> {
  const widthPx = paperPxWidth(paperSize);

  const sandbox = document.createElement("div");
  sandbox.style.position = "fixed";
  sandbox.style.left = "-100000px";
  sandbox.style.top = "0";
  sandbox.style.width = `${widthPx}px`;
  sandbox.style.background = "#ffffff";
  sandbox.style.color = "#0f172a";
  sandbox.style.zIndex = "-1";
  sandbox.style.pointerEvents = "none";
  // Override any inherited custom properties that use oklch()
  sandbox.style.setProperty("--background", "#ffffff");
  sandbox.style.setProperty("--foreground", "#0f172a");
  sandbox.style.setProperty("--border", "#e2e8f0");
  sandbox.style.setProperty("--color-border", "#e2e8f0");

  const clone = sourceEl.cloneNode(true) as HTMLElement;
  clone.style.transform = "none";
  clone.style.width = `${widthPx}px`;
  clone.style.maxWidth = "none";
  clone.style.boxShadow = "none";
  clone.style.margin = "0";

  sandbox.appendChild(clone);
  document.body.appendChild(sandbox);

  // Wait for layout + fonts
  await new Promise((r) => requestAnimationFrame(() => r(null)));
  if (document.fonts?.ready) {
    try { await document.fonts.ready; } catch { /* noop */ }
  }

  try {
    const dataUrl = await toPng(clone, {
      pixelRatio: 2,
      backgroundColor: "#ffffff",
      cacheBust: true,
      width: widthPx,
      height: clone.scrollHeight,
      style: { transform: "none", margin: "0" },
      // Skip external stylesheet rules we can't read (CORS); inline styles still apply
      skipFonts: false,
    });
    return dataUrl;
  } finally {
    sandbox.remove();
  }
}

function triggerDownload(href: string, filename: string) {
  const link = document.createElement("a");
  link.href = href;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
}

export async function exportPNG(
  el: HTMLElement,
  invoiceNo: string,
  clientName: string,
  paperSize: PaperSize,
) {
  const dataUrl = await renderDataUrl(el, paperSize);
  triggerDownload(dataUrl, `${safe(invoiceNo)}_${safe(clientName)}.png`);
}

export async function exportPDF(
  el: HTMLElement,
  invoiceNo: string,
  clientName: string,
  paperSize: PaperSize,
) {
  const dataUrl = await renderDataUrl(el, paperSize);
  const { w, h } = PAPER_DIMENSIONS[paperSize];

  const pdf = new jsPDF({
    orientation: w > h ? "landscape" : "portrait",
    unit: "mm",
    format:
      paperSize === "Letter" || paperSize === "Legal"
        ? [w, h]
        : (paperSize.toLowerCase() as "a4" | "a5"),
  });

  // Load image to learn aspect ratio
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = () => reject(new Error("Failed to load rendered image"));
    i.src = dataUrl;
  });

  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const imgRatio = img.height / img.width;
  const imgW = pageW;
  const imgH = imgW * imgRatio;

  if (imgH <= pageH) {
    pdf.addImage(dataUrl, "PNG", 0, 0, imgW, imgH);
  } else {
    let remaining = imgH;
    let position = 0;
    while (remaining > 0) {
      pdf.addImage(dataUrl, "PNG", 0, position, imgW, imgH);
      remaining -= pageH;
      position -= pageH;
      if (remaining > 0) pdf.addPage();
    }
  }

  pdf.save(`${safe(invoiceNo)}_${safe(clientName)}.pdf`);
}
