# Design System — InvoiceCraft

Source of truth: [`src/styles.css`](src/styles.css). All tokens are CSS custom properties consumed through Tailwind v4's `@theme inline`, so any component can reach them via utility classes (`bg-primary`, `text-accent-foreground`, `rounded-xl`, etc.).

## Brand palette

A single blue scale is the brand color, plus one warm lime accent reserved for the primary CTA.

| Token | Hex | Typical use |
|---|---|---|
| `--blue-50` | `#EFF7FF` | Lightest tint — subtle panel backgrounds |
| `--blue-100` | `#DBECFE` | `--accent` — light branded fills (badges, icon circles) |
| `--blue-200` | `#BFDFFE` | — |
| `--blue-300` | `#94CBFC` | `--ink-subtext` on dark canvas |
| `--blue-400` | `#61AEF9` | `--ink-border` on dark canvas |
| `--blue-500` | `#3C8DF5` | — |
| `--blue-600` | `#266FEA` | — |
| `--blue-700` | `#1F5BDB` | — |
| `--blue-800` | `#1F49AE` | — |
| `--blue-900` | `#1F4189` | `--primary`, `--ring`, `--accent-foreground` |
| `--blue-950` | `#172854` | `--ink-canvas` — dark nav/hero/footer background |

**Rule of thumb:** blue is the system color (buttons, focus rings, tints, dark canvas). Lime is reserved exclusively for the one primary call-to-action per page — don't reuse it for anything else.

### Lime scale

`--accent-lime` used to be a single hardcoded value. It's now `--lime-500`, backed by a full 11-step scale generated from the original `#E5DB1C` (same hue, stepped lightness/saturation — mirrors the structure of the blue scale above):

| Token | Hex |
|---|---|
| `--lime-50` | `#FFFEE6` |
| `--lime-100` | `#FEFBCD` |
| `--lime-200` | `#FAF6A8` |
| `--lime-300` | `#F6F079` |
| `--lime-400` | `#F0E847` |
| `--lime-500` | `#E5DB1C` — the original accent, unchanged |
| `--lime-600` | `#C6BD10` |
| `--lime-700` | `#A8A00B` |
| `--lime-800` | `#888107` |
| `--lime-900` | `#6B6606` |
| `--lime-950` | `#423F05` |

`--accent-lime` remains as an alias to `--lime-500` for backward compatibility with existing usage (e.g. the Export button). Available as Tailwind utilities: `bg-lime-50` … `bg-lime-950`.

## Semantic tokens

| Token | Value | Notes |
|---|---|---|
| `--background` | `#FAFAF9` | Warm off-white page background |
| `--foreground` | `#1A1916` | Warm near-black text |
| `--surface` | `#FFFFFF` | Card/panel background |
| `--panel` | `#F5F3F0` | Recessed panel background |
| `--primary` / `--primary-foreground` | `blue-900` / white | Primary buttons, active states |
| `--secondary` / `--secondary-foreground` | `#F5F3F0` / `#1A1916` | Neutral warm gray fills |
| `--muted` / `--muted-foreground` | `#F5F3F0` / `#6B6760` | De-emphasized backgrounds/text |
| `--accent` / `--accent-foreground` | `blue-100` / `blue-900` | Light branded fills (e.g. expand/collapse icon circle) |
| `--destructive` / `--success` | `#C0392B` / `#2D7A4F` | Status colors |
| `--border` | `#E8E5E0` | Default hairline border (lighter than `--input`) |
| `--input` | `#D8D4CE` | Legacy/darker border token — prefer `--border` for new fields |
| `--ring` | `blue-900` | Focus ring |

## Typography

- **Body & UI font:** `Rethink Sans` (`--font-sans` / `--font-display`), loaded from Google Fonts. Applied globally via `body { font-family: var(--font-sans) }` — every component inherits it by default.
- **Mono:** `Geist Mono` (`--font-mono`) — used sparingly for code/error output, not in the invoice.
- **Invoice preview:** `.font-invoice` stacks `'Rethink Sans', 'Noto Sans', 'Noto Sans Khmer', system-ui, sans-serif` — Rethink Sans renders Latin glyphs, and the browser automatically falls back to Noto Sans Khmer for Khmer characters it doesn't cover. This keeps the brand font everywhere while preserving bilingual (EN/KM) support.
- **Advanced font override:** users can pick a Google Font (`GOOGLE_FONTS` in [`src/lib/invoice.ts`](src/lib/invoice.ts)) for just the invoice preview. The chosen font's stylesheet is injected on demand (`InvoicePreview.tsx`), and falls back to `'Noto Sans Khmer'` for Khmer glyphs.
- **Headings:** `h1`/`h2` get `font-weight: 700` and tight tracking (`-0.02em`); `h3`–`h6` get `font-weight: 600`. Component-level classes (`font-bold`, `text-base`, …) override these via Tailwind utility specificity when a different weight/size is needed.
- **Eyebrow labels:** `.eyebrow` utility — 11px, uppercase, `0.12em` tracking, `--muted-foreground` color. Used for field labels (`Field` component in `InvoiceForm.tsx`).

## Radius scale

Derived from a single `--radius: 0.5rem` (8px) base:

| Class | Formula | Px |
|---|---|---|
| `rounded-sm` | `radius - 4px` | 4px — text inputs, textareas |
| `rounded-md` | `radius - 2px` | 6px |
| `rounded-lg` | `radius` | 8px |
| `rounded-xl` | `radius + 4px` | 12px — line-item list container |
| `rounded-2xl` | `radius + 8px` | 16px — section cards |
| `rounded-3xl` | `radius + 12px` | 20px |

**Convention:** the bigger the surface, the bigger the radius — form fields are `rounded-sm`, list containers `rounded-xl`, top-level cards `rounded-2xl`.

## Shadows

Neutral, no color tint — kept subtle so the blue palette does the visual work:

```css
--shadow-card: 0 2px 16px rgba(0,0,0,0.06);
--shadow-elegant: 0 2px 16px rgba(0,0,0,0.06);
```

Utility classes: `.shadow-card`, `.shadow-elegant`. Form fields (`Input`, `Textarea`) intentionally have **no shadow** — flat, bordered style only.

## Core components

- **`Input` / `Textarea`** ([`src/components/ui/input.tsx`](src/components/ui/input.tsx), [`textarea.tsx`](src/components/ui/textarea.tsx)): `h-11`, `rounded-sm`, `border-border`, no shadow, `text-base` at every breakpoint (no shrink on desktop).
- **`Label`** ([`label.tsx`](src/components/ui/label.tsx)): explicit `font-sans` (Rethink Sans), `text-sm font-medium`.
- **`Section`** (in [`InvoiceForm.tsx`](src/components/invoice/InvoiceForm.tsx)): the collapsible card pattern used for every form group (Customize, From, Bill to, Invoice details, Line items, Payment, Advanced settings).
  - `rounded-2xl bg-surface shadow-card` container.
  - Header is a full-width `<button>` with an `<h2>` title (`text-base font-bold`) + subtitle, and a trailing chevron inside a `bg-accent` / `text-accent-foreground` circle (`h-8 w-8 rounded-full`) that rotates 180° when open.
  - Content collapses via a CSS `grid-rows-[0fr] → [1fr]` transition (no JS height measurement needed).
  - `defaultOpen` prop lets a section start collapsed (used for "Advanced settings").
- **Line items list:** one bordered container (`rounded-xl border border-border`) with `divide-y divide-border` between rows — not individual colored cards.
- **Switch** ([`switch.tsx`](src/components/ui/switch.tsx)): `bg-primary` when checked, `bg-input` when unchecked.

## Working conventions

- Prefer existing semantic tokens (`bg-accent`, `border-border`, `bg-secondary`) over hardcoding a blue shade — makes future rebranding a one-file change in `styles.css`.
- `--accent` (blue-100) is the go-to "lighter brand tint" for small UI accents like icon circles; `--secondary` (warm gray) is the neutral alternative when a non-branded fill is wanted.
- Don't introduce a second `<h1>` per page — the page-level title (e.g. "Invoice Builder" in `builder.tsx`) owns it; section titles inside the form use `<h2>`.
