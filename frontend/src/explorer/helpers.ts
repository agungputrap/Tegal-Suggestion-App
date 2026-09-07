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

// Waktu saat ini dalam komponen Jakarta-relevan (hari Indonesia + jam/menit)
export function nowParts(): {
  dayIndo: string;
  hour: number;
  min: number;
} {
  const now = new Date();
  return {
    dayIndo: dayNameMap[now.getDay()],
    hour: now.getHours(),
    min: now.getMinutes(),
  };
}

export function parseTimeString(str: string): number | null {
  const s = str.trim().replace(".", ":");
  const match = s.match(/(\d{1,2}):(\d{2})/);
  if (match) return parseInt(match[1]) * 60 + parseInt(match[2]);
  return null;
}

// null = jadwal tidak diketahui (badge "buka/tutup" disembunyikan)
export function isOpenNow(
  place: Place,
  dayIndo: string,
  hour: number,
  min: number
): boolean | null {
  if (!place.open_hours || !place.open_hours[dayIndo]) return null;
  const hoursList = place.open_hours[dayIndo];
  if (!Array.isArray(hoursList) || hoursList.length === 0) return null;

  const timeStr = hoursList[0].toLowerCase();
  if (timeStr.includes("tutup") || timeStr.includes("closed")) return false;
  if (timeStr.includes("24 jam") || timeStr.includes("24 hours")) return true;

  const parts = timeStr.split(/[–—\-]/);
  if (parts.length === 2) {
    const start = parseTimeString(parts[0]);
    const end = parseTimeString(parts[1]);
    const current = hour * 60 + min;

    if (start !== null && end !== null) {
      if (end > start) {
        return current >= start && current <= end;
      } else {
        return current >= start || current <= end;
      }
    }
  }
  return null;
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
