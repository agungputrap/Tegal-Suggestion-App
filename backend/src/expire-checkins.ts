import type { Env } from "./types";
import { todayJakarta } from "./geo";
import { invalidateListingsCache } from "./cache";

// Dipanggil cron 0 17 * * * UTC (00:00 WIB): tandai semua checkin yang
// tanggalnya bukan hari ini jadi non-aktif. Data tidak dihapus (histori).
export async function expireYesterdayCheckins(env: Env) {
  const today = todayJakarta();
  await env.DB.prepare(
    "UPDATE checkins SET is_active = 0 WHERE date != ? AND is_active = 1"
  )
    .bind(today)
    .run();

  await invalidateListingsCache(env, today);
}
