// Daftar kecamatan wilayah layanan (Kota Tegal + Kabupaten Tegal).
// Statis sesuai keputusan #14 — filter area memakai exact-match.
export const KECAMATAN = [
  // Kota Tegal
  "Margadana",
  "Tegal Barat",
  "Tegal Timur",
  "Tegal Selatan",
  // Kabupaten Tegal
  "Adiwerna",
  "Balapulang",
  "Bumijawa",
  "Dampak",
  "Dukuhwaru",
  "Jatinegara",
  "Kedungbanteng",
  "Kramat",
  "Lebaksiu",
  "Margasari",
  "Pangkah",
  "Slawi",
  "Suradadi",
  "Talang",
  "Tarub",
  "Warureja",
] as const;

export type Kecamatan = (typeof KECAMATAN)[number];
