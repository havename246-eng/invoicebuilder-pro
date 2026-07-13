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
type OnProgress = (pct: number) => void;

/**
 * Build a compact @font-face CSS containing only the families used on the sheet,
 * subset (via Google Fonts' `text=` param) to the exact characters it displays,
 * with the font data inlined as data: URLs.
 *
 * Passing this to toPng via `fontEmbedCSS` stops html-to-image from walking the
 * page's stylesheets itself — those now include hundreds of unicode-range-sliced
 * CJK @font-face rules, and fetching them all exhausts the browser's connection
 * pool (net::ERR_INSUFFICIENT_RESOURCES) and kills the export.
 */
async function buildFontEmbedCSS(sourceEl: HTMLElement): Promise<string> {
  const families = getComputedStyle(sourceEl)
    .fontFamily.split(",")
    .map((f) => f.trim().replace(/^["']|["']$/g, ""))
    .filter((f) => !["system-ui", "ui-sans-serif", "sans-serif", "serif", "monospace"].includes(f));
  const chars = [...new Set(sourceEl.textContent ?? "")].filter((c) => c.trim()).slice(0, 800).join("");
  if (!families.length || !chars) return "";

  const familyParams = (weights: string) =>
    families.map((f) => `family=${f.replace(/ /g, "+")}${weights}`).join("&");
  const textParam = `&text=${encodeURIComponent(chars)}`;
  // Some families don't ship every weight; if the weighted request is rejected,
  // retry with regular-only (bold gets synthesized) rather than failing the export.
  let res = await fetch(`https://fonts.googleapis.com/css2?${familyParams(":wght@400;500;600;700")}${textParam}`);
  if (!res.ok) res = await fetch(`https://fonts.googleapis.com/css2?${familyParams("")}${textParam}`);
  if (!res.ok) return "";
  let css = await res.text();

  const urls = [...new Set([...css.matchAll(/url\((https:\/\/[^)]+)\)/g)].map((m) => m[1]))];
  await Promise.all(
    urls.map(async (u) => {
      const r = await fetch(u);
      if (!r.ok) throw new Error(`Font download failed (${r.status})`);
      const buf = new Uint8Array(await r.arrayBuffer());
      let bin = "";
      for (let i = 0; i < buf.length; i += 0x8000) {
        bin += String.fromCharCode(...buf.subarray(i, i + 0x8000));
      }
      css = css.replaceAll(u, `data:font/woff2;base64,${btoa(bin)}`);
    }),
  );
  return css;
}

async function renderDataUrl(sourceEl: HTMLElement, paperSize: PaperSize, onProgress?: OnProgress): Promise<string> {
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
  onProgress?.(10);

  // Wait for layout + fonts
  await new Promise((r) => requestAnimationFrame(() => r(null)));
  if (document.fonts?.ready) {
    try { await document.fonts.ready; } catch { /* noop */ }
  }
  onProgress?.(20);

  // Empty string is a valid fallback: exports render with system fonts instead of failing.
  let fontEmbedCSS = "";
  try {
    fontEmbedCSS = await buildFontEmbedCSS(sourceEl);
  } catch {
    /* noop */
  }
  onProgress?.(30);

  // Pre-warm: load every image src via fresh Image() so the browser cache has them decoded
  const sources = Array.from(sourceEl.querySelectorAll("img"))
    .map((i) => i.getAttribute("src"))
    .filter((s): s is string => !!s);
  await Promise.all(
    sources.map(
      (src) =>
        new Promise<void>((resolve) => {
          const i = new Image();
          i.onload = () => resolve();
          i.onerror = () => resolve();
          i.src = src;
        }),
    ),
  );
  onProgress?.(45);

  // Strip crossOrigin on cloned images (data URLs don't need CORS, and the
  // attribute can cause silent re-fetch failures inside the cloned subtree).
  const imgs = Array.from(clone.querySelectorAll("img"));
  imgs.forEach((img) => {
    img.removeAttribute("crossorigin");
    (img as HTMLImageElement).crossOrigin = null as unknown as string;
  });

  // Wait for every image inside the clone to fully load and decode.
  await Promise.all(
    imgs.map(async (img) => {
      try {
        if (!(img.complete && img.naturalWidth > 0)) {
          await new Promise<void>((resolve) => {
            const done = () => resolve();
            img.addEventListener("load", done, { once: true });
            img.addEventListener("error", done, { once: true });
          });
        }
        if (typeof img.decode === "function") {
          await img.decode().catch(() => undefined);
        }
      } catch {
        /* noop */
      }
    }),
  );
  onProgress?.(65);

  try {
    const dataUrl = await toPng(clone, {
      pixelRatio: 2,
      backgroundColor: "#ffffff",
      cacheBust: true,
      width: widthPx,
      height: clone.scrollHeight,
      style: { transform: "none", margin: "0" },
      // Pre-built subset CSS — keeps html-to-image from fetching every @font-face on the page
      fontEmbedCSS,
    });
    onProgress?.(85);
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
  onProgress?: OnProgress,
) {
  const dataUrl = await renderDataUrl(el, paperSize, onProgress);
  onProgress?.(95);
  triggerDownload(dataUrl, `${safe(invoiceNo)}_${safe(clientName)}.png`);
  onProgress?.(100);
}

export async function exportPDF(
  el: HTMLElement,
  invoiceNo: string,
  clientName: string,
  paperSize: PaperSize,
  onProgress?: OnProgress,
) {
  const dataUrl = await renderDataUrl(el, paperSize, onProgress);
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
  onProgress?.(90);

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
  onProgress?.(98);

  pdf.save(`${safe(invoiceNo)}_${safe(clientName)}.pdf`);
  onProgress?.(100);
}
