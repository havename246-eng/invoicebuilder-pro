/**
 * Google Drive for signed-in users: syncs their business profile (the
 * invoice's From and Payment details), and keeps a copy of every invoice they
 * export — a PDF they can open in My Drive / InvoiceCraft / Invoices / {year},
 * plus the full invoice data in the hidden app folder for the My invoices page.
 *
 * The file lives in Drive's hidden app-data folder, which only this app can
 * see; the scope (drive.appdata) grants no access to anything else in the
 * user's Drive. The user connects once per device (connectDrive, from a
 * click); after that the server hands out short-lived access tokens from an
 * encrypted grant kept in a cookie on that device (see drive-sync.ts), so
 * syncing needs no further clicks. Profile data goes browser-to-Google only.
 */
import { driveConnectFn, driveDisconnectFn, driveStatusFn, driveTokenFn } from "./drive-sync";
import { calcTotals, defaultInvoice, type InvoiceData, type InvoiceStatus } from "./invoice";

export const GOOGLE_CLIENT_ID = (import.meta.env.VITE_GOOGLE_CLIENT_ID ?? "") as string;
export const isDriveConfigured = GOOGLE_CLIENT_ID.endsWith(".apps.googleusercontent.com");

const SCOPE_APPDATA = "https://www.googleapis.com/auth/drive.appdata";
/** Files this app creates (the invoice PDFs) and nothing else in the user's Drive. */
const SCOPE_FILE = "https://www.googleapis.com/auth/drive.file";
const SCOPES = `${SCOPE_APPDATA} ${SCOPE_FILE}`;
const FILE_NAME = "invoicecraft-business-profile.json";
const API = "https://www.googleapis.com/drive/v3/files";
const UPLOAD = "https://www.googleapis.com/upload/drive/v3/files";

/** What "Save to Drive" writes: the From section plus the Payment section. */
export type BusinessProfile = {
  senderName: string;
  senderEmail: string;
  senderAddress: string;
  logo: string | null;
  bankName: string;
  bankAccount: string;
  qrCode: string | null;
};

/**
 * What "Load" returns. Payment fields are undefined when the file predates
 * them (saved before payment details were synced), so loading an old file
 * leaves the user's current payment details alone instead of wiping them.
 */
export type LoadedProfile = Omit<BusinessProfile, "bankName" | "bankAccount" | "qrCode"> & {
  bankName?: string;
  bankAccount?: string;
  qrCode?: string | null;
};

type CodeResponse = { code?: string; error?: string };
type CodeClient = { requestCode: () => void };

declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initCodeClient: (config: {
            client_id: string;
            scope: string;
            ux_mode: "popup";
            callback: (r: CodeResponse) => void;
            error_callback?: (e: { type: string }) => void;
          }) => CodeClient;
        };
      };
    };
  }
}

let gisLoader: Promise<void> | null = null;

function loadGis(): Promise<void> {
  if (window.google?.accounts?.oauth2) return Promise.resolve();
  if (gisLoader) return gisLoader;
  gisLoader = new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Couldn't load Google sign-in."));
    document.head.appendChild(script);
  });
  // Let a later click retry after a network failure.
  gisLoader.catch(() => {
    gisLoader = null;
  });
  return gisLoader;
}

/** Start loading Google's script early so the Connect click opens instantly. */
export function preloadGoogle() {
  if (isDriveConfigured) loadGis().catch(() => undefined);
}

/**
 * Connects this device's Drive: Google's consent popup, then the server keeps
 * an encrypted grant so later syncs need no clicks. Call from a click handler.
 */
export async function connectDrive(): Promise<void> {
  await loadGis();
  const code = await new Promise<string>((resolve, reject) => {
    const client = window.google!.accounts.oauth2.initCodeClient({
      client_id: GOOGLE_CLIENT_ID,
      scope: SCOPES,
      ux_mode: "popup",
      callback: (r) =>
        r.code
          ? resolve(r.code)
          : reject(
              new Error(
                r.error === "access_denied"
                  ? "Google Drive access wasn't allowed."
                  : "Couldn't connect to Google Drive.",
              ),
            ),
      error_callback: (e) =>
        reject(
          new Error(
            e.type === "popup_closed"
              ? "Google Drive connection was cancelled."
              : e.type === "popup_failed_to_open"
                ? "Your browser blocked the Google window. Allow pop-ups for this site and try again."
                : "Couldn't connect to Google Drive.",
          ),
        ),
    });
    client.requestCode();
  });
  const result = await driveConnectFn({ data: code });
  if (!result.ok) throw new Error(result.error ?? "Couldn't connect to Google Drive.");
  cached = null;
  setConnected(true);
}

/** Stops syncing on this device (other connected devices keep syncing). */
export async function disconnectDrive(): Promise<void> {
  cached = null;
  await driveDisconnectFn();
  setConnected(false);
}

// Whether this device has Drive connected, shared by the header link, the
// builder's export hook and the sync card, and fetched once per page load.
let connectedState: Promise<boolean> | null = null;
const CONNECTION_EVENT = "invoicecraft:drive-connection";

function setConnected(value: boolean) {
  connectedState = Promise.resolve(value);
  window.dispatchEvent(new CustomEvent(CONNECTION_EVENT, { detail: value }));
}

/** True when Drive is connected on this device (for a signed-in user). */
export function isDriveConnected(): Promise<boolean> {
  if (!isDriveConfigured) return Promise.resolve(false);
  connectedState ??= driveStatusFn().then(
    (s) => s.connected,
    () => false,
  );
  return connectedState;
}

/** Calls back when Drive is connected or disconnected on this page. */
export function onDriveConnectionChange(cb: (connected: boolean) => void) {
  const handler = (e: Event) => cb((e as CustomEvent<boolean>).detail);
  window.addEventListener(CONNECTION_EVENT, handler);
  return () => window.removeEventListener(CONNECTION_EVENT, handler);
}

/** Thrown when Drive is connected but without the newer invoice-files permission. */
export class DriveScopeMissingError extends Error {
  constructor() {
    super("Reconnect Google Drive to allow saving invoices.");
  }
}

/** A Drive API error that keeps its HTTP status (404 = file deleted by the user). */
class DriveHttpError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

/** Thrown when this device isn't connected (or the grant was revoked). */
export class DriveNotConnectedError extends Error {
  constructor() {
    super("Google Drive isn't connected on this device.");
  }
}

// Access tokens last an hour; reuse one until shortly before it expires.
let cached: { token: string; scopes: string[]; expiresAt: number } | null = null;

async function getToken(): Promise<string> {
  if (cached && cached.expiresAt - 60_000 > Date.now()) return cached.token;
  const r = await driveTokenFn();
  if (!r.accessToken) {
    connectedState = Promise.resolve(false);
    throw new DriveNotConnectedError();
  }
  cached = {
    token: r.accessToken,
    scopes: (r.scope ?? "").split(" "),
    expiresAt: Date.now() + (r.expiresIn ?? 3600) * 1000,
  };
  return r.accessToken;
}

/** Throws unless the grant includes drive.file (users who connected before invoices existed). */
async function requireFileScope() {
  await getToken();
  if (!cached?.scopes.includes(SCOPE_FILE)) throw new DriveScopeMissingError();
}

async function drive(url: string, init: RequestInit = {}) {
  const token = await getToken();
  const res = await fetch(url, {
    ...init,
    headers: { ...init.headers, Authorization: `Bearer ${token}` },
  });
  if (res.status === 401) cached = null;
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
    throw new DriveHttpError(
      body.error?.message ?? `Google Drive error (${res.status})`,
      res.status,
    );
  }
  return res;
}

async function findFileId(): Promise<string | null> {
  const q = encodeURIComponent(`name = '${FILE_NAME}' and trashed = false`);
  const res = await drive(`${API}?spaces=appDataFolder&q=${q}&fields=files(id)&pageSize=1`);
  const { files } = (await res.json()) as { files?: { id: string }[] };
  return files?.[0]?.id ?? null;
}

/** Writes the profile, creating the file the first time. */
export async function saveProfileToDrive(profile: BusinessProfile): Promise<void> {
  const body = JSON.stringify({ version: 1, savedAt: new Date().toISOString(), ...profile });
  const id = await findFileId();

  if (id) {
    await drive(`${UPLOAD}/${id}?uploadType=media`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body,
    });
    return;
  }

  // Metadata (name, hidden app folder) and content in one multipart request.
  const boundary = `ic-${crypto.randomUUID()}`;
  const multipart = [
    `--${boundary}`,
    "Content-Type: application/json; charset=UTF-8",
    "",
    JSON.stringify({ name: FILE_NAME, parents: ["appDataFolder"] }),
    `--${boundary}`,
    "Content-Type: application/json",
    "",
    body,
    `--${boundary}--`,
  ].join("\r\n");
  await drive(`${UPLOAD}?uploadType=multipart`, {
    method: "POST",
    headers: { "Content-Type": `multipart/related; boundary=${boundary}` },
    body: multipart,
  });
}

/** The saved profile, or null if this Google account hasn't saved one yet. */
export async function loadProfileFromDrive(): Promise<LoadedProfile | null> {
  const id = await findFileId();
  if (!id) return null;
  const res = await drive(`${API}/${id}?alt=media`);
  const data = (await res.json()) as Record<string, unknown>;
  const str = (v: unknown) => (typeof v === "string" ? v : undefined);
  // Only an image data URL is accepted back as a logo or QR code.
  const img = (v: unknown) => (typeof v === "string" && /^data:image\//.test(v) ? v : null);
  return {
    senderName: str(data.senderName) ?? "",
    senderEmail: str(data.senderEmail) ?? "",
    senderAddress: str(data.senderAddress) ?? "",
    logo: img(data.logo),
    bankName: str(data.bankName),
    bankAccount: str(data.bankAccount),
    qrCode: "qrCode" in data ? img(data.qrCode) : undefined,
  };
}

// ───────── Invoices: PDF in My Drive, data in the hidden app folder ─────────

const FOLDER_MIME = "application/vnd.google-apps.folder";
const INVOICE_PREFIX = "invoice-";

/** A row on the My invoices page, read from file metadata only (fast). */
export type InvoiceSummary = {
  /** The hidden JSON file holding the full invoice. */
  fileId: string;
  invoiceId: string;
  invoiceNumber: string;
  clientName: string;
  total: number;
  currency: string;
  issueDate: string;
  dueDate: string;
  status: InvoiceStatus;
  pdfFileId: string | null;
  modifiedTime: string;
};

export const pdfViewUrl = (pdfFileId: string) =>
  `https://drive.google.com/file/d/${pdfFileId}/view`;

/** Drive query string literal: escape backslashes and single quotes. */
const q = (v: string) => `'${v.replace(/\\/g, "\\\\").replace(/'/g, "\\'")}'`;

/**
 * Drive caps each appProperty at 124 bytes of UTF-8 for key + value together;
 * Khmer and CJK client names hit that fast. Trim the value to fit (and to 100
 * characters), never splitting a character.
 */
function appProps(props: Record<string, string>): Record<string, string> {
  const enc = new TextEncoder();
  const out: Record<string, string> = {};
  for (const [key, raw] of Object.entries(props)) {
    let value = Array.from(raw).slice(0, 100).join("");
    while (enc.encode(key + value).length > 124) value = Array.from(value).slice(0, -1).join("");
    out[key] = value;
  }
  return out;
}

/** One multipart/related body: JSON metadata, then the file content. */
function multipart(metadata: object, content: Blob | string, contentType: string) {
  const boundary = `ic-${crypto.randomUUID()}`;
  const body = new Blob([
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n`,
    `--${boundary}\r\nContent-Type: ${contentType}\r\n\r\n`,
    content,
    `\r\n--${boundary}--`,
  ]);
  return { body, headers: { "Content-Type": `multipart/related; boundary=${boundary}` } };
}

// Folder ids by path, so each save doesn't search Drive again.
const folderCache = new Map<string, string>();

async function folderId(name: string, parent: string, path: string): Promise<string> {
  const hit = folderCache.get(path);
  if (hit) return hit;
  const query = encodeURIComponent(
    `name = ${q(name)} and mimeType = '${FOLDER_MIME}' and ${q(parent)} in parents and trashed = false`,
  );
  const res = await drive(`${API}?q=${query}&fields=files(id)&pageSize=1&spaces=drive`);
  const found = ((await res.json()) as { files?: { id: string }[] }).files?.[0]?.id;
  const id =
    found ??
    (
      (await (
        await drive(`${API}?fields=id`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, mimeType: FOLDER_MIME, parents: [parent] }),
        })
      ).json()) as { id: string }
    ).id;
  folderCache.set(path, id);
  return id;
}

/** My Drive / InvoiceCraft / Invoices / {year}, created as needed. */
async function yearFolder(year: string): Promise<string> {
  const app = await folderId("InvoiceCraft", "root", "InvoiceCraft");
  const invoices = await folderId("Invoices", app, "InvoiceCraft/Invoices");
  return folderId(year, invoices, `InvoiceCraft/Invoices/${year}`);
}

async function findInvoiceFile(invoiceId: string) {
  const query = encodeURIComponent(
    `appProperties has { key='invoiceId' and value=${q(invoiceId)} } and trashed = false`,
  );
  const res = await drive(
    `${API}?spaces=appDataFolder&q=${query}&fields=files(id,appProperties)&pageSize=1`,
  );
  const file = (
    (await res.json()) as { files?: { id: string; appProperties?: Record<string, string> }[] }
  ).files?.[0];
  return file ?? null;
}

const pdfName = (inv: InvoiceData) =>
  `${inv.invoiceNumber.trim() || "Invoice"} – ${inv.clientName.trim() || "No client"}.pdf`.replace(
    /[/\\]/g,
    "-",
  );

/**
 * Saves (or updates) an invoice in Drive: the PDF where the user can see it,
 * the full invoice data in the hidden app folder. Re-saving the same
 * invoiceId patches both files instead of duplicating them; a PDF the user
 * deleted from Drive is created again. Returns the PDF's id.
 */
export async function saveInvoiceToDrive(
  invoice: InvoiceData,
  pdf: Blob,
): Promise<{ pdfFileId: string }> {
  await requireFileScope();
  const existing = await findInvoiceFile(invoice.invoiceId);
  let pdfFileId = existing?.appProperties?.pdfFileId ?? null;

  // The PDF: update in place, or create in the year folder.
  const pdfMeta = {
    name: pdfName(invoice),
    appProperties: appProps({ invoiceId: invoice.invoiceId, status: invoice.status }),
  };
  if (pdfFileId) {
    try {
      const { body, headers } = multipart(pdfMeta, pdf, "application/pdf");
      await drive(`${UPLOAD}/${pdfFileId}?uploadType=multipart&fields=id`, {
        method: "PATCH",
        headers,
        body,
      });
    } catch (e) {
      if (!(e instanceof DriveHttpError && e.status === 404)) throw e;
      pdfFileId = null; // deleted by the user in Drive: make a new one
    }
  }
  if (!pdfFileId) {
    const year = /^\d{4}/.exec(invoice.issueDate)?.[0] ?? String(new Date().getFullYear());
    const { body, headers } = multipart(
      { ...pdfMeta, mimeType: "application/pdf", parents: [await yearFolder(year)] },
      pdf,
      "application/pdf",
    );
    const res = await drive(`${UPLOAD}?uploadType=multipart&fields=id`, {
      method: "POST",
      headers,
      body,
    });
    pdfFileId = ((await res.json()) as { id: string }).id;
  }

  // The data, with the list columns as appProperties for a metadata-only list.
  const { total } = calcTotals(invoice.items, invoice.taxRate);
  const jsonMeta = {
    appProperties: appProps({
      invoiceId: invoice.invoiceId,
      invoiceNumber: invoice.invoiceNumber,
      clientName: invoice.clientName,
      total: String(Math.round(total * 100) / 100),
      currency: invoice.currency,
      issueDate: invoice.issueDate,
      dueDate: invoice.dueDate,
      status: invoice.status,
      pdfFileId,
    }),
  };
  const content = JSON.stringify({ version: 1, savedAt: new Date().toISOString(), invoice });
  if (existing) {
    const { body, headers } = multipart(jsonMeta, content, "application/json");
    await drive(`${UPLOAD}/${existing.id}?uploadType=multipart&fields=id`, {
      method: "PATCH",
      headers,
      body,
    });
  } else {
    const { body, headers } = multipart(
      {
        ...jsonMeta,
        name: `${INVOICE_PREFIX}${invoice.invoiceId}.json`,
        parents: ["appDataFolder"],
      },
      content,
      "application/json",
    );
    await drive(`${UPLOAD}?uploadType=multipart&fields=id`, { method: "POST", headers, body });
  }
  return { pdfFileId };
}

const STATUSES: InvoiceStatus[] = ["draft", "unpaid", "partial", "paid", "void"];

/** Every saved invoice, newest first, from file metadata only. */
export async function listInvoicesFromDrive(): Promise<InvoiceSummary[]> {
  await requireFileScope();
  const query = encodeURIComponent(`name contains '${INVOICE_PREFIX}' and trashed = false`);
  const out: InvoiceSummary[] = [];
  let pageToken = "";
  do {
    const res = await drive(
      `${API}?spaces=appDataFolder&q=${query}&pageSize=1000&orderBy=modifiedTime desc` +
        `&fields=nextPageToken,files(id,appProperties,modifiedTime)${pageToken ? `&pageToken=${pageToken}` : ""}`,
    );
    const page = (await res.json()) as {
      nextPageToken?: string;
      files?: { id: string; modifiedTime: string; appProperties?: Record<string, string> }[];
    };
    for (const f of page.files ?? []) {
      const p = f.appProperties ?? {};
      if (!p.invoiceId) continue;
      out.push({
        fileId: f.id,
        invoiceId: p.invoiceId,
        invoiceNumber: p.invoiceNumber ?? "",
        clientName: p.clientName ?? "",
        total: Number(p.total) || 0,
        currency: p.currency ?? "USD",
        issueDate: p.issueDate ?? "",
        dueDate: p.dueDate ?? "",
        status: STATUSES.includes(p.status as InvoiceStatus)
          ? (p.status as InvoiceStatus)
          : "draft",
        pdfFileId: p.pdfFileId || null,
        modifiedTime: f.modifiedTime,
      });
    }
    pageToken = page.nextPageToken ?? "";
  } while (pageToken);
  return out;
}

/** The full invoice behind a My invoices row, ready to load into the builder. */
export async function loadInvoiceFromDrive(fileId: string): Promise<InvoiceData> {
  const res = await drive(`${API}/${fileId}?alt=media`);
  const data = (await res.json()) as { invoice?: Partial<InvoiceData> };
  if (!data.invoice || typeof data.invoice !== "object")
    throw new Error("That invoice file is damaged.");
  return { ...defaultInvoice(), ...data.invoice };
}

/** Changes an invoice's status in its data file and on its PDF's metadata. */
export async function setInvoiceStatusInDrive(row: InvoiceSummary, status: InvoiceStatus) {
  const invoice = await loadInvoiceFromDrive(row.fileId);
  invoice.status = status;
  const { body, headers } = multipart(
    { appProperties: appProps({ status }) },
    JSON.stringify({ version: 1, savedAt: new Date().toISOString(), invoice }),
    "application/json",
  );
  await drive(`${UPLOAD}/${row.fileId}?uploadType=multipart&fields=id`, {
    method: "PATCH",
    headers,
    body,
  });
  if (row.pdfFileId) {
    await drive(`${API}/${row.pdfFileId}?fields=id`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ appProperties: appProps({ status }) }),
    }).catch((e) => {
      if (!(e instanceof DriveHttpError && e.status === 404)) throw e;
    });
  }
}

/** Deletes both files of an invoice (a PDF already removed by the user is fine). */
export async function deleteInvoiceFromDrive(row: InvoiceSummary) {
  const del = (id: string) =>
    drive(`${API}/${id}`, { method: "DELETE" }).catch((e) => {
      if (!(e instanceof DriveHttpError && e.status === 404)) throw e;
    });
  if (row.pdfFileId) await del(row.pdfFileId);
  await del(row.fileId);
}
