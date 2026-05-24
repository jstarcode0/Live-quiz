import Database from 'better-sqlite3';
import path from 'path';

const dbPath = process.env.DATABASE_URL || 'telegram_media.db';
const db = new Database(dbPath);

// Initialize schema
db.exec(`
  CREATE TABLE IF NOT EXISTS entities (
    id TEXT PRIMARY KEY,
    access_hash TEXT,
    type TEXT,
    username TEXT,
    title TEXT,
    serialized_entity BLOB,
    last_seen DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS channels (
    id TEXT PRIMARY KEY,
    username TEXT,
    title TEXT,
    type TEXT,
    category TEXT DEFAULT 'misc',
    is_active INTEGER DEFAULT 1,
    last_sync_message_id INTEGER DEFAULT 0,
    sync_status TEXT DEFAULT 'idle',
    sync_progress TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS media (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    channel_id TEXT,
    message_id INTEGER,
    media_id TEXT,
    file_name TEXT,
    file_size INTEGER,
    mime_type TEXT,
    category TEXT,
    caption TEXT,
    message_date INTEGER,
    thumb_path TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(channel_id, message_id)
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

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_media_channel ON media(channel_id);
  CREATE INDEX IF NOT EXISTS idx_media_category ON media(category);
  CREATE INDEX IF NOT EXISTS idx_media_msg_date ON media(message_date);
  CREATE INDEX IF NOT EXISTS idx_channels_active ON channels(is_active);
`);

export default db;
