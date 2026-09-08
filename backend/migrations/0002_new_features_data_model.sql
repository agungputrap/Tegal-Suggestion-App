-- Migration number: 0002 	 2026-09-08T01:51:48.117Z
-- Model data untuk to-do #4b/#5/#6/#7/#12/#13/#14:
--  - items: menu jajanan / daftar harga jasa (satu bentuk untuk dua vertikal)
--  - providers: area (kecamatan), halal (food-only, nullable), approval
--    (pending|approved|rejected — data lama otomatis 'approved'), verify_code,
--    owner_token (magic-link /kelola/{token}, tidak pernah expose ke publik)
--  - checkins.note: catatan opsional saat buka dari portal pemilik
--  - provider_views: penghitung views per hari untuk trending sort

CREATE TABLE IF NOT EXISTS items (
  id TEXT PRIMARY KEY,
  provider_id TEXT NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  price INTEGER NOT NULL DEFAULT 0, -- Rupiah
  note TEXT,
  available INTEGER NOT NULL DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_items_provider ON items(provider_id, sort_order);

ALTER TABLE providers ADD COLUMN area TEXT;                                  -- kecamatan (dropdown statis)
ALTER TABLE providers ADD COLUMN halal INTEGER;                              -- 1 = halal; NULL untuk jasa
ALTER TABLE providers ADD COLUMN approval_status TEXT NOT NULL DEFAULT 'approved'; -- pending|approved|rejected
ALTER TABLE providers ADD COLUMN verify_code TEXT;                           -- 6 digit, ditampilkan ke pemilik
ALTER TABLE providers ADD COLUMN owner_token TEXT;                           -- magic link /kelola/{token}

CREATE UNIQUE INDEX IF NOT EXISTS idx_providers_owner_token ON providers(owner_token) WHERE owner_token IS NOT NULL;

ALTER TABLE checkins ADD COLUMN note TEXT;                                   -- catatan saat buka (opsional)

CREATE TABLE IF NOT EXISTS provider_views (
  provider_id TEXT NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  date TEXT NOT NULL,                                                        -- tanggal Jakarta (todayJakarta)
  views INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (provider_id, date)
);
