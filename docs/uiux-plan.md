# Rencana UI/UX — Dari Dashboard Analitik ke Mesin Konversi "Buka Hari Ini"

> **Status:** Rencana untuk dieksekusi bertahap (PR = jalur review tim).
> **Tanggal:** 2026-09-29 · **Author:** Gan Fitran
> **Dasar:** riset 3 jalur — (1) audit forensik UI dari kode (semua view, komponen, state), (2) best-practice kategori dengan teardown GoFood/Google Maps/Mamikos/GBP/Yelp, (3) realitas mobile-web Indonesia tier-2 (Ookla, CWV, CSA Research, web.dev case studies). Sumber lengkap di bagian 7.
> **Bacaan terkait:** `docs/strategy.md` (arah produk), `docs/prd.md`.

---

## 0. Verdict

Produk ini punya **mesin kesetiaan yang benar** (check-in freshness, klaim listing, bot WhatsApp) tapi **kulitnya masih dashboard analitik**: halaman depan memuat data F&B basi dengan KPI band bergaya admin, sementara produk inti ("yang buka sekarang") tersembunyi satu tombol ikon dari landing page, dan **PlaceModal — halaman detail utama direktori — tidak punya tombol WhatsApp sama sekali**. Riset menempatkan masalahnya dengan angka:

- **53% pengunjung mobile kabur kalau load >3 detik** (Google/SOASTA); bottom-decile jaringan Indonesia hanya **5,7 Mbps** — dataset 1,5MB kita sendiri makan ~2-3 detik dari budget **LCP 2,5 detik**.
- **~7% konversi hilang per field form tambahan** (analisis HubSpot); form registrasi kita 7 field + kondisional; GoFood membuktikan onboarding UMKM "aktif 5 menit" bisa dilakukan.
- **Click-to-WhatsApp adalah format konversi tertinggi Meta** dan WA menjangkau ~90% pengguna internet Indonesia — tapi jalur direktori (PlaceModal) berujung di `tel:` dan Google Maps.
- **76% konsumen mencari lokal mengunjungi bisnis dalam 24 jam** (Think with Google) — nilai "buka sekarang" nyata, tapi badge kita bahkan salah untuk jam buka pecah (bug `isOpenNow`).

Rencana ini menata ulang UI di sekitar empat pekerjaan utama: **percaya (freshness terverifikasi), konversi (WA satu tap), ikut (klaim tanpa gesekan), kembali (habit loop)**.

## 1. Temuan audit — terurut keparahan

### P1 — Menggerus inti produk

| # | Temuan | Bukti |
|---|--------|-------|
| 1 | **Landing page = direktori basi; produk inti tersembunyi.** Feed live "Hari Ini" hanya lewat tombol ikon di header; konsumen dari peta butuh 5 tap sampai WhatsApp. PlaceModal tidak bisa di-share/deep-link (state bukan URL; tombol back browser keluar dari app). | `ExplorerApp.tsx:491-498` (ikon <lg), `ExplorerApp.tsx:146-157` |
| 2 | **PlaceModal tanpa CTA WhatsApp** — padahal banner app menjanjikan "order via WhatsApp". Direktori berujung `tel:`/GMaps. | `PlaceModal.tsx:389-449` |
| 3 | **Badge "buka sekarang" bisa salah** untuk jam buka pecah — `isOpenNow` hanya baca rentang pertama (warung tutup siang buka sore tampil "tutup"); jam memakai timezone browser bukan WIB. Satu pengalaman "dipalak badge" merusak kepercayaan freshness. | `helpers.ts:40-45, 66` |
| 4 | **Bot WhatsApp tak terlihat di UI mana pun** — `BOT_NUMBER` didokumentasikan "untuk UI" tapi nol referensi di frontend. Retensi fase 1 tak berjalan kalau owner tak tahu botnya ada. | grep `frontend/src` = 0 hit |
| 5 | **Nol meta/OG/favicon/PWA** — `public/` kosong, `index.html` tanpa description/OG: link yang di-share ke grup WhatsApp (channel utama!) tampil polos tanpa preview. SEO = nol (SPA + data 1,5MB client-side). | `index.html:2-6` |

### P2 — Gesekan & trust

| # | Temuan | Bukti |
|---|--------|-------|
| 6 | **Dataset 1,5MB di critical path** + filter memanggil `JSON.stringify` per place per keystroke; KPI band tampil nol saat loading; spinner, bukan skeleton ( Studi CHI'18: skeleton terasa lebih cepat, tepat di mobile/3s+). | `api.ts:216-223`, `ExplorerApp.tsx:164-221` |
| 7 | **Form registrasi 7 field + kondisional**, satu baris error tanpa validasi per-field; placeholder merujuk **Lowokwaru (kota Malang!)** di app Tegal. | `ProviderPage.tsx:343-476, 462` |
| 8 | **Klaim = full page reload** (raw `<a href>`), pending-state tanpa nomor admin yang jelas (WA share tanpa penerima), admin tolak tanpa alasan, tidak ada notifikasi "disetujui". | `PlaceModal.tsx:378-384`, `ProviderPage.tsx:277-286` |
| 9 | **Favorites tak terjangkau di mobile** (hanya nav desktop); owner tak punya jalan balik ke `/kelola` setelah approved; OwnerPortal tak ada link kembali ke app. | `ExplorerApp.tsx:348-352`, `OwnerPortalPage.tsx:136-138` |
| 10 | **Touch target di bawah standar** (WCAG 2.5.8 min 24px, de-facto 44px): pills 24px, tab mobile 28px, tombol konfirmasi kartu 27px, search-clear 16px. | `ui.ts:21`, `ExplorerApp.tsx:577`, `ListingCard.tsx:149` |

### P3 — Konsistensi & aksesibilitas

- **A11y**: pola `div onClick` tanpa role/keyboard di semua kartu (ListingCard, Grid/TableView, Favorites, Analytics); tidak ada `focus-visible` di mana pun; modal tanpa focus-trap/`role="dialog"`; dua `h1`; hierarki heading bolong (h2→h4); label form hilang di search & semua `<select>` Explorer; teks 10-11px `slate-400/500` di atas putih/foto.
- **Design system menyimpang**: Explorer & Modal melewati `ui.ts` (kartu ditulis manual di 6+ tempat); dua bahasa pill aktif (`qf-btn` vs `pillClass`); 4 font dimuat, 2 tak terpakai (Archivo Black, JetBrains Mono); tile peta selalu terang saat dark mode; `ERROR_LINE` tanpa dark variant; overscroll body masih krem di dark mode.
- **Map UX**: `fitBounds` menarik viewport tiap filter berubah; tiga tinggi peta berbeda (550/440/360); legend floating menutup peta 360px; control bar 7 tombol wrap 3 baris di layar kecil.
- **Salinan**: campur EN ("Grid View", "Dashboard & Statistik", "Total Provider"), formal "Anda" vs santai "kamu", error copy menghadap developer ("Pastikan API berjalan di `GET /places`"), `confirm()`/`alert()` native ber-tombol OK/Cancel Inggris.

## 2. Prinsip desain (dari riset realitas)

1. **Budget performa = LCP ≤2,5s · INP ≤200ms · CLS ≤0,1 (p75)**; dataset 1,5MB tidak boleh di critical path; bottom-decile jaringan 5,7Mbps adalah pengguna nyata.
2. **Perangkat lantai ~Rp1,6jt / 4GB RAM / Android**: `preferCanvas` + clustering di semua peta; Leaflet (42KB) tetap, jangan Google Maps embed (~200KB).
3. **WhatsApp adalah CTA, bukan fitur**: satu tombol hijau primer per kartu dengan prefill Indonesia singkat; fallback copy-nomor di desktop.
4. **Bahasa Indonesia santai (gaya Gojek, "kamu"/tanpa pronomina), format Rp 15.000 / DD-MM-YYYY**; 76% konsumen lebih percaya informasi bahasa sendiri (CSA Research).
5. **Freshness itu timestamp, bukan badge**: "Buka · dikonfirmasi 12 mnt lalu" (pola Waze); data basi memudar visual.
6. **Dark mode auto-detect + toggle**, tile peta gelap ikut; kontras AA (4,5:1) kedua tema.
7. **Empty state wajib punya pintu keluar** (NN/g: status → ajarkan → tunjukkan jalan); skeleton menggantikan spinner.
8. **Form: maks 3 field sebelum nilai terlihat**; sisanya progressive profiling; `inputmode="tel"`, nomor WA = identitas.

## 3. Rencana eksekusi

### Tier 0 — Quick wins (±1 minggu, tidak mengubah struktur)

| Item | Detail |
|------|--------|
| **Meta + share preview** | `index.html`: meta description (ID), Open Graph + image (og: "X usaha buka sekarang di Tegal"), favicon, `manifest.json` dasar; canonical per-route later (Tier 2). |
| **WA CTA di PlaceModal** | Tombol hijau primer `wa.me` + prefill ("Halo [nama], saya lihat usaha Anda di Buka Hari Ini Tegal. Masih buka?") — prefill yang sama sekaligus jadi probe freshness (balasan owner = konfirmasi buka). |
| **Fix `isOpenNow`** | Dukung jam pecah (semua rentang per hari), timezone WIB konsisten dengan backend; tambah unit test. Ini bug trust. |
| **Salinan & konsistensi bahasa** | Ganti placeholder Lowokwaru → kecamatan Tegal; rapikan EN leakage ke ID santai; error copy user-facing ("Koneksi terputus — coba lagi") + tombol **Coba lagi** di semua error state; hapus `alert()`/`confirm()` → modal/toast kecil. |
| **Touch targets ≥44px** | Pills, tab mobile, konfirmasi kartu, search-clear — padding, bukan desain baru. |
| **Dark mode rapikan** | Tile peta gelap (CartoDB dark) saat dark; `ERROR_LINE` dark variant; overscroll body; teks slate-400 → slate-500 di dark. |
| **Favorites & portal reachable** | Tab "Tersimpan" masuk mobile nav; dashboard owner approved dapat tombol "Portal /kelola"; OwnerPortal dapat link kembali. |
| **Modal a11y dasar** | `role="dialog"` + `aria-modal`, fokus awal & restore, fokus terjebak; kartu `div onClick` → `<button>`/`<a>` + `focus-visible:ring`. |
| **Skeleton untuk dataset** | Skeleton kartu direktori menggantikan spinner; KPI band jangan tampil nol sebelum data. |

### Tier 1 — Mesin konversi (±2 minggu, restrukturisasi ringan)

| Item | Detail |
|------|--------|
| **Landing ulang: hero pencarian + hitungan live** | "Cari makanan & jasa buka sekarang di Tegal" + search box di atas fold + "X usaha · Y buka sekarang" (live count = janji freshness). Feed "Hari Ini" dan peta jadi bagian landing, bukan tab tersembunyi. Direktori analitik turun jadi bagian bawah/tab sekunder. |
| **Freshness timestamp di semua status** | "Buka · check-in 12 mnt lalu" + konfirmasi publik ("3 orang konfirmasi"); status tanpa konfirmasi >4 jam memudar. Data: `checkins.created_at` + `confirm_opens` sudah ada. |
| **Form registrasi 3 field** | Layar 1: nama + nomor WA (`inputmode="tel"`) + kategori → daftar masuk status "pending verification" yang sudah terlihat hidup; layar 2 (opsional, setelah live): foto, jam, area, deskripsi. Foto toko diprompt sekali (riset: foto = +42% interaksi). |
| **Pending & approval terasa hidup** | Pending screen: nomor admin tegas + tombol WA ke admin + "listingmu sudah terlihat sebagai menunggu verifikasi"; status berubah otomatis (polling ringan) saat approved — tanpa perlu re-visit. |
| **Klaim tanpa reload** | Tombol klaim → SPA navigation (bukan `<a href>` full reload); success state jelas; error 409 "sudah diklaim" dimanusiakan ("Sudah ada pemiliknya — hubungi kami kalau itu kamu"). |
| **Bot terlihat** | Semua permukaan owner (portal, dashboard, pending) menampilkan nomor bot + perintah ("Balas BUKA di WhatsApp"); konsumen melihat "cari lewat WhatsApp" di footer/hero. |
| **Navigasi bawah mobile** | Bottom nav 3-4 item (Jelajah · Peta · Tersimpan · Saya) — one-handed reach; `env(safe-area-inset-bottom)`. |

### Tier 2 — Struktur & performa (±3 minggu)

| Item | Detail |
|------|--------|
| **Dataset off critical path** | Endpoint ringkasan ringan (id/nama/kategori/koordinat/status) untuk render pertama; dataset penuh lazy + service-worker cache. Hapus `JSON.stringify` per keystroke (precompute field pencarian sekali). |
| **PWA offline-first** | Service worker: cache shell + dataset + tile (stale-while-revalidate); menghidupkan app di jaringan 5,7Mbps / offline. A2HS banner custom tertunda (bukan fitur launch — riset: install rate kecil, SW adalah nilainya). |
| **Map stack standar 2025** | `preferCanvas` + clustering semua peta; bottom-sheet place card (peek/expand) menggantikan PlaceModal di mobile; my-location FAB; hentikan `fitBounds` otomatis saat user sudah interaksi; satu tinggi peta konsisten; legend jadi chip collapse. |
| **Deep-link semua halaman** | PlaceModal → URL `/place/:id` (shareable ke grup WA dengan OG preview per place via prerender ringan); favorit tersinkron (localStorage + hash) — memperluas permukaan share. |
| **A11y sweep penuh** | Semantics (satu h1/view, heading ladder), semua interactive = button/a, `aria-live` untuk status async, kontras AA audit, test keyboard-only jalur utama. |
| **Consolidate design system** | Semua kartu/tombol/pill lewat `ui.ts` (hapus duplikat), hapus 2 font tak terpakai, satu bahasa pill. |

### Tier 3 — Habit & polish (pasca-semua di atas)

- **Streak sebagai badge publik** di kartu ("🔥 14 hari beruntun") — trust signal yang tidak bisa dipalsukan kompetitor.
- **Ping WhatsApp di jam kebiasaan owner** (personalisasi jam dari histori check-in — bukti Duolingo: timing personal > broadcast).
- **Digest pagi konsumen via bot**: "3 jasa & 5 warung buka sekarang di dekatmu" (opt-in).
- **Add-to-home-screen** custom banner (engagement-gated, tunda sampai SW matang).

### Yang TIDAK perlu dikerjakan (anti-rekomendasi)

- **Taksonomi badge (verified/premium/featured)** — literatur trust-seal: efek modest, yang menyelesaikan masalah unknown-seller adalah timestamp + foto asli + kecepatan balas WA.
- **Google Maps embed** — regresi performa (~200KB JS); Leaflet sudah benar.
- **Instalasi PWA sebagai target metrik** — angka install tak dipublikasikan industri dan diduga kecil; nilainya di service worker.
- **Fitur baru sebelum Tier 0-1** — audit menunjukkan justru permukaan existing yang bocor konversi.

## 4. Ukuran berhasil

| Metrik | Baseline sekarang | Target |
|--------|-------------------|--------|
| LCP p75 (emulasi Moto G4/fast 3G) | belum diukur (est >4s) | ≤2,5s |
| Tap: landing → chat WhatsApp (jalur live) | 5 tap / tersembunyi | ≤2 tap dari landing |
| Form registrasi: field sebelum submit | 7+1 | 3 |
| Klaim: langkah sampai "pending terlihat" | reload + form panjang | ≤3 langkah, live state |
| Aksesibilitas | div onClick luas, tanpa focus-visible | jalur utama lolos keyboard-only + AA |
| Ping→BUKA (retensi owner, dari fase 1) | belum terukur | ≥50% di minggu ke-2 |

## 5. Kaitan dengan strategi

Semua tier melayani `docs/strategy.md`: **percaya** (timestamp + konfirmasi + foto = panel liveness terlihat), **konversi** (WA satu tap = sisi demand), **ikut** (klaim 3 field = mesin suplai), **kembali** (streak + ping personal = habit loop). Tidak ada item UI yang berdiri sendiri dari moat.

## 6. Estimasi

| Tier | Isi | Estimasi |
|------|-----|----------|
| 0 | Quick wins (11 item) | ±1 minggu |
| 1 | Hero ulang, form 3 field, freshness, klaim SPA, bot visible, bottom nav | ±2 minggu |
| 2 | Dataset off critical path, PWA, map stack, deep-link, a11y sweep | ±3 minggu |
| 3 | Habit & polish | berkelanjutan |

## 7. Sumber utama

- **Audit kode**: seluruh view/komponen frontend (rincian path+baris di bagian 1; laporan penuh di sesi riset 2026-09-29).
- **Performa & realitas**: Ookla Indonesia 1H2025 (median 30,5 Mbps; p10 5,69 Mbps); web.dev Core Web Vitals; Google/SOASTA 53%-abandon & Deloitte "Milliseconds Make Millions" (+8,4%/0,1s); Web Almanac 2024 page weight; web.dev OLX Indonesia PWA (+250% re-engagement) & Twitter Lite; Leaflet vs Google Maps JS (42KB vs ~200KB); panduan `preferCanvas`/clustering.
- **Konversi & trust**: Think with Google micro-moments (76%/28%); click-to-WhatsApp playbooks (ChatMaxima/Sova/Vybinex); WhatsApp click-to-chat FAQ; BrightLocal & statistik foto GBP (+42%/35%); Waze last-updated pattern; Google Business Profile verification docs; GoFood instant onboarding (Jakarta Post 2025); HubSpot/Brixon field-count (−7%/field); Baymard `inputmode`; studi skeleton CHI'18; NN/g empty states.
- **Bahasa & a11y**: CSA Research "Can't Read, Won't Buy" (76%/60%); BPS/OGP disabilitas ~9%; WCAG 2.2 (2.5.8 ≥24px, 1.4.3 AA 4,5:1); survei dark mode Android ~82%; tone-of-voice Gojek/tiket.com (bahasa santai).
