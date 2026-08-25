# Buka Hari Ini — Web (Vite + React)

SPA statis (bukan SSR) supaya deploy ke Cloudflare Pages simpel dan cepat,
menghindari kerumitan Next.js SSR di Workers runtime.

## Setup

```bash
npm install
cp .env.example .env   # sesuaikan VITE_API_URL ke Worker API kamu
npm run dev
```

Buka `http://localhost:5173`. Pastikan Worker API (`jajan-jasa-worker`) juga
jalan di `http://localhost:8787` (lihat README di folder API).

## Build & Deploy ke Cloudflare Pages

```bash
npm run build
npx wrangler pages deploy dist --project-name=jajan-jasa-web
```

Setelah deploy:
1. Set environment variable `VITE_API_URL` di dashboard Pages ke URL Worker
   production kamu, lalu build ulang (env var Vite di-bake saat build, bukan
   runtime).
2. Hubungkan domain `.id` lewat tab **Custom Domains** di project Pages.

## Desain

Palet dan tipografi sengaja dijauhkan dari tampilan default AI (krem +
terracotta, atau dark mode + hijau neon): warna diambil dari suasana pasar
pagi (kuning tenda, teal peralatan tukang), dan badge "Aktif" dibuat seperti
stempel tanggal di bon warung — merepresentasikan langsung mekanisme inti
produk (status berlaku cuma untuk hari itu).

Detail lain yang sengaja dijaga supaya tidak terasa generik:
- Tekstur butiran halus di background (bukan warna solid rata) + shadow
  hangat (bukan hitam polos) di kartu dan bottom nav.
- Skala radius bertingkat (`--radius-sm/md/lg`) — kartu, tombol, dan badge
  tidak semuanya membulat dengan nilai yang sama.
- Tombol dibedakan secara fungsi: `.chip` (filter kategori, pill, ink-bordered),
  `.tag-toggle` (filter admin, kotak kecil, aksen teal saat aktif),
  `.btn-primary`/`.btn-secondary`/`.btn-secondary--danger` — bukan satu gaya
  tombol dipakai untuk semua konteks.
- Marker peta pakai ikon emoji per kategori (bukan titik warna generik) —
  mis. servis AC pakai ❄️, penjahit pakai 🧵 — dibentuk pin tetesan air lewat
  `L.divIcon`. Ikon disimpan di kolom `icon` pada tabel `categories`, jadi
  menambah kategori baru tidak perlu ubah kode frontend.
- Empty state dan admin panel punya hierarki visual sendiri (dashed border,
  ikon kontekstual) alih-alih baris teks polos.

## Halaman yang tersedia

- **Cari** (`pages/ConsumerPage.tsx`) — peta + list penyedia yang aktif hari ini
- **Jualan / Jasa Saya** (`pages/ProviderPage.tsx`) — alur penyedia:
  1. Registrasi (nama, nomor WA, kategori, radius jika jasa)
  2. Checkin harian (ambil lokasi browser, kirim ke API)
  3. Upload foto jajanan/portofolio
- **Admin** (`pages/AdminPage.tsx`) — login pakai `ADMIN_TOKEN` (sama dengan
  secret di backend), lalu:
  1. **Statistik** — total provider, aktif hari ini, breakdown per jenis/kategori
  2. **Provider** — cari by nama/HP, filter jenis & status, nonaktifkan/aktifkan
     provider (moderasi), reset checkin hari ini (tanpa suspend permanen),
     hapus foto, hapus provider permanen
  3. **Kategori** — tambah/hapus kategori beserta icon-nya (tidak bisa hapus
     kategori yang masih dipakai provider)

Token admin disimpan di `localStorage` browser setelah login berhasil (mirip
provider), jadi tidak perlu login ulang tiap buka halaman.

## Belum ada (Fase 2)

- Autentikasi penyedia yang sesungguhnya (sekarang identitas provider cuma
  disimpan di `localStorage` browser — cukup untuk demo lomba, tapi provider
  kehilangan akun kalau ganti device/hapus data browser. Perlu OTP WA/SMS.)
- Chat in-app (sementara deep link ke WhatsApp)
- Auth admin masih single shared token — cukup untuk satu admin, belum ada
  role/permission per admin kalau tim membesar.
