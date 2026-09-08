import { useEffect, useState } from "react";
import {
  fetchProviderItems,
  resolvePhotoUrl,
  trackProviderView,
  waChatLink,
  type Item,
  type Listing,
} from "../api";
import { FALLBACK_IMAGE_LARGE } from "../explorer/helpers";
import { LABEL } from "./ui";

function formatRupiah(n: number): string {
  return `Rp ${n.toLocaleString("id-ID")}`;
}

type Props = {
  listing: Listing;
  categoryName: string;
  onClose: () => void;
};

// Detail penyedia (#5/#13) — dibuka dari ListingCard. Menampilkan foto,
// deskripsi, badge area/halal, daftar item + harga, dan CTA WhatsApp.
// Membuka halaman ini juga mencatat 1 view (trending #4b).
export function ProviderDetailModal({ listing, categoryName, onClose }: Props) {
  const [items, setItems] = useState<Item[] | null>(null);

  useEffect(() => {
    trackProviderView(listing.id);
    fetchProviderItems(listing.id)
      .then(setItems)
      .catch(() => setItems([]));
  }, [listing.id]);

  // Kunci scroll + Escape
  useEffect(() => {
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const photoSrc = resolvePhotoUrl(listing.photo_url);
  const isJajanan = listing.category_type === "jajanan";

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 transition-opacity"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-2xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden relative">
        <div className="absolute top-4 right-4 z-20">
          <button
            onClick={onClose}
            title="Tutup"
            className="w-9 h-9 rounded-full bg-black/40 hover:bg-black/60 text-white backdrop-blur-md flex items-center justify-center transition"
          >
            <i className="fa-solid fa-xmark text-sm"></i>
          </button>
        </div>

        <div className="overflow-y-auto custom-scrollbar flex-grow">
          {/* Hero */}
          <div className="relative bg-slate-950 h-52 sm:h-64 w-full overflow-hidden">
            {photoSrc ? (
              <img
                src={photoSrc}
                alt={listing.name}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = FALLBACK_IMAGE_LARGE;
                }}
              />
            ) : (
              <div
                className={`w-full h-full flex items-center justify-center text-6xl ${
                  isJajanan
                    ? "bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-950/40 dark:to-orange-950/40"
                    : "bg-gradient-to-br from-emerald-100 to-teal-100 dark:from-emerald-950/40 dark:to-teal-950/40"
                }`}
              >
                {isJajanan ? "🍜" : "🛠️"}
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>

            <div className="absolute bottom-4 left-4 right-4 text-white">
              <div className="flex items-center flex-wrap gap-1.5 mb-1">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500 text-white">
                  {categoryName}
                </span>
                {isJajanan && listing.halal === 1 && (
                  <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-600/90 text-white">
                    ☪️ Halal
                  </span>
                )}
                {listing.area && (
                  <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-white/20 text-white backdrop-blur-sm">
                    <i className="fa-solid fa-location-dot mr-1"></i>
                    {listing.area}
                  </span>
                )}
              </div>
              <h2 className="text-xl sm:text-2xl font-black">{listing.name}</h2>
            </div>
          </div>

          <div className="p-5 space-y-5">
            {listing.description && (
              <p className="text-sm text-slate-600 dark:text-slate-300">
                {listing.description}
              </p>
            )}

            {/* Items / daftar harga */}
            <div>
              <h4 className={`${LABEL} flex items-center`}>
                <i className="fa-solid fa-list-ul text-emerald-500 mr-2"></i>
                {isJajanan ? "Menu hari ini" : "Daftar jasa & harga"}
              </h4>
              {items === null ? (
                <p className="text-xs text-slate-500">memuat item...</p>
              ) : items.filter((i) => i.available === 1).length === 0 ? (
                <p className="text-xs text-slate-400">
                  Belum ada daftar {isJajananLabel(isJajanan)} yang tersedia
                  hari ini.
                </p>
              ) : (
                <div className="space-y-1.5">
                  {items
                    .filter((i) => i.available === 1)
                    .map((item) => (
                      <div
                        key={item.id}
                        className="flex justify-between items-center gap-3 py-2 px-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 text-sm"
                      >
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-800 dark:text-slate-100 truncate">
                            {item.name}
                          </p>
                          {item.note && (
                            <p className="text-[11px] text-slate-500 dark:text-slate-400">
                              {item.note}
                            </p>
                          )}
                        </div>
                        <span className="font-bold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                          {formatRupiah(item.price)}
                        </span>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer CTA */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-800">
          <a
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold transition flex items-center justify-center space-x-2"
            href={waChatLink(listing.phone, listing.name)}
            target="_blank"
            rel="noreferrer"
          >
            <i className="fa-brands fa-whatsapp text-lg"></i>
            <span>Chat WhatsApp — {listing.phone}</span>
          </a>
        </div>
      </div>
    </div>
  );
}

function isJajananLabel(isJajanan: boolean): string {
  return isJajanan ? "menu" : "jasa";
}
