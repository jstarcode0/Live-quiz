# Telegram Media Streaming Platform

A professional MTProto-powered media streaming and library management platform.

## Features

- **MTProto Integration**: Uses GramJS for high-performance direct Telegram access.
- **Media Library**: Supports Video, PDF, Image, Audio, and Document indexing.
- **Search Engine**: Instant global search across all synced channels.
- **Direct Streaming**: Byte-range request support for seeking large video files without full download.
- **Admin Panel**: Channel management, sync control, and real-time analytics.
- **Metadata Storage**: SQLite-backed metadata storage with optimized indexing.

## Configuration

Required Environment Variables:

```env
TELEGRAM_API_ID=XXXXX
TELEGRAM_API_HASH=XXXXX
TELEGRAM_SESSION=XXXXX (Optional: Generated on first login or provided)
TELEGRAM_CHANNEL=@channel_username (Default channel to index)
DATABASE_URL=telegram_media.db
```

## Routes

- **User Library**: `/telegram`
- **Admin Panel**: `/telegram/admin`
- **Streaming API**: `/api/telegram/stream/:id`
- **Sync API**: `/api/telegram/sync`

## Architecture

- **telegramService.ts**: Core MTProto communication and media handling.
- **db.ts**: SQLite schema management and data persistence.
- **telegramRoutes.ts**: Express API endpoints for streaming and library access.
- **TelegramMediaLibrary.tsx**: Premium React frontend with glassmorphism UI.

## Performance Optimization

Optimized for 1 vCPU / 2GB RAM VPS:
- Lazy loading media items.
- Chunked streaming for low memory overhead.
- Indexed SQLite queries.
- Pagination / infinite scroll support.
