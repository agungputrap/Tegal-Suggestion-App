// Tipe data halaman Explorer — port dari model data ref/index.html
// (window.EMBEDDED_PLACES), kini disajikan lewat GET /places.

export type AboutOption = { name: string; enabled: boolean };
export type AboutSection = { name?: string; options?: AboutOption[] };

export type PlaceImage = { title?: string; image: string };

export type UserReview = {
  Name?: string;
  ProfilePicture?: string;
  Rating?: number;
  Description?: string;
  Images?: string[] | null;
  When?: string;
  text_original?: string;
  review_id?: string;
};

// Kunci hari jam buka pakai nama hari Indonesia (Senin…Minggu),
// sedangkan popular_times pakai nama hari Inggris (Monday…Sunday).
export type OpenHours = Record<string, string[]>;
export type PopularTimes = Record<string, Record<string, number>>;

// Satu tempat F&B — bentuk yang dipakai seluruh komponen Explorer.
export type Place = {
  id: string;
  title: string;
  category: string;
  address: string;
  city: string;
  rating: number | null;
  review_count: number;
  price_range: string;
  phone: string;
  website: string;
  thumbnail: string;
  latitude: number;
  longitude: number;
  link: string;
  street_view_url: string;
  plus_code: string;
  open_hours: OpenHours | null;
  popular_times: PopularTimes | null;
  images: PlaceImage[];
  about: AboutSection[];
  user_reviews: UserReview[];
  reviews_per_rating: Record<string, number> | null;
};

// Bentuk mentah dari GET /places — kolom JSON dikirim sebagai string
// agar Worker tidak boros CPU parse (lihat backend/src/types.ts).
export type PlaceRecord = Omit<
  Place,
  | "address"
  | "city"
  | "price_range"
  | "phone"
  | "website"
  | "thumbnail"
  | "link"
  | "street_view_url"
  | "plus_code"
  | "open_hours"
  | "popular_times"
  | "images"
  | "about"
  | "user_reviews"
  | "reviews_per_rating"
> & {
  address: string | null;
  city: string | null;
  price_range: string | null;
  phone: string | null;
  website: string | null;
  thumbnail: string | null;
  link: string | null;
  street_view_url: string | null;
  plus_code: string | null;
  open_hours: string | null;
  popular_times: string | null;
  images: string | null;
  about: string | null;
  user_reviews: string | null;
  reviews_per_rating: string | null;
};

// JSON.parse aman — data hasil scrape GMaps tidak menjamin struktur valid.
function parseJson<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function toPlace(row: PlaceRecord): Place {
  return {
    id: row.id,
    title: row.title,
    category: row.category,
    address: row.address ?? "",
    city: row.city ?? "",
    rating: row.rating,
    review_count: row.review_count ?? 0,
    price_range: row.price_range ?? "",
    phone: row.phone ?? "",
    website: row.website ?? "",
    thumbnail: row.thumbnail ?? "",
    latitude: row.latitude,
    longitude: row.longitude,
    link: row.link ?? "",
    street_view_url: row.street_view_url ?? "",
    plus_code: row.plus_code ?? "",
    open_hours: parseJson<OpenHours | null>(row.open_hours, null),
    popular_times: parseJson<PopularTimes | null>(row.popular_times, null),
    images: parseJson<PlaceImage[]>(row.images, []),
    about: parseJson<AboutSection[]>(row.about, []),
    user_reviews: parseJson<UserReview[]>(row.user_reviews, []),
    reviews_per_rating: parseJson<Record<string, number> | null>(
      row.reviews_per_rating,
      null
    ),
  };
}
