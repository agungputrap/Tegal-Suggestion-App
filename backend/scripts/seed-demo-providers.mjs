// Seed penyedia DEMO untuk demo day (PRD target: 15–20 bisnis campuran
// food + service, beberapa buka hari ini) — dipanggil via
// `npm run db:seed:demo`.
//
// Berbeda dari db:seed:places (SQL langsung ke D1), script ini lewat API
// publik/admin yang sama dengan alur asli produk: register → approve
// admin → check-in hari ini → items via portal. Jadi jalur demo == jalur
// nyata, dan "today" dijamin konsisten dengan todayJakarta() backend.
//
// Idempoten: kunci unik = nomor HP. Re-run tidak menduplikasi provider;
// ia me-refresh check-in HARI INI untuk yang terdaftar sebagai "buka"
// (tabel checkins UNIQUE(provider_id, date) → upsert idempoten), supaya
// pin live tetap tampil di hari demo (cron expire-kan listing tiap
// tengah malam WIB). Items hanya dibuat saat registrasi baru karena
// owner_token hanya dikembalikan sekali.
//
// Pemakaian:
//   npm run db:seed:demo                                   # lokal (:8787)
//   SEED_API_URL=https://<worker> ADMIN_TOKEN=<prod> npm run db:seed:demo
//
// Data adalah DEMO: nomor HP dummy (boleh sesuai PRD — "can be a dummy
// number"), koordinat tersebar realistis antar kecamatan.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const API_URL = (
  process.env.SEED_API_URL ?? "http://localhost:8787"
).replace(/\/$/, "");

function adminToken() {
  if (process.env.ADMIN_TOKEN) return process.env.ADMIN_TOKEN;
  const devVars = path.join(scriptDir, "..", ".dev.vars");
  if (fs.existsSync(devVars)) {
    const line = fs
      .readFileSync(devVars, "utf8")
      .split("\n")
      .find((l) => l.startsWith("ADMIN_TOKEN="));
    if (line) return line.slice("ADMIN_TOKEN=".length).trim();
  }
  throw new Error("ADMIN_TOKEN tidak ditemukan (env atau backend/.dev.vars)");
}
const TOKEN = adminToken();

const DEMO = [
  // ---- Jajanan (8) ----
  {
    name: "Gorengan Bu Ida", phone: "081200010001", type: "jajanan",
    categoryId: "gorengan", area: "Tegal Barat",
    lat: -6.8731, lng: 109.1282, openToday: true, halal: true,
    description: "Gorengan hangat keluar tiap jam 6 pagi & 3 sore. Tahu isi, bakwan, pisang goreng.",
    items: [
      { name: "Tahu Isi", price: 2000, note: "pedas / original" },
      { name: "Bakwan Udang", price: 2500 },
      { name: "Pisang Goreng", price: 3000 },
    ],
  },
  {
    name: "Kue Basah Bu Sri", phone: "081200010002", type: "jajanan",
    categoryId: "kue-basah", area: "Tegal Timur",
    lat: -6.8661, lng: 109.1478, openToday: true, halal: true,
    description: "Kue basah khas Tegal: jongkong, kalinap, apem. Bisa pesan untuk acara.",
    items: [
      { name: "Jongkong", price: 3000 },
      { name: "Kalinap", price: 3500, note: "min. pesan 10" },
      { name: "Apem", price: 2500 },
    ],
  },
  {
    name: "Wedangan Pak Joko", phone: "081200010003", type: "jajanan",
    categoryId: "minuman", area: "Tegal Selatan",
    lat: -6.8832, lng: 109.1359, openToday: true, halal: false,
    description: "Wedang rondhe & bajigur malam, jam 4 sore sampai habis.",
    items: [
      { name: "Wedang Ronde", price: 8000 },
      { name: "Bajigur", price: 8000 },
      { name: "Es Cincau", price: 6000 },
    ],
  },
  {
    name: "Nasi Goreng Gila Kampus", phone: "081200010004", type: "jajanan",
    categoryId: "nasi-goreng", area: "Margadana",
    lat: -6.8761, lng: 109.1253, openToday: true, halal: true,
    description: "Nasi goreng pedas level 1-5, buka sampai jam 12 malam.",
    items: [
      { name: "Nasi Goreng Gila", price: 13000, note: "level 1-5" },
      { name: "Nasi Goreng Telur", price: 12000 },
      { name: "Es Teh Jumbo", price: 4000 },
    ],
  },
  {
    name: "Gorengan Lengkap 21", phone: "081200010005", type: "jajanan",
    categoryId: "gorengan", area: "Adiwerna",
    lat: -6.8623, lng: 109.1412, openToday: false, halal: true,
    description: "Aneka gorengan, cocok untuk pesanan acara & jajan sekolah.",
    items: [
      { name: "Tempe Mendoan", price: 2000 },
      { name: "Tahu Pong", price: 2000 },
    ],
  },
  {
    name: "Kue & Snack Bu Nur", phone: "081200010006", type: "jajanan",
    categoryId: "kue-basah", area: "Kedungbanteng",
    lat: -6.8712, lng: 109.1551, openToday: false, halal: true,
    description: "Kue basah, kue kering, dan snack hampers.",
    items: [{ name: "Snack Box", price: 25000, note: "isi 25" }],
  },
  {
    name: "Es Kelapa Muda Segar", phone: "081200010007", type: "jajanan",
    categoryId: "minuman", area: "Kramat",
    lat: -6.8562, lng: 109.1451, openToday: false, halal: false,
    description: "Es kelapa muda langsung dari kebun, siap antar.",
    items: [{ name: "Es Kelapa Muda", price: 10000 }],
  },
  {
    name: "Nasi Goreng Pak Min", phone: "081200010008", type: "jajanan",
    categoryId: "nasi-goreng", area: "Dukuhwaru",
    lat: -6.8931, lng: 109.1103, openToday: false, halal: true,
    description: "Nasi goreng kampung & mie goreng, buka pagi sampai siang.",
    items: [{ name: "Nasi Goreng Kampung", price: 11000 }],
  },
  // ---- Jasa (10) ----
  {
    name: "Servis AC Tegal Dingin", phone: "081200020001", type: "jasa",
    categoryId: "servis-ac", area: "Tegal Barat",
    lat: -6.8742, lng: 109.1271, openToday: true,
    description: "Cuci & isi freon AC rumah/kantor, area Tegal kota. Panggilan hari yang sama.",
    items: [
      { name: "Cuci AC 0,5-1 PK", price: 60000 },
      { name: "Isi Freon R32", price: 250000 },
    ],
  },
  {
    name: "Tukang Bangunan H. Rohmat", phone: "081200020002", type: "jasa",
    categoryId: "tukang", area: "Tegal Selatan",
    lat: -6.8841, lng: 109.1372, openToday: true,
    description: "Renovasi, cor, atap, keramik. Tim 5 orang, siap datang hari ini.",
    items: [
      { name: "Bor Dinding (per titik)", price: 15000 },
      { name: "Pasang Keramik (per m²)", price: 45000 },
    ],
  },
  {
    name: "Bersih Tandon Amanah", phone: "081200020003", type: "jasa",
    categoryId: "bersih-tandon", area: "Margadana",
    lat: -6.8753, lng: 109.1244, openToday: true,
    description: "Bersih tandon & cek saluran air, siap panggilan pagi/sore.",
    items: [{ name: "Bersih Tandon 1000L", price: 150000 }],
  },
  {
    name: "Laundry Wangi Kilat", phone: "081200020004", type: "jasa",
    categoryId: "laundry", area: "Tegal Timur",
    lat: -6.8652, lng: 109.1469, openToday: true,
    description: "Laundry panggilan: jemput & antar gratis area kota, kilat 3 jam.",
    items: [
      { name: "Cuci Kering Setrika (per kg)", price: 7000 },
      { name: "Layanan Kilat 3 Jam", price: 12000 },
    ],
  },
  {
    name: "Tukang Ledeng Jaya", phone: "081200020005", type: "jasa",
    categoryId: "tukang-ledeng", area: "Dukuhwaru",
    lat: -6.8921, lng: 109.1112, openToday: true,
    description: "Perbaikan pipa, keran, flush toilet. Panggilan hari yang sama.",
    items: [
      { name: "Perbaikan Keran", price: 30000 },
      { name: "Pasang Pipa (per titik)", price: 50000 },
    ],
  },
  {
    name: "Penjahit Bu Ratna", phone: "081200020006", type: "jasa",
    categoryId: "penjahit", area: "Adiwerna",
    lat: -6.8632, lng: 109.1421, openToday: true,
    description: "Jahit & permak pakaian, seragam, terasi. Bisa datang ke rumah.",
    items: [
      { name: "Permak Celana", price: 10000 },
      { name: "Jahit Seragam (per pcs)", price: 45000 },
    ],
  },
  {
    name: "Servis AC 24 Jam", phone: "081200020007", type: "jasa",
    categoryId: "servis-ac", area: "Kedungbanteng",
    lat: -6.8702, lng: 109.1541, openToday: false,
    description: "Cuci AC, servis, bongkar-pasang. Bisa panggilan malam.",
    items: [{ name: "Cuci AC 1-2 PK", price: 65000 }],
  },
  {
    name: "Tukang Bangunan Barokah", phone: "081200020008", type: "jasa",
    categoryId: "tukang", area: "Lebaksiu",
    lat: -6.8862, lng: 109.0902, openToday: false,
    description: "Bangun & renovasi rumah, pagar, kanopi.",
    items: [{ name: "Cor Sak (per sak)", price: 85000 }],
  },
  {
    name: "Ledeng Panggilan Timur", phone: "081200020009", type: "jasa",
    categoryId: "tukang-ledeng", area: "Tegal Timur",
    lat: -6.8672, lng: 109.1491, openToday: false,
    description: "Servis pipa mampet & tandon, area Tegal timur.",
    items: [{ name: "Bocor Pipa", price: 40000 }],
  },
  {
    name: "Laundry Sepatu & Tas", phone: "081200020010", type: "jasa",
    categoryId: "laundry", area: "Kramat",
    lat: -6.8552, lng: 109.1441, openToday: false,
    description: "Cuci sepatu, tas, topi — deep clean & whitening.",
    items: [{ name: "Cuci Sepatu", price: 25000 }],
  },
];

async function api(path, init) {
  const res = await fetch(`${API_URL}${path}`, init);
  const body = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, body };
}

async function findExisting(phone) {
  const { ok, body } = await api(
    `/admin/providers?q=${encodeURIComponent(phone)}`,
    { headers: { Authorization: `Bearer ${TOKEN}` } },
  );
  if (!ok) return null;
  return (body.providers ?? []).find((p) => p.phone === phone) ?? null;
}

async function main() {
  console.log(`Seeding demo providers ke ${API_URL}\n`);
  let openCount = 0;

  for (const d of DEMO) {
    // 1) Registrasi (skip kalau nomor HP sudah ada dari run sebelumnya)
    const reg = await api("/providers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: d.name,
        phone: d.phone,
        category_type: d.type,
        category_id: d.categoryId,
        description: d.description,
        base_lat: d.lat,
        base_lng: d.lng,
        service_radius_km: 5,
        area: d.area,
        ...(d.type === "jajanan" ? { halal: d.halal } : {}),
      }),
    });

    let provider = null;
    if (reg.ok) {
      provider = { id: reg.body.id, ownerToken: reg.body.owner_token };
      console.log(`  + daftar    : ${d.name} (${d.area})`);
    } else {
      provider = await findExisting(d.phone);
      console.log(
        provider
          ? `  = sudah ada : ${d.name} — refresh saja`
          : `  ! GAGAL     : ${d.name} — ${reg.body.error ?? reg.status}`,
      );
    }
    if (!provider) continue;

    // 2) Approve admin (idempoten untuk yang sudah approved)
    await api(`/admin/providers/${provider.id}/approval`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ status: "approved" }),
    });

    // 3) Items via portal — hanya saat registrasi baru (owner_token hanya
    //    dikembalikan sekali); re-run tidak menambah item ganda.
    if (provider.ownerToken) {
      for (const item of d.items) {
        await api(`/kelola/${provider.ownerToken}/items`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(item),
        });
      }
    }

    // 4) Check-in hari ini untuk yang "buka" — upsert idempoten per hari
    if (d.openToday) {
      const ck = await api("/checkins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider_id: provider.id, lat: d.lat, lng: d.lng }),
      });
      if (ck.ok) openCount++;
    }
  }

  const res = await api(`/listings?lat=-6.87&lng=109.13&radius=20`);
  const active = res.ok ? res.body.count : "?";
  console.log(
    `\nSelesai. Check-in baru sesi ini: ${openCount}. ` +
      `Listing aktif hari ini: ${active}. ` +
      `Re-run script ini besok pagi untuk refresh check-in.`,
  );
}

main().catch((err) => {
  console.error(`Seed gagal: ${err.message}`);
  console.error("Pastikan backend jalan (npm run dev) lalu coba lagi.");
  process.exit(1);
});
