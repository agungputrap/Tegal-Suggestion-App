# Proposal: Peta Satu — Opsi C, Peta Berlapis (Layered Hybrid)

> **Status:** Proposal untuk didiskusikan sebelum demo day (menindaklanjuti README "Known gaps" #3).
> **Tanggal:** 2026-09-29 · **Author:** Gan Fitran (riset via 3 jalur: inventory kode, docs PRD/keputusan, riset eksternal data-source)
> **Keputusan yang diminta:** setuju/tidak pada Fase 1–2 untuk demo day; Fase 3–4 sebagai arah pasca-hackathon.

---

## 0. Ringkasan

Satu peta, dua lapisan marker dengan semantik kebaruan (freshness) yang jujur:

| Lapisan | Data | Marker | Artinya |
|---|---|---|---|
| **Direktori** | `places` (63 F&B, scrape Google Maps) | pin teardrop warna kategori (sudah ada) | "terdaftar di direktori" — boleh basi |
| **Buka Hari Ini** | `GET /listings` (check-in realtime, jajanan + jasa) | pin emerald/amber + ring pulsing | "aktif sekarang" — sinyal utama produk |

**Fase 1 (demo day) murni frontend** — `GET /places` dan `GET /listings` sudah publik, dan halaman detail `/provider/<id>` (#19) sudah jadi target navigasi popup. Tidak ada perubahan backend, tidak ada migrasi.

**Jasa TIDAK di-scrape.** Riset eksternal (bagian 6): OSM nyaris kosong untuk Tegal (terukur: 6 POI F&B, 0 POI jasa se-kota), Google Places API valid ToS-nya melarang penyimpanan sebagai direktori sendiri + tampil di non-Google map — scrape yang sudah ada (63 place di D1) sudah melanggar; jangan digandakan. Kesenjangan jasa adalah **masalah operasi data** (onboarding manual 15–20 penyedia, Fase 2), bukan masalah scraping.

---

## 1. Latar belakang (satu paragraf)

README menjanjikan "kuliner + jasa rumah tangga dalam satu aplikasi berbasis peta", dan keputusan terkunci 2026-08-23 berbunyi "two verticals on one map". Realitas hari ini: dua peta terpisah — Explorer (63 place scrape, client-side filter, cluster) dan app inti (check-in realtime, radius 5 km, geolocation) — tanpa satu pun tautan antar-tabel (`places` ↔ `providers`: tidak ada FK, id, atau endpoint yang menyentuh keduanya). Split ini diciptakan sengaja 2026-09-07 (port Explorer demi "demo-day visual impact"); gap #3 menandai bahwa penyatuan butuh keputusan sebelum demo day.

---

## 2. Keputusan yang diusulkan (assumsi yang dikunci proposal ini)

1. **Satu permukaan peta**: tab "Peta Interaktif" di Explorer menjadi peta utama (direktori + live). Halaman "Hari Ini" di app inti **tetap ada** — fungsinya beda ("terdekat dari lokasiku, sekarang", radius 5 km + geolocation) dan sudah bekerja.
2. **Semantik freshness per lapisan, tidak dicampur**: marker direktori ≠ marker live. Legenda wajib menjelaskan dua sumber. Ini menjawab pertanyaan gap #3 ("scrape vs realtime") dengan *keduanya, dipisah visual*.
3. **Jasa hanya muncul sebagai provider live** (hasil Fase 2) — tidak ada scrape jasa.
4. Explorer tetap halaman depan; tab default tetap "Direktori" (dibuka di bawah).

---

## 3. Fase 1 — Demo slice (frontend-only)

### 3.1 Fetch data live di Explorer

`frontend/src/explorer/ExplorerApp.tsx` — tambah state + effect paralel dengan fetch `places` (baris 102–109):

```tsx
const [listings, setListings] = useState<Listing[]>([]);
const [liveStatus, setLiveStatus] = useState<"loading"|"ready"|"error">("loading");

useEffect(() => {
  // radius 20 km: mencakup Kota + Kab. Tegal + Brebes (default endpoint = 5 km,
  // jadi WAJIB kirim radius eksplisit). lat/lng = pusat Tegal, bukan geolocation —
  // Explorer adalah direktori kota, bukan "sekitarku".
  fetchListings({ lat: -6.87, lng: 109.13, radius: 20 })
    .then((d) => { setListings(d); setLiveStatus("ready"); })
    .catch(() => setLiveStatus("error"));
}, []);
```

Gagal load live **tidak fatal** (direktori tetap tampil) — pola yang sama dengan fetch kategori di ConsumerPage.

### 3.2 Filter & legenda

- State baru: `mapType: "semua" | "kuliner" | "jasa"` + `liveOnly: boolean` (khusus tab peta).
- `filteredLive = useMemo(...)`: filter `listings` per `category_type` dan `mapType`/`liveOnly`.
- `mapLegend` (baris 259–285) ditambah seksi terpisah "Buka Hari Ini" — hitungan jajanan/jasa live. Legenda FullMap dirender dua grup: "Direktori (Google Maps)" vs "Buka Hari Ini (live)".
- **Tidak** menyentuh `filteredPlaces` (direktori tetap 63 tempat saat `mapType=jasa` + liveOnly — direktori memang tidak punya jasa).

### 3.3 FullMap: lapisan live

`frontend/src/explorer/FullMap.tsx` — props bertambah `{ liveListings: Listing[]; onOpenProvider: (id: string) => void }`:

1. **Pane terpisah** supaya pin live selalu di atas cluster direktori (pin live jarang, jangan ikut cluster — "buka sekarang" tidak boleh sembunyi di dalam bulatan angka):

```ts
map.createPane("live").style.zIndex = "650"; // default marker pane = 600
const liveLayer = L.layerGroup([], { pane: "live" }).addTo(map);
```

2. **Pin live**: gaya `buildPinIcon` MapView.tsx:22–34 (teardrop emoji 34×34, emerald utk jasa / amber utk jajanan) + ring pulsing CSS (class baru `map-pin--live` di `explorer.css`, keyframes `pulse` Tailwind sudah ada di header Explorer — pola sama). Ekstrak `buildPinIcon` dari `MapView.tsx` ke modul bersama `src/components/mapPins.ts` (impor di kedua peta; bukan duplikasi ketiga).
3. **Popup live** memakai pola delegasi `popupopen` yang sudah ada (baris 105–114): nama, kategori, badge "✓ Buka hari ini", `distance_km`, tombol `data-open-provider="<id>"` → `onOpenProviderRef.current(id)` → navigasi ke `/provider/<id>` (halaman detail penuh hasil #19).
4. **fitBounds** (baris 116–118) memasukkan koordinat live juga — live provider di luar bbox 63 place tidak terpotong.
5. Header copy baris 144–147: "Peta Persebaran Lokasi F&B" → **"Peta Tegal — Direktori & Buka Hari Ini"**, dengan hitungan `(63 tempat · N buka hari ini)`.

### 3.4 Wiring navigasi

`frontend/src/App.tsx` — `openProvider` sudah ada (hasil #19). Tinggal dikirim ke Explorer:

```tsx
<ExplorerApp
  onOpenLegacyApp={() => setView("hari-ini")}
  onOpenAdmin={() => setView("admin")}
  onOpenProvider={openProvider}   // baru
/>
```

`ExplorerApp` meneruskan ke `FullMap`; pushState `/provider/<id>` + back/forward sudah beres di App.

### 3.5 Di luar scope Fase 1 (eksplisit)

- SplitView mini-map di DirectoryTab (tetap F&B-only) — peta kecil hasil filter, bukan "peta satu".
- AnalyticsTab & FavoritesTab (tetap F&B).
- Halaman "Hari Ini" app inti (tidak berubah sama sekali).
- KPI strip hero & footer Explorer (boleh ikut update copy kalau murah, tidak wajib).
- Penggabungan tiga implementasi pin Leaflet menjadi satu (dilakukan sebatas ekstraksi `buildPinIcon`; konsolidasi penuh pasca-hackathon).

### 3.6 Test & validasi

- Ekstraksi fungsi murni agar testable tanpa Leaflet di jsdom: `filterLiveListings(listings, { mapType, liveOnly })` + `buildLivePopupMeta(listing, categoryName)` (nama, badge, distance, href) di modul terpisah; unit test keduanya di `frontend/test/`.
- Regression: test FullMap yang ada tidak ada — cukup pastikan 12 test lama tetap hijau.
- DoD frontend: `typecheck`, `build` (perhatikan: leaflet sudah di chunk terpisah — entry tidak boleh naik), `lint`, `test`.
- Smoke: jalankan backend + seed 1 provider uji (alur register → approve → checkin seperti di runbook), pastikan pin live muncul di tab peta dan popup membuka `/provider/<id>`.

### 3.7 Estimasi

±1–1,5 hari kerja (ekstraksi pin + layer + popup + toggle + legend + test). Tidak ada perubahan kontrak API → tidak ada entry `docs/decisions.md` yang diwajibkan, tapi keputusan "peta berlapis" sendiri layak dicatat di decisions.md saat diterima.

### 3.8 Tabel perubahan file (Fase 1)

| File | Perubahan |
|---|---|
| `src/components/mapPins.ts` (baru) | `buildPinIcon` dipindah dari `MapView.tsx`, + varian `--live` |
| `src/explorer/FullMap.tsx` | props baru, pane "live", layer group, popup provider, fitBounds, header copy |
| `src/explorer/ExplorerApp.tsx` | fetch listings, state `mapType`/`liveOnly`, `filteredLive`, legenda 2 grup, teruskan props |
| `src/explorer/explorer.css` | `.map-pin--live` ring pulse |
| `src/components/MapView.tsx` | impor `buildPinIcon` dari modul bersama (perilaku identik) |
| `src/App.tsx` | 1 baris: `onOpenProvider={openProvider}` |
| `frontend/test/*.test.tsx` | unit test helper murni baru |

---

## 4. Fase 2 — Operasi data jasa (non-kode, paralel)

PRD demo-day target: "15–20 seeded businesses (mix of food + service) with several open". Status: 0 penyedia jasa nyata (gap #2). Tidak ada kode yang menutup ini.

1. **Rekrut nyata dulu** (5–10 cukup untuk demo): servis AC, tukang bangunan, laundry panggilan, tukang ledeng — daftarkan lewat `/register` atau form "Jasa Saya", kirim verify code via WhatsApp ke admin, approve, **check-in hari-H** lewat portal `/kelola/<token>` (ini juga demo Flow C sekaligus).
2. **Sisanya data demo realistis** (sampai 15–20): nomor WhatsApp dummy boleh (PRD: "can be a dummy number") — daftarkan via `curl POST /providers` + approve admin + check-in. Kuantitas dari script, kualitas dari yang nyata.
3. **Check-in di pagi demo day**: cron sudah expire-kan listing kemarin (midnight WIB) — pin live hanya muncul kalau ada check-in hari itu; sediakan 5 menit sebelum demo untuk buka-tutup via portal.

---

## 5. Fase 3 — Pasca-hackathon: claim-and-verify

Pola standar industri (Google Business Profile, Yelp, TripAdvisor): direktori dari data publik → owner klaim → verifikasi → akses kelola. Di app ini verifikasi alami = **OTP WhatsApp** (sudah pola Flow B: verify code 6 digit via admin).

1. **Migrasi 0003**: `ALTER TABLE providers ADD COLUMN place_id TEXT NULL REFERENCES places(id)` (unique, partial). Provider ber-place_id = "claimed" dari direktori; provider biasa tetap berdiri sendiri.
2. **Alur klaim**: `PlaceModal` tombol "Ini usaha saya — klaim" → form registrasi ter-prefill (nama, kategori, foto, koordinat dari place) → verify code → approve admin → provider live dengan `place_id`.
3. **Sisi pembaca**: `GET /places` (atau `GET /places/:id`) ikutkan `claimed_provider_id` + status hari ini → PlaceModal menampilkan "✓ Buka hari ini" + link `/provider/<id>`. Pin direktori yang claimed diberi indikator live kecil.
4. **Anti-hijack**: klaim hanya aktif setelah approve admin (sama seperti alur eksisting) — kompetitor tidak bisa merebut listing.
5. Perubahan kontrak (types.ts, migration, endpoint) → masuk `docs/decisions.md` + review kedua owner.

## 6. Fase 4 — Higiene lisensi

1. **Uji Overture** (CDLA-Permissive, gratis) sebagai fallback bersih: `overturemaps download --bbox=109.08,-6.93,109.22,-6.80 -t places` → hitung coverage Tegal. Kalau layak: sumber direktori v2.
2. **Containerisasi ToS**: data scrape Google Maps hanya untuk demo/internal; tidak ikut dalam peluncuran publik/monetisasi tanpa keputusan lisensi. Catat di decisions.md saat demo.

## 7. Risiko & mitigasi

| Risiko | Mitigasi |
|---|---|
| User mengira pin direktori = buka sekarang | Legenda 2 grup + ring pulsing hanya untuk live + copy header jelas |
| ToS Google (data tersimpan + non-Google map) | Demo-only (Fase 4.2); uji Overture (4.1); tidak scrape jasa |
| Payload ganda di tab peta (~1,5 MB places + listings kecil) | Listings kecil (≤20 row); places sudah di-fetch sekali untuk semua tab |
| Pin live tertutup cluster direktori | Pane zIndex 650 terpisah, live tidak di-cluster |
| Live layer gagal load | `liveStatus` error → direktori tetap penuh + catatan kecil "live tak tersedia" |

## 8. Pertanyaan terbuka (untuk diskusi tim)

1. Setuju demo day berjalan di atas data scrape Google Maps (ToS) dengan Overture sebagai fallback tercatat — atau blok dulu sampai sumber bersih lolos uji?
2. Tab default Explorer setelah Fase 1: tetap "Direktori" (usulan) atau langsung "Peta"?
3. Fase 2: berapa banyak provider demo realistis yang bisa direkrut nyata sebelum demo day (target minimal 5)?

## 9. Ringkasan effort

| Fase | Isi | Estimasi | Kapan |
|---|---|---|---|
| 1 | Peta berlapis, frontend-only | 1–1,5 hari | minggu ini |
| 2 | Onboarding 15–20 provider | 0 kode, ±2 hari kerja tim | paralel |
| 3 | Claim-and-verify (migrasi+API+portal) | ±1 minggu | pasca-hackathon |
| 4 | Uji Overture + catatan lisensi | ½ hari | sebelum peluncuran publik |
