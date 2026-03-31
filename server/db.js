const { DatabaseSync } = require('node:sqlite');
const path = require('path');

const db = new DatabaseSync(path.join(__dirname, 'deeplinker.db'));

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    email TEXT,
    role TEXT NOT NULL DEFAULT 'user',
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS sessions (
    token TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    expires_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS links (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    marketplace TEXT NOT NULL,
    original_url TEXT NOT NULL,
    short_code TEXT UNIQUE NOT NULL,
    utm_source TEXT,
    utm_medium TEXT,
    utm_campaign TEXT,
    utm_content TEXT,
    utm_term TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS clicks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    link_id TEXT NOT NULL,
    timestamp TEXT DEFAULT (datetime('now')),
    -- device
    user_agent TEXT,
    platform TEXT,
    os TEXT,
    os_version TEXT,
    browser TEXT,
    browser_version TEXT,
    device_type TEXT,
    -- geo
    ip TEXT,
    country TEXT,
    country_code TEXT,
    city TEXT,
    -- traffic source
    referer TEXT,
    referer_domain TEXT,
    -- dedup
    unique_hash TEXT,
    is_unique INTEGER DEFAULT 1,
    is_bot INTEGER DEFAULT 0,
    FOREIGN KEY (link_id) REFERENCES links(id) ON DELETE CASCADE
  );
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS multi_links (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    short_code TEXT UNIQUE NOT NULL,
    wb_url TEXT,
    ozon_url TEXT,
    ym_url TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );
`);

// Migrations for users table
const userCols = db.prepare("PRAGMA table_info(users)").all().map((r) => r.name);
if (!userCols.includes('email'))  db.exec("ALTER TABLE users ADD COLUMN email TEXT");
if (!userCols.includes('role'))   db.exec("ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'user'");
if (!userCols.includes('status')) db.exec("ALTER TABLE users ADD COLUMN status TEXT NOT NULL DEFAULT 'approved'");

// Migrations: add columns that may not exist in older DBs
const existingCols = db.prepare("PRAGMA table_info(clicks)").all().map((r) => r.name);
const newCols = [
  ['os_version',      'TEXT'],
  ['browser_version', 'TEXT'],
  ['device_type',     'TEXT'],
  ['country',         'TEXT'],
  ['country_code',    'TEXT'],
  ['city',            'TEXT'],
  ['referer_domain',  'TEXT'],
  ['unique_hash',     'TEXT'],
  ['is_unique',       'INTEGER DEFAULT 1'],
  ['is_bot',          'INTEGER DEFAULT 0'],
];
for (const [col, type] of newCols) {
  if (!existingCols.includes(col)) {
    db.exec(`ALTER TABLE clicks ADD COLUMN ${col} ${type}`);
  }
}

module.exports = db;
