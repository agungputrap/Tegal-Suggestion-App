import { useState } from "react";
import type { Listing } from "../api";
import { confirmOpen, resolvePhotoUrl, waChatLink } from "../api";
import { FALLBACK_IMAGE_MEDIUM } from "../explorer/helpers";
import { photoErrorHandler } from "./photo";
import { CARD } from "./ui";

type Props = {
  listing: Listing;
  categoryName: string;
  categoryIcon?: string;
  onOpenDetail?: () => void;
};

function todayLabel(): string {
  return new Date().toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
  });
}

// Dedupe konfirmasi per pengunjung per hari di sisi UI (server juga dedupe).
// try/catch: localStorage bisa tidak tersedia (private mode / lingkungan uji).
const CONFIRM_KEY = "jajanjasa:confirmedOpen";
function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}
function confirmedToday(id: string): boolean {
  try {
    return localStorage.getItem(`${CONFIRM_KEY}:${id}`) === todayIso();
  } catch {
    return false;
  }
}
function markConfirmedToday(id: string) {
  try {
    localStorage.setItem(`${CONFIRM_KEY}:${id}`, todayIso());
  } catch {
    /* abaikan — dedupe server tetap jalan */
  }
}

export function ListingCard({
  listing,
  categoryName,
  categoryIcon,
  onOpenDetail,
}: Props) {
  const photoSrc = resolvePhotoUrl(listing.photo_url);
  const isJajanan = listing.category_type === "jajanan";
  const [confirmed, setConfirmed] = useState(() =>
    confirmedToday(listing.id),
  );
  const [confirmCount, setConfirmCount] = useState(listing.confirm_count ?? 0);

  async function handleConfirm() {
    if (confirmed) return;
    try {
      const count = await confirmOpen(listing.id);
      markConfirmedToday(listing.id);
      setConfirmed(true);
      setConfirmCount(count);
    } catch (err) {
      console.warn("Konfirmasi gagal:", err); // tombol tetap bisa dicoba lagi
    }
  }

  return (
    <div
      className={`${CARD} overflow-hidden hover:shadow-lg hover:-translate-y-0.5 transition duration-300 flex flex-col group`}
    >
      {/* Media: foto provider, atau tile emoji kategori */}
      <div
        className="relative h-40 overflow-hidden bg-slate-100 dark:bg-slate-800 cursor-pointer"
        onClick={onOpenDetail}
      >
        {photoSrc ? (
          <img
            className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
            src={photoSrc}
            alt={listing.name}
            loading="lazy"
            onError={photoErrorHandler(FALLBACK_IMAGE_MEDIUM)}
          />
        ) : (
          <div
            className={`w-full h-full flex items-center justify-center text-5xl ${
              isJajanan
                ? "bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-950/40 dark:to-orange-950/40"
                : "bg-gradient-to-br from-emerald-100 to-teal-100 dark:from-emerald-950/40 dark:to-teal-950/40"
            }`}
          >
            {categoryIcon ?? (isJajanan ? "🍽️" : "🛠️")}
          </div>
        )}

        {/* Badge aktif hari ini */}
        <span className="absolute top-3 left-3 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/90 text-white backdrop-blur-sm">
          <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse mr-1"></span>
          Aktif · {todayLabel()}
        </span>

        {/* Kategori */}
        <span className="absolute bottom-2 left-3 px-2 py-0.5 rounded-lg bg-black/60 text-white backdrop-blur-sm font-medium text-[11px]">
          {categoryIcon && <span className="mr-1">{categoryIcon}</span>}
          {categoryName}
        </span>
      </div>

      <div className="p-4 flex-grow flex flex-col">
        {/* Judul = elemen aksesibel kartu (tier 0 #34): button asli supaya
            bisa dikeyboard, bukan div onClick */}
        <button
          type="button"
          onClick={onOpenDetail}
          className="block w-full text-left font-bold text-slate-900 dark:text-white text-base line-clamp-1 hover:text-emerald-600 dark:hover:text-emerald-400 transition cursor-pointer"
        >
          {listing.name}
        </button>

        <div className="flex items-center flex-wrap gap-x-2 text-xs text-slate-500 dark:text-slate-400 mt-1.5 mb-3">
          {listing.distance_km != null && (
            <span className="inline-flex items-center">
              <i className="fa-solid fa-location-dot text-rose-400 mr-1"></i>
              {listing.distance_km.toFixed(1)} km
            </span>
          )}
          {listing.halal === 1 && (
            <span className="px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 text-[10px] font-semibold">
              ☪️ Halal
            </span>
          )}
          {listing.area && <span>{listing.area}</span>}
          {listing.description && (
            <span className="line-clamp-1">{listing.description}</span>
          )}
        </div>

        {/* Trust row (fase 0 #27): streak freshness + konfirmasi publik */}
        <div className="mt-auto pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
          {listing.streak_days != null && listing.streak_days >= 2 ? (
            <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400">
              🔥 {listing.streak_days} hari beruntun
            </span>
          ) : (
            <span />
          )}
          <button
            onClick={handleConfirm}
            disabled={confirmed}
            title="Konfirmasi bahwa usaha ini benar-benar buka hari ini"
            className={`text-xs font-semibold px-3 py-2 min-h-[44px] rounded-lg transition ${
              confirmed
                ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400"
                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 hover:text-emerald-600"
            }`}
          >
            {confirmed
              ? `✓ Dikonfirmasi${confirmCount > 1 ? ` · ${confirmCount}` : ""}`
              : "✓ Masih buka"}
          </button>
        </div>

        <div className="pt-2">
          <a
            className="w-full py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold transition flex items-center justify-center space-x-1.5"
            href={waChatLink(listing.phone, listing.name)}
            target="_blank"
            rel="noreferrer"
          >
            <i className="fa-brands fa-whatsapp text-base"></i>
            <span>Chat WhatsApp</span>
          </a>
        </div>
      </div>
    </div>
  );
}
