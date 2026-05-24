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
    const [channelId, msgIdStr] = id.split('_');
    const msgId = parseInt(msgIdStr);
    const range = req.headers.range;

    try {
        // We'll first get the basic info to handle the range correctly
        const startBytes = range ? parseInt(range.replace(/bytes=/, "").split("-")[0], 10) : 0;
        
        // We might need the full size first. For efficiency, we can fetch message info.
        // But for now let's just use the stream and pipe it.
        // To support proper range, we need the end too.
        
        // Fetch message metadata from DB if we have it to get fileSize
        const mediaInfo = db.prepare('SELECT file_size, mime_type FROM media WHERE channel_id = ? AND message_id = ?').get(channelId, msgId) as any;
        const totalSize = mediaInfo?.file_size || 0;
        const mimeType = mediaInfo?.mime_type || 'application/octet-stream';

        const endBytes = range ? (range.split("-")[1] ? parseInt(range.split("-")[1], 10) : totalSize - 1) : totalSize - 1;
        const chunksize = (endBytes - startBytes) + 1;

        const { stream } = await telegramService.getMediaStream(channelId, msgId, startBytes, endBytes);

        if (range) {
            res.writeHead(206, {
                'Content-Range': `bytes ${startBytes}-${endBytes}/${totalSize}`,
                'Accept-Ranges': 'bytes',
                'Content-Length': chunksize,
                'Content-Type': mimeType,
            });
        } else {
            res.writeHead(200, {
                'Content-Length': totalSize,
                'Content-Type': mimeType,
            });
        }

        for await (const chunk of stream) {
            res.write(chunk);
        }
        res.end();
    } catch (error: any) {
        console.error("Stream error:", error);
        if (!res.headersSent) res.status(500).send(error.message);
    }
});

router.get('/thumb/:id', async (req, res) => {
    const { id } = req.params;
    const [channelId, msgId] = id.split('_');
    try {
        const thumb = await telegramService.getThumbnail(channelId, parseInt(msgId));
        if (!thumb) return res.status(404).send('No thumb');
        res.setHeader('Content-Type', 'image/jpeg');
        res.setHeader('Cache-Control', 'public, max-age=86400');
        res.send(thumb);
    } catch (e: any) {
        res.status(500).send(e.message);
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
