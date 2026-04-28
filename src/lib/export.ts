import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { PAPER_DIMENSIONS, type PaperSize } from "./invoice";

const safe = (s: string) => (s || "invoice").replace(/[^\w\-]+/g, "_").replace(/_+/g, "_").replace(/^_|_$/g, "");

const captureCanvas = async (el: HTMLElement) => {
  return html2canvas(el, {
    scale: 2,
    backgroundColor: null,
    useCORS: true,
    logging: false,
  });
};

export async function exportPNG(el: HTMLElement, invoiceNo: string, clientName: string) {
  const canvas = await captureCanvas(el);
  const link = document.createElement("a");
  link.download = `${safe(invoiceNo)}_${safe(clientName)}.png`;
  link.href = canvas.toDataURL("image/png");
  link.click();
}

export async function exportPDF(
  el: HTMLElement,
  invoiceNo: string,
  clientName: string,
  paperSize: PaperSize,
) {
  const canvas = await captureCanvas(el);
  const { w, h } = PAPER_DIMENSIONS[paperSize];

  const pdf = new jsPDF({
    orientation: w > h ? "landscape" : "portrait",
    unit: "mm",
    format: paperSize === "Letter" || paperSize === "Legal"
      ? [w, h]
      : (paperSize.toLowerCase() as "a4" | "a5"),
  });

  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();

  // Fit image to page width, preserve aspect; paginate if taller than page.
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
