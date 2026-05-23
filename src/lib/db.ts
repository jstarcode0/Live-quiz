import Database from 'better-sqlite3';
import path from 'path';

const dbPath = process.env.DATABASE_URL || 'telegram_media.db';
const db = new Database(dbPath);

// Initialize schema
db.exec(`
  CREATE TABLE IF NOT EXISTS channels (
    id TEXT PRIMARY KEY,
    username TEXT,
    title TEXT,
    last_sync_message_id INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS media (
    id TEXT PRIMARY KEY,
    telegram_id INTEGER,
    channel_id TEXT,
    file_name TEXT,
    caption TEXT,
    file_size INTEGER,
    mime_type TEXT,
    thumb_path TEXT,
    category TEXT,
    message_date DATETIME,
    file_reference BLOB,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(channel_id) REFERENCES channels(id)
  );

  CREATE TABLE IF NOT EXISTS sync_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    channel_id TEXT,
    status TEXT,
    message TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS favorites (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    media_id TEXT,
    user_id TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(media_id, user_id)
  );

  CREATE INDEX IF NOT EXISTS idx_media_channel ON media(channel_id);
  CREATE INDEX IF NOT EXISTS idx_media_category ON media(category);
  CREATE INDEX IF NOT EXISTS idx_media_file_name ON media(file_name);
`);

export default db;
