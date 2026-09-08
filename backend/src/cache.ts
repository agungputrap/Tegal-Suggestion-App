import type { Env } from "./types";

// KV hanya cache: D1 tetap sumber kebenaran. Semua penulisan yang mengubah
// listing aktif hari ini memanggil helper ini — jangan tulis key KV manual.
export async function invalidateListingsCache(env: Env, date: string) {
  await env.ACTIVE_CACHE.delete(`listings:${date}`);
}
