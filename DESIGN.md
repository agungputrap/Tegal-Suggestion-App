# DESIGN.md — Sistem Desain Buka Hari Ini

> **Sumber aturan:** prinsip [Refactoring UI](https://refactoringui.com/) (pemisahan lewat
> latar berlapis + shadow lembut + spacing — border adalah upaya terakhir),
> konvensi [shadcn/ui](https://www.designskills.dev/insights/design-principles-behind-shadcn)
> (netral-first, satu aksen, border 1px samar hanya bila perlu), dan format
> [DESIGN.md](https://builder.aws.com/how-ai-instructions-split-into-three-layers) (token
> mesin-baca + aturan manusia-baca) supaya agen AI punya satu kebenaran visual.
> **Aturan utama: kalau butuh memisahkan dua elemen, pakai (1) perbedaan warna
> latar, (2) shadow lembut, (3) spacing — BUKAN border.**

```yaml
# ---------- TOKEN ----------
colors:
  brand:      "#059669"   # emerald-600 — SATU-SATUNYA aksen. Aksi primer, status aktif, fokus.
  brand-deep: "#047857"   # emerald-700 — hero/permukaan brand.
  live:       "#f59e0b"   # amber-500 — KHUSUS sinyal "hidup/buka" (pulse, streak). Jangan dipakai lain.
  danger:     "#e11d48"   # rose-600 — hanya destruktif.
  surface-page: { light: "#f8fafc", dark: "#020617" }   # slate-50 / slate-950
  surface-card: { light: "#ffffff", dark: "#0f172a" }   # putih / slate-900
  line:         { light: "transparent (pakai shadow)", dark: "#1e293b/60" }
  text:         { light: "#0f172a", dark: "#f1f5f9" }
  text-muted:   { light: "#64748b", dark: "#94a3b8" }  # slate-500 / slate-400
radius:
  card: 12px      # rounded-xl — kartu, panel, dropdown
  control: 8px    # rounded-lg — tombol, input, select
  chip: 9999px    # rounded-full — pill, badge, avatar
  overlay: 16px   # rounded-2xl — modal/sheet saja (permukaan besar)
shadow:
  card: "0 1px 2px rgba(2,6,23,.05), 0 12px 32px -16px rgba(2,6,23,.10)"
  overlay: "0 24px 48px -12px rgba(2,6,23,.25)"
gradient: "DILARANG. Tanpa pengecualian — tidak ada gradient pada banner, hero,
  teks, logo, atau chip. Warna flat. Hero = satu warna brand-deep."
typography:
  font: "Plus Jakarta Sans (sudah ada)"
  display: "text-2xl font-bold tracking-tight"   # judul halaman/hero — BUKAN font-black
  section: "text-sm font-semibold"
  stat: "text-xl font-bold tabular-nums"          # angka KPI
  body: "text-sm"
  caption: "text-xs text-muted"
icon: "FontAwesome hanya di tempat fungsional (status, aksi). Jangan jadi dekorasi chip."
```

## Aturan (membinda semua kontributor & agen)

1. **Kartu tanpa border.** Kartu = permukaan putih (dark: slate-900) + `shadow-card`.
   Mode gelap boleh `ring-1 ring-slate-800/60` supaya permukaan terbaca. Dilarang
   `border border-slate-200` pada kartu — itu penyebab tampilan "lembar stiker".
2. **Tombol tanpa border.** Tiga varian saja: `primary` (solid emerald-600 putih),
   `secondary` (tint: `slate-100` light / `slate-800` dark — tanpa border),
   `danger` (tint rose). Semua `rounded-lg`. Dilarang tombol outline kecuali input.
3. **Pill/chip tanpa border.** Nonaktif = tint netral; aktif = solid emerald-600 putih.
4. **Satu aksen.** Emerald-600 hanya untuk: aksi primer, item aktif, fokus, status
   "buka". Amber-500 hanya sinyal live. Rose hanya destruktif. Dilarang mencampur
   teal/cyan/violet/indigo sebagai warna dekorasi.
5. **Tanpa gradient.** Banner atas = strip netral gelap (`slate-900`). Hero = satu
   warna `emerald-700`. Logo = kotak solid emerald-600. Teks judul tidak bergradasi.
6. **KPI bukan dashboard.** Angka statistik tampil sebagai strip teks dengan
   pemisah tipis (`divide-x`), angka `tabular-nums` — tanpa kartu, tanpa ikon-tile
   pelangi, tanpa latar pastel per-metrik.
7. **Radius konsisten** mengikuti token di atas; jangan mencampur rounded-2xl/3xl
   pada kartu kecil.
8. **Hierarki teks lewat kontras & ukuran** (hitam pekat → slate-500), bukan lewat
   banyak warna. `font-black` dilarang; cukup `font-bold tracking-tight`.
9. **Kontras AA tetap wajib** (4,5:1 teks kecil) di kedua tema — aturan ini tidak
   menggantikan aturan aksesibilitas `docs/dev-standards.md`.
10. **Touch target ≥44px tetap wajib** (tier 0 #34).

Penerapan token hidup: `frontend/src/components/ui.ts` (satu-satunya sumber kelas
bersama). Kalau token di dokumen ini berubah, ubah `ui.ts` di commit yang sama.
