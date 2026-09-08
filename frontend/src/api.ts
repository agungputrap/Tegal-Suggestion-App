import { toPlace, type Place } from "./explorer/types";

export type { Place } from "./explorer/types";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8787";

export type Category = {
  id: string;
  name: string;
  type: "jajanan" | "jasa";
  icon: string;
};

export type Listing = {
  id: string;
  name: string;
  phone: string;
  category_type: "jajanan" | "jasa";
  category_id: string;
  description: string | null;
  photo_url: string | null;
  checkin_lat: number;
  checkin_lng: number;
  distance_km?: number;
};

// photo_url yang disimpan backend berbentuk path relatif ("/photos/...")
// karena diserve langsung dari Worker yang sama, jadi tinggal digabung
// dengan base URL API.
export function resolvePhotoUrl(photoUrl: string | null): string | null {
  if (!photoUrl) return null;
  return `${API_URL}${photoUrl}`;
}

export async function uploadProviderPhoto(
  providerId: string,
  file: File
): Promise<string> {
  const res = await fetch(`${API_URL}/providers/${providerId}/photo`, {
    method: "POST",
    headers: { "Content-Type": file.type },
    body: file,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Upload gagal" }));
    throw new Error(err.error ?? "Upload gagal");
  }

  const data = await res.json();
  return data.photo_url as string;
}

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
  area: string | null;
  halal: number | null;
  approval_status: "pending" | "approved" | "rejected";
};

// Hasil registrasi — owner_token & verify_code HANYA dikembalikan sekali
// di sini, jadi harus langsung ditampilkan/disimpan di sisi pemilik.
export type RegistrationResult = {
  id: string;
  owner_token: string;
  verify_code: string;
};

export async function createProvider(input: {
  name: string;
  phone: string;
  category_type: "jajanan" | "jasa";
  category_id: string;
  description?: string;
  base_lat?: number;
  base_lng?: number;
  service_radius_km?: number;
  area?: string;
  halal?: boolean;
}): Promise<RegistrationResult> {
  const res = await fetch(`${API_URL}/providers`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Pendaftaran gagal" }));
    throw new Error(err.error ?? "Pendaftaran gagal");
  }

  return res.json();
}

export async function fetchProvider(id: string): Promise<Provider | null> {
  const res = await fetch(`${API_URL}/providers/${id}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error("Gagal memuat data penyedia");
  const data = await res.json();
  return data.provider;
}

export async function checkin(input: {
  provider_id: string;
  lat: number;
  lng: number;
}): Promise<{ date: string }> {
  const res = await fetch(`${API_URL}/checkins`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Checkin gagal" }));
    throw new Error(err.error ?? "Checkin gagal");
  }

  return res.json();
}

export async function fetchCategories(): Promise<Category[]> {
  const res = await fetch(`${API_URL}/categories`);
  if (!res.ok) throw new Error("Gagal memuat kategori");
  const data = await res.json();
  return data.categories;
}

export async function fetchListings(params: {
  type?: "jajanan" | "jasa";
  lat?: number;
  lng?: number;
  radius?: number;
}): Promise<Listing[]> {
  const qs = new URLSearchParams();
  if (params.type) qs.set("type", params.type);
  if (params.lat != null) qs.set("lat", String(params.lat));
  if (params.lng != null) qs.set("lng", String(params.lng));
  if (params.radius != null) qs.set("radius", String(params.radius));

  const res = await fetch(`${API_URL}/listings?${qs.toString()}`);
  if (!res.ok) throw new Error("Gagal memuat listing");
  const data = await res.json();
  return data.listings;
}

// Dataset F&B Tegal dari Google Maps (halaman Explorer).
// Payload besar (~1.5MB) — kolom JSON di-parse sekali di sini.
export async function fetchPlaces(): Promise<Place[]> {
  const res = await fetch(`${API_URL}/places`);
  if (!res.ok) throw new Error("Gagal memuat data places");
  const data = await res.json();
  return (data.places ?? []).map(toPlace);
}

export function waChatLink(phone: string, providerName: string): string {
  const digits = phone.replace(/^0/, "62").replace(/\D/g, "");
  const text = encodeURIComponent(
    `Halo ${providerName}, saya lihat statusnya aktif hari ini di Buka Hari Ini. Masih bisa?`
  );
  return `https://wa.me/${digits}?text=${text}`;
}
