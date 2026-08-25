const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8787";
const ADMIN_TOKEN_KEY = "jajanjasa:adminToken";

export function getStoredAdminToken(): string | null {
  return localStorage.getItem(ADMIN_TOKEN_KEY);
}

export function setStoredAdminToken(token: string) {
  localStorage.setItem(ADMIN_TOKEN_KEY, token);
}

export function clearStoredAdminToken() {
  localStorage.removeItem(ADMIN_TOKEN_KEY);
}

function authHeaders(token: string): HeadersInit {
  return { Authorization: `Bearer ${token}` };
}

export async function verifyAdminToken(token: string): Promise<boolean> {
  const res = await fetch(`${API_URL}/admin/me`, {
    headers: authHeaders(token),
  });
  return res.ok;
}

export type AdminStats = {
  total_providers: number;
  active_today: number;
  by_type: { type: string; n: number }[];
  by_category: { category: string; n: number }[];
};

export async function fetchAdminStats(token: string): Promise<AdminStats> {
  const res = await fetch(`${API_URL}/admin/stats`, {
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error("Gagal memuat statistik");
  return res.json();
}

export type AdminProvider = {
  id: string;
  name: string;
  phone: string;
  category_type: "jajanan" | "jasa";
  category_id: string;
  photo_url: string | null;
  suspended: number;
  active_today: number;
  created_at: string;
};

export async function fetchAdminProviders(
  token: string,
  filters?: { type?: "jajanan" | "jasa"; status?: "active" | "suspended" | "all"; q?: string }
): Promise<AdminProvider[]> {
  const qs = new URLSearchParams();
  if (filters?.type) qs.set("type", filters.type);
  if (filters?.status) qs.set("status", filters.status);
  if (filters?.q) qs.set("q", filters.q);

  const res = await fetch(`${API_URL}/admin/providers?${qs.toString()}`, {
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error("Gagal memuat daftar provider");
  const data = await res.json();
  return data.providers;
}

export async function deactivateTodayCheckin(
  token: string,
  id: string
): Promise<void> {
  const res = await fetch(
    `${API_URL}/admin/providers/${id}/deactivate-checkin`,
    { method: "POST", headers: authHeaders(token) }
  );
  if (!res.ok) throw new Error("Gagal menonaktifkan checkin");
}

export async function setProviderSuspended(
  token: string,
  id: string,
  suspended: boolean
): Promise<void> {
  const res = await fetch(`${API_URL}/admin/providers/${id}`, {
    method: "PATCH",
    headers: { ...authHeaders(token), "Content-Type": "application/json" },
    body: JSON.stringify({ suspended }),
  });
  if (!res.ok) throw new Error("Gagal mengubah status provider");
}

export async function deleteProvider(token: string, id: string): Promise<void> {
  const res = await fetch(`${API_URL}/admin/providers/${id}`, {
    method: "DELETE",
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error("Gagal menghapus provider");
}

export async function deleteProviderPhoto(
  token: string,
  id: string
): Promise<void> {
  const res = await fetch(`${API_URL}/admin/providers/${id}/photo`, {
    method: "DELETE",
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error("Gagal menghapus foto");
}

export type AdminCategory = {
  id: string;
  name: string;
  type: "jajanan" | "jasa";
  icon: string;
};

export async function fetchAdminCategories(
  token: string
): Promise<AdminCategory[]> {
  const res = await fetch(`${API_URL}/admin/categories`, {
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error("Gagal memuat kategori");
  const data = await res.json();
  return data.categories;
}

export async function createCategory(
  token: string,
  input: { id: string; name: string; type: "jajanan" | "jasa"; icon: string }
): Promise<void> {
  const res = await fetch(`${API_URL}/admin/categories`, {
    method: "POST",
    headers: { ...authHeaders(token), "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Gagal menambah kategori" }));
    throw new Error(err.error ?? "Gagal menambah kategori");
  }
}

export async function deleteCategory(token: string, id: string): Promise<void> {
  const res = await fetch(`${API_URL}/admin/categories/${id}`, {
    method: "DELETE",
    headers: authHeaders(token),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Gagal menghapus kategori" }));
    throw new Error(err.error ?? "Gagal menghapus kategori");
  }
}
