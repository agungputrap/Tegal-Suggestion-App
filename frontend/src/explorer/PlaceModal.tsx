import { useMemo, useState } from "react";
import type { Place } from "./types";
import {
  FALLBACK_IMAGE_LARGE,
  daysIndo,
  formatCount,
  formatRating,
  isOpenNow,
  nowParts,
} from "./helpers";

type Props = {
  place: Place;
  isFav: boolean;
  onToggleFavorite: (id: string) => void;
  highlights: string[];
  onClose: () => void;
};

export function PlaceModal({
  place,
  isFav,
  onToggleFavorite,
  highlights,
  onClose,
}: Props) {
  const [heroIdx, setHeroIdx] = useState(0);
  const images = place.images;

  const { dayIndo } = nowParts();
  const openStatus = isOpenNow(place, dayIndo, nowParts().hour, nowParts().min);

  const ratingBreakdown = useMemo(
    () => place.reviews_per_rating ?? {},
    [place]
  );
  const totalRatingSum = useMemo(() => {
    const sum = Object.values(ratingBreakdown).reduce((a, v) => a + v, 0);
    return sum || 1;
  }, [ratingBreakdown]);

  const sharePlace = () => {
    const url = place.link || window.location.href;
    if (navigator.share) {
      navigator
        .share({
          title: place.title,
          text: `Cek tempat kuliner ${place.title} di Tegal!`,
          url,
        })
        .catch(() => {});
    } else {
      navigator.clipboard.writeText(url);
      alert("Tautan tempat berhasil disalin ke clipboard!");
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 transition-opacity"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden relative">
        {/* Modal Header (Close & share) */}
        <div className="absolute top-4 right-4 z-20 flex items-center space-x-2">
          <button
            onClick={sharePlace}
            title="Bagikan"
            className="w-9 h-9 rounded-full bg-black/40 hover:bg-black/60 text-white backdrop-blur-md flex items-center justify-center transition"
          >
            <i className="fa-solid fa-share-nodes text-xs"></i>
          </button>
          <button
            onClick={onClose}
            title="Tutup"
            className="w-9 h-9 rounded-full bg-black/40 hover:bg-black/60 text-white backdrop-blur-md flex items-center justify-center transition"
          >
            <i className="fa-solid fa-xmark text-sm"></i>
          </button>
        </div>

        {/* Modal Body (scrollable) */}
        <div className="overflow-y-auto custom-scrollbar flex-grow">
          {images.length > 0 && (
            <>
              <div className="relative bg-slate-950 h-64 sm:h-80 w-full overflow-hidden">
                <img
                  src={images[heroIdx]?.image ?? FALLBACK_IMAGE_LARGE}
                  alt={place.title}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = FALLBACK_IMAGE_LARGE;
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>

                <div className="absolute bottom-4 left-4 right-4 text-white">
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500 text-white">
                      {place.category}
                    </span>
                    {openStatus === true && (
                      <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-600/90 text-white">
                        🟢 Buka Sekarang
                      </span>
                    )}
                    {openStatus === false && (
                      <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-600/90 text-white">
                        🔴 Tutup
                      </span>
                    )}
                  </div>
                  <h2 className="text-xl sm:text-2xl font-black">
                    {place.title}
                  </h2>
                  <p className="text-xs text-slate-200 line-clamp-1 mt-0.5">
                    <i className="fa-solid fa-location-dot mr-1"></i>
                    {place.address}
                  </p>
                </div>
              </div>

              {images.length > 1 && (
                <div className="flex space-x-2 p-3 bg-slate-900 overflow-x-auto custom-scrollbar">
                  {images.map((img, idx) => (
                    <img
                      key={idx}
                      src={img.image}
                      alt={`Foto ${idx + 1}`}
                      onClick={() => setHeroIdx(idx)}
                      className={`w-16 h-12 rounded-lg object-cover cursor-pointer flex-shrink-0 transition border-2 ${
                        idx === heroIdx
                          ? "opacity-100 border-emerald-500"
                          : "opacity-70 border-transparent hover:opacity-100 hover:border-emerald-500"
                      }`}
                    />
                  ))}
                </div>
              )}
            </>
          )}

          <div className="p-5 sm:p-6 space-y-6">
            {/* Stat cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-xl">
                <div className="text-slate-400 text-[10px] uppercase font-bold">
                  Rating Google
                </div>
                <div className="text-base font-extrabold text-amber-500 flex items-center mt-0.5">
                  ★ {formatRating(place)}
                  <span className="text-xs text-slate-400 font-normal ml-1">
                    / 5.0
                  </span>
                </div>
              </div>

              <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-xl">
                <div className="text-slate-400 text-[10px] uppercase font-bold">
                  Total Ulasan
                </div>
                <div className="text-base font-extrabold text-slate-800 dark:text-slate-100 mt-0.5">
                  {formatCount(place.review_count)}
                </div>
              </div>

              <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-xl">
                <div className="text-slate-400 text-[10px] uppercase font-bold">
                  Rentang Harga
                </div>
                <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                  {place.price_range || "Tidak Tercantum"}
                </div>
              </div>

              <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-xl">
                <div className="text-slate-400 text-[10px] uppercase font-bold">
                  Wilayah
                </div>
                <div className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-1">
                  {place.city}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Jadwal jam buka */}
              <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3 flex items-center">
                  <i className="fa-solid fa-clock text-emerald-500 mr-2"></i>{" "}
                  Jadwal Jam Buka
                </h4>
                <div className="space-y-1">
                  {daysIndo.map((day) => {
                    const isToday = day === dayIndo;
                    const hours = place.open_hours?.[day]
                      ? place.open_hours[day].join(", ")
                      : "Tutup";
                    return (
                      <div
                        key={day}
                        className={`flex justify-between items-center py-1.5 px-2 rounded-lg text-xs ${
                          isToday
                            ? "bg-emerald-50 dark:bg-emerald-950/50 font-bold text-emerald-800 dark:text-emerald-300"
                            : "text-slate-600 dark:text-slate-400"
                        }`}
                      >
                        <span>
                          {day}{" "}
                          {isToday && (
                            <span className="text-[10px] bg-emerald-200 dark:bg-emerald-800 px-1.5 py-0.5 rounded-full ml-1">
                              Hari Ini
                            </span>
                          )}
                        </span>
                        <span>{hours}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Distribusi bintang */}
              <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3 flex items-center">
                  <i className="fa-solid fa-star-half-stroke text-amber-500 mr-2"></i>{" "}
                  Distribusi Bintang Ulasan
                </h4>
                <div className="space-y-1.5 text-xs">
                  {[5, 4, 3, 2, 1].map((stars) => {
                    const count = ratingBreakdown[String(stars)] ?? 0;
                    const pct = Math.round((count / totalRatingSum) * 100);
                    return (
                      <div key={stars} className="flex items-center space-x-2">
                        <span className="w-7 font-bold text-slate-600 dark:text-slate-400">
                          {stars} ★
                        </span>
                        <div className="flex-grow bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                          <div
                            className="bg-amber-400 h-full rounded-full"
                            style={{ width: `${pct}%` }}
                          ></div>
                        </div>
                        <span className="w-10 text-right text-[11px] text-slate-400 font-medium">
                          {count}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Fasilitas & layanan */}
            {highlights.length > 0 && (
              <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3 flex items-center">
                  <i className="fa-solid fa-list-check text-blue-500 mr-2"></i>{" "}
                  Fasilitas &amp; Layanan
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {highlights.map((h) => (
                    <span
                      key={h}
                      className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                    >
                      <i className="fa-solid fa-check text-emerald-500 mr-1.5 text-[10px]"></i>
                      {h}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Ulasan */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3 flex items-center">
                <i className="fa-solid fa-comments text-indigo-500 mr-2"></i>{" "}
                Ulasan Pengunjung Terbaru ({place.user_reviews.length})
              </h4>
              <div className="space-y-3">
                {place.user_reviews.length === 0 ? (
                  <p className="text-xs text-slate-400">
                    Belum ada rincian ulasan teks untuk tempat ini.
                  </p>
                ) : (
                  place.user_reviews.map((rev, idx) => {
                    const rating = rev.Rating || 5;
                    const stars =
                      "★".repeat(rating) + "☆".repeat(Math.max(0, 5 - rating));
                    const revImages = rev.Images ?? [];
                    return (
                      <div
                        key={rev.review_id ?? idx}
                        className="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2.5">
                            <img
                              src={
                                rev.ProfilePicture ||
                                "https://lh3.googleusercontent.com/a/default-user=s120"
                              }
                              alt={rev.Name ?? "Pengunjung"}
                              className="w-8 h-8 rounded-full object-cover"
                            />
                            <div>
                              <div className="font-bold text-xs text-slate-900 dark:text-white">
                                {rev.Name ?? "Pengunjung"}
                              </div>
                              <div className="text-[10px] text-slate-400">
                                {rev.When ?? ""}
                              </div>
                            </div>
                          </div>
                          <div className="text-amber-500 text-xs font-bold">
                            {stars}
                          </div>
                        </div>
                        <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                          {rev.Description || rev.text_original || ""}
                        </p>
                        {revImages.length > 0 && (
                          <div className="flex space-x-1.5 pt-1 overflow-x-auto custom-scrollbar">
                            {revImages.map((img, i) => (
                              <img
                                key={i}
                                src={img}
                                alt={`Foto ulasan ${i + 1}`}
                                onClick={() => window.open(img, "_blank")}
                                className="w-16 h-16 rounded-lg object-cover cursor-pointer hover:opacity-90 transition flex-shrink-0"
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer (action buttons) */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => onToggleFavorite(place.id)}
              className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition flex items-center space-x-1.5"
            >
              <i
                className={`${isFav ? "fa-solid text-rose-500" : "fa-regular"} fa-heart`}
              ></i>
              <span>{isFav ? "Tersimpan" : "Simpan"}</span>
            </button>

            {place.phone && (
              <a
                href={`tel:${place.phone}`}
                className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-semibold hover:bg-slate-200 transition flex items-center space-x-1.5"
              >
                <i className="fa-solid fa-phone text-emerald-500"></i>
                <span>{place.phone}</span>
              </a>
            )}

            {place.website && (
              <a
                href={place.website}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-semibold hover:bg-slate-200 transition flex items-center space-x-1.5"
              >
                <i className="fa-solid fa-globe text-blue-500"></i>
                <span>Website</span>
              </a>
            )}
          </div>

          <div className="flex items-center space-x-2">
            {place.street_view_url && (
              <a
                href={place.street_view_url}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3.5 py-2 rounded-xl bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 text-xs font-semibold hover:bg-blue-100 transition flex items-center space-x-1.5"
              >
                <i className="fa-solid fa-street-view"></i>
                <span>Street View 360°</span>
              </a>
            )}

            {place.link && (
              <a
                href={place.link}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition flex items-center space-x-1.5 shadow-md shadow-emerald-600/20"
              >
                <i className="fa-solid fa-diamond-turn-right"></i>
                <span>Buka di Google Maps</span>
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
