/**
 * Saves and loads the user's business profile (the invoice's "From" details)
 * in their own Google Drive.
 *
 * The file lives in Drive's hidden app-data folder, which only this app can
 * see; the scope (drive.appdata) grants no access to anything else in the
 * user's Drive. Access comes from Google Identity Services' token client, asked
 * for only when the user clicks a Drive button, so it works for email/password
 * accounts too and never widens what Google sign-in asks for.
 */

export const GOOGLE_CLIENT_ID = (import.meta.env.VITE_GOOGLE_CLIENT_ID ?? "") as string;
export const isDriveConfigured = GOOGLE_CLIENT_ID.endsWith(".apps.googleusercontent.com");

const SCOPE = "https://www.googleapis.com/auth/drive.appdata";
const FILE_NAME = "invoicecraft-business-profile.json";
const API = "https://www.googleapis.com/drive/v3/files";
const UPLOAD = "https://www.googleapis.com/upload/drive/v3/files";

export type BusinessProfile = {
  senderName: string;
  senderEmail: string;
  senderAddress: string;
  logo: string | null;
};

type TokenResponse = { access_token?: string; expires_in?: number; error?: string };
type TokenClient = { requestAccessToken: (o?: { prompt?: string }) => void };

declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            callback: (r: TokenResponse) => void;
            error_callback?: (e: { type: string }) => void;
          }) => TokenClient;
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

// Access tokens last an hour; reuse one until shortly before it expires.
let cached: { token: string; expiresAt: number } | null = null;

/**
 * An access token for the app-data folder. The first call in a session opens
 * Google's consent popup, so call it straight from a click handler.
 */
async function getToken(): Promise<string> {
  if (cached && cached.expiresAt - 60_000 > Date.now()) return cached.token;
  await loadGis();
  return new Promise<string>((resolve, reject) => {
    const client = window.google!.accounts.oauth2.initTokenClient({
      client_id: GOOGLE_CLIENT_ID,
      scope: SCOPE,
      callback: (r) => {
        if (!r.access_token) {
          reject(new Error(r.error === "access_denied" ? "Google Drive access wasn't allowed." : "Couldn't connect to Google Drive."));
          return;
        }
        cached = { token: r.access_token, expiresAt: Date.now() + (r.expires_in ?? 3600) * 1000 };
        resolve(r.access_token);
      },
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
    client.requestAccessToken({ prompt: "" });
  });
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
export async function loadProfileFromDrive(): Promise<BusinessProfile | null> {
  const id = await findFileId();
  if (!id) return null;
  const res = await drive(`${API}/${id}?alt=media`);
  const data = (await res.json()) as Partial<BusinessProfile>;
  const str = (v: unknown) => (typeof v === "string" ? v : "");
  // Only an image data URL is accepted back as a logo.
  const logo = typeof data.logo === "string" && /^data:image\//.test(data.logo) ? data.logo : null;
  return {
    senderName: str(data.senderName),
    senderEmail: str(data.senderEmail),
    senderAddress: str(data.senderAddress),
    logo,
  };
}
