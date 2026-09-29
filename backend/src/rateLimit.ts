// Rate limiter fixed-window in-memory, per kunci (IP + route).
// BEST-EFFORT: state hidup per isolate Workers (bukan global), jadi ini
// memperlambat spam loop sederhana — bukan proteksi DDoS (itu layer
// Cloudflare). Fase 0 strategi #27; upgrade ke KV/D1 counter jika perlu.
const windows = new Map<string, { count: number; resetAt: number }>();

const MAX_KEYS = 10_000;

export function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): boolean {
  const now = Date.now();

  // Pembersihan murah supaya Map tidak tumbuh tanpa batas
  if (windows.size > MAX_KEYS) {
    for (const [k, w] of windows) {
      if (now > w.resetAt) windows.delete(k);
    }
  }

  const w = windows.get(key);
  if (!w || now > w.resetAt) {
    windows.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (w.count >= limit) return false;
  w.count++;
  return true;
}

// Cloudflare selalu menyuntikkan IP klien asli di header ini.
export function clientIp(headers: Headers): string {
  return (
    headers.get("CF-Connecting-IP") ??
    headers.get("X-Forwarded-For") ??
    "unknown"
  );
}
