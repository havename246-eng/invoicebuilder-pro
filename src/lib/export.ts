import { toPng } from "html-to-image";
import jsPDF from "jspdf";
import {
  PAPER_DIMENSIONS,
  paperPxWidth,
  THEMES,
  type InvoiceData,
  type PaperSize,
} from "./invoice";

const safe = (s: string) =>
  (s || "invoice")
    .replace(/[^\w-]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "") || "invoice";

/**
 * Render the invoice into a PNG data URL. We clone into an off-screen sandbox
 * with the theme background and no transforms so:
 *  - inherited OKLCH/oklab tokens from the page don't break parsing
 *  - the responsive scale() on the live preview doesn't distort the capture
 */
type OnProgress = (pct: number) => void;

// Phones and tablets expose a coarse primary pointer; desktops don't.
const isTouchDevice = () =>
  typeof window !== "undefined" &&
  (window.matchMedia?.("(pointer: coarse)").matches || navigator.maxTouchPoints > 0);

// Every iOS browser (Safari, CriOS, FxiOS…) runs WebKit; iPadOS reports "Macintosh"
// but has multi-touch. Desktop Safari shares the same rendering engine quirk.
const isWebKitEngine = () => {
  const ua = navigator.userAgent;
  const iOS = /iP(hone|ad|od)/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  const safari = /AppleWebKit/.test(ua) && !/Chrome|Chromium|Edg|Android/.test(ua);
  return iOS || safari;
};

// Short buzz when the download hands off to the browser. navigator.vibrate is a
// no-op where unsupported (iOS), so this degrades silently.
const hapticBuzz = () => {
  if (!isTouchDevice()) return;
  try {
    navigator.vibrate?.(35);
  } catch {
    /* noop */
  }
};

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
  const chars = [...new Set(sourceEl.textContent ?? "")]
    .filter((c) => c.trim())
    .slice(0, 800)
    .join("");
  if (!families.length || !chars) return "";

  const familyParams = (weights: string) =>
    families.map((f) => `family=${f.replace(/ /g, "+")}${weights}`).join("&");
  const textParam = `&text=${encodeURIComponent(chars)}`;
  // Some families don't ship every weight; if the weighted request is rejected,
  // retry with regular-only (bold gets synthesized) rather than failing the export.
  let res = await fetch(
    `https://fonts.googleapis.com/css2?${familyParams(":wght@400;500;600;700")}${textParam}`,
  );
  if (!res.ok)
    res = await fetch(`https://fonts.googleapis.com/css2?${familyParams("")}${textParam}`);
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

async function renderDataUrl(
  sourceEl: HTMLElement,
  paperSize: PaperSize,
  bg: string,
  onProgress?: OnProgress,
): Promise<string> {
  const widthPx = paperPxWidth(paperSize);

  const sandbox = document.createElement("div");
  sandbox.style.position = "fixed";
  sandbox.style.left = "-100000px";
  sandbox.style.top = "0";
  sandbox.style.width = `${widthPx}px`;
  sandbox.style.background = bg;
  sandbox.style.color = "#0f172a";
  sandbox.style.zIndex = "-1";
  sandbox.style.pointerEvents = "none";
  // Mobile browsers inflate text on wide off-screen blocks (font boosting), which
  // would re-wrap lines and shift the layout vs. the same invoice exported on desktop.
  sandbox.style.setProperty("text-size-adjust", "100%");
  sandbox.style.setProperty("-webkit-text-size-adjust", "100%");
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
    try {
      await document.fonts.ready;
    } catch {
      /* noop */
    }
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

  // Pin every image to the pixel box it laid out at. The brand footer SVG has only
  // a viewBox (no intrinsic size), and WebKit's foreignObject capture sizes such
  // images by intrinsic default instead of the CSS box — on phones that rendered
  // the footer strip at the wrong width.
  imgs.forEach((img) => {
    if (img.offsetWidth > 0 && img.offsetHeight > 0) {
      img.style.width = `${img.offsetWidth}px`;
      img.style.height = `${img.offsetHeight}px`;
    }
  });
  onProgress?.(60);

  try {
    const options = {
      pixelRatio: 2,
      backgroundColor: bg,
      cacheBust: true,
      width: widthPx,
      height: clone.scrollHeight,
      style: { transform: "none", margin: "0" },
      // Pre-built subset CSS — keeps html-to-image from fetching every @font-face on the page
      fontEmbedCSS,
    };

    // WebKit routinely drops images or embedded fonts on the first foreignObject
    // rasterization; capture and discard warm-up passes so the final PNG matches
    // the on-screen preview on iPhone/iPad and Safari.
    if (isWebKitEngine()) {
      for (const pct of [68, 76]) {
        try {
          await toPng(clone, options);
        } catch {
          /* warm-up only */
        }
        onProgress?.(pct);
      }
    }

    const dataUrl = await toPng(clone, options);
    onProgress?.(85);
    return dataUrl;
  } finally {
    sandbox.remove();
  }
}

function dataUrlToBlob(dataUrl: string): Blob {
  const [meta, b64] = dataUrl.split(",");
  const mime = /data:([^;,]+)/.exec(meta)?.[1] ?? "application/octet-stream";
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

/**
 * Blob object URLs (unlike multi-MB data: URLs) trigger a real download on mobile
 * browsers — iOS Safari saves to Files, Android Chrome to Downloads — instead of
 * navigating to the image. Buzz once the download is handed to the browser.
 */
function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.rel = "noopener";
  document.body.appendChild(link);
  link.click();
  link.remove();
  hapticBuzz();
  // Revoke late: mobile Safari starts the download asynchronously.
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

export async function exportPNG(el: HTMLElement, data: InvoiceData, onProgress?: OnProgress) {
  const bg = THEMES[data.theme].bg;
  const dataUrl = await renderDataUrl(el, data.paperSize, bg, onProgress);
  onProgress?.(95);
  triggerDownload(
    dataUrlToBlob(dataUrl),
    `${safe(data.invoiceNumber)}_${safe(data.clientName)}.png`,
  );
  onProgress?.(100);
}

export async function exportPDF(el: HTMLElement, data: InvoiceData, onProgress?: OnProgress) {
  const bg = THEMES[data.theme].bg;
  const paperSize = data.paperSize;
  const dataUrl = await renderDataUrl(el, paperSize, bg, onProgress);
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
  const imgW = pageW;
  const imgH = imgW * (img.height / img.width);

  // Rounding paper mm → CSS px makes the render a fraction of a mm taller than
  // the page on some sizes (A4 ≈ +0.02mm); without this tolerance that sliver
  // used to add a blank trailing page.
  const pageCount = Math.max(1, Math.ceil((imgH - 1) / pageH));
  for (let page = 0; page < pageCount; page++) {
    if (page > 0) pdf.addPage();
    // Paint the paper in the theme colour so dark themes don't show white
    // strips where the image doesn't cover the page.
    pdf.setFillColor(bg);
    pdf.rect(0, 0, pageW, pageH, "F");
    // jsPDF re-encodes the PNG's pixels into the PDF and defaults to no
    // compression, which balloons a one-page invoice to ~10MB.
    pdf.addImage(dataUrl, "PNG", 0, -page * pageH, imgW, imgH, undefined, "FAST");
  }
  onProgress?.(98);

  triggerDownload(pdf.output("blob"), `${safe(data.invoiceNumber)}_${safe(data.clientName)}.pdf`);
  onProgress?.(100);
}
