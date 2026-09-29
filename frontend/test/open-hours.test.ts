import { afterEach, describe, expect, it, vi } from "vitest";
import { dayNameMap, isOpenNow, nowParts } from "../src/explorer/helpers";
import type { Place } from "../src/explorer/types";

// Place minimal untuk pengujian — field selain jam buka tidak dipakai
// isOpenNow/nowParts.
function mkPlace(openHours: Record<string, string[]> | null): Place {
  return {
    id: "p1",
    title: "Warung Uji",
    category: "Kafe",
    address: "",
    city: "Kota Tegal",
    rating: 4.5,
    review_count: 10,
    price_range: "",
    phone: "",
    website: "",
    thumbnail: "",
    latitude: -6.87,
    longitude: 109.13,
    link: "",
    street_view_url: "",
    plus_code: "",
    open_hours: openHours,
    popular_times: null,
    images: [],
    about: [],
    user_reviews: [],
    reviews_per_rating: null,
  };
}

afterEach(() => vi.useRealTimers());

describe("isOpenNow — jam pecah (beberapa rentang per hari)", () => {
  const split = mkPlace({ Selasa: ["07:00–10:00", "16:00–21:00"] });

  it("buka di rentang pagi", () => {
    expect(isOpenNow(split, "Selasa", 8, 0)).toBe(true);
  });

  it("tutup di sela jam pecah (siang)", () => {
    // bug lama: hanya rentang pertama yang dibaca, jadi warung yang buka
    // lagi sore tampil "buka" padahal tutup siang (atau sebaliknya)
    expect(isOpenNow(split, "Selasa", 12, 30)).toBe(false);
  });

  it("buka di rentang sore", () => {
    expect(isOpenNow(split, "Selasa", 17, 0)).toBe(true);
  });

  it("tutup di luar kedua rentang", () => {
    expect(isOpenNow(split, "Selasa", 22, 0)).toBe(false);
    expect(isOpenNow(split, "Selasa", 5, 0)).toBe(false);
  });
});

describe("isOpenNow — kasus khusus", () => {
  it("hari 'Tutup' → false", () => {
    expect(isOpenNow(mkPlace({ Senin: ["Tutup"] }), "Senin", 10, 0)).toBe(
      false,
    );
  });

  it("'24 jam' → true kapan pun", () => {
    expect(isOpenNow(mkPlace({ Senin: ["24 jam"] }), "Senin", 3, 15)).toBe(
      true,
    );
  });

  it("rentang lintas tengah malam", () => {
    const overnight = mkPlace({ Jumat: ["21:00-02:00"] });
    expect(isOpenNow(overnight, "Jumat", 23, 0)).toBe(true);
    expect(isOpenNow(overnight, "Jumat", 1, 0)).toBe(true);
    expect(isOpenNow(overnight, "Jumat", 12, 0)).toBe(false);
  });

  it("tidak ada jadwal untuk hari itu → null (badge disembunyikan)", () => {
    expect(isOpenNow(mkPlace({ Senin: ["07:00-10:00"] }), "Rabu", 8, 0)).toBe(
      null,
    );
  });

  it("jadwal tidak bisa di-parse → null", () => {
    expect(isOpenNow(mkPlace({ Senin: ["?"] }), "Senin", 8, 0)).toBe(null);
    expect(isOpenNow(mkPlace(null), "Senin", 8, 0)).toBe(null);
  });

  it("format jam dengan titik (07.00–10.00) tetap terbaca", () => {
    const dotted = mkPlace({ Sabtu: ["07.00 – 10.00"] });
    expect(isOpenNow(dotted, "Sabtu", 8, 0)).toBe(true);
    expect(isOpenNow(dotted, "Sabtu", 11, 0)).toBe(false);
  });
});

describe("nowParts — selalu WIB (UTC+7), bukan timezone browser", () => {
  it("20:00 UTC → 03:00 WIB hari berikutnya (Selasa)", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-01T20:00:00Z")); // Senin UTC
    const p = nowParts();
    expect(p.hour).toBe(3);
    expect(p.min).toBe(0);
    expect(p.dayIndo).toBe("Selasa");
  });

  it("17:00 UTC → 00:00 WIB (Rabu, lintas hari)", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-02T17:00:00Z")); // Selasa UTC
    const p = nowParts();
    expect(p.hour).toBe(0);
    expect(p.dayIndo).toBe("Rabu");
  });

  it("konsisten dengan hitungan WIB manual di timezone mesin apa pun", () => {
    const expected = new Date(Date.now() + 7 * 60 * 60 * 1000);
    const p = nowParts();
    expect(p.hour).toBe(expected.getUTCHours());
    expect(p.dayIndo).toBe(dayNameMap[expected.getUTCDay()]);
  });
});
