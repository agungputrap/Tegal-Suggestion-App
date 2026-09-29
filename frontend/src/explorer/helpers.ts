// Logika turunan places (buka sekarang, highlight, warna kategori, dll)
// — port 1:1 dari script ref/index.html supaya perilakunya identik.
import type { Place } from "./types";

export const FALLBACK_IMAGE_PLAIN =
  "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=600&auto=format&fit=crop&q=80";
export const FALLBACK_IMAGE_SMALL =
  "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=200&auto=format&fit=crop&q=80";
export const FALLBACK_IMAGE_MEDIUM =
  "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=600&auto=format&fit=crop&q=80";
export const FALLBACK_IMAGE_LARGE =
  "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&auto=format&fit=crop&q=80";

export const dayNameMap: Record<number, string> = {
  0: "Minggu",
  1: "Senin",
  2: "Selasa",
  3: "Rabu",
  4: "Kamis",
  5: "Jumat",
  6: "Sabtu",
};

export const daysIndo = [
  "Senin",
  "Selasa",
  "Rabu",
  "Kamis",
  "Jumat",
  "Sabtu",
  "Minggu",
];

// Waktu saat ini dalam komponen Jakarta-relevan (hari Indonesia + jam/menit).
// Wajib WIB (UTC+7), bukan timezone browser — sama dengan todayJakarta()
// di backend/src/geo.ts, kalau tidak badge "buka sekarang" bisa meleset
// berjam-jam untuk pengunjung dari timezone lain.
export function nowParts(): {
  dayIndo: string;
  hour: number;
  min: number;
} {
  const now = new Date(Date.now() + 7 * 60 * 60 * 1000);
  return {
    dayIndo: dayNameMap[now.getUTCDay()],
    hour: now.getUTCHours(),
    min: now.getUTCMinutes(),
  };
}

export function parseTimeString(str: string): number | null {
  const s = str.trim().replace(".", ":");
  const match = s.match(/(\d{1,2}):(\d{2})/);
  if (match) return parseInt(match[1]) * 60 + parseInt(match[2]);
  return null;
}

// null = jadwal tidak diketahui (badge "buka/tutup" disembunyikan).
// Satu hari bisa punya beberapa rentang (jam pecah, mis. 07-10 & 16-21) —
// buka selama ADA SATU rentang yang memuat waktu sekarang.
export function isOpenNow(
  place: Place,
  dayIndo: string,
  hour: number,
  min: number,
): boolean | null {
  if (!place.open_hours || !place.open_hours[dayIndo]) return null;
  const hoursList = place.open_hours[dayIndo];
  if (!Array.isArray(hoursList) || hoursList.length === 0) return null;

  const current = hour * 60 + min;
  let known = false; // minimal satu entri berhasil dibaca

  for (const raw of hoursList) {
    const timeStr = String(raw ?? "").toLowerCase();
    if (!timeStr) continue;
    if (timeStr.includes("tutup") || timeStr.includes("closed")) {
      known = true; // hari libur yang sah — status "tutup"
      continue;
    }
    if (timeStr.includes("24 jam") || timeStr.includes("24 hours")) return true;

    const parts = timeStr.split(/[–—-]/);
    if (parts.length !== 2) continue;
    const start = parseTimeString(parts[0]);
    const end = parseTimeString(parts[1]);
    if (start === null || end === null) continue;

    known = true;
    const inRange =
      end > start
        ? current >= start && current <= end
        : current >= start || current <= end; // rentang lintas tengah malam
    if (inRange) return true;
  }

  return known ? false : null;
}

export function placeThumbnail(place: Place): string {
  return (
    place.thumbnail ||
    (place.images[0] ? place.images[0].image : "") ||
    FALLBACK_IMAGE_PLAIN
  );
}

// Tag fasilitas dari section `about` yang option-nya enabled
export function extractHighlights(place: Place): string[] {
  const list: string[] = [];
  place.about.forEach((sec) => {
    sec.options?.forEach((opt) => {
      if (opt.enabled && opt.name) list.push(opt.name);
    });
  });
  return list;
}

export function getCategoryColor(cat: string | undefined): string {
  if (!cat) return "#6b7280";
  const c = cat.toLowerCase();
  if (c.includes("kafe")) return "#f59e0b";
  if (c.includes("kopi")) return "#ea580c";
  if (c.includes("seafood")) return "#14b8a6";
  if (c.includes("restoran")) return "#3b82f6";
  if (c.includes("jawa") || c.includes("indonesia")) return "#ef4444";
  return "#8b5cf6";
}

export function formatRating(place: Place): string {
  return place.rating != null ? place.rating.toFixed(1) : "-";
}

export function formatCount(n: number): string {
  return (n || 0).toLocaleString("id-ID");
}

// ---------- Freshness check-in (tier 1 #36) ----------
// Timestamp dari backend berbentuk UTC "YYYY-MM-DD HH:MM:SS" (SQLite
// CURRENT_TIMESTAMP). Konversi ke label relatif Indonesia; null kalau
// tidak bisa diparse / sudah terlalu lama. nowMs opsional untuk test.

// > 4 jam tanpa kabar → badge memudar (prinsip 5 uiux-plan: data basi
// memudar visual, pola Waze)
export const FRESHNESS_STALE_MS = 4 * 60 * 60 * 1000;

function parseSqliteUtc(sqliteUtc: string): number | null {
  const t = Date.parse(`${sqliteUtc.replace(" ", "T")}Z`);
  return Number.isNaN(t) ? null : t;
}

export function relativeCheckinLabel(
  sqliteUtc: string | undefined | null,
  nowMs: number = Date.now(),
): string | null {
  if (!sqliteUtc) return null;
  const t = parseSqliteUtc(sqliteUtc);
  if (t === null) return null;
  const diffMin = Math.max(0, Math.floor((nowMs - t) / 60_000));
  if (diffMin < 1) return "baru saja";
  if (diffMin < 60) return `${diffMin} mnt lalu`;
  const hours = Math.floor(diffMin / 60);
  if (hours < 24) return `${hours} jam lalu`;
  return null; // lebih dari sehari — jangan tampilkan, sudah basi
}

export function isStaleCheckin(
  sqliteUtc: string | undefined | null,
  nowMs: number = Date.now(),
): boolean {
  if (!sqliteUtc) return false;
  const t = parseSqliteUtc(sqliteUtc);
  if (t === null) return false;
  return nowMs - t > FRESHNESS_STALE_MS;
}

// ---------- Pencarian precompute (tier 2 #36) ----------
// Blob pencarian lowercase — dibangun SEKALI per place (bukan per keystroke):
// dulu filter Explorer memanggil JSON.stringify(about/user_reviews) untuk
// setiap place di setiap ketikan. Field digabung dengan pemisah "\n" yang
// tidak bisa muncul di hasil JSON.stringify (newline di string JSON
// ter-escape jadi "\\n"), jadi semantik "match jika ADA field yang memuat
// query" tetap identik dengan cek per-field.

// JSON `about` lowercase — dipakai juga filter cepat (wifi/outdoor/reservasi)
// yang dulu stringify ulang di setiap evaluasi filter.
export function aboutSearchBlob(place: Place): string {
  return JSON.stringify(place.about).toLowerCase();
}

export function buildSearchBlob(place: Place): string {
  return [
    place.title.toLowerCase(),
    place.category.toLowerCase(),
    place.address.toLowerCase(),
    place.about.length > 0 ? aboutSearchBlob(place) : "",
    place.user_reviews.length > 0
      ? JSON.stringify(place.user_reviews).toLowerCase()
      : "",
  ].join("\n");
}
