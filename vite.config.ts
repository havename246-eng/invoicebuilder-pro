// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, cloudflare (build-only),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... } }) if needed.
import { readFileSync } from "node:fs";
import { defineConfig, type LovableViteTanstackOptions } from "@lovable.dev/vite-tanstack-config";


// styles.css @imports the site fonts from Google Fonts, InvoicePreview adds the
// chosen invoice font the same way, and export.ts fetches both hosts to inline
// fonts into the PDF/PNG. Without these, every device fell back to its own
// system font — which is why phones and tablets didn't match the design.
const FONT_CSS = "https://fonts.googleapis.com";
const FONT_FILES = "https://fonts.gstatic.com";

/**
 * Reads one key out of a dotenv file.
 *
 * Deliberately hand-rolled rather than using Vite's own `loadEnv`: importing
 * `vite` from this config file makes Node require() an ES module in a cycle
 * (the wrapper's CJS build already requires vite) and the build dies before it
 * starts.
 */
function readEnvFile(file: string, key: string): string | undefined {
  try {
    for (const line of readFileSync(file, "utf8").split("\n")) {
      const match = line.match(/^\s*([\w.]+)\s*=\s*(.*)$/);
      if (match?.[1] === key) return match[2].trim().replace(/^["']|["']$/g, "");
    }
  } catch {
    // No such file — the value may still come from the process environment.
  }
  return undefined;
}

// Firebase Auth's REST endpoints (sign-in, token refresh) and the loader its
// Google popup uses to talk to the auth-domain iframe.
const FIREBASE_APIS = "https://identitytoolkit.googleapis.com https://securetoken.googleapis.com";
const GOOGLE_API_LOADER = "https://apis.google.com";

/**
 * The Firebase auth domain, read at build time: the Google sign-in popup
 * works through a hidden iframe served from it.
 *
 * Falls back to any Firebase-hosted domain when the value isn't in the build
 * environment — a wrong-but-loose policy still blocks arbitrary origins,
 * whereas a missing frame-src would break Google sign-in on a preview deploy
 * that forgot the env var.
 */
function firebaseAuthOrigins(): string {
  const key = "VITE_FIREBASE_AUTH_DOMAIN";
  const domain =
    process.env[key] ??
    readEnvFile(".env.local", key) ??
    readEnvFile(".env.production", key) ??
    readEnvFile(".env", key) ??
    "";
  return /^[\w.-]+$/.test(domain) ? `https://${domain}` : "https://*.firebaseapp.com https://*.web.app";
}

const csp = [
  "default-src 'self'",
  // 'unsafe-inline' is load-bearing, not laziness: TanStack Router hydrates by
  // emitting inline <script> blocks (ScriptOnce / Asset) and @tanstack/react-start
  // has no nonce support, so a strict script-src white-screens the app. Revisit
  // if Start ever threads a nonce through the SSR response.
  `script-src 'self' 'unsafe-inline' ${GOOGLE_API_LOADER}`,
  // Tailwind and Radix both set inline styles at runtime.
  `style-src 'self' 'unsafe-inline' ${FONT_CSS}`,
  // data:/blob: cover the PDF and PNG export paths (jspdf, html-to-image);
  // Google's CDN serves OAuth account avatars.
  "img-src 'self' data: blob: https://lh3.googleusercontent.com",
  `font-src 'self' data: ${FONT_FILES}`,
  `connect-src 'self' ${FIREBASE_APIS} ${FONT_CSS} ${FONT_FILES}`,
  // Firebase's Google sign-in iframe.
  `frame-src ${firebaseAuthOrigins()}`,
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  // Stop the site being framed for clickjacking. Matters most for the login and
  // account pages, where an overlay could harvest a click.
  "frame-ancestors 'self'",
  "upgrade-insecure-requests",
].join("; ");

// The wrapper's published type enumerates only preset/output/cloudflare, but its
// implementation spreads these options straight into nitro() from nitro/vite —
// so routeRules does take effect. Cast past the too-narrow declaration.
const nitro = {
  preset: "cloudflare-module",
  // Security headers. These belong here rather than in vercel.json: this build
  // emits the Vercel Build Output API layout, whose generated
  // .vercel/output/config.json owns the routing, so Nitro route rules are what
  // actually reach the edge.
  routeRules: {
    "/**": {
      headers: {
        // Legacy companion to frame-ancestors, for browsers that predate CSP2.
        "X-Frame-Options": "SAMEORIGIN",
        "Content-Security-Policy": csp,
        // Two years, matching the HSTS preload list's requirement. Only ship
        // includeSubDomains once every subdomain is HTTPS — it locks them all in.
        "Strict-Transport-Security": "max-age=63072000; includeSubDomains",
        // Don't let the browser second-guess declared content types.
        "X-Content-Type-Options": "nosniff",
        // Auth callbacks carry a one-time ?code= in the URL; never send that
        // path to a third-party origin in a Referer header.
        "Referrer-Policy": "strict-origin-when-cross-origin",
        // The app never uses these devices; deny them outright.
        "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=()",
      },
    },
  },
} as unknown as LovableViteTanstackOptions["nitro"];

export default defineConfig({ nitro });
