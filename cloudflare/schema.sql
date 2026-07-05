PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  role TEXT NOT NULL CHECK (role IN ('customer', 'vendor', 'admin')),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT,
  password_hash TEXT,
  password_salt TEXT,
  password_version INTEGER DEFAULT 2,
  avatar TEXT,
  whatsapp TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  metadata_json TEXT DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS user_addresses (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  label TEXT NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  country TEXT NOT NULL,
  phone TEXT NOT NULL,
  is_default INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  last_seen_at TEXT NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS vendors (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE,
  brand_name TEXT,
  business_name TEXT,
  display_name TEXT,
  bio TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'featured', 'removed')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS vendor_products (
  id TEXT PRIMARY KEY,
  vendor_id TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  price REAL NOT NULL,
  original_price REAL,
  description TEXT NOT NULL,
  short_desc TEXT,
  features_json TEXT DEFAULT '[]',
  variants_json TEXT DEFAULT '[]',
  images_json TEXT DEFAULT '[]',
  video TEXT,
  badge TEXT,
  whatsapp TEXT,
  in_stock INTEGER NOT NULL DEFAULT 1,
  stock_count INTEGER,
  weight_kg REAL,
  sensitive INTEGER NOT NULL DEFAULT 0,
  model_3d TEXT,
  active INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'featured', 'removed')),
  added_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  videos_json TEXT DEFAULT '[]',
  FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS product_overrides (
  slug TEXT PRIMARY KEY,
  name TEXT,
  price REAL,
  original_price REAL,
  in_stock INTEGER,
  badge TEXT,
  images_json TEXT,
  description TEXT,
  short_desc TEXT,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS orders (
  order_id TEXT PRIMARY KEY,
  user_id TEXT,
  date TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'processing', 'shipped', 'delivered')),
  payment_status TEXT NOT NULL CHECK (payment_status IN ('pending', 'paid')),
  payment_method TEXT NOT NULL,
  currency TEXT NOT NULL,
  subtotal_usd REAL NOT NULL,
  shipping_usd REAL NOT NULL,
  grand_total_usd REAL NOT NULL,
  discount_usd REAL DEFAULT 0,
  coupon_code TEXT,
  customer_json TEXT NOT NULL,
  shipping_json TEXT NOT NULL,
  notes TEXT,
  gift_message TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS order_items (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL,
  product_id TEXT NOT NULL,
  product_name TEXT NOT NULL,
  unit_price_usd REAL NOT NULL,
  quantity INTEGER NOT NULL,
  selected_variants_json TEXT DEFAULT '{}',
  product_snapshot_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (order_id) REFERENCES orders(order_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  email TEXT PRIMARY KEY,
  source TEXT NOT NULL DEFAULT 'footer',
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS stock_alert_requests (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL,
  email TEXT NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE (slug, email)
);

CREATE TABLE IF NOT EXISTS media_assets (
  id TEXT PRIMARY KEY,
  owner_user_id TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('image', 'video')),
  url TEXT NOT NULL UNIQUE,
  data_b64 TEXT,
  size_bytes INTEGER NOT NULL,
  mime TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (owner_user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS store_settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  store_name TEXT NOT NULL,
  announcement TEXT,
  whatsapp TEXT,
  email TEXT,
  maintenance_mode INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS chat_threads (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  vendor_id TEXT,
  subject TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS chat_messages (
  id TEXT PRIMARY KEY,
  thread_id TEXT NOT NULL,
  sender_role TEXT NOT NULL CHECK (sender_role IN ('customer', 'vendor', 'admin', 'support')),
  sender_id TEXT,
  body TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (thread_id) REFERENCES chat_threads(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS presence_heartbeats (
  id TEXT PRIMARY KEY,
  actor_id TEXT NOT NULL,
  actor_role TEXT NOT NULL CHECK (actor_role IN ('customer', 'vendor', 'admin')),
  last_seen_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_orders_customer_email ON orders(json_extract(customer_json, '$.email'));
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status, payment_status);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_vendor_products_status ON vendor_products(status, active);
CREATE INDEX IF NOT EXISTS idx_stock_alert_slug ON stock_alert_requests(slug);
CREATE INDEX IF NOT EXISTS idx_media_assets_owner ON media_assets(owner_user_id, created_at);

INSERT OR IGNORE INTO store_settings (
  id,
  store_name,
  announcement,
  whatsapp,
  email,
  maintenance_mode,
  updated_at
) VALUES (
  1,
  'Taries Beauty Emporium',
  'Luxury wigs, bundles, beauty essentials and coats shipped from Guangzhou to Nigeria & Ghana.',
  '+234 903 541 2919',
  'tariesbeautyemporium@gmail.com',
  0,
  CURRENT_TIMESTAMP
);
