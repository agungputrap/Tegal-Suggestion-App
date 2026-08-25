import type { Listing } from "../api";
import { resolvePhotoUrl, waChatLink } from "../api";

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
  const barColor =
    listing.category_type === "jajanan"
      ? "var(--accent-jajanan)"
      : "var(--accent-jasa)";

  const photoSrc = resolvePhotoUrl(listing.photo_url);

  return (
    <div className="card">
      <span className="stamp">Aktif · {todayLabel()}</span>
      <div className="card__category-bar" style={{ background: barColor }} />
      {photoSrc ? (
        <img
          className="card__thumb"
          src={photoSrc}
          alt={listing.name}
          loading="lazy"
        />
      ) : (
        categoryIcon && (
          <div className="card__icon" style={{ background: barColor }}>
            {categoryIcon}
          </div>
        )
      )}
      <div className="card__body">
        <p className="card__name">{listing.name}</p>
        <p className="card__category">{categoryName}</p>
        <div className="card__meta">
          {listing.distance_km != null && (
            <span>{listing.distance_km.toFixed(1)} km</span>
          )}
        </div>
      </div>
      <a
        className="card__chat-btn"
        href={waChatLink(listing.phone, listing.name)}
        target="_blank"
        rel="noreferrer"
      >
        Chat
      </a>
    </div>
  );
}
