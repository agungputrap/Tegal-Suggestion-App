-- ============================================
-- Schema: Jajan + Jasa (D1 / SQLite)
-- ============================================

CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('jajanan', 'jasa')),
  icon TEXT NOT NULL DEFAULT '📍' -- emoji, dipakai sebagai ikon marker peta
);

CREATE TABLE IF NOT EXISTS providers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT NOT NULL UNIQUE,
  category_type TEXT NOT NULL CHECK (category_type IN ('jajanan', 'jasa')),
  category_id TEXT NOT NULL REFERENCES categories(id),
  description TEXT,
  photo_url TEXT,
  base_lat REAL,
  base_lng REAL,
  service_radius_km REAL DEFAULT 0,
  suspended INTEGER NOT NULL DEFAULT 0, -- 1 = disembunyikan admin (moderasi)
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS checkins (
  id TEXT PRIMARY KEY,
  provider_id TEXT NOT NULL REFERENCES providers(id),
  date TEXT NOT NULL,
  lat REAL NOT NULL,
  lng REAL NOT NULL,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(provider_id, date)
);

CREATE INDEX IF NOT EXISTS idx_checkins_date_active ON checkins(date, is_active);
CREATE INDEX IF NOT EXISTS idx_checkins_lat_lng ON checkins(lat, lng);
CREATE INDEX IF NOT EXISTS idx_providers_category ON providers(category_type, category_id);

-- Seed kategori awal
INSERT OR IGNORE INTO categories (id, name, type, icon) VALUES
  ('nasi-goreng', 'Nasi Goreng', 'jajanan', '🍛'),
  ('gorengan', 'Gorengan', 'jajanan', '🍤'),
  ('kue-basah', 'Kue Basah', 'jajanan', '🧁'),
  ('minuman', 'Minuman', 'jajanan', '🥤'),
  ('tukang', 'Tukang Bangunan', 'jasa', '👷'),
  ('servis-ac', 'Servis AC', 'jasa', '❄️'),
  ('bersih-tandon', 'Bersih Tandon', 'jasa', '🚰'),
  ('laundry', 'Laundry Panggilan', 'jasa', '🧺'),
  ('tukang-ledeng', 'Tukang Ledeng', 'jasa', '🔧'),
  ('penjahit', 'Penjahit', 'jasa', '🧵');

-- ============================================
-- Places: dataset F&B Tegal hasil ekspor Google Maps (tegal-fnb.csv).
-- Data referensi read-only untuk halaman Explorer — disemai via
-- `npm run db:seed:places` (scripts/seed-places.mjs), bukan ditulis dari app.
-- Kolom JSON disimpan sebagai TEXT; frontend yang parse.
-- ============================================

CREATE TABLE IF NOT EXISTS places (
  id TEXT PRIMARY KEY,              -- cid Google Maps (0x…:0x…)
  title TEXT NOT NULL,
  category TEXT NOT NULL,           -- kategori asli GMaps: Kafe, Kedai Kopi, Restoran, …
  address TEXT,
  city TEXT,                        -- derivasi: Kota Tegal | Kabupaten Tegal | Kabupaten Brebes | Kota Jakarta …
  rating REAL,
  review_count INTEGER NOT NULL DEFAULT 0,
  price_range TEXT,
  phone TEXT,
  website TEXT,
  thumbnail TEXT,
  latitude REAL NOT NULL,
  longitude REAL NOT NULL,
  link TEXT,                        -- URL Google Maps asli
  street_view_url TEXT,
  plus_code TEXT,
  open_hours TEXT,                  -- JSON: { "Senin": ["08.00–21.00"], … }
  popular_times TEXT,               -- JSON: { "Monday": { "0": 45, … }, … }
  images TEXT,                      -- JSON: [{ "title": "Semua", "image": "https://…" }, …]
  about TEXT,                       -- JSON: [{ "name": "Opsi layanan", "options": [{ "name", "enabled" }] }, …]
  user_reviews TEXT,                -- JSON: [{ "Name", "ProfilePicture", "Rating", "Description", … }, …]
  reviews_per_rating TEXT,          -- JSON: { "1": 29, "2": 8, … }
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_places_category ON places(category);
CREATE INDEX IF NOT EXISTS idx_places_city ON places(city);
CREATE INDEX IF NOT EXISTS idx_places_review_count ON places(review_count DESC);
