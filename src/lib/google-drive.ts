/**
 * Syncs a signed-in user's business profile (the invoice's From and Payment
 * details) with their own Google Drive.
 *
 * The file lives in Drive's hidden app-data folder, which only this app can
 * see; the scope (drive.appdata) grants no access to anything else in the
 * user's Drive. The user connects once per device (connectDrive, from a
 * click); after that the server hands out short-lived access tokens from an
 * encrypted grant kept in a cookie on that device (see drive-sync.ts), so
 * syncing needs no further clicks. Profile data goes browser-to-Google only.
 */
import { driveConnectFn, driveDisconnectFn, driveTokenFn } from "./drive-sync";

export const GOOGLE_CLIENT_ID = (import.meta.env.VITE_GOOGLE_CLIENT_ID ?? "") as string;
export const isDriveConfigured = GOOGLE_CLIENT_ID.endsWith(".apps.googleusercontent.com");

const SCOPE = "https://www.googleapis.com/auth/drive.appdata";
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
      scope: SCOPE,
      ux_mode: "popup",
      callback: (r) =>
        r.code
          ? resolve(r.code)
          : reject(new Error(r.error === "access_denied" ? "Google Drive access wasn't allowed." : "Couldn't connect to Google Drive.")),
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
}

/** Stops syncing on this device (other connected devices keep syncing). */
export async function disconnectDrive(): Promise<void> {
  cached = null;
  await driveDisconnectFn();
}

/** Thrown when this device isn't connected (or the grant was revoked). */
export class DriveNotConnectedError extends Error {
  constructor() {
    super("Google Drive isn't connected on this device.");
  }
}

// Access tokens last an hour; reuse one until shortly before it expires.
let cached: { token: string; expiresAt: number } | null = null;

async function getToken(): Promise<string> {
  if (cached && cached.expiresAt - 60_000 > Date.now()) return cached.token;
  const r = await driveTokenFn();
  if (!r.accessToken) throw new DriveNotConnectedError();
  cached = { token: r.accessToken, expiresAt: Date.now() + (r.expiresIn ?? 3600) * 1000 };
  return r.accessToken;
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
    throw new Error(body.error?.message ?? `Google Drive error (${res.status})`);
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
