import express from 'express';
import bigInt from 'big-integer';
import { telegramService } from './services/telegramService.js';
import db from './lib/db.js';
import path from 'path';
import os from 'os';

const router = express.Router();

// Search and List Media
router.get('/media', (req, res) => {
    const { q, categoryId, mainTopicId, subTopicId, channelId, limit = 50, offset = 0 } = req.query;
    
    let query = 'SELECT m.*, c.title as channel_name FROM media m JOIN channels c ON m.channel_id = c.id WHERE 1=1';
    const params: any[] = [];

    if (q) {
        query += ' AND (m.file_name LIKE ? OR m.caption LIKE ? OR m.clean_title LIKE ?)';
        params.push(`%${q}%`, `%${q}%`, `%${q}%`);
    }
    if (categoryId) {
        query += ' AND m.category_id = ?';
        params.push(categoryId);
    }
    if (mainTopicId) {
        query += ' AND m.main_topic_id = ?';
        params.push(mainTopicId);
    }
    if (subTopicId) {
        query += ' AND m.sub_topic_id = ?';
        params.push(subTopicId);
    }
    if (channelId) {
        query += ' AND m.channel_id = ?';
        params.push(channelId);
    }

    query += ' ORDER BY m.message_date DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit as string), parseInt(offset as string));

    const media = db.prepare(query).all(...params);
    res.json(media);
});

// Course Platform Hierarchy Routes
router.get('/categories', (req, res) => {
    const categories = db.prepare(`
        SELECT c.*, 
        (SELECT COUNT(*) FROM media WHERE category_id = c.id) as media_count,
        (SELECT COUNT(*) FROM media WHERE category_id = c.id AND category = 'video') as video_count,
        (SELECT COUNT(*) FROM media WHERE category_id = c.id AND category = 'pdf') as pdf_count
        FROM categories c
        ORDER BY name ASC
    `).all();
    res.json(categories);
});

router.get('/topics/:categoryId', (req, res) => {
    const topics = db.prepare(`
        SELECT t.*, 
        (SELECT COUNT(*) FROM media WHERE main_topic_id = t.id) as media_count
        FROM main_topics t 
        WHERE t.category_id = ? 
        ORDER BY name ASC
    `).all(req.params.categoryId);
    res.json(topics);
});

router.get('/subtopics/:mainTopicId', (req, res) => {
    const subTopics = db.prepare(`
        SELECT s.*, 
        (SELECT COUNT(*) FROM media WHERE sub_topic_id = s.id) as media_count
        FROM sub_topics s 
        WHERE s.main_topic_id = ? 
        ORDER BY name ASC
    `).all(req.params.mainTopicId);
    res.json(subTopics);
});

router.get('/media/hierarchy/:subTopicId', (req, res) => {
    const media = db.prepare(`
        SELECT m.*, c.title as channel_name 
        FROM media m 
        JOIN channels c ON m.channel_id = c.id 
        WHERE m.sub_topic_id = ? 
        ORDER BY m.part_number ASC, m.message_date ASC
    `).all(req.params.subTopicId);
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
    let channelId: string;
    let msgId: number;

    if (id.includes('_')) {
        const parts = id.split('_');
        channelId = parts[0];
        msgId = parseInt(parts[1]);
    } else {
        // Look up by database ID
        const media = db.prepare('SELECT channel_id, message_id FROM media WHERE id = ?').get(id) as any;
        if (!media) return res.status(404).send('Media not found in library');
        channelId = media.channel_id;
        msgId = media.message_id;
    }

    const range = req.headers.range;

    try {
        const startBytes = range ? parseInt(range.replace(/bytes=/, "").split("-")[0], 10) : 0;
        
        // Use getMediaInfo to get metadata first
        const { size: totalSize, mimeType: resolvedMimeType } = await telegramService.getMediaInfo(channelId, msgId);
        
        const endBytes = range ? (range.split("-")[1] ? parseInt(range.split("-")[1], 10) : totalSize - 1) : totalSize - 1;
        const chunksize = (endBytes - startBytes) + 1;

        // Fetch the actual stream with proper range
        const { stream } = await telegramService.getMediaStream(channelId, msgId, startBytes, endBytes);

        if (range) {
            res.writeHead(206, {
                'Content-Range': `bytes ${startBytes}-${endBytes}/${totalSize}`,
                'Accept-Ranges': 'bytes',
                'Content-Length': chunksize,
                'Content-Type': resolvedMimeType,
            });
        } else {
            res.writeHead(200, {
                'Content-Length': totalSize,
                'Content-Type': resolvedMimeType,
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
    let channelId: string;
    let msgId: number;

    if (id.includes('_')) {
        const parts = id.split('_');
        channelId = parts[0];
        msgId = parseInt(parts[1]);
    } else {
        // Look up by database ID
        const media = db.prepare('SELECT channel_id, message_id FROM media WHERE id = ?').get(id) as any;
        if (!media) return res.status(404).send('Media not found in library');
        channelId = media.channel_id;
        msgId = media.message_id;
    }

    try {
        const thumb = await telegramService.getThumbnail(channelId, msgId);
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
    const cpus = os.cpus();
    const stats = {
        totalFiles: (db.prepare('SELECT COUNT(*) as count FROM media').get() as any).count,
        totalVideos: (db.prepare('SELECT COUNT(*) as count FROM media WHERE category = \'video\'').get() as any).count,
        totalPDFs: (db.prepare('SELECT COUNT(*) as count FROM media WHERE category = \'pdf\'').get() as any).count,
        totalStorage: (db.prepare('SELECT SUM(file_size) as total FROM media').get() as any).total || 0,
        totalCategories: (db.prepare('SELECT COUNT(*) as count FROM categories').get() as any).count,
        totalTopics: (db.prepare('SELECT COUNT(*) as count FROM main_topics').get() as any).count,
        byCategory: db.prepare('SELECT c.name as category, COUNT(*) as count FROM media m JOIN categories c ON m.category_id = c.id GROUP BY m.category_id').all(),
        server: {
            uptime: os.uptime(),
            totalMem: os.totalmem(),
            freeMem: os.freemem(),
            cpuUsage: os.loadavg()[0],
            cores: cpus.length,
            platform: os.platform(),
            nodeVersion: process.version
        }
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
