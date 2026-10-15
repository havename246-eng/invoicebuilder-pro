import { downloadInvoiceFile } from "./export";
import type { InvoiceLanguage } from "./invoice";

export type ShareFormat = "pdf" | "png";

/**
 * How the invoice reached Telegram:
 * - share_sheet: phone share sheet, the file arrives attached in the chosen chat
 * - clipboard:   PNG copied, Telegram Web opened, the user pastes it
 * - download:    file saved, Telegram opened, the user attaches it
 * - cancelled:   the user closed the share sheet
 */
export type TelegramMethod = "share_sheet" | "clipboard" | "download" | "cancelled";

const MIME: Record<ShareFormat, string> = {
  pdf: "application/pdf",
  png: "image/png",
};

/**
 * Send the invoice file to Telegram without uploading it anywhere.
 *
 * Telegram's links (t.me/share, tgaddr) carry text only — no link can attach a
 * file. The browser has exactly two ways to hand a local file to another app:
 *
 * - Phones: the Web Share API. The system sheet lists Telegram, and picking it
 *   opens Telegram's chat picker with the file already attached, named after
 *   the invoice number. Needs HTTPS — on plain http the browser has no file
 *   sharing, and this falls back to the text-only link plus a download.
 * - Computers: the clipboard, for PNG. Telegram Web opens and Ctrl/⌘+V in the
 *   chat attaches the image. PDFs can't go on the clipboard, so they download.
 *
 * SAFARI: share() and clipboard.write() are only allowed during the tap, so the
 * file must already be rendered and both are called before the first await.
 * `onBlocked` is called when the pop-up blocker refuses Telegram Web after the
 * clipboard step, so the caller can offer a button that opens it on a new tap.
 */
export async function sendInvoiceToTelegram({
  blob,
  format,
  invoiceNo,
  message,
}: {
  blob: Blob;
  format: ShareFormat;
  invoiceNo: string;
  message: string;
}): Promise<{ method: TelegramMethod; fileName: string; opened: boolean }> {
  const fileName = `${safeName(invoiceNo)}.${format}`;
  const file = new File([blob], fileName, { type: MIME[format] });

  if (isPhoneOrTablet() && navigator.canShare?.({ files: [file] })) {
    try {
      // File only, no `text`: given both, Telegram and WhatsApp on iOS keep the
      // text and drop the file. The file name carries the invoice number.
      await navigator.share({ files: [file] });
      return { method: "share_sheet", fileName, opened: true };
    } catch (err) {
      if ((err as DOMException)?.name === "AbortError")
        return { method: "cancelled", fileName, opened: false };
      // Share sheet unavailable after all — fall through to link + download.
    }
  }

  const href = telegramLink(message);

  if (format === "png" && !isPhoneOrTablet() && canCopyImage()) {
    try {
      await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
      // Opened after the copy: a new tab takes focus, and Chrome refuses
      // clipboard writes from a page that isn't focused.
      return { method: "clipboard", fileName, opened: openTab(href) };
    } catch {
      // Clipboard refused — download instead.
    }
  }

  const opened = openTab(href);
  downloadInvoiceFile(file);
  return { method: "download", fileName, opened };
}

/**
 * Telegram's "send to…" picker with the message typed. Phones get t.me, which
 * iOS and Android hand straight to the Telegram app. Computers get Telegram
 * Web's tgaddr entry point (supported since its build 560, Feb 2025), because
 * t.me on a computer dead-ends on a stub page without the desktop app.
 *
 * `url` is the share link's one required parameter and Telegram drops it into
 * the message box; omitting `text`, which it would append, types it once.
 */
export function telegramLink(message: string) {
  const encoded = encodeURIComponent(message);
  return isPhoneOrTablet()
    ? `https://t.me/share/url?url=${encoded}`
    : `https://web.telegram.org/k/#?tgaddr=${encodeURIComponent(`tg://msg_url?url=${encoded}`)}`;
}

/**
 * Returns false when a pop-up blocker refused. Not "noopener" in the features
 * string: with it window.open always returns null, hiding a refusal, so the
 * opener link is cut by hand instead.
 */
export function openTab(href: string) {
  const win = window.open(href, "_blank");
  if (win) win.opener = null;
  return !!win;
}

function canCopyImage() {
  return typeof ClipboardItem !== "undefined" && !!navigator.clipboard?.write;
}

/** A coarse primary pointer: phones and tablets, where Telegram is an app. */
function isPhoneOrTablet() {
  return window.matchMedia?.("(pointer: coarse)").matches ?? false;
}

/** Invoice numbers are user-typed; keep the filename to characters every OS accepts. */
function safeName(s: string) {
  return (s || "invoice").replace(/[^\w-]+/g, "_").replace(/^_+|_+$/g, "") || "invoice";
}

const pasteKey = () => (/Mac|iPhone|iPad/.test(navigator.platform) ? "⌘V" : "Ctrl+V");

// ───────── UI strings ─────────

/**
 * Builder chrome for the Telegram action, following the invoice's own language
 * setting — the only KH/EN switch the app has. Kept out of I18N in invoice.ts:
 * that dictionary is the rendered invoice's vocabulary and spans five
 * languages, and t() would print raw key names for any language without an
 * entry. Languages other than Khmer fall back to English.
 */
const STRINGS = {
  en: {
    sendViaTelegram: "Send via Telegram",
    preparing: "Preparing…",
    openTelegram: "Open Telegram",
    message: (invoiceNo: string) => `Invoice ${invoiceNo}`,
    pasteToast: () => `Invoice copied — press ${pasteKey()} in the Telegram chat to attach it.`,
    attachToast: (file: string) =>
      `${file} downloaded — drag it into the Telegram chat to attach it.`,
    shareFailed: "Couldn't prepare the invoice. Please try again.",
  },
  km: {
    sendViaTelegram: "ផ្ញើតាម Telegram",
    preparing: "កំពុងរៀបចំ…",
    openTelegram: "បើក Telegram",
    message: (invoiceNo: string) => `វិក្កយបត្រ ${invoiceNo}`,
    pasteToast: () =>
      `បានចម្លងវិក្កយបត្រ — ចុច ${pasteKey()} ក្នុងការជជែក Telegram ដើម្បីភ្ជាប់វា។`,
    attachToast: (file: string) =>
      `បានទាញយក ${file} — សូមអូសវាចូលក្នុងការជជែក Telegram ដើម្បីភ្ជាប់។`,
    shareFailed: "មិនអាចរៀបចំវិក្កយបត្របានទេ។ សូមព្យាយាមម្តងទៀត។",
  },
};

export function telegramStrings(lang: InvoiceLanguage) {
  return lang === "km" ? STRINGS.km : STRINGS.en;
}
