# Strategy: From Map App to Tegal's Open-Now Data Network

> **Status:** DIADOPSI sebagai arah produk (PR = jalur review tim).
> **Tanggal:** 2026-09-29 · **Author:** Gan Fitran
> **Dasar:** riset 3 jalur — audit forensik repo, lanskap kompetitif Indonesia, studi kasus moat (sumber lengkap di akhir dokumen).
> **Bacaan terkait:** `docs/prd.md` (apa yang dibangun), `docs/tech-spec.md` (bagaimana), dokumen ini **kenapa & ke mana**.

---

## 0. Verdict satu paragraf

Kode app ini ~8.100 LOC pola komoditas (sebagian port dashboard, mekanik inti diadopsi dari app Malang) — bisa di-clone dalam 5–10 hari kerja, jadi **rebuild kode tidak membeli apa pun**: biaya rebuild = biaya clone = nilai strategis nol. Moat yang benar-benar tersedia untuk tim 1–2 orang di kota tier-2 bukan arsitektur, melainkan **operasi data**: suplai lapangan yang terverifikasi (playbook Zomato/Mamikos) + sinyal freshness yang **terkompoundi jadi histori** ("liveness panel" usaha informal — data yang Google, Overture, dan OSM tidak punya dan tidak akan bangun untuk Tegal), dikumpulkan lewat **WhatsApp-native** (channel dengan penetrasi 89–98%, yang meruntuhkan CAC sisi demand). Strategi: **pivot produk, bukan codebase** — dari "aplikasi peta" menjadi "jaringan data open-now Tegal yang dikumpulkan lewat WhatsApp".

## 1. Temuan 1 — separuh produk bertarung di medan si raksasa

- **F&B discovery = beban mati.** GoFood, GrabFood, dan ShopeeFood **semuanya live di Tegal** (driver, merchant count, ongkir Rp100-an). Dataset 63 tempat scrape adalah pembulatan di samping coverage mereka, bermasalah ToS, dan beku sejak Agustus 2026.
- **Kompetitor sebenarnya bukan app** — WhatsApp Status, story Instagram, grup Facebook "Info Tegal", mulut ke mulut. Penetrasi WA 89–98% (APJII/DataReportal); 88% orang Indonesia mengirim pesan ke bisnis tiap minggu. Produk sudah mengasumsikan WhatsApp (CTA WA di mana-mana) tapi hidup di URL browser yang tidak ada yang mendistribusikan.
- **Retensi adalah kuburan yang terdokumentasi.** Gojek membubarkan divisi jasa rumah (GoFix/GoClean/GoLaundry 2019–20); Grab "Clean & Fix" (Sejasa) berhenti di kota metro; BukuWarung/Lummo membakar ~USD 160 juta membuktikan **meminta warung memakai software berbasis kebiasaan tanpa uang yang melekat tidak retain**; ServisHero, Kaodim, Stoqo mati dengan pola sama: frekuensi rendah, churn suplai, CAC > LTV. **Check-in harian kami adalah habit-ask persis seperti itu** — kewajiban harian tanpa bayaran, tanpa atribusi (owner tidak pernah tahu apakah view menjadi chat; handoff WhatsApp memutus data itu).

## 2. Temuan 2 — celah yang nyata, sempit, dan milik kita

1. **Jasa rumah tangga di tier-2/3 terstruktur tanpa penyaji** — superapp keluar, yang bertahan adalah directory-kontak (cocok dengan desain WhatsApp kami), dan tukang beriklan lewat post Facebook berisi nomor HP.
2. **Data jam-buka Google terbukti rusak di segmen ini** — Google sendiri menampilkan warning "hours may be incorrect"; sensus ekonomi menyebut warung & bengkel rumahan "sering tidak terekam dalam sistem digital". Uji Overture kami: 5.457 POI Tegal, **nol data liveness**. Tidak ada yang tahu teknisi AC Tegal mana yang benar-benar kerja hari ini.
3. **Tidak ada tool di mana pun yang menstrukturkan sinyal "open today"** — ekosistem WA-commerce (Qontak, WATI, Fonnte, Wablas) melakukan broadcast & katalog, bukan agregasi ketersediaan sisi-suplai.
4. **Angka pasar:** Kota Tegal ±32.581 UMKM, Kabupaten ±132.225; Pemkab Tegal sudah pernah membayar startup untuk program UMKM — uang digitalisasi pemerintah actively hunting for wins.

## 3. Temuan 3 — moat yang tersedia (dan yang tidak)

**Tersedia (berurutan):**
1. **Dataset suplai lapangan terverifikasi** — playbook Zomato (scan menu lapangan mengalahkan Justdial horizontal) & Mamikos (verifikasi lapangan mengalahkan grup Facebook) untuk 300–800 usaha Tegal yang Google nyaris tidak mencatat. Kerja kasar = justru defensibel.
2. **Freshness yang terkompoundi jadi histori.** "Buka hari ini" adalah fitur; **historinya moat**. Tabel `checkins` (retained forever, belum dibaca siapa pun) adalah embrio **liveness panel**: streak, skor reliabilitas ("buka 95% pagi saat klaim buka") — dataset yang tidak akan pernah dibangun Google untuk Tegal.
3. **WhatsApp-native distribution** — bukan moat, tapi meruntuhkan CAC demand ke ~nol (tanpa install, link forwardable ke grup), yang membuat cold-start 2 orang survivable.

**Tidak tersedia (dan kenapa):** network-effect lock-in ala OpenTable (butuh aliran transaksi); korpus review UGC (traffic terlalu tipis; Tripadvisor/Yelp pun seed kontennya lewat scrape/kerja manual); SaaS warung (perang Lummo kalah); live busyness (skala Android); antarmuka chat AI itu sendiri (komoditas — Meta AI ada di dalam WhatsApp, Google AI Mode live di Indonesia; yang bernilai adalah **korpus** yang mereka butuhkan — Yelp baru saja lisensikan datanya ke OpenAI).

**Fakta integritas yang harus dibereskan lebih dulu (audit):** `POST /checkins` tanpa autentikasi + `provider_id` publik di setiap respons listing = siapa pun bisa memalsukan status "buka" usaha mana pun dari mana pun; GPS tidak pernah divalidasi terhadap base; foto usaha bisa ditimpa siapa pun. **Satu-satunya pembeda kami saat ini bisa dirusak dalam satu sore.** → Ditutup di Fase 0.

## 4. Arah: pivot produk, bukan codebase

Satu kalimat: **setiap usaha informal di Tegal bisa ditemukan sebagai "open now" lewat satu tap WhatsApp, dan setiap check-in terkompoundi jadi catatan reliabilitas yang tidak dimiliki siapa pun.**

**Keep:** stack Cloudflare, model data `providers`/`checkins`/`items`, peta, portal `/kelola`. **Build:**

### Fase 0 — Integritas sinyal (hari; kode)
- `POST /checkins` wajib `owner_token`; validasi GPS terhadap base + radius; rate-limit tulisan publik; tabel konfirmasi publik ("✓ Masih buka" oleh pelanggan, dedupe per pengunjung/hari); **streak freshness** di listing ("Buka 24 hari beruntun") — bacaan pertama dari data moat.

### Fase 1 — WhatsApp-native (2–4 minggu; kode + ops)
- Bot WhatsApp (API unofficial murah dulu, BSP resmi belakangan) jadi antarmuka utama **dua sisi**:
  - **Owner:** reply "BUKA" ke ping harian = check-in — satu tap di app yang sudah mereka tinggali, menggantikan kewajiban buka portal web.
  - **Pelanggan:** tanya "tukang AC buka sekarang?" → daftar live + tap-to-chat.
- **Kunci retensi: lead yang diteruskan & dihitung.** Pesan bot ke owner memuat "2 orang tanya usaha Anda minggu ini" — mengubah check-in dari pajak perhatian menjadi layanan lead-generation. Ini perbaikan tunggal untuk kuburan retensi (Temuan 1).

### Fase 2 — Densitas (moat sebenarnya; non-kode)
- Satu kecamatan, door-to-door, 100–200 onboarding nyata (DoorDash "do things that don't scale").
- Ukur **fill rate**: % sesi "cari X sekarang" yang menemukan opsi fresh-buka; benchmark marketplace ~60–80% sebelum kota #2.
- Piggyback program pemerintah (Dinas Koperasi, Pemkab, BI) — subsidi distribusi yang tidak bisa dibeli tim 2 orang.

### Fase 3 — Korpus menjadi bisnis (6–12 bulan)
- Panel liveness informal pertama di Indonesia → lisensiable (pola Yelp↔OpenAI), bernilai untuk Google (jam-bukanya salah), pemda, dan pemain AI-local-search berikutnya. Playbook densitas diulang per kota sebagai **pabrik moat**, bukan one-off.

### Kill criteria (ini taruhan, bukan agama)
- Retensi check-in < ~30% di minggu ke-4 ping WhatsApp → tesiss freshness salah, berhenti.
- Fill rate < ~40% dengan 200 penyedia nyata → densitas tidak clear di Tegal, evaluasi ulang kota/kategori.

### Keputusan vertikal
- **Jasa rumah tangga + usaha makanan informal = fokus.** F&B formal (restoran/kafe) didemosi: Explorer tetap ada sebagai showcase direktori (dengan rencana migrasi Overture bersih-lisensi di backlog), tapi energi produk & lapangan tidak lagi dibelanjakan bersaing dengan GoFood.

## 5. Jawaban atas "rebuild from scratch?"

**Tidak.** Justifikasi: (1) biaya rebuild = biaya clone (5–10 hari) → kode tidak membawa bobot strategis ke arah mana pun; (2) model data sudah mencerminkan aset moat; (3) sumber daya langka adalah operasi lapangan + satu integrasi baru (bot WhatsApp), bukan arsitektur. Yang layak dibangun dari nol bukan app-nya — melainkan **operasinya** (satu kecamatan, door-to-door) dan **sinyalnya** (check-in terverifikasi, terreward, terkompoundi). Di situlah rasa "weekend project" mati: pemsaing bisa meng-clone petanya, tapi tidak panelnya, channelnya, dan relasi dorong-dorongnya.

## 6. Sumber utama

- **Audit repo:** ~8.100 LOC; check-in tanpa auth (`routes/checkins.ts`); portal fallback koordinat base (`routes/kelola.ts`); cron expire harian; nol SEO (SPA client-side, tanpa meta/OG); identitas owner = localStorage + token di path URL.
- **Kompetisi:** GoFood Tegal (gofood.co.id/tegal); ShopeeFood area kecil (help.shopee.co.id); GoLife shutdown 2019–20; Grab Clean & Fix = Sejasa (metro); ServisHero stop 2023; Kaodim stop 2022; Stoqo tutup 2020 (Tech in Asia post-mortem); Lummo PHK pasca raise $80M (CNBC Indonesia); BukuWarung → Mekari 2023.
- **Data pasar:** WA 89–98% (APJII, DataReportal Digital 2025 Indonesia); 88% WA bisnis mingguan (Meta); UMKM Kota Tegal 32.581 (tegal.pks.id) & Kabupaten 132.225 (PPID Kab. Tegal); 62% konsumen menghindari bisnis ber-info online salah (BrightLocal); WA API resmi ~Rp586/pesan marketing (Qontak/ChatMaxima).
- **Moat playbooks:** Zomato/Foodiebay menu-scan (Emerald case study); Mamikos verifikasi lapangan + agen (mamikos.com/agen); FullTank Sri Lanka (konfirmasi komunitas green-after-3); Google Popular Times = skala Android; Yelp↔OpenAI data licensing (2026); fill-rate benchmark (Lenny Rachitsky marketplace metrics); atomic network & density (Andrew Chen, The Cold Start Problem; Paul Graham, Do Things That Don't Scale).
