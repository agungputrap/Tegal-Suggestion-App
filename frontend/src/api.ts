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
  area: string | null;
  halal: number | null;
  views: number;
};

// Item menu/price-list penyedia (bentuk sama dengan backend/src/types.ts)
export type Item = {
  id: string;
  provider_id: string;
  name: string;
  price: number;
  note: string | null;
  available: number;
  sort_order: number;
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
  file: File,
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
  category?: string;
  area?: string;
  halal?: boolean;
  sort?: "trending";
  lat?: number;
  lng?: number;
  radius?: number;
}): Promise<Listing[]> {
  const qs = new URLSearchParams();
  if (params.type) qs.set("type", params.type);
  if (params.category) qs.set("category", params.category);
  if (params.area) qs.set("area", params.area);
  if (params.halal) qs.set("halal", "1");
  if (params.sort) qs.set("sort", params.sort);
  if (params.lat != null) qs.set("lat", String(params.lat));
  if (params.lng != null) qs.set("lng", String(params.lng));
  if (params.radius != null) qs.set("radius", String(params.radius));

  const res = await fetch(`${API_URL}/listings?${qs.toString()}`);
  if (!res.ok) throw new Error("Gagal memuat listing");
  const data = await res.json();
  return data.listings;
}

// Items penyedia (menu / daftar harga) untuk halaman detail (#5/#13)
export async function fetchProviderItems(id: string): Promise<Item[]> {
  const res = await fetch(`${API_URL}/providers/${id}/items`);
  if (!res.ok) throw new Error("Gagal memuat item");
  const data = await res.json();
  return data.items;
}

// Fire-and-forget: catat 1 view saat detail dibuka (#4b trending)
export function trackProviderView(id: string): void {
  fetch(`${API_URL}/providers/${id}/view`, { method: "POST" }).catch(() => {
    /* view tracking tidak boleh mengganggu UI */
  });
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
    `Halo ${providerName}, saya lihat statusnya aktif hari ini di Buka Hari Ini. Masih bisa?`,
  );
  return `https://wa.me/${digits}?text=${text}`;
}

// ---------------------------------------------------------
// Portal pemilik (/kelola/{token}) — auth via token di path
// ---------------------------------------------------------
export type PortalItem = {
  id: string;
  name: string;
  price: number;
  note: string | null;
  available: number;
  sort_order: number;
};

export type PortalData = {
  provider: Provider;
  items: PortalItem[];
  today: { open: boolean; note?: string | null };
};

async function portalFetch(
  token: string,
  path: string,
  init?: RequestInit,
): Promise<Response> {
  return fetch(`${API_URL}/kelola/${token}${path}`, init);
}

async function portalJson<T>(res: Response, fallbackError: string): Promise<T> {
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: fallbackError }));
    throw new Error(err.error ?? fallbackError);
  }
  return res.json();
}

export async function fetchPortal(token: string): Promise<PortalData> {
  return portalFetch(token, "").then((res) =>
    portalJson<PortalData>(res, "Gagal memuat portal"),
  );
}

export async function portalOpen(
  token: string,
  input: { item_ids?: string[]; note?: string; lat?: number; lng?: number },
): Promise<{ status: string; date: string }> {
  return portalFetch(token, "/open", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  }).then((res) => portalJson(res, "Gagal buka hari ini"));
}

export async function portalClose(token: string): Promise<{ status: string }> {
  return portalFetch(token, "/close", { method: "POST" }).then((res) =>
    portalJson(res, "Gagal tutup hari ini"),
  );
}

export async function portalUpdateBusiness(
  token: string,
  input: {
    name?: string;
    description?: string;
    area?: string;
    halal?: boolean;
    service_radius_km?: number;
    base_lat?: number;
    base_lng?: number;
  },
): Promise<void> {
  const res = await portalFetch(token, "/business", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error("Gagal menyimpan data usaha");
}

export async function portalCreateItem(
  token: string,
  input: { name: string; price: number; note?: string },
): Promise<void> {
  const res = await portalFetch(token, "/items", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const err = await res
      .json()
      .catch(() => ({ error: "Gagal menambah item" }));
    throw new Error(err.error ?? "Gagal menambah item");
  }
}

export async function portalUpdateItem(
  token: string,
  itemId: string,
  input: {
    name?: string;
    price?: number;
    note?: string;
    available?: boolean;
    sort_order?: number;
  },
): Promise<void> {
  const res = await portalFetch(token, `/items/${itemId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error("Gagal menyimpan item");
}

export async function portalDeleteItem(
  token: string,
  itemId: string,
): Promise<void> {
  const res = await portalFetch(token, `/items/${itemId}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Gagal menghapus item");
}
