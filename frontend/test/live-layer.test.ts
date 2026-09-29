import { describe, expect, it } from "vitest";
import {
  filterLiveListings,
  formatLiveDistance,
} from "../src/explorer/liveLayer";
import type { Listing } from "../src/api";

function listing(overrides: Partial<Listing>): Listing {
  return {
    id: "p1",
    name: "Jasa Uji",
    phone: "08123456789",
    category_type: "jasa",
    category_id: "servis-ac",
    description: null,
    photo_url: null,
    checkin_lat: -6.87,
    checkin_lng: 109.14,
    distance_km: undefined,
    area: null,
    halal: null,
    views: 0,
    ...overrides,
  };
}

const LISTINGS: Listing[] = [
  listing({ id: "a", category_type: "jasa" }),
  listing({ id: "b", category_type: "jajanan" }),
  listing({ id: "c", category_type: "jasa" }),
];

describe("filterLiveListings", () => {
  it("semua = tanpa filter", () => {
    expect(filterLiveListings(LISTINGS, "semua")).toHaveLength(3);
  });

  it("kuliner = hanya category_type jajanan", () => {
    const out = filterLiveListings(LISTINGS, "kuliner");
    expect(out).toHaveLength(1);
    expect(out[0].id).toBe("b");
  });

  it("jasa = hanya category_type jasa", () => {
    const out = filterLiveListings(LISTINGS, "jasa");
    expect(out.map((l) => l.id)).toEqual(["a", "c"]);
  });

  it("array kosong tetap aman", () => {
    expect(filterLiveListings([], "jasa")).toEqual([]);
  });
});

describe("formatLiveDistance", () => {
  it("format km 1 desimal, sama dengan ListingCard", () => {
    expect(formatLiveDistance(5.5)).toBe("5.5 km");
    expect(formatLiveDistance(0.42)).toBe("0.4 km");
  });

  it("kosong kalau distance tidak ada", () => {
    expect(formatLiveDistance(undefined)).toBe("");
  });
});
