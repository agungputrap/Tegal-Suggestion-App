export type Env = {
  DB: D1Database;
  ACTIVE_CACHE: KVNamespace;
  PHOTOS: R2Bucket;
  ENVIRONMENT: string;
  ADMIN_TOKEN: string; // set lewat `wrangler secret put ADMIN_TOKEN`, bukan di wrangler.toml
};

export type Provider = {
  id: string;
  name: string;
  phone: string;
  category_type: "jajanan" | "jasa";
  category_id: string;
  description: string | null;
  photo_url: string | null;
  base_lat: number | null;
  base_lng: number | null;
  service_radius_km: number;
  suspended: number;
  created_at: string;
};

export type Checkin = {
  id: string;
  provider_id: string;
  date: string;
  lat: number;
  lng: number;
  is_active: number;
  created_at: string;
};

// Hasil gabungan provider + checkin aktif hari ini, dipakai untuk listing
export type ActiveListing = Provider & {
  checkin_lat: number;
  checkin_lng: number;
  distance_km?: number;
};
