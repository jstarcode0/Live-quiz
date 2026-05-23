import { TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions/index.js";
import { Api } from "telegram/tl/index.js";
import db from "../lib/db.js";
import fs from "fs";
import path from "path";

class TelegramService {
    private client: TelegramClient | null = null;
    private config: any = {
        apiId: process.env.TELEGRAM_API_ID || "",
        apiHash: process.env.TELEGRAM_API_HASH || "",
        session: process.env.TELEGRAM_SESSION || ""
    };

    constructor() {
        this.loadConfig();
    }

    private loadConfig() {
        const rows = db.prepare('SELECT * FROM settings WHERE key IN ("telegram_api_id", "telegram_api_hash", "telegram_session")').all() as any[];
        rows.forEach(row => {
            if (row.key === 'telegram_api_id') this.config.apiId = row.value;
            if (row.key === 'telegram_api_hash') this.config.apiHash = row.value;
            if (row.key === 'telegram_session') this.config.session = row.value;
        });
    }

    async updateConfig(key: string, value: string) {
        db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(key, value);
        this.loadConfig();
        if (this.client) {
            await this.client.disconnect();
            this.client = null;
        }
    }

    async getStatus() {
        if (!this.client) {
            try {
                await this.getClient();
            } catch (e) {
                return { status: 'Disconnected', error: (e as Error).message };
            }
        }
        
        if (this.client && this.client.connected) {
            try {
                const me = await this.client.getMe();
                if (me instanceof Api.User) {
                    return {
                        status: 'Connected',
                        username: me.username,
                        firstName: me.firstName,
                        phone: me.phone,
                        id: me.id.toString(),
                        isBot: me.bot
                    };
                }
                return { status: 'Connected' };
            } catch (e) {
                return { status: 'Invalid Session', error: (e as Error).message };
            }
        }
        return { status: 'Disconnected' };
    }

    async getClient() {
        if (this.client && this.client.connected) {
            return this.client;
        }

        if (!this.config.apiId || !this.config.apiHash) {
            throw new Error("TELEGRAM_API_ID and TELEGRAM_API_HASH are required");
        }

        const session = new StringSession(this.config.session || "");
        this.client = new TelegramClient(session, parseInt(this.config.apiId), this.config.apiHash, {
            connectionRetries: 5,
        });

        await this.client.connect();
        return this.client;
    }

    async syncChannel(channelUsername: string) {
        const client = await this.getClient();
        
        try {
            const entity = await client.getEntity(channelUsername);
            const channelId = entity.id.toString();

            // Track channel in DB
            db.prepare('INSERT OR IGNORE INTO channels (id, username, title) VALUES (?, ?, ?)')
                .run(channelId, channelUsername, (entity as any).title || channelUsername);

            const lastSync = db.prepare('SELECT last_sync_message_id FROM channels WHERE id = ?').get(channelId) as any;
            const minId = lastSync?.last_sync_message_id || 0;

            let messages = await client.getMessages(entity, {
                limit: 100,
                // minId: minId // GramJS minId behavior can be tricky, might prefer reverse sync
            });

            for (const msg of messages) {
                if (msg.media) {
                    await this.indexMedia(msg, channelId);
                }
            }

            // Update last sync
            if (messages.length > 0) {
                const maxId = Math.max(...messages.map(m => m.id));
                db.prepare('UPDATE channels SET last_sync_message_id = ? WHERE id = ?')
                    .run(maxId, channelId);
            }

            return { success: true, count: messages.length };
        } catch (error) {
            console.error("Sync error:", error);
            throw error;
        }
    }

    private async indexMedia(msg: Api.Message, channelId: string) {
        let fileName = "unnamed_file";
        let fileSize = 0;
        let mimeType = "application/octet-stream";
        let category = "other";

        const media = msg.media;
        if (media instanceof Api.MessageMediaDocument) {
            const doc = media.document as Api.Document;
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
            fileName = `photo_${msg.id}.jpg`;
            category = 'image';
            mimeType = 'image/jpeg';
        }

        db.prepare(`
            INSERT OR REPLACE INTO media (id, telegram_id, channel_id, file_name, caption, file_size, mime_type, category, message_date)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
            `${channelId}_${msg.id}`,
            msg.id,
            channelId,
            fileName,
            msg.message || "",
            fileSize,
            mimeType,
            category,
            new Date(msg.date * 1000).toISOString()
        );
    }

    async streamMedia(mediaId: string, range?: string) {
        const [channelId, msgId] = mediaId.split('_');
        const client = await this.getClient();
        
        const messages = await client.getMessages(channelId, { ids: [parseInt(msgId)] });
        const msg = messages[0];

        if (!msg || !msg.media) throw new Error("Media not found");

        // This is a simplified stream logic. In production we'd use downloadFile with offsets.
        // GramJS downloadFile supports range-like streaming if we pipe it correctly.
        return { msg, client };
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
