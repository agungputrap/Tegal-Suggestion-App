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
