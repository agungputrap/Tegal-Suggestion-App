// Test integrasi API — berjalan di runtime Workers asli dengan D1/KV/R2
// lokal (vitest-pool-workers). Semua request lewat SELF.fetch sehingga
// yang diuji adalah app yang sama dengan yang di-deploy.
import { SELF } from "cloudflare:test";
import { beforeAll, describe, expect, it } from "vitest";
import { applyMigrations } from "./helpers";

beforeAll(async () => {
  // Toleran: kalau migrasi sudah diterapkan (ALTER duplikat), lanjut saja.
  await applyMigrations().catch(() => {});
});

const ADMIN = { Authorization: "Bearer test-admin-token" };

type ProviderRow = {
  id: string;
  name: string;
  phone: string;
  owner_token: string;
  verify_code: string;
  approval_status: string;
};

function randomPhone(): string {
  return `0812${Math.floor(Math.random() * 1e8).toString().padStart(8, "0")}`;
}

async function registerProvider(
  overrides: Record<string, unknown> = {}
): Promise<ProviderRow> {
  const phone = randomPhone();
  const res = await SELF.fetch("http://x/providers", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "Warung Test",
      phone,
      category_type: "jajanan",
      category_id: "gorengan",
      ...overrides,
    }),
  });
  return { ...(await res.json()), phone } as ProviderRow;
}

async function approve(id: string) {
  await SELF.fetch(`http://x/admin/providers/${id}/approval`, {
    method: "POST",
    headers: { ...ADMIN, "Content-Type": "application/json" },
    body: JSON.stringify({ status: "approved" }),
  });
}

async function ownerOpen(token: string, body: Record<string, unknown> = {}) {
  return SELF.fetch(`http://x/kelola/${token}/open`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ lat: -6.87, lng: 109.14, ...body }),
  });
}

async function fetchListings(query = ""): Promise<{ listings: { id: string; name: string }[] }> {
  const res = await SELF.fetch(
    `http://x/listings?lat=-6.87&lng=109.14&radius=25${query}`
  );
  return res.json();
}

// ---------- Registrasi & verifikasi (#6) ----------
describe("POST /providers", () => {
  it("400 kalau field wajib kosong", async () => {
    const res = await SELF.fetch("http://x/providers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "X" }),
    });
    expect(res.status).toBe(400);
  });

  it("400 kalau nomor WhatsApp tidak valid", async () => {
    const res = await SELF.fetch("http://x/providers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "X",
        phone: "abc",
        category_type: "jajanan",
        category_id: "gorengan",
      }),
    });
    expect(res.status).toBe(400);
  });

  it("201: verify_code 6 digit + owner_token, status pending", async () => {
    // Catatan: pencarian admin memakai nomor HP (bukan nama) karena
    // SELF.fetch di test environment meng-encode spasi secara tak konsisten.
    const phone = randomPhone();
    const p = await registerProvider({ phone });
    expect(p.id).toBeTruthy();
    expect(p.owner_token).toMatch(/^[a-f0-9]{32}$/);
    expect(
      (p as unknown as { verify_code: string }).verify_code
    ).toMatch(/^\d{6}$/);

    const res = await SELF.fetch(`http://x/admin/providers?q=${phone}`, {
      headers: ADMIN,
    });
    const data = (await res.json()) as {
      providers: { approval_status: string }[];
    };
    expect(data.providers.length).toBe(1);
    expect(data.providers[0].approval_status).toBe("pending");
  });
});

// ---------- Checkin (#6/#14) ----------
describe("POST /checkins", () => {
  it("403 kalau provider belum approved", async () => {
    const p = await registerProvider();
    const res = await SELF.fetch("http://x/checkins", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider_id: p.id, lat: -6.87, lng: 109.14 }),
    });
    expect(res.status).toBe(403);
  });

  it("idempotent per hari: checkin ulang tidak membuat baris kedua", async () => {
    const p = await registerProvider();
    await approve(p.id);
    for (const lng of [109.14, 109.15]) {
      const res = await SELF.fetch("http://x/checkins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider_id: p.id, lat: -6.87, lng }),
      });
      expect(res.status).toBe(200);
    }
    const data = await fetchListings();
    const mine = data.listings.filter((l) => l.id === p.id);
    expect(mine.length).toBe(1);
  });
});

// ---------- Listings + filter (#14/#4b) ----------
describe("GET /listings", () => {
  it("hanya menampilkan provider approved", async () => {
    const pending = await registerProvider({ name: "Pending Hide" });
    const approved = await registerProvider({ name: "Approved Show" });
    await approve(approved.id);
    await ownerOpen(approved.owner_token);

    const data = await fetchListings();
    const names = data.listings.map((l) => l.name);
    expect(names).toContain("Approved Show");
    expect(names).not.toContain(pending.name);
  });

  it("filter area + halal", async () => {
    const p = await registerProvider({ area: "Tegal Barat", halal: true });
    await approve(p.id);
    await ownerOpen(p.owner_token);

    const match = await fetchListings("&area=Tegal%20Barat&halal=1");
    expect(match.listings.some((l) => l.id === p.id)).toBe(true);

    const miss = await fetchListings("&area=Slawi&halal=1");
    expect(miss.listings.some((l) => l.id === p.id)).toBe(false);
  });

  it("sort=trending mengurutkan berdasarkan views", async () => {
    const a = await registerProvider({ name: "Trending A" });
    const b = await registerProvider({ name: "Trending B" });
    await approve(a.id);
    await approve(b.id);
    await ownerOpen(a.owner_token);
    await ownerOpen(b.owner_token);

    // B dilihat 3x, A 1x -> B harus di atas A
    for (let i = 0; i < 3; i++) {
      await SELF.fetch(`http://x/providers/${b.id}/view`, { method: "POST" });
    }
    await SELF.fetch(`http://x/providers/${a.id}/view`, { method: "POST" });

    const data = await fetchListings("&sort=trending");
    const ia = data.listings.findIndex((l) => l.id === a.id);
    const ib = data.listings.findIndex((l) => l.id === b.id);
    expect(ib).toBeGreaterThanOrEqual(0);
    expect(ia).toBeGreaterThanOrEqual(0);
    expect(ib).toBeLessThan(ia);
  });
});

// ---------- Portal pemilik (#7) + items (#12) ----------
describe("portal /kelola/:token", () => {
  it("401 kalau token salah", async () => {
    const res = await SELF.fetch("http://x/kelola/token-ngasal");
    expect(res.status).toBe(401);
  });

  it("open -> tampil di listings; close -> hilang", async () => {
    const p = await registerProvider();
    await approve(p.id);

    await ownerOpen(p.owner_token, { note: "ready pagi" });
    const open = await fetchListings();
    expect(open.listings.some((l) => l.id === p.id)).toBe(true);

    const close = await SELF.fetch(`http://x/kelola/${p.owner_token}/close`, {
      method: "POST",
    });
    expect(close.status).toBe(200);
    const closed = await fetchListings();
    expect(closed.listings.some((l) => l.id === p.id)).toBe(false);
  });

  it("items CRUD + pilihan item saat open", async () => {
    const p = await registerProvider();

    const created = await SELF.fetch(`http://x/kelola/${p.owner_token}/items`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Cuci AC 1 PK", price: 75000 }),
    });
    expect(created.status).toBe(201);
    const { id: itemId } = (await created.json()) as { id: string };

    await ownerOpen(p.owner_token, { item_ids: [itemId] });

    const detail = await SELF.fetch(`http://x/kelola/${p.owner_token}`);
    const data = (await detail.json()) as {
      items: { id: string; available: number; price: number }[];
      today: { open: boolean };
    };
    expect(data.today.open).toBe(true);
    expect(data.items[0].available).toBe(1);
    expect(data.items[0].price).toBe(75000);

    const removed = await SELF.fetch(
      `http://x/kelola/${p.owner_token}/items/${itemId}`,
      { method: "DELETE" }
    );
    expect(removed.status).toBe(200);
  });
});

// ---------- Admin auth ----------
describe("admin auth", () => {
  it("401 tanpa/salah token", async () => {
    const noToken = await SELF.fetch("http://x/admin/me");
    expect(noToken.status).toBe(401);

    const badToken = await SELF.fetch("http://x/admin/me", {
      headers: { Authorization: "Bearer salah" },
    });
    expect(badToken.status).toBe(401);
  });

  it("400 kalau status approval tidak dikenal", async () => {
    const p = await registerProvider();
    const res = await SELF.fetch(`http://x/admin/providers/${p.id}/approval`, {
      method: "POST",
      headers: { ...ADMIN, "Content-Type": "application/json" },
      body: JSON.stringify({ status: "mungkin" }),
    });
    expect(res.status).toBe(400);
  });
});
