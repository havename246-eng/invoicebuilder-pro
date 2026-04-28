import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { PAPER_DIMENSIONS, paperPxWidth, type PaperSize } from "./invoice";

const safe = (s: string) =>
  (s || "invoice").replace(/[^\w\-]+/g, "_").replace(/_+/g, "_").replace(/^_|_$/g, "") || "invoice";

/**
 * Render the invoice node off-screen at its true (unscaled) size with safe
 * colors, then snapshot via html2canvas. This avoids two common failure modes:
 *   1) modern OKLCH/oklab tokens inherited from the page that html2canvas can't parse
 *   2) CSS transform: scale() on the live preview distorting the capture box
 */
const captureCanvas = async (sourceEl: HTMLElement, paperSize: PaperSize) => {
  const widthPx = paperPxWidth(paperSize);

  // Off-screen sandbox
  const sandbox = document.createElement("div");
  sandbox.style.position = "fixed";
  sandbox.style.left = "-100000px";
  sandbox.style.top = "0";
  sandbox.style.width = `${widthPx}px`;
  sandbox.style.background = "#ffffff";
  sandbox.style.color = "#0f172a";
  sandbox.style.zIndex = "-1";
  sandbox.style.pointerEvents = "none";

  // Deep clone the live preview, strip transforms / scaling
  const clone = sourceEl.cloneNode(true) as HTMLElement;
  clone.style.transform = "none";
  clone.style.width = `${widthPx}px`;
  clone.style.maxWidth = "none";
  clone.style.boxShadow = "none";
  clone.style.margin = "0";

  sandbox.appendChild(clone);
  document.body.appendChild(sandbox);

  // Wait one frame so layout/fonts settle
  await new Promise((r) => requestAnimationFrame(() => r(null)));
  if (document.fonts && document.fonts.ready) {
    try {
      await document.fonts.ready;
    } catch {
      /* ignore */
    }
  }

  try {
    const canvas = await html2canvas(clone, {
      scale: 2,
      backgroundColor: "#ffffff",
      useCORS: true,
      logging: false,
      windowWidth: widthPx,
      width: widthPx,
      height: clone.scrollHeight,
    });
    return canvas;
  } finally {
    document.body.removeChild(sandbox);
  }
};

export async function exportPNG(
  el: HTMLElement,
  invoiceNo: string,
  clientName: string,
  paperSize: PaperSize,
) {
  const canvas = await captureCanvas(el, paperSize);
  const link = document.createElement("a");
  link.download = `${safe(invoiceNo)}_${safe(clientName)}.png`;
  link.href = canvas.toDataURL("image/png");
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export async function exportPDF(
  el: HTMLElement,
  invoiceNo: string,
  clientName: string,
  paperSize: PaperSize,
) {
  const canvas = await captureCanvas(el, paperSize);
  const { w, h } = PAPER_DIMENSIONS[paperSize];

  const pdf = new jsPDF({
    orientation: w > h ? "landscape" : "portrait",
    unit: "mm",
    format:
      paperSize === "Letter" || paperSize === "Legal"
        ? [w, h]
        : (paperSize.toLowerCase() as "a4" | "a5"),
  });

  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const imgRatio = canvas.height / canvas.width;
  const imgW = pageW;
  const imgH = imgW * imgRatio;
  const dataUrl = canvas.toDataURL("image/png");

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
