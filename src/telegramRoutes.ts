import express from 'express';
import bigInt from 'big-integer';
import { telegramService } from './services/telegramService.js';
import db from './lib/db.js';
import path from 'path';

const router = express.Router();

// Search and List Media
router.get('/media', (req, res) => {
    const { q, category, channel, limit = 50, offset = 0 } = req.query;
    
    let query = 'SELECT m.*, c.title as channel_name FROM media m JOIN channels c ON m.channel_id = c.id WHERE 1=1';
    const params: any[] = [];

    if (q) {
        query += ' AND (m.file_name LIKE ? OR m.caption LIKE ?)';
        params.push(`%${q}%`, `%${q}%`);
    }
    if (category) {
        query += ' AND m.category = ?';
        params.push(category);
    }
    if (channel) {
        query += ' AND m.channel_id = ?';
        params.push(channel);
    }

    query += ' ORDER BY m.message_date DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit as string), parseInt(offset as string));

    const media = db.prepare(query).all(...params);
    res.json(media);
});

// Dynamic Discovery & Channels
router.get('/dialogs', async (req, res) => {
    try {
        const dialogs = await telegramService.getDialogs();
        res.json(dialogs);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

router.get('/channels', async (req, res) => {
    try {
        const channels = await telegramService.getChannels();
        res.json(channels);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/channels/add', async (req, res) => {
    const { id, username, title, type } = req.body;
    try {
        const result = await telegramService.addChannel(id, username, title, type);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/channels/toggle', async (req, res) => {
    const { id, active } = req.body;
    try {
        await telegramService.toggleChannelSync(id, active);
        res.json({ success: true });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Sync Engine
router.post('/sync', async (req, res) => {
    const { channelId, username } = req.body;
    try {
        if (channelId) {
            await telegramService.syncChannelRecursive(channelId);
            res.json({ success: true, message: 'Sync started' });
        } else if (username) {
            await telegramService.syncChannel(username);
            res.json({ success: true, message: 'Sync completed' });
        } else {
            res.status(400).json({ error: 'channelId or username required' });
        }
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/sync/all', async (req, res) => {
    try {
        telegramService.syncAllActive(); // Run in background
        res.json({ success: true, message: 'Batch sync started in background' });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Stream Media
router.get('/stream/:id', async (req, res) => {
    const { id } = req.params;
    const range = req.headers.range;

    try {
        const { msg, client } = await telegramService.streamMedia(id);
        
        let mediaObj: any = null;
        if (msg.media instanceof (await import('telegram/tl/index.js')).Api.MessageMediaDocument) {
            mediaObj = msg.media.document;
        } else if (msg.media instanceof (await import('telegram/tl/index.js')).Api.MessageMediaPhoto) {
            mediaObj = msg.media.photo;
        }

        if (!mediaObj) return res.status(404).send('Not media');

        const fileSize = mediaObj.size ? mediaObj.size.toJSNumber() : (mediaObj.sizes ? mediaObj.sizes[mediaObj.sizes.length-1].size : 0);
        const mimeType = mediaObj.mimeType || 'application/octet-stream';

        if (range) {
            const parts = range.replace(/bytes=/, "").split("-");
            const start = parseInt(parts[0], 10);
            const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
            const chunksize = (end - start) + 1;

            res.writeHead(206, {
                'Content-Range': `bytes ${start}-${end}/${fileSize}`,
                'Accept-Ranges': 'bytes',
                'Content-Length': chunksize,
                'Content-Type': mimeType,
            });

            const stream = client.iterDownload({
                file: mediaObj,
                offset: bigInt(start) as any,
                limit: chunksize,
                requestSize: 64 * 1024,
            });

            for await (const chunk of stream) {
                res.write(chunk);
            }
            res.end();
        } else {
            res.writeHead(200, {
                'Content-Length': fileSize,
                'Content-Type': mimeType,
            });

            const stream = client.iterDownload({
                file: mediaObj,
                requestSize: 64 * 1024,
            });

            for await (const chunk of stream) {
                res.write(chunk);
            }
            res.end();
        }
    } catch (error: any) {
        console.error("Stream error:", error);
        if (!res.headersSent) res.status(500).send(error.message);
    }
});

// Stats for Admin
router.get('/stats', (req, res) => {
    const stats = {
        totalFiles: db.prepare('SELECT COUNT(*) as count FROM media').get() as any,
        byCategory: db.prepare('SELECT category, COUNT(*) as count FROM media GROUP BY category').all(),
        channels: db.prepare('SELECT * FROM channels').all(),
    };
    res.json(stats);
});

router.get('/status', async (req, res) => {
    try {
        const status = await telegramService.getStatus();
        res.json(status);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/login/send-code', async (req, res) => {
    const { phoneNumber, apiId, apiHash } = req.body;
    try {
        if (apiId) await telegramService.updateConfig('telegram_api_id', apiId);
        if (apiHash) await telegramService.updateConfig('telegram_api_hash', apiHash);
        
        const result = await telegramService.startLogin(phoneNumber);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/login/verify', async (req, res) => {
    const { phoneNumber, phoneCodeHash, code, password } = req.body;
    try {
        const result = await telegramService.completeLogin(phoneNumber, phoneCodeHash, code, password);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/credentials/save', async (req, res) => {
    const { apiId, apiHash, session } = req.body;
    try {
        await telegramService.saveCredentials(apiId, apiHash, session);
        res.json({ success: true, message: 'Credentials saved and connected' });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/disconnect', async (req, res) => {
    try {
        await telegramService.disconnect();
        res.json({ success: true });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

router.get('/trending', (req, res) => {
    // Basic trending: just recent 10 videos
    const media = db.prepare('SELECT m.*, c.title as channel_name FROM media m JOIN channels c ON m.channel_id = c.id WHERE m.category = \'video\' ORDER BY m.message_date DESC LIMIT 10').all();
    res.json(media);
});

router.get('/recent', (req, res) => {
    const media = db.prepare('SELECT m.*, c.title as channel_name FROM media m JOIN channels c ON m.channel_id = c.id ORDER BY m.message_date DESC LIMIT 20').all();
    res.json(media);
});

export default router;
