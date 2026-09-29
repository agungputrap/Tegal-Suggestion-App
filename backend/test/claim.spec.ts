// Test klaim listing direktori (fase 3 strategi #31).
// Tabel places kosong di test — baris place disuntik langsung via D1,
// satu place unik per test (state D1 persist antar test dalam satu file).
import { SELF, env } from "cloudflare:test";
import { beforeAll, describe, expect, it } from "vitest";
import { applyMigrations } from "./helpers";

beforeAll(async () => {
  await applyMigrations().catch(() => {});
});

const ADMIN = { Authorization: "Bearer test-admin-token" };

function randomPhone(): string {
  return `0812${Math.floor(Math.random() * 1e8).toString().padStart(8, "0")}`;
}

function randomIp(): string {
  return `10.${Math.floor(Math.random() * 255)}.${Math.floor(
    Math.random() * 255,
  )}.${Math.floor(Math.random() * 255)}`;
}

let placeSeq = 0;
function newPlaceId(): string {
  return `0xtest:0x${(++placeSeq).toString(16).padStart(6, "0")}`;
}

async function seedPlace(id: string) {
  await env.DB.prepare(
    `INSERT INTO places (id, title, category, latitude, longitude)
     VALUES (?, ?, ?, ?, ?)`,
  )
    .bind(id, "Gorengan Bu Test", "Gorengan", -6.87, 109.14)
    .run();
}

async function registerProvider(overrides: Record<string, unknown> = {}) {
  const phone = randomPhone();
  const res = await SELF.fetch("http://x/providers", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "CF-Connecting-IP": randomIp(),
    },
    body: JSON.stringify({
      name: "Pengklaim Test",
      phone,
      category_type: "jajanan",
      category_id: "gorengan",
      ...overrides,
    }),
  });
  return { status: res.status, body: await res.json(), phone };
}

async function fetchPlace(id: string) {
  const res = await SELF.fetch(`http://x/places/${id}`);
  const body = (await res.json()) as {
    place?: {
      claimed_provider_id: string | null;
      claimed_open: number;
    };
  };
  return { status: res.status, place: body.place ?? null };
}

describe("Klaim listing (fase 3)", () => {
  it("registrasi dengan place_id valid -> terhubung; 400 kalau place tak ada", async () => {
    const placeId = newPlaceId();
    await seedPlace(placeId);

    const bad = await registerProvider({ place_id: "0xtidak:0xada" });
    expect(bad.status).toBe(400);

    const ok = await registerProvider({ place_id: placeId });
    expect(ok.status).toBe(201);

    const { place } = await fetchPlace(placeId);
    expect(place?.claimed_provider_id).toBeTruthy();
    expect(place?.claimed_open).toBe(0); // belum approved / belum buka
  });

  it("409: satu place hanya boleh satu pemilik", async () => {
    const placeId = newPlaceId();
    await seedPlace(placeId);

    const first = await registerProvider({ place_id: placeId });
    expect(first.status).toBe(201);

    const second = await registerProvider({ place_id: placeId });
    expect(second.status).toBe(409);
    expect((second.body as { error: string }).error).toContain("sudah diklaim");
  });

  it("claimed_open = 1 setelah approve + check-in hari ini", async () => {
    const placeId = newPlaceId();
    await seedPlace(placeId);

    const reg = await registerProvider({
      name: "Pengklaim Buka",
      place_id: placeId,
      base_lat: -6.87,
      base_lng: 109.14,
    });
    const p = reg.body as { id: string; owner_token: string };
    await SELF.fetch(`http://x/admin/providers/${p.id}/approval`, {
      method: "POST",
      headers: { ...ADMIN, "Content-Type": "application/json" },
      body: JSON.stringify({ status: "approved" }),
    });
    await SELF.fetch("http://x/checkins", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        provider_id: p.id,
        owner_token: p.owner_token,
        lat: -6.87,
        lng: 109.14,
      }),
    });

    const { place } = await fetchPlace(placeId);
    expect(place?.claimed_open).toBe(1);
    expect(place?.claimed_provider_id).toBe(p.id);
  });

  it("404 place tidak dikenal", async () => {
    const res = await fetchPlace("0xtidak:0xpernah");
    expect(res.status).toBe(404);
    expect(res.place).toBeNull();
  });
});
