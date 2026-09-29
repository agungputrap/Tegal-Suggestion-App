import { Hono } from "hono";
import type { Env } from "../types";
import { todayJakarta } from "../geo";
import { invalidateListingsCache } from "../cache";
import { normalizePhone, sendWhatsApp } from "../whatsapp";

const router = new Hono<{ Bindings: Env }>();

// ---------------------------------------------------------
// Bot WhatsApp (fase 1 strategi #29) — antarmuka utama owner:
//   BUKA   -> check-in hari ini (pakai lokasi dasar usaha)
//   TUTUP  -> nonaktifkan check-in hari ini
//   STATUS -> status hari ini + streak + lead 7 hari terakhir
//   BANTUAN / teks lain -> pencarian penyedia live (dicatat sebagai lead)
// Adapter kirim pluggable (whatsapp.ts); tanpa FONNTE_TOKEN bot NOOP
// dan webhook tetap menjawab (dipakai test & onboarding).
// ---------------------------------------------------------
router.post("/bot/webhook", async (c) => {
  const secret = c.env.BOT_WEBHOOK_TOKEN;
  if (!secret) {
    return c.json({ error: "Bot belum dikonfigurasi (BOT_WEBHOOK_TOKEN)" }, 503);
  }
  if (c.req.header("x-bot-token") !== secret) {
    return c.json({ error: "Token webhook salah" }, 401);
  }

  const body = await parseIncoming(c);
  const sender = String(body.sender ?? "");
  const message = String(body.message ?? "").trim();
  if (!sender || !message) {
    return c.json({ error: "sender & message wajib" }, 400);
  }

  const reply = await handleIncoming(c.env, sender, message);
  try {
    await sendWhatsApp(c.env, sender, reply);
  } catch (err) {
    console.warn("Bot: gagal kirim balasan", err);
  }
  // reply ikut direspons supaya testable & adapter lain bisa memakainya
  return c.json({ status: "ok", reply });
});

async function parseIncoming(c: {
  req: { header: (k: string) => string | undefined; parseBody: () => unknown; json: () => unknown };
}): Promise<{ sender?: string; message?: string }> {
  const ctype = c.req.header("content-type") ?? "";
  if (ctype.includes("application/json")) {
    return (await c.req.json()) as { sender?: string; message?: string };
  }
  // Fonnte bisa mengirim form-encoded
  const form = (await c.req.parseBody()) as Record<string, string>;
  return { sender: form.sender, message: form.message };
}

export async function handleIncoming(
  env: Env,
  sender: string,
  message: string,
): Promise<string> {
  const provider = await providerByPhone(env, sender);
  const cmd = message.toUpperCase().trim();

  // Perintah owner butuh provider terdaftar; pencarian bebas terbuka untuk
  // siapa pun (sisi demand — orang awam bukan pengguna terdaftar).
  if (cmd === "BUKA" || cmd === "OPEN" || cmd === "1") {
    if (!provider) return onboardingText();
    return cmdBuka(env, provider);
  }
  if (cmd === "TUTUP" || cmd === "CLOSE" || cmd === "0") {
    if (!provider) return onboardingText();
    return cmdTutup(env, provider);
  }
  if (cmd === "STATUS") {
    if (!provider) return onboardingText();
    return cmdStatus(env, provider);
  }
  if (cmd === "BANTUAN" || cmd === "HELP" || cmd === "MENU") {
    return provider ? helpText(provider.name) : consumerHelpText();
  }
  return cmdCari(env, provider, message);
}

function onboardingText(): string {
  return "Halo! Untuk muncul di peta Buka Hari Ini Tegal, daftarkan usahamu dulu di web Jajan+Jasa, lalu balas pesan ini dengan BANTUAN. 🙏\n\nKalau kamu mencari jasa/jajanan, ketik saja mis. \"servis ac\" atau \"gorengan\".";
}

function consumerHelpText(): string {
  return (
    "Halo! 👋 Ini bot Buka Hari Ini Tegal.\n\n" +
    "Ketik yang kamu cari, mis. \"servis ac\", \"laundry\", \"gorengan\" — nanti kubalas yang sedang BUKA sekarang + kontak WhatsApp-nya.\n\n" +
    "Punya usaha? Daftarkan di web Jajan+Jasa biar ditemukan orang."
  );
}

// ---------------------------------------------------------
type ProviderRow = {
  id: string;
  name: string;
  phone: string;
  suspended: number;
  approval_status: string;
  base_lat: number | null;
  base_lng: number | null;
};

async function providerByPhone(env: Env, sender: string): Promise<ProviderRow | null> {
  // Nomor tersimpan apa adanya hasil normalisasi registrasi (0xxxxxxxxx);
  // pengirim WA datang sebagai 62xxxxxxxxxx — bandingkan kedua bentuk.
  const { e164, local } = normalizePhone(sender);
  return env.DB.prepare(
    `SELECT id, name, phone, suspended, approval_status, base_lat, base_lng
     FROM providers WHERE phone = ? OR phone = ? LIMIT 1`,
  )
    .bind(local, e164)
    .first<ProviderRow>();
}

async function cmdBuka(env: Env, provider: ProviderRow): Promise<string> {
  if (provider.suspended) {
    return `Maaf, akun "${provider.name}" sedang dinonaktifkan admin. Hubungi pengelola.`;
  }
  if (provider.approval_status !== "approved") {
    return `Pendaftaran "${provider.name}" belum disetujui admin. Kirim kode verifikasi ke admin via WhatsApp dulu ya.`;
  }
  if (provider.base_lat == null || provider.base_lng == null) {
    return `Lokasi dasar usaha belum ada. Buka portal pemilik sekali untuk melengkapi lokasi, setelah itu BUKA lewat sini bisa jalan. 🙏`;
  }

  const date = todayJakarta();
  await env.DB.prepare(
    `INSERT INTO checkins (id, provider_id, date, lat, lng, is_active)
     VALUES (?, ?, ?, ?, ?, 1)
     ON CONFLICT(provider_id, date)
     DO UPDATE SET lat = excluded.lat, lng = excluded.lng, is_active = 1`,
  )
    .bind(crypto.randomUUID(), provider.id, date, provider.base_lat, provider.base_lng)
    .run();
  await invalidateListingsCache(env, date);

  const streak = await streakForProvider(env, provider.id, date);
  const streakText = streak >= 2 ? ` 🔥 ${streak} hari beruntun!` : "";
  return `✅ ${provider.name} BUKA hari ini!${streakText}\nUsahamu sekarang tampil di peta Buka Hari Ini.`;
}

async function cmdTutup(env: Env, provider: ProviderRow): Promise<string> {
  const date = todayJakarta();
  const result = await env.DB.prepare(
    "UPDATE checkins SET is_active = 0 WHERE provider_id = ? AND date = ?",
  )
    .bind(provider.id, date)
    .run();
  await invalidateListingsCache(env, date);

  if (result.meta.changes === 0) {
    return `${provider.name} memang belum tercatat buka hari ini. Balas BUKA kalau mulai jualan. 💪`;
  }
  return ` ✓ ${provider.name} ditutup untuk hari ini. Istirahat yang cukup, sampai besok! 👋`;
}

async function cmdStatus(env: Env, provider: ProviderRow): Promise<string> {
  const date = todayJakarta();
  const today = await env.DB.prepare(
    "SELECT is_active FROM checkins WHERE provider_id = ? AND date = ?",
  )
    .bind(provider.id, date)
    .first<{ is_active: number }>();

  const streak = await streakForProvider(env, provider.id, date);

  const week = await env.DB.prepare(
    `SELECT COUNT(*) as count FROM leads
     WHERE provider_id = ? AND date >= date(?, '-6 days')`,
  )
    .bind(provider.id, date)
    .first<{ count: number }>();

  const statusText = today?.is_active
    ? "✅ BUKA hari ini"
    : "⭕ Belum buka hari ini (balas BUKA untuk tampil di peta)";
  const streakText = streak >= 2 ? `\n🔥 Beruntun: ${streak} hari` : "";
  const leads = week?.count ?? 0;
  const leadText =
    leads > 0
      ? `\n👥 ${leads} orang mencari usaha seperti milikmu minggu ini.`
      : `\n👥 Belum ada pencari minggu ini — pastikan kamu buka & datamu lengkap ya.`;

  return `📊 STATUS — ${provider.name}\n${statusText}${streakText}${leadText}`;
}

function helpText(name: string): string {
  return (
    `Halo ${name}! 👋 Ini bot Buka Hari Ini Tegal.\n\n` +
    `BUKA — tampilkan usahamu di peta hari ini\n` +
    `TUTUP — sembunyikan usahamu hari ini\n` +
    `STATUS — cek status, streak & pencari\n` +
    `BANTUAN — ulangkan menu ini\n\n` +
    `Atau cari usaha lain: ketik saja, mis. "gorengan" atau "servis ac".`
  );
}

// Pencarian pelanggan: teks bebas -> penyedia live yang cocok (maks 3).
// Terbuka untuk nomor tak terdaftar (sisi demand). Setiap provider yang
// ditampilkan dicatat 1 lead.
async function cmdCari(
  env: Env,
  inquirer: ProviderRow | null,
  message: string,
): Promise<string> {
  const date = todayJakarta();
  const keyword = `%${message.replace(/[%_]/g, "").trim()}%`;

  const { results } = await env.DB.prepare(
    `SELECT p.id, p.name, p.phone, c.name as category, p.area
     FROM checkins ck
     JOIN providers p ON p.id = ck.provider_id
     JOIN categories c ON c.id = p.category_id
     WHERE ck.date = ? AND ck.is_active = 1 AND p.suspended = 0
       AND p.approval_status = 'approved' AND p.id != COALESCE(?, '')
       AND (p.name LIKE ? OR c.name LIKE ?)
     ORDER BY c.name LIMIT 3`,
  )
    .bind(date, inquirer?.id ?? "", keyword, keyword)
    .all<{ id: string; name: string; phone: string; category: string; area: string | null }>();

  if (results.length === 0) {
    return (
      `Waduh, belum ada yang cocok dengan "${message}" yang sedang buka sekarang. 😔\n` +
      `Coba kata lain (mis. "gorengan", "laundry", "servis ac") — atau datang lagi nanti ya!`
    );
  }

  for (const r of results) {
    await env.DB.prepare(
      "INSERT INTO leads (id, provider_id, date, query) VALUES (?, ?, ?, ?)",
    )
      .bind(crypto.randomUUID(), r.id, date, message.slice(0, 100))
      .run();
  }

  const lines = results.map(
    (r, i) =>
      `${i + 1}. ${r.name}${r.area ? ` (${r.area})` : ""} — ${r.category}\n   wa.me/${normalizePhone(r.phone).e164}`,
  );
  return `🔍 Yang buka hari ini untuk "${message}":\n\n${lines.join("\n")}\n\nLead ini tercatat untuk masing-masing usaha. 👍`;
}

// Streak = hari beruntun check-in aktif berakhir hari ini (jendela 60 hari).
// Logika sama dengan GET /listings (disederhanakan untuk satu provider).
export async function streakForProvider(
  env: Env,
  providerId: string,
  today: string,
): Promise<number> {
  const { results } = await env.DB.prepare(
    `SELECT date FROM checkins
     WHERE provider_id = ? AND is_active = 1 AND date >= date(?, '-60 days')
     ORDER BY date DESC`,
  )
    .bind(providerId, today)
    .all<{ date: string }>();

  let streak = 0;
  for (const row of results) {
    const expected = minusDays(today, streak);
    if (row.date === expected) streak++;
    else break;
  }
  return streak;
}

function minusDays(date: string, n: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().slice(0, 10);
}

// ---------------------------------------------------------
// Ping harian — dipanggil cron 0 23 * * * UTC (06:00 WIB).
// Hanya kirim jika adapter aktif (FONNTE_TOKEN) supaya metrik ping->BUKA
// jujur; setiap kirim dicatat di bot_pings (UNIQUE per hari).
// ---------------------------------------------------------
export async function sendDailyPing(env: Env): Promise<number> {
  if (!env.FONNTE_TOKEN) {
    console.warn("Bot: FONNTE_TOKEN belum diset — ping harian dilewati.");
    return 0;
  }

  const date = todayJakarta();
  const { results } = await env.DB.prepare(
    `SELECT id, name, phone FROM providers
     WHERE approval_status = 'approved' AND suspended = 0 AND phone != ''
     ORDER BY name`,
  ).all<{ id: string; name: string; phone: string }>();

  let sent = 0;
  for (const p of results) {
    try {
      await sendWhatsApp(
        env,
        p.phone,
        `Selamat pagi ${p.name}! ☀️\nBuka hari ini? Balas BUKA untuk tampil di peta Buka Hari Ini, atau TUTUP kalau libur.`,
      );
      await env.DB.prepare(
        `INSERT INTO bot_pings (id, provider_id, date) VALUES (?, ?, ?)
         ON CONFLICT(provider_id, date) DO NOTHING`,
      )
        .bind(crypto.randomUUID(), p.id, date)
        .run();
      sent++;
    } catch (err) {
      console.warn(`Bot: ping gagal ke ${p.name}`, err);
    }
  }
  return sent;
}

export const botRoutes = router;
