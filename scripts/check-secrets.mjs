#!/usr/bin/env node
/**
 * Blocks commits that would add a secret. Runs from .githooks/pre-commit on
 * the staged changes; `node scripts/check-secrets.mjs --all` scans every
 * tracked file instead.
 *
 * This repository is public: anything committed is readable by anyone, and
 * stays in git history even after it's deleted. If this blocks you and the
 * match really is safe, adjust ALLOW below rather than skipping the check.
 */
import { execFileSync } from "node:child_process";

const SECRET_PATTERNS = [
  ["private key", /-----BEGIN (?:RSA |EC |DSA |OPENSSH |ENCRYPTED )?PRIVATE KEY-----(?!\\nYOUR_KEY)/],
  ["Google service-account JSON", /"private_key(?:_id)?"\s*:\s*"[^"]{8,}/],
  ["Google OAuth client secret", /GOCSPX-[A-Za-z0-9_-]{20,}/],
  ["OAuth client_secret value", /"client_secret"\s*:\s*"[^"]{8,}/],
  ["Drive token key", /DRIVE_TOKEN_KEY\s*=\s*["']?[A-Za-z0-9+/]{40,}={0,2}/],
  ["Supabase service key", /sb_secret_[A-Za-z0-9_-]{10,}|service_role/],
  ["Cloudflare API token", /CLOUDFLARE_API_TOKEN\s*=\s*\S{20,}/],
  ["AWS access key", /AKIA[0-9A-Z]{16}/],
  ["GitHub token", /gh[pousr]_[A-Za-z0-9]{36,}|github_pat_[A-Za-z0-9_]{40,}/],
  ["Stripe secret key", /sk_live_[A-Za-z0-9]{16,}/],
  ["Slack token", /xox[baprs]-[A-Za-z0-9-]{10,}/],
];

const SECRET_FILES = [
  /(^|\/)\.env(\.local|\.[\w-]+\.local)?$/,
  /\.(pem|key|p12|pfx)$/,
  /firebase-adminsdk.*\.json$/,
  /client_secret.*\.json$/,
  /service-?account.*\.json$/i,
  /supabase-users\.json$/,
];

// Files allowed to contain a pattern on purpose.
const ALLOW = [
  // This scanner's own patterns.
  "scripts/check-secrets.mjs",
  // Placeholders only (YOUR_KEY), documenting the variable names.
  ".env.example",
];

const git = (...args) =>
  execFileSync("git", args, {
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
    stdio: ["ignore", "pipe", "ignore"],
  });
const all = process.argv.includes("--all");

const files = (all
  ? git("ls-files")
  : git("diff", "--cached", "--name-only", "--diff-filter=ACMR")
)
  .split("\n")
  .filter(Boolean);

const problems = [];

for (const file of files) {
  if (SECRET_FILES.some((re) => re.test(file))) {
    problems.push(`${file}: this kind of file holds secrets and must never be committed`);
    continue;
  }
  if (ALLOW.includes(file)) continue;

  let text;
  try {
    // Staged content (what would actually be committed), or the tracked file.
    text = all ? git("show", `HEAD:${file}`) : git("show", `:${file}`);
  } catch {
    continue;
  }
  if (text.includes("\0")) continue; // binary

  text.split("\n").forEach((line, i) => {
    for (const [name, re] of SECRET_PATTERNS) {
      if (re.test(line)) problems.push(`${file}:${i + 1}: looks like a ${name}`);
    }
  });
}

if (problems.length) {
  console.error("\n✋ Commit blocked: possible secrets found\n");
  for (const p of problems) console.error(`  • ${p}`);
  console.error(
    "\nRemove them (keep secrets in .env.local / Cloudflare secrets), unstage with" +
      "\n`git restore --staged <file>`, then commit again.\n",
  );
  process.exit(1);
}
if (all) console.log(`No secrets found in ${files.length} tracked files.`);
