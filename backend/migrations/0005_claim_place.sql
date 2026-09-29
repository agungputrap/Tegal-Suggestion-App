-- Klaim listing direktori (fase 3 strategi #31).
-- Provider yang lahir dari klaim place direktori membawa place_id —
-- menghubungkan dataset scrape (read-only) dengan suplai live.
-- Anti-hijack: klaim baru "aktif" setelah approve admin (Flow B);
-- unique partial index menjamin satu place hanya satu pemilik.
ALTER TABLE providers ADD COLUMN place_id TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_providers_place
  ON providers (place_id) WHERE place_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_places_claimed ON places (id);
