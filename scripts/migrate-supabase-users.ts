/**
 * One-off: copy Supabase Auth users into Firebase Auth, passwords included.
 *
 * 1. In the Supabase dashboard → SQL Editor, run scripts/export-supabase-users.sql
 *    and save the single JSON cell it returns as supabase-users.json (keep this
 *    file private and delete it afterwards — it holds password hashes).
 * 2. Dry run, which only prints what would be imported:
 *      npx tsx --env-file=.env.local scripts/migrate-supabase-users.ts supabase-users.json
 * 3. Import for real:
 *      npx tsx --env-file=.env.local scripts/migrate-supabase-users.ts supabase-users.json --apply
 *
 * Needs FIREBASE_PROJECT_ID (or VITE_FIREBASE_PROJECT_ID), FIREBASE_CLIENT_EMAIL
 * and FIREBASE_PRIVATE_KEY in the environment — the same service account the
 * server uses.
 *
 * Every user keeps their Supabase id as their Firebase uid. Supabase stores
 * bcrypt hashes, which Firebase imports as-is, so existing passwords keep
 * working. Google accounts are linked by their Google id, so "Continue with
 * Google" lands in the same account. Safe to re-run: users that already exist
 * are reported and skipped.
 */
import { readFileSync } from "node:fs";
import { identityToolkit, type ServiceAccount } from "../src/lib/firebase/rest";

type SupabaseUser = {
  id: string;
  email: string | null;
  encrypted_password: string | null;
  email_confirmed_at: string | null;
  created_at: string | null;
  last_sign_in_at: string | null;
  raw_user_meta_data: Record<string, unknown> | null;
  identities:
    | {
        provider: string;
        provider_id: string;
        identity_data: Record<string, unknown> | null;
      }[]
    | null;
};

const [file, flag] = process.argv.slice(2);
const apply = flag === "--apply";
if (!file) {
  console.error("Usage: migrate-supabase-users.ts <supabase-users.json> [--apply]");
  process.exit(1);
}

const projectId = process.env.FIREBASE_PROJECT_ID ?? process.env.VITE_FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY;
if (!projectId || !clientEmail || !privateKey) {
  console.error("Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY.");
  process.exit(1);
}
const sa: ServiceAccount = { projectId, clientEmail, privateKey };

// The SQL editor may hand back the json_agg cell wrapped in an array/object.
let raw: unknown = JSON.parse(readFileSync(file, "utf8"));
while (!Array.isArray(raw) || (raw.length === 1 && !("id" in (raw[0] as object)))) {
  if (Array.isArray(raw)) raw = raw[0];
  else if (raw && typeof raw === "object") raw = Object.values(raw)[0];
  else break;
}
const users = (raw ?? []) as SupabaseUser[];

const str = (v: unknown) => (typeof v === "string" && v ? v : undefined);
const ms = (iso: string | null) => (iso ? String(Date.parse(iso)) : undefined);

const records = users
  .filter((u) => u.email)
  .map((u) => {
    const meta = u.raw_user_meta_data ?? {};
    const google = u.identities?.find((i) => i.provider === "google");
    const gdata = google?.identity_data ?? {};
    const displayName = str(meta.full_name) ?? str(meta.name) ?? str(gdata.full_name) ?? str(gdata.name);
    const photoUrl = str(meta.avatar_url) ?? str(meta.picture) ?? str(gdata.avatar_url);
    const hash = u.encrypted_password?.startsWith("$2") ? u.encrypted_password : undefined;

    return {
      localId: u.id,
      email: u.email!.toLowerCase(),
      emailVerified: Boolean(u.email_confirmed_at),
      displayName,
      photoUrl,
      createdAt: ms(u.created_at),
      lastLoginAt: ms(u.last_sign_in_at),
      // BCRYPT import takes the whole "$2a$10$…" string, base64-encoded.
      passwordHash: hash ? Buffer.from(hash).toString("base64") : undefined,
      providerUserInfo: google
        ? [
            {
              providerId: "google.com",
              rawId: google.provider_id,
              email: u.email!.toLowerCase(),
              displayName,
              photoUrl,
            },
          ]
        : undefined,
    };
  });

const withPassword = records.filter((r) => r.passwordHash).length;
const withGoogle = records.filter((r) => r.providerUserInfo).length;
console.log(
  `${users.length} Supabase users → ${records.length} to import ` +
    `(${withPassword} with a password, ${withGoogle} linked to Google, ` +
    `${records.filter((r) => !r.emailVerified).length} with an unconfirmed email).`,
);
const skipped = users.length - records.length;
if (skipped) console.log(`${skipped} skipped: no email address.`);

if (!apply) {
  console.log("Dry run — nothing imported. Re-run with --apply to import.");
  process.exit(0);
}

let imported = 0;
for (let i = 0; i < records.length; i += 1000) {
  const batch = records.slice(i, i + 1000);
  const res = await identityToolkit<{ error?: { index: number; message: string }[] }>(
    sa,
    "accounts:batchCreate",
    { hashAlgorithm: "BCRYPT", users: batch },
  );
  const failed = res.error ?? [];
  for (const e of failed) console.warn(`  ✗ ${batch[e.index]?.email}: ${e.message}`);
  imported += batch.length - failed.length;
}
console.log(`Imported ${imported} of ${records.length} users.`);
