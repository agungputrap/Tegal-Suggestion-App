# Design System — Tegal Suggestion App

> **Status:** Draft — frontend visual language. Complement `docs/prd.md` (the *why*) and `docs/tech-spec.md` (the *how*).
> Read this before building any page or component. Change it when the look-and-feel direction changes; flag in `docs/decisions.md` if it affects the other side.
>
> **Base style:** Airbnb (warm, photography-led marketplace) — adapted for a local food + household-services map. Single accent, soft rounded shapes, photo-first cards, and floating status badges.

---

## 1. Direction

The app is a **local discovery marketplace**: a map/list of food stalls and household services that are *open today*, browsed by photo, filtered by category and area, with WhatsApp as the single call-to-action.

That maps almost 1:1 to Airbnb's design language:

| Airbnb pattern | Our app |
| -------------- | ------- |
| Map + list search results | Home map + business list |
| Category strip chips | Food / Service filter |
| Pill search bar with location segments | Area (kecamatan) filter |
| Floating "Guest favorite" badge | "Buka hari ini" / "Halal" badges |
| Single accent CTA | WhatsApp button |
| Photo-first listing card | Business card |

**One deliberate change:** Airbnb's pink (Rausch) is swapped for a **warm ember orange** — appetizing for food, still trustworthy for services, and visually distinct from the reference.

### Design principles

1. **Photo does the heavy lifting.** Cards are photo-first; typography stays modest. Never let type outshout the food/service photo.
2. **One accent, used sparingly.** Orange carries the WhatsApp CTA and the "open today" moment. Everything else is warm neutral.
3. **Soft, friendly geometry.** Rounded corners everywhere interactive. No hard corners except the map itself.
4. **Status is a badge, not a color wash.** "Buka / Tutup / Halal" live as floating pills over the photo — scannable in one glance.
5. **Mobile-first.** The primary flow is a resident on a phone finding what's open right now.

---

## 2. Color tokens

Warm-neutral base with a single ember accent. Dark mode is out of scope for MVP (kept below for future reference).

| Token | Value | Use |
| ----- | ----- | --- |
| `primary` | `#e85d2c` | WhatsApp CTA, active filter, map markers |
| `primary-active` | `#c94a1e` | CTA press state |
| `primary-soft` | `#fbe3d7` | CTA disabled fill, selected chip tint |
| `ink` | `#1f1b16` | Headings, primary text |
| `body` | `#4a4038` | Running body text |
| `muted` | `#8a7a6e` | Secondary text, subtitles, card meta |
| `muted-soft` | `#b0a49a` | Placeholder, disabled text |
| `hairline` | `#ece4dd` | Borders, dividers |
| `hairline-soft` | `#f4eee8` | Lightest dividers |
| `canvas` | `#fffdfb` | Page background (warm white) |
| `surface-soft` | `#f7f2ed` | Filter bar, chips, icon-button fills |
| `surface-card` | `#ffffff` | Card surface |
| `success` | `#1f8a5b` | "Buka hari ini" status |
| `success-soft` | `#d9f2e6` | "Buka" badge background |
| `danger` | `#b33a3a` | "Tutup" status |
| `danger-soft` | `#f7dcdc` | "Tutup" badge background |
| `halal` | `#0f7a5a` | Halal badge |
| `halal-soft` | `#d6efe3` | Halal badge background |
| `scrim` | `#000000` @ 50% | Modal backdrop |

---

## 3. Tailwind v4 setup

Tailwind v4 uses CSS-first configuration. Put these in `frontend/src/index.css` via `@theme` so tokens become real utilities (`bg-primary`, `text-ink`, `rounded-card`, etc.).

```css
@import 'tailwindcss';

@theme {
  /* colors */
  --color-primary: #e85d2c;
  --color-primary-active: #c94a1e;
  --color-primary-soft: #fbe3d7;
  --color-ink: #1f1b16;
  --color-body: #4a4038;
  --color-muted: #8a7a6e;
  --color-muted-soft: #b0a49a;
  --color-hairline: #ece4dd;
  --color-hairline-soft: #f4eee8;
  --color-canvas: #fffdfb;
  --color-surface-soft: #f7f2ed;
  --color-surface-card: #ffffff;
  --color-success: #1f8a5b;
  --color-success-soft: #d9f2e6;
  --color-danger: #b33a3a;
  --color-danger-soft: #f7dcdc;
  --color-halal: #0f7a5a;
  --color-halal-soft: #d6efe3;

  /* radius */
  --radius-sm: 8px;
  --radius-card: 14px;
  --radius-lg: 20px;
  --radius-pill: 9999px;

  /* font */
  --font-sans: 'Plus Jakarta Sans', system-ui, -apple-system, 'Segoe UI', sans-serif;

  /* shadow */
  --shadow-card: 0 1px 2px rgba(31, 27, 22, 0.04), 0 4px 12px rgba(31, 27, 22, 0.06);
  --shadow-float: 0 2px 8px rgba(31, 27, 22, 0.12);
}
```

> **Font note:** Airbnb's Cereal is proprietary. Use **Plus Jakarta Sans** (open, warm, geometric) as the primary face, with the system stack as fallback. Inter is acceptable if Plus Jakarta Sans isn't bundled.

---

## 4. Typography

One family, modest weights. Headings are sentence-case, never all-caps.

| Token | Size / Weight / Line-height | Use |
| ----- | --------------------------- | --- |
| `display` | 24px / 700 / 1.25 | Page titles ("Buka hari ini di Tegal") |
| `title` | 18px / 600 / 1.3 | Business name on card/detail |
| `subtitle` | 16px / 600 / 1.3 | Section heads |
| `body` | 16px / 400 / 1.5 | Default text, descriptions |
| `body-sm` | 14px / 400 / 1.4 | Card meta, prices, distance |
| `caption` | 12px / 500 / 1.3 | Badge labels, fine print |
| `button` | 16px / 600 / 1.25 | CTA labels |

### Rules

- Keep display at 24px — the photo and map carry visual weight, not the headline.
- Price uses `title` weight (600); don't inflate it to display size.
- Badge labels are 12px/500 — small, uppercase-free, scannable.
- No letter-spacing flourishes. Default tracking only.

---

## 5. Spacing & radius

### Spacing

Base unit **4px**. Use Tailwind's default scale:

- **Card internal padding:** `p-4` (16px) for business cards; `p-5`/`p-6` for detail sections.
- **Grid gutters:** `gap-4` (16px) between cards.
- **Section rhythm:** `space-y-6` (24px) between page bands; `space-y-4` inside a card.
- **Filter bar:** `p-2` with `gap-2` between chips.

### Radius

| Token | Value | Use |
| ----- | ----- | --- |
| `rounded-sm` | 8px | Buttons, inputs, chips |
| `rounded-card` | 14px | Business card, detail card, photo plate |
| `rounded-lg` | 20px | Larger surfaces, bottom sheets |
| `rounded-pill` | 9999px | Status badges, filter chips, circular icon buttons |

### Elevation

Flat is the default. Two shadow tiers total:

- **Card** (`shadow-card`) — business cards at rest and the floating filter bar.
- **Float** (`shadow-float`) — map controls, the sticky WhatsApp bottom bar.

No heavy layered shadows. Depth comes from the photo, warm-white surface separation, and rounded clipping.

---

## 6. Components

### 6.1 Business card (photo-first)

The core unit of the browse flow. Photo on top, meta below.

```
┌─────────────────────────┐
│  [photo 4:3]            │
│  ⬜ Halal     ❤ save    │
├─────────────────────────┤
│  Business name  ·  1.2km│
│  subcategory · area     │
│  [Buka hari ini]  Rp …  │
└─────────────────────────┘
```

- **Photo plate:** aspect 4:3 (landscape food/service shots), `rounded-card`, object-cover.
- **Badges:** float top-left over the photo — "Halal" (food only) and "Buka hari ini" / "Tutup". White pill with `shadow-float`.
- **Title:** `title` weight 600, ink.
- **Meta:** `body-sm` muted — subcategory · area · distance.
- **Price hint:** optional, right-aligned in `body-sm` (muted), showing the lowest item price.
- **Open state:** closed businesses are hidden by default; when shown (e.g. search), they render muted with a "Tutup" badge and reduced photo saturation.

### 6.2 Status badges

| Badge | Background | Text | Icon |
| ----- | ---------- | ---- | ---- |
| Buka hari ini | `success-soft` | `success` | dot |
| Tutup | `danger-soft` | `danger` | dot |
| Halal | `halal-soft` | `halal` | none (text-only) |

All are `rounded-pill`, `px-2 py-0.5`, `caption` (12px/500). Uppercase-free.

### 6.3 Filter bar

Sticky under the header, above the map.

- **Category chips:** Food / Service — pill chips, `surface-soft` fill, `body-sm`. Active chip = `primary` fill with white text.
- **Area selector:** a second pill chip opening a bottom sheet of kecamatan options.
- Behavior: horizontal scroll on mobile, no wrapping.

### 6.4 Map + list toggle

- **Map:** CARTO light tiles (already in `BusinessMap.tsx`). Markers use `primary`; cluster with `Leaflet.markercluster`.
- **Toggle:** segmented control (Map / List) floating at the top of the map, `shadow-float`, `rounded-sm`.
- **List:** 1-up on mobile, 2-up tablet, 3-up desktop (`grid gap-4`).

### 6.5 WhatsApp CTA

The single conversion action.

- **Primary button:** `primary` fill, white text, `rounded-sm`, `h-12`, full-width in the sticky bottom bar on detail pages.
- **Icon + label:** WhatsApp glyph + "Chat WhatsApp".
- **Sticky bottom bar** (detail page): white surface, `shadow-float`, hairline top border, holds the CTA only.
- Link built via `buildWhatsAppLink()` in `src/lib/whatsapp.ts` (already implemented).

### 6.6 Detail page

Two-column on desktop, single scroll on mobile.

- **Left (~64%):** photo banner → name + badges → description → items/price list → location.
- **Right (~32%):** sticky card with area, halal flag, "open today" status, and the WhatsApp CTA.
- **Items list:** each row = item name (`body`), note (`body-sm` muted), price right-aligned (`subtitle`). `available` items shown; unavailable ones struck through or dimmed.

### 6.7 Forms (register + owner portal)

- **Inputs:** `surface-soft` fill, `rounded-sm`, `h-12`, hairline border on focus (no glow).
- **Labels:** `body-sm` muted above the field.
- **Primary submit:** same `primary` button style.
- **Owner portal "Buka/Tutup":** large tap targets, `Buka` = `success` fill, `Tutup` = `danger` fill, both `rounded-sm`.

---

## 7. Responsive behavior

| Breakpoint | Behavior |
| ---------- | -------- |
| Mobile (< 640px) | Cards 1-up; filter bar horizontal-scroll; detail collapses to single column with sticky WhatsApp bar; map at ~40vh |
| Tablet (640–1024px) | Cards 2-up; filter bar wraps; detail two-column with sticky rail |
| Desktop (> 1024px) | Cards 3-up; map + list side-by-side or toggled; detail two-column |

Touch targets: primary CTA min 48px tall; filter chips min 44px; map markers are tap-native.

---

## 8. Do's & Don'ts

### Do

- Reserve `primary` for the WhatsApp CTA, active filter, and map markers. One orange moment per viewport.
- Make every card **photo-first**; keep the type quiet underneath.
- Use `rounded-card` on cards/photo plates, `rounded-pill` on badges/chips.
- Render status as a floating badge over the photo, not as a full-card color wash.
- Use the warm-neutral canvas everywhere; let the photo add the color.

### Don't

- Don't introduce a second accent color (no green CTA, no blue links for primary actions).
- Don't use all-caps or heavy 700+ weights for body copy.
- Don't drop a shadow on every surface — flat is default, card/float are the only tiers.
- Don't let closed businesses look identical to open ones — dim the photo and show "Tutup".
- Don't hand-roll new primitives; use shadcn/ui + Tailwind (per `docs/dev-standards.md`).

---

## 9. Current scaffold → target

The existing frontend skeleton (`BusinessCard`, `BusinessMap`, `HomeMap`) uses default gray/red/green Tailwind colors. Bring it in line with these tokens:

| Now | Target |
| --- | ------ |
| `border-gray-200` | `border-hairline` |
| `text-gray-500/700` | `text-muted` / `text-body` |
| `bg-green-100 text-green-700` | `bg-success-soft text-success` |
| `bg-red-100 text-red-700` | `bg-danger-soft text-danger` |
| `rounded-lg` on card | `rounded-card` |
| Default `font-sans` | `--font-sans: Plus Jakarta Sans` |
