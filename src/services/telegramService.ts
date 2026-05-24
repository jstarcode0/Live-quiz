import { TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions/index.js";
import { Api } from "telegram/tl/index.js";
import bigInt from "big-integer";
import db from "../lib/db.js";
import fs from "fs";
import path from "path";

class TelegramService {
    private client: TelegramClient | null = null;
    private initPromise: Promise<TelegramClient> | null = null;
    private config: any = {
        apiId: process.env.TELEGRAM_API_ID || "",
        apiHash: process.env.TELEGRAM_API_HASH || "",
        session: process.env.TELEGRAM_SESSION || ""
    };

    constructor() {
        this.loadConfig();
    }

    private loadConfig() {
        try {
            const keys = ['telegram_api_id', 'telegram_api_hash', 'telegram_session'];
            const placeholders = keys.map(() => '?').join(',');
            const rows = db.prepare(`SELECT * FROM settings WHERE key IN (${placeholders})`).all(...keys) as any[];
            
            rows.forEach(row => {
                if (row.key === 'telegram_api_id') this.config.apiId = row.value;
                if (row.key === 'telegram_api_hash') this.config.apiHash = row.value;
                if (row.key === 'telegram_session') this.config.session = row.value;
            });
        } catch (e) {
            console.error("Error loading telegram config:", e);
        }
    }

    async updateConfig(key: string, value: string) {
        db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(key, value);
        this.loadConfig();
        if (this.client) {
            try {
                await this.client.disconnect();
            } catch (e) {}
            this.client = null;
        }
    }

    async saveCredentials(apiId: string, apiHash: string, session: string) {
        db.transaction(() => {
            db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run('telegram_api_id', apiId);
            db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run('telegram_api_hash', apiHash);
            db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run('telegram_session', session);
        })();
        this.loadConfig();
        if (this.client) {
            try {
                await this.client.disconnect();
            } catch (e) {}
            this.client = null;
        }
        return await this.getClient();
    }

    async getStatus() {
        if (!this.client || !this.client.connected) {
            try {
                const keys = ['telegram_api_id', 'telegram_api_hash'];
                const rows = db.prepare(`SELECT * FROM settings WHERE key IN (?, ?)`).all(...keys) as any[];
                const hasCreds = rows.length >= 2 && rows.every(r => r.value);
                
                if (!hasCreds) return { status: 'Missing Credentials' };
                
                // Only try to connect if we have a session or if this is the first check after setting creds
                if (this.config.session) {
                   await this.getClient();
                } else {
                   return { status: 'Disconnected' };
                }
            } catch (e) {
                return { status: 'Error', error: (e as Error).message };
            }
        }
        
        if (this.client) {
            if (!this.client.connected) {
                return { status: 'Reconnecting' };
            }

            try {
                const me = await this.client.getMe();
                if (me instanceof Api.User) {
                    return {
                        status: 'Connected',
                        username: me.username,
                        firstName: me.firstName,
                        lastName: me.lastName,
                        phone: me.phone,
                        id: me.id.toString(),
                        isBot: me.bot,
                        dcId: this.client.session.dcId
                    };
                }
                return { status: 'Connected' };
            } catch (e: any) {
                if (e.message.toLowerCase().includes('migrate')) {
                    return { status: 'DC Migration' };
                }
                if (e.message.toLowerCase().includes('timeout')) {
                   return { status: 'DC Timeout', error: 'Handshaking with Data Center...' };
                }
                return { status: 'Invalid Session', error: (e as Error).message };
            }
        }
        return { status: 'Disconnected' };
    }

    async getClient(): Promise<TelegramClient> {
        if (this.client && this.client.connected) {
            return this.client;
        }

        if (this.initPromise) {
            return this.initPromise;
        }

        this.initPromise = (async () => {
            try {
                if (!this.config.apiId || !this.config.apiHash) {
                    throw new Error("TELEGRAM_API_ID and TELEGRAM_API_HASH are required");
                }

                const session = new StringSession(this.config.session || "");
                const client = new TelegramClient(session, parseInt(this.config.apiId), this.config.apiHash, {
                    connectionRetries: 15,
                    autoReconnect: true,
                    retryDelay: 5000,
                    floodSleepThreshold: 60,
                    deviceModel: "AI Studio Server",
                    systemVersion: "Debian 12",
                    appVersion: "1.0.0",
                    useWSS: false
                });

                console.log("Connecting to Telegram MTProto... (DC Migration safe mode)");
                await client.connect();
                
                // Save updated session if it changed (e.g. after migration)
                const newSession = client.session.save() as unknown as string;
                if (newSession !== this.config.session) {
                    console.log("Saving migrated session string...");
                    db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run('telegram_session', newSession);
                    this.config.session = newSession;
                }

                this.client = client;
                return client;
            } finally {
                this.initPromise = null;
            }
        })();

        return this.initPromise;
    }

    async getDialogs() {
        const client = await this.getClient();
        
        // Verify account type - discovery REQUIRES User account (not Bot)
        const me = await client.getMe();
        if (me instanceof Api.User && me.bot) {
            throw new Error("BOT_ACCOUNT_RESTRICTED: Your account is a BOT account. Telegram MTProto Discovery and Library syncing are only available for REAL User accounts. Please connect a User Session.");
        }

        // Increase limit slightly but keep it reasonable
        const dialogs = await client.getDialogs({ limit: 500 });
        
        // Save entities to cache
        this.saveEntitiesMetadata(dialogs);

        return dialogs
            .filter(d => d.isChannel || d.isGroup) // Only channels and groups
            .map(d => {
                let username = null;
                if (d.entity instanceof Api.Channel) {
                    username = d.entity.username;
                }

                return {
                    id: d.id.toString(),
                    title: d.title || "Untitled",
                    username: username,
                    type: d.isChannel ? 'channel' : 'group',
                    unreadCount: d.unreadCount || 0,
                    participantsCount: (d.entity as any).participantsCount || 0
                };
            });
    }

    private saveEntitiesMetadata(dialogsOrEntities: any[]) {
        db.transaction(() => {
            const stmt = db.prepare(`
                INSERT OR REPLACE INTO entities (id, access_hash, type, username, title)
                VALUES (?, ?, ?, ?, ?)
            `);
            for (const item of dialogsOrEntities) {
                if (!item) continue;
                // If it's a dialog, it has .entity
                const entity = item.entity || item;
                
                if (entity.id && (entity instanceof Api.Channel || entity instanceof Api.Chat || entity instanceof Api.User)) {
                    const id = entity.id.toString();
                    const accessHash = (entity as any).accessHash ? (entity as any).accessHash.toString() : null;
                    
                    let type = 'user';
                    if (entity instanceof Api.Channel) type = 'channel';
                    else if (entity instanceof Api.Chat) type = 'group';

                    const username = (entity as any).username || null;
                    const title = (entity as any).title || (entity as any).firstName || (entity as any).username || id;
                    
                    stmt.run(id, accessHash, type, username, title);
                }
            }
        })();
    }

    async resolveEntity(id: string): Promise<any> {
        const client = await this.getClient();
        
        try {
            // 1. Try built-in getEntity (memory cache)
            return await client.getEntity(id);
        } catch (e) {
            // 2. Fallback to database cache
            const cached = db.prepare('SELECT * FROM entities WHERE id = ?').get(id) as any;
            if (cached) {
                try {
                    if (cached.type === 'channel' && cached.access_hash) {
                        return new Api.InputPeerChannel({ channelId: bigInt(id) as any, accessHash: bigInt(cached.access_hash) as any });
                    } else if (cached.type === 'user' && cached.access_hash) {
                        return new Api.InputPeerUser({ userId: bigInt(id) as any, accessHash: bigInt(cached.access_hash) as any });
                    } else if (cached.type === 'group') {
                        return new Api.InputPeerChat({ chatId: bigInt(id) as any });
                    }
                } catch (pe) {
                    console.error("Failed to construct input peer from cache:", pe);
                }
            }

            // 3. Auto Encounter: Refresh dialogs to find missing entity
            console.log(`Entity ${id} not found in cache. Refreshing dialogs to encounter...`);
            try {
                // Preload a larger set of dialogs to encounter more entities
                const dialogs = await client.getDialogs({ limit: 100 });
                this.saveEntitiesMetadata(dialogs);
                return await client.getEntity(id);
            } catch (re) {
                console.warn(`Could not resolve entity ${id} even after refresh:`, re);
                throw re;
            }
        }
    }

    async addChannel(id: string, username: string | null, title: string, type: string) {
        db.prepare(`
            INSERT OR REPLACE INTO channels (id, username, title, type, is_active)
            VALUES (?, ?, ?, ?, 1)
        `).run(id, username, title, type);
        return { success: true };
    }

    async toggleChannelSync(id: string, active: boolean) {
        db.prepare('UPDATE channels SET is_active = ? WHERE id = ?').run(active ? 1 : 0, id);
    }

    async getChannels() {
        return db.prepare('SELECT * FROM channels ORDER BY updated_at DESC').all() as any[];
    }

    async syncAllActive() {
        const activeChannels = db.prepare('SELECT * FROM channels WHERE is_active = 1').all() as any[];
        for (const channel of activeChannels) {
            // We'll run them sequentially to avoid flood limits
            try {
                await this.syncChannelRecursive(channel.id);
            } catch (e) {
                console.error(`Failed to sync channel ${channel.title}:`, e);
            }
        }
    }

    async syncChannelRecursive(channelId: string) {
        const client = await this.getClient();
        const channel = db.prepare('SELECT * FROM channels WHERE id = ?').get(channelId) as any;
        if (!channel) throw new Error("Channel not in database");

        db.prepare("UPDATE channels SET sync_status = 'syncing' WHERE id = ?").run(channelId);

        try {
            const entity = await this.resolveEntity(channelId);
            
            // Try to encounter some participants to cache entities (especially for groups/channels)
            try {
                const participants = await client.getParticipants(entity, { limit: 100 });
                if (participants) this.saveEntitiesMetadata(participants);
            } catch (e) {
                console.warn(`Could not preload participants for ${channelId}:`, e.message);
            }

            let offsetId = 0;
            let totalIndexed = 0;
            const limit = 100;
            let hasMore = true;

            console.log(`Starting deep sync for: ${channel.title} (${channelId})`);

            while (hasMore) {
                const messages: Api.Message[] = await client.getMessages(entity, {
                    limit,
                    offsetId: offsetId,
                }) as any;

                if (messages.length === 0) {
                    hasMore = false;
                    break;
                }

                // Process batch
                db.transaction(() => {
                    for (const msg of messages) {
                        if (msg.media) {
                            this.indexMediaBatch(msg, channelId);
                        }
                    }
                })();

                totalIndexed += messages.length;
                offsetId = messages[messages.length - 1].id;
                
                // Update progress in DB
                db.prepare('UPDATE channels SET sync_progress = ? WHERE id = ?').run(`Indexed ${totalIndexed} messages...`, channelId);
                console.log(`Channel ${channel.title}: Indexed ${totalIndexed} messages`);

                // Small delay to respect flood limits
                await new Promise(r => setTimeout(r, 500));

                if (messages.length < limit) {
                    hasMore = false;
                }
            }

            db.prepare("UPDATE channels SET sync_status = 'completed', sync_progress = 'Full history indexed' WHERE id = ?").run(channelId);
            return { totalIndexed };
        } catch (error: any) {
            db.prepare("UPDATE channels SET sync_status = 'failed', sync_progress = ? WHERE id = ?")
                .run(error.message, channelId);
            throw error;
        }
    }

    private indexMediaBatch(msg: Api.Message, channelId: string) {
        let fileName = "unnamed_file";
        let fileSize = 0;
        let mimeType = "application/octet-stream";
        let category = "other";
        let mediaId = "";

        const media = msg.media;
        if (media instanceof Api.MessageMediaDocument) {
            const doc = media.document as Api.Document;
            mediaId = doc.id.toString();
            fileSize = doc.size.toJSNumber();
            mimeType = doc.mimeType;
            
            const attr = doc.attributes.find(a => a instanceof Api.DocumentAttributeFilename) as Api.DocumentAttributeFilename;
            if (attr) fileName = attr.fileName;

            if (mimeType.startsWith('video/')) category = 'video';
            else if (mimeType.startsWith('image/')) category = 'image';
            else if (mimeType === 'application/pdf') category = 'pdf';
            else if (mimeType.includes('zip') || mimeType.includes('rar')) category = 'archive';
            else if (mimeType.startsWith('audio/')) category = 'audio';
        } else if (media instanceof Api.MessageMediaPhoto) {
            const photo = media.photo as Api.Photo;
            mediaId = photo.id.toString();
            fileName = `photo_${msg.id}.jpg`;
            category = 'image';
            mimeType = 'image/jpeg';
        }

        if (!mediaId) return;

        db.prepare(`
            INSERT OR REPLACE INTO media (channel_id, message_id, media_id, file_name, file_size, mime_type, category, caption, message_date)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
            channelId,
            msg.id,
            mediaId,
            fileName,
            fileSize,
            mimeType,
            category,
            msg.message || "",
            msg.date
        );
    }

    async syncChannel(channelUsername: string) {
        // Fallback for direct username entry
        const client = await this.getClient();
        const entity = await client.getEntity(channelUsername);
        const id = entity.id.toString();
        const title = (entity as any).title || channelUsername;
        const type = (entity as any).className === 'Channel' ? 'channel' : 'group';
        
        // Save to entities cache
        db.prepare(`
            INSERT OR REPLACE INTO entities (id, access_hash, type, username, title)
            VALUES (?, ?, ?, ?, ?)
        `).run(
            id, 
            (entity as any).accessHash ? (entity as any).accessHash.toString() : null,
            type,
            (entity as any).username || channelUsername,
            title
        );

        await this.addChannel(id, channelUsername, title, type);
        return await this.syncChannelRecursive(id);
    }

    async getMediaInfo(channelId: string, msgId: number) {
        const client = await this.getClient();
        const entity = await this.resolveEntity(channelId);
        const messages = await client.getMessages(entity, { ids: [msgId] });
        const msg = messages[0];
        if (!msg || !msg.media) throw new Error("Media not found");

        let size = 0;
        let mimeType = "application/octet-stream";
        if (msg.media instanceof Api.MessageMediaDocument) {
            size = (msg.media.document as Api.Document).size.toJSNumber();
            mimeType = (msg.media.document as Api.Document).mimeType;
        } else if (msg.media instanceof Api.MessageMediaPhoto) {
            const photo = msg.media.photo as Api.Photo;
            const largest = photo.sizes[photo.sizes.length - 1];
            if ((largest as any).size) size = (largest as any).size;
            mimeType = "image/jpeg";
        }
        return { size, mimeType };
    }

    async getMediaStream(channelId: string, msgId: number, start: number, end: number) {
        const client = await this.getClient();
        const entity = await this.resolveEntity(channelId);
        
        const messages = await client.getMessages(entity, { ids: [msgId] });
        const msg = messages[0];
        if (!msg || !msg.media) throw new Error("Media not found");

        let size = 0;
        let mimeType = "application/octet-stream";
        if (msg.media instanceof Api.MessageMediaDocument) {
            size = (msg.media.document as Api.Document).size.toJSNumber();
            mimeType = (msg.media.document as Api.Document).mimeType;
        } else if (msg.media instanceof Api.MessageMediaPhoto) {
            const photo = msg.media.photo as Api.Photo;
            const largest = photo.sizes[photo.sizes.length - 1];
            if ((largest as any).size) size = (largest as any).size;
            mimeType = "image/jpeg";
        }

        const stream = client.iterDownload({
            file: msg.media,
            offset: bigInt(start) as any,
            limit: (end > start) ? (end - start + 1) : undefined,
            requestSize: 1024 * 128
        });

        return { stream, size, mimeType };
    }

    async getThumbnail(channelId: string, msgId: number) {
        const client = await this.getClient();
        const entity = await this.resolveEntity(channelId);
        const messages = await client.getMessages(entity, { ids: [msgId] });
        const msg = messages[0];
        if (!msg || !msg.media) return null;

        try {
            if (msg.media instanceof Api.MessageMediaDocument) {
                const thumbs = (msg.media.document as Api.Document).thumbs;
                const thumb = thumbs ? thumbs[0] : undefined;
                return await client.downloadMedia(msg.media, { thumb });
            } else if (msg.media instanceof Api.MessageMediaPhoto) {
                const sizes = (msg.media.photo as Api.Photo).sizes;
                const thumb = sizes ? sizes[0] : undefined;
                return await client.downloadMedia(msg.media, { thumb });
            }
            return await client.downloadMedia(msg.media, {});
        } catch (e) {
            return null;
        }
    }

    async startLogin(phoneNumber: string) {
        const client = await this.getClient();
        return await client.sendCode({
            apiId: parseInt(this.config.apiId),
            apiHash: this.config.apiHash
        }, phoneNumber);
    }

    async completeLogin(phoneNumber: string, phoneCodeHash: string, code: string, password?: string) {
        const client = await this.getClient();
        await (client as any).signIn({
            phoneNumber,
            phoneCodeHash,
            phoneCode: code,
            password: async () => password || "",
            onError: (err: any) => console.log(err),
        });
        
        const session = client.session.save() as unknown as string;
        await this.updateConfig('telegram_session', session);
        return { session };
    }

    async disconnect() {
        if (this.client) {
            await this.client.disconnect();
            this.client = null;
        }
        await this.updateConfig('telegram_session', "");
    }
}

export const telegramService = new TelegramService();
