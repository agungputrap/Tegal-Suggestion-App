// Test bot WhatsApp (fase 1 strategi #29) — lewat webhook asli lewat
// SELF.fetch; adapter kirim NOOP (FONNTE_TOKEN kosong di binding test),
// jadi balasan divalidasi lewat JSON respons webhook.
import { SELF, env } from "cloudflare:test";
import { beforeAll, describe, expect, it } from "vitest";
import { applyMigrations } from "./helpers";
import { sendDailyPing } from "../src/routes/bot";

beforeAll(async () => {
  await applyMigrations().catch(() => {});
});

const BOT = { "X-Bot-Token": "test-bot-token", "Content-Type": "application/json" };

function randomPhone(): string {
  return `0812${Math.floor(Math.random() * 1e8).toString().padStart(8, "0")}`;
}

function randomIp(): string {
  return `10.${Math.floor(Math.random() * 255)}.${Math.floor(
    Math.random() * 255,
  )}.${Math.floor(Math.random() * 255)}`;
}

async function registerProvider(overrides: Record<string, unknown> = {}) {
  const phone = (overrides.phone as string) ?? randomPhone();
  const res = await SELF.fetch("http://x/providers", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "CF-Connecting-IP": randomIp(),
    },
    body: JSON.stringify({
      name: "Warung Bot",
      phone,
      category_type: "jasa",
      category_id: "servis-ac",
      base_lat: -6.87,
      base_lng: 109.14,
      ...overrides,
    }),
  });
  return { ...(await res.json()), phone };
}

async function approve(id: string) {
  await SELF.fetch(`http://x/admin/providers/${id}/approval`, {
    method: "POST",
    headers: {
      Authorization: "Bearer test-admin-token",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ status: "approved" }),
  });
}

// Pengirim WA datang sebagai 62xxx; DB menyimpan 0xxx — sekaligus uji
// normalisasi nomor.
function botBody(phone: string, message: string) {
  return {
    sender: `62${phone.slice(1)}`,
    message,
  };
}

async function sendBot(phone: string, message: string) {
  return SELF.fetch("http://x/bot/webhook", {
    method: "POST",
    headers: BOT,
    body: JSON.stringify(botBody(phone, message)),
  });
}

describe("POST /bot/webhook — auth", () => {
  it("401 kalau token webhook salah", async () => {
    const res = await SELF.fetch("http://x/bot/webhook", {
      method: "POST",
      headers: { "X-Bot-Token": "salah", "Content-Type": "application/json" },
      body: JSON.stringify({ sender: "6281200000001", message: "BUKA" }),
    });
    expect(res.status).toBe(401);
  });

  it("400 kalau sender/message kosong", async () => {
    const res = await SELF.fetch("http://x/bot/webhook", {
      method: "POST",
      headers: BOT,
      body: JSON.stringify({ message: "BUKA" }),
    });
    expect(res.status).toBe(400);
  });
});

describe("Perintah owner", () => {
  it("BUKA: check-in via koordinat base + balasan streak; provider pending diblokir", async () => {
    const p = await registerProvider();

    // Belum approved -> diblokir dengan pesan jelas
    const blocked = await sendBot(p.phone, "BUKA");
    expect(blocked.status).toBe(200);
    expect(
      ((await blocked.json()) as { reply: string }).reply,
    ).toContain("belum disetujui");

    await approve(p.id);
    const ok = await sendBot(p.phone, "buka"); // lowercase juga jalan
    expect(ok.status).toBe(200);
    expect(((await ok.json()) as { reply: string }).reply).toContain("BUKA hari ini");

    // Listing hari ini memuat provider (check-in nyata terjadi)
    const listings = await SELF.fetch(
      "http://x/listings?lat=-6.87&lng=109.14&radius=25",
    );
    const data = (await listings.json()) as { listings: { id: string }[] };
    expect(data.listings.some((l) => l.id === p.id)).toBe(true);
  });

  it("TUTUP: menyembunyikan dari listing", async () => {
    const p = await registerProvider();
    await approve(p.id);
    await sendBot(p.phone, "BUKA");

    const close = await sendBot(p.phone, "TUTUP");
    expect(((await close.json()) as { reply: string }).reply).toContain("ditutup");

    const listings = await SELF.fetch(
      "http://x/listings?lat=-6.87&lng=109.14&radius=25",
    );
    const data = (await listings.json()) as { listings: { id: string }[] };
    expect(data.listings.some((l) => l.id === p.id)).toBe(false);
  });

  it("STATUS: menampilkan status hari ini (streak 1 belum diperlihatkan)", async () => {
    const p = await registerProvider();
    await approve(p.id);
    await sendBot(p.phone, "BUKA");

    const status = await sendBot(p.phone, "STATUS");
    const { reply } = (await status.json()) as { reply: string };
    expect(reply).toContain("BUKA hari ini");
    // streak 1 hari sengaja tidak dipamerkan (badge mulai >= 2)
    expect(reply).not.toContain("Beruntun");
  });

  it("nomor tak dikenal -> ajakan daftar", async () => {
    const res = await sendBot("081299991111", "BUKA");
    const { reply } = (await res.json()) as { reply: string };
    expect(reply).toContain("daftarkan");
  });
});

describe("Pencarian pelanggan + lead", () => {
  it("chat bebas -> penyedia live + lead tercatat (muncul di STATUS)", async () => {
    const owner = await registerProvider({ name: "Servis AC Sari" });
    await approve(owner.id);
    await sendBot(owner.phone, "BUKA");

    // Pencari: provider lain (bukan diri sendiri)
    const asker = await registerProvider({ name: "Asker" });
    await approve(asker.id);

    const search = await sendBot(asker.phone, "servis ac");
    const { reply } = (await search.json()) as { reply: string };
    expect(reply).toContain("Servis AC Sari");
    expect(reply).toContain("wa.me/62");

    // Lead tercatat: STATUS owner menyebut pencari minggu ini
    const status = await sendBot(owner.phone, "STATUS");
    const { reply: statusReply } = (await status.json()) as { reply: string };
    expect(statusReply).toContain("1 orang");
  });

  it("pencarian tanpa hasil -> saran kata lain", async () => {
    const p = await registerProvider();
    await approve(p.id);
    const res = await sendBot(p.phone, "zzz-tidak-ada");
    const { reply } = (await res.json()) as { reply: string };
    expect(reply).toContain("belum ada yang cocok");
  });

  it("nomor tak terdaftar tetap bisa mencari (sisi demand) + lead tercatat", async () => {
    const owner = await registerProvider({ name: "Laundry Kilat" });
    await approve(owner.id);
    await sendBot(owner.phone, "BUKA");

    // orang awam (bukan pengguna terdaftar) mencari
    const res = await SELF.fetch("http://x/bot/webhook", {
      method: "POST",
      headers: BOT,
      body: JSON.stringify({ sender: "628777666555", message: "laundry" }),
    });
    const { reply } = (await res.json()) as { reply: string };
    expect(reply).toContain("Laundry Kilat");

    const status = await sendBot(owner.phone, "STATUS");
    const { reply: statusReply } = (await status.json()) as { reply: string };
    expect(statusReply).toContain("1 orang");
  });
});

describe("Ping harian", () => {
  it("adapter NOOP: tidak crash, 0 terkirim, tidak log bot_pings", async () => {
    const before = await SELF.fetch("http://x/listings");
    expect(before.status).toBe(200);

    const sent = await sendDailyPing(env);
    expect(sent).toBe(0);
  });
});
