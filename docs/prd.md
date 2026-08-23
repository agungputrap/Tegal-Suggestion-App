# PRD — Tegal Suggestion App

> **Product requirements** — the *why* and *what*. Complements `docs/tech-spec.md` (the *how*). Keep to 2 pages; this is a hackathon MVP, not a product backlog.
> Update this file when the product direction changes; log the change in `docs/decisions.md`.

## 1. Problem

Residents and newcomers in Tegal don't have one place to find out:

- Which food stalls / snacks / meals are **open today**
- Which household services (AC cleaning, washing machine repair, house repair) are **available today**

Currently this info is scattered (Word of mouth, status WhatsApp, social media posts) and often stale — a stall listed as "open" may have closed months ago.

## 2. Target users

| Persona | Need |
| ------- | ---- |
| Local resident | Quickly find what's open near me right now — food or a service provider |
| Newcomer to Tegal | Discover the local food scene and find trusted service providers without asking around |
| Small business owner | Get discovered by nearby customers at zero cost; tell them "open today" with one tap |

## 3. Core user flows (MVP)

### Flow A — Browse & contact (buyer)

1. User opens the app → sees a map/list of businesses **open today**
2. Filters by category (food / service) and area (kecamatan)
3. Taps a business → detail page: description, items (menu or price-list), halal flag, location, WhatsApp button
4. Taps "Chat WhatsApp" → WhatsApp opens with a pre-filled message to the owner
   - No in-app chat, payment, or ordering. WhatsApp handles it all.

### Flow B — Register (business owner)

1. Owner fills registration form: name, category, description, WhatsApp number, location (pin on map), photo, items
2. System shows a 6-digit verify code → owner sends it to admin via WhatsApp
3. Admin approves → business goes live (visible on map when opened)

### Flow C — Open today (business owner)

1. Owner opens their portal link (`/kelola/{token}` — no password, magic link)
2. Taps **Buka** (open), selects which items are available today, adds an optional note
3. Business now appears on the public map under "open today"
4. Owner taps **Tutup** (close) when done — business disappears from the map

## 4. Acceptance criteria

### Flow A
- [ ] Map/list shows **only** businesses open today (closed ones hidden by default)
- [ ] Filter by category and area works
- [ ] Detail page shows items with prices, halal flag (food), location, WhatsApp CTA
- [ ] WhatsApp button opens `wa.me` with correct pre-filled message (number format validated)

### Flow B
- [ ] Registration validates: WhatsApp number format (E.164 `628...`), required fields, photo, map pin
- [ ] Verify code generated and shown; approval required before business appears
- [ ] Invalid input → friendly error (`{"detail": ...}` shape, shown as toast)

### Flow C
- [ ] Owner portal accessible only with the correct token (invalid token → 401)
- [ ] "Buka" with item selection makes the business appear on the map immediately
- [ ] "Tutup" removes it from the map immediately
- [ ] Public responses never expose the owner token

## 5. Success metrics (demo day)

- Map shows 15–20 seeded businesses (mix of food + service) with several open
- End-to-end demo works: browse → filter → detail → WhatsApp (can be a dummy number)
- Owner portal demo: open a business → see it appear on the map
- All Definition of Done checks pass (see `docs/dev-standards.md`)

## 6. Out of scope (post-hackathon)

- In-app payments, delivery tracking, in-app chat, ratings/reviews
- Photo contribution + moderation, story-card/OG image generation
- Real user accounts/auth, push notifications, multi-language
- Admin dashboard beyond WhatsApp-based approval
