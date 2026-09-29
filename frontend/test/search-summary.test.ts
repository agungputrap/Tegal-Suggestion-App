import { describe, expect, it } from "vitest";
import {
  aboutSearchBlob,
  buildSearchBlob,
} from "../src/explorer/helpers";
import { toPlaceFromSummary, type Place } from "../src/explorer/types";

// Place minimal untuk pengujian blob pencarian (tier 2 #36)
function mkPlace(overrides: Partial<Place> = {}): Place {
  return {
    id: "p1",
    title: "Kafe Bahagia",
    category: "Kedai Kopi",
    address: "Jl. Pasar Baru 12",
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
    open_hours: null,
    popular_times: null,
    images: [],
    about: [],
    user_reviews: [],
    reviews_per_rating: null,
    ...overrides,
  };
}

describe("buildSearchBlob", () => {
  it("judul, kategori, dan alamat match tanpa case", () => {
    const blob = buildSearchBlob(mkPlace());
    expect(blob.includes("bahagia")).toBe(true);
    expect(blob.includes("kedai kopi")).toBe(true);
    expect(blob.includes("pasar baru")).toBe(true);
  });

  it("about & ulasan ikut termasuk (JSON lowercase)", () => {
    const blob = buildSearchBlob(
      mkPlace({
        about: [{ name: "Fasilitas", options: [{ name: "Wifi", enabled: true }] }],
        user_reviews: [{ Name: "Budi", Description: "kopinya enak" }],
      }),
    );
    expect(blob.includes("wifi")).toBe(true);
    expect(blob.includes("kopinya enak")).toBe(true);
  });

  it("field kosong tidak menghasilkan false match", () => {
    const blob = buildSearchBlob(mkPlace());
    expect(blob.includes("wifi")).toBe(false);
    expect(blob.includes("[]")).toBe(false);
  });

  it("semantik OR antar-field: query di field mana pun match", () => {
    // query "enak" hanya ada di ulasan — tetap match lewat blob gabungan
    const blob = buildSearchBlob(
      mkPlace({ user_reviews: [{ Description: "enak" }] }),
    );
    expect(blob.includes("enak")).toBe(true);
    // newline dalam data ter-escape di JSON — tidak memecah pemisah field
    const blob2 = buildSearchBlob(
      mkPlace({ about: [{ name: "a\nb" }] }),
    );
    expect(blob2.split("\n").length).toBe(5);
  });

  it("aboutSearchBlob lowercase dan cocok dipakai filter cepat", () => {
    const about = aboutSearchBlob(
      mkPlace({ about: [{ name: "Tempat Duduk di Area Terbuka", options: [] }] }),
    );
    expect(about.includes("area terbuka")).toBe(true);
  });
});

describe("toPlaceFromSummary", () => {
  const row = {
    id: "s1",
    title: "Warung Bali",
    category: "Restoran",
    address: "Jl. Raya 1",
    city: "Kota Tegal",
    rating: 4.2,
    review_count: 99,
    price_range: "Rp 25–50 rb",
    latitude: -6.88,
    longitude: 109.14,
    thumbnail: "https://contoh/foto.jpg",
    open_hours: '{"Senin":["07:00–21:00"]}',
    images_count: 7,
  };

  it("memetakan ringkasan ke Place dengan marker partial", () => {
    const p = toPlaceFromSummary(row);
    expect(p.id).toBe("s1");
    expect(p.title).toBe("Warung Bali");
    expect(p.rating).toBe(4.2);
    expect(p.partial).toBe(true);
    expect(p.images_count).toBe(7);
  });

  it("open_hours tetap diparse — badge buka bisa dihitung", () => {
    const p = toPlaceFromSummary(row);
    expect(p.open_hours).toEqual({ Senin: ["07:00–21:00"] });
  });

  it("kolom berat kosong tapi tidak pernah crash untuk null", () => {
    const p = toPlaceFromSummary({
      ...row,
      address: null,
      city: null,
      price_range: null,
      thumbnail: null,
      open_hours: null,
      images_count: 0,
    });
    expect(p.address).toBe("");
    expect(p.city).toBe("");
    expect(p.thumbnail).toBe("");
    expect(p.open_hours).toBeNull();
    expect(p.images).toEqual([]);
    expect(p.about).toEqual([]);
    expect(p.user_reviews).toEqual([]);
  });
});
