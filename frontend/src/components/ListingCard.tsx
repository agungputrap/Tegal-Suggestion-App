import type { Listing } from "../api";
import { resolvePhotoUrl, waChatLink } from "../api";
import { CARD } from "./ui";

type Props = {
  listing: Listing;
  categoryName: string;
  categoryIcon?: string;
};

function todayLabel(): string {
  return new Date().toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
  });
}

export function ListingCard({ listing, categoryName, categoryIcon }: Props) {
  const photoSrc = resolvePhotoUrl(listing.photo_url);
  const isJajanan = listing.category_type === "jajanan";

  return (
    <div
      className={`${CARD} overflow-hidden hover:shadow-lg hover:-translate-y-0.5 transition duration-300 flex flex-col group`}
    >
      {/* Media: foto provider, atau tile emoji kategori */}
      <div className="relative h-40 overflow-hidden bg-slate-100 dark:bg-slate-800">
        {photoSrc ? (
          <img
            className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
            src={photoSrc}
            alt={listing.name}
            loading="lazy"
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
        <h3 className="font-bold text-slate-900 dark:text-white text-base line-clamp-1">
          {listing.name}
        </h3>

        <div className="flex items-center space-x-2 text-xs text-slate-500 dark:text-slate-400 mt-1.5 mb-3">
          {listing.distance_km != null && (
            <span className="inline-flex items-center">
              <i className="fa-solid fa-location-dot text-rose-400 mr-1"></i>
              {listing.distance_km.toFixed(1)} km
            </span>
          )}
          {listing.description && (
            <>
              {listing.distance_km != null && (
                <span className="text-slate-400">•</span>
              )}
              <span className="line-clamp-1">{listing.description}</span>
            </>
          )}
        </div>

        <div className="mt-auto pt-3 border-t border-slate-100 dark:border-slate-800">
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
