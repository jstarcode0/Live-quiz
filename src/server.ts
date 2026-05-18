import express from 'express';
import { createServer as createViteServer } from 'vite';
import fsPromises from 'fs/promises';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createHash } from 'crypto';
import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts';
import streamControlRoutes from './streamControlRoutes.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const DATA_DIR = path.join(__dirname, 'data');
const CATEGORIES_DIR = path.join(DATA_DIR, 'categories');
const SETTINGS_DIR = path.join(DATA_DIR, 'settings');
const TTS_CACHE_DIR = path.join(DATA_DIR, 'tts_cache');
const YT_NOTES_DIR = path.join(DATA_DIR, 'yt-notes');
const STATE_FILE = path.join(SETTINGS_DIR, 'live-state.json');

async function ensureDirs() {
  await fsPromises.mkdir(DATA_DIR, { recursive: true });
  await fsPromises.mkdir(CATEGORIES_DIR, { recursive: true });
  await fsPromises.mkdir(SETTINGS_DIR, { recursive: true });
  await fsPromises.mkdir(TTS_CACHE_DIR, { recursive: true });
  await fsPromises.mkdir(YT_NOTES_DIR, { recursive: true });
}

async function readJson(file: string, defaultValue: any) {
  try {
    const data = await fsPromises.readFile(file, 'utf-8');
    return JSON.parse(data);
  } catch (e) {
    return defaultValue;
  }
}

import { setupWebSocketTerminals } from './terminals.js';

async function writeJson(file: string, data: any) {
  await fsPromises.writeFile(file, JSON.stringify(data, null, 2), 'utf-8');
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  await ensureDirs();

  app.use(express.json({ limit: '50mb' }));

  // API Routes
  
  app.use('/tts_cache', express.static(TTS_CACHE_DIR));

  // TTS Endpoint
  app.post('/api/tts', async (req, res) => {
    try {
      const { text, lang, gender, rate = 1.0, volume = 1.0 } = req.body;
      if (!text) {
         res.status(400).json({ error: 'Text is required' });
         return;
      }
      
      let voiceName = 'en-US-JennyNeural'; // Default
      if (lang === 'hi') {
         voiceName = gender === 'male' ? 'hi-IN-MadhurNeural' : 'hi-IN-SwaraNeural';
      } else {
         voiceName = gender === 'male' ? 'en-US-GuyNeural' : 'en-US-JennyNeural';
      }

      // Hash attributes to generate unique filename
      const hashInput = `${text}-${voiceName}-${rate}-${volume}`;
      const hash = createHash('md5').update(hashInput).digest('hex');
      const filename = `${hash}.mp3`;
      const filepath = path.join(TTS_CACHE_DIR, filename);

      try {
         await fsPromises.access(filepath);
         // Exists in cache
         res.json({ url: `/tts_cache/${filename}` });
         return;
      } catch (err) {
         // Doesn't exist, we must generate
      }

      const tts = new MsEdgeTTS();
      await tts.setMetadata(voiceName, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
      
      let rateStr = '0%';
      if (rate !== 1.0) {
          const diff = Math.round((rate - 1.0) * 100);
          rateStr = diff > 0 ? `+${diff}%` : `${diff}%`;
      }
      let volStr = '0%';
      if (volume !== 1.0) {
          const diff = Math.round((volume - 1.0) * 100);
          volStr = diff > 0 ? `+${diff}%` : `${diff}%`;
      }

      const { audioStream } = await tts.toStream(text, { rate: rateStr, volume: volStr, pitch: '+0Hz' });
      await new Promise<void>((resolve, reject) => {
         const fileStream = fs.createWriteStream(filepath);
         audioStream.pipe(fileStream);
         fileStream.on('finish', resolve);
         fileStream.on('error', reject);
         audioStream.on('error', reject);
      });
      
      res.json({ url: `/tts_cache/${filename}` });
    } catch (e: any) {
      console.error("TTS generation error:", e);
      res.status(500).json({ error: e.message || 'TTS generation failed' });
    }
  });

  // Get Global Live State
  app.get('/api/state', async (req, res) => {
    const state = await readJson(STATE_FILE, {
      currentIdx: 0,
      phase: 'reading',
      timeLeft: 15,
      isTimerPaused: false,
      activeCategoryIds: ['default'],
      narrationLanguage: 'hi',
      streamingSettings: {
        streamTitle: 'SSC LIVE QUIZ',
        sscTitle: 'Premium Platform',
        headerText: 'SSC CGL 2024 LIVE MOCK TEST',
        viewerCount: 15420,
        liveBadgeText: 'LIVE',
        logoUrl: '',
        footerText: 'System Ops: Nominal | Broadcast Res: 1080P60 | Latency: 12ms',
        globalTimerDuration: 15,
        quizCompletionMode: 'loop',
        speechEnabled: true,
        humanExpressionsEnabled: true,
        ttsRate: 0.9,
        ttsVolume: 1.0,
        theme: {
          bgPrimary: '#050505',
          bgSecondary: '#020202',
          textPrimary: '#ffffff',
          textSecondary: '#94a3b8',
          accentColor: '#0ea5e9',
          timerColor: '#ef4444',
          correctColor: '#22c55e',
          wrongColor: '#ef4444',
          explanationBg: '#0f172a',
          explanationText: '#f8fafc',
          headerBg: '#000000',
          headerText: '#ffffff',
          footerBg: '#000000',
          footerText: '#64748b',
          progressBarColor: '#0ea5e9',
          glowColor: '#0ea5e9',
          neonIntensity: 0.5
        }
      }
    });
    res.json(state);
  });

  // Update Global Live State
  app.post('/api/state', async (req, res) => {
    const currentState = await readJson(STATE_FILE, {});
    
    // Deep merge to avoid deleting streaming settings
    const newState = { ...currentState, ...req.body };
    if (currentState.streamingSettings && req.body.streamingSettings) {
        newState.streamingSettings = {
            ...currentState.streamingSettings,
            ...req.body.streamingSettings,
            theme: {
                ...(currentState.streamingSettings.theme || {}),
                ...(req.body.streamingSettings.theme || {})
            }
        };
    }
    
    await writeJson(STATE_FILE, newState);
    res.json(newState);
  });

  // List Categories
  app.get('/api/categories', async (req, res) => {
    try {
      const files = await fsPromises.readdir(CATEGORIES_DIR);
      const categories = await Promise.all(files
        .filter(f => f.endsWith('.json'))
        .map(async f => {
          const filePath = path.join(CATEGORIES_DIR, f);
          const content = await readJson(filePath, []);
          const stats = await fsPromises.stat(filePath);
          return {
            id: f.replace('.json', ''),
            name: f.replace('.json', '').replace(/-/g, ' ').toUpperCase(),
            questionCount: Array.isArray(content) ? content.length : 0,
            lastUpdated: stats.mtime.toISOString()
          };
        }));
      
      if (categories.length === 0) {
        // Create a default one if none exist
        const defaultCat = { id: 'default', name: 'GENERAL KNOWLEDGE' };
        await writeJson(path.join(CATEGORIES_DIR, 'default.json'), []);
        return res.json([{ ...defaultCat, questionCount: 0 }]);
      }
      
      res.json(categories);
    } catch (e) {
      res.json([]);
    }
  });

  // Add/Update Category
  app.post('/api/categories', async (req, res) => {
    const { id, name } = req.body;
    const safeId = id.toLowerCase().replace(/[^a-z0-9]/g, '-');
    const filePath = path.join(CATEGORIES_DIR, `${safeId}.json`);
    
    // If file doesn't exist, create it with empty array
    try {
      await fsPromises.access(filePath);
    } catch (e) {
      await writeJson(filePath, []);
    }
    
    res.json({ id: safeId, name });
  });

  // Delete Category
  app.delete('/api/categories/:id', async (req, res) => {
    const id = req.params.id;
    const filePath = path.join(CATEGORIES_DIR, `${id}.json`);
    try {
      await fsPromises.unlink(filePath);
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: 'Failed to delete' });
    }
  });

  // ==========================================
  // YT NOTES API
  // ==========================================
  
  app.get('/api/yt-notes/lessons', async (req, res) => {
    try {
      const files = await fsPromises.readdir(YT_NOTES_DIR);
      const lessons = await Promise.all(files
        .filter(f => f.endsWith('.json'))
        .map(async f => {
          const filePath = path.join(YT_NOTES_DIR, f);
          const content = await readJson(filePath, null);
          return content;
        })
      );
      res.json(lessons.filter(l => l !== null));
    } catch (e) {
      res.json([]);
    }
  });

  app.get('/api/yt-notes/lessons/:id', async (req, res) => {
    const filePath = path.join(YT_NOTES_DIR, `${req.params.id}.json`);
    try {
      const data = await readJson(filePath, null);
      if (data) {
        res.json(data);
      } else {
        res.status(404).json({ error: 'Lesson not found' });
      }
    } catch (e) {
      res.status(500).json({ error: 'Failed' });
    }
  });

  app.post('/api/yt-notes/lessons/:id', async (req, res) => {
    const id = req.params.id;
    const filePath = path.join(YT_NOTES_DIR, `${id}.json`);
    try {
      await writeJson(filePath, req.body);
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: 'Failed to save lesson' });
    }
  });

  app.delete('/api/yt-notes/lessons/:id', async (req, res) => {
    const filePath = path.join(YT_NOTES_DIR, `${req.params.id}.json`);
    try {
      await fsPromises.unlink(filePath);
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: 'Failed to delete lesson' });
    }
  });

  // Get Questions for Category
  app.get('/api/questions/:categoryId', async (req, res) => {
    const categoryId = req.params.categoryId;
    const filePath = path.join(CATEGORIES_DIR, `${categoryId}.json`);
    const questions = await readJson(filePath, []);
    res.json(questions);
  });

  // Update Questions for Category
  app.post('/api/questions/:categoryId', async (req, res) => {
    const categoryId = req.params.categoryId;
    const filePath = path.join(CATEGORIES_DIR, `${categoryId}.json`);
    await writeJson(filePath, req.body);
    res.json({ success: true });
  });

  // Get combined questions for multiple categories
  app.get('/api/questions-multi/:categoryIds', async (req, res) => {
    const categoryIds = req.params.categoryIds.split(',');
    let allQuestions: any[] = [];
    for (const id of categoryIds) {
      const filePath = path.join(CATEGORIES_DIR, `${id}.json`);
      const questions = await readJson(filePath, []);
      // Prepend category info to questions if needed for banner updates
      const categoryName = id.replace(/-/g, ' ').toUpperCase();
      const taggedQuestions = questions.map((q: any) => ({ ...q, categoryId: id, categoryName }));
      allQuestions = allQuestions.concat(taggedQuestions);
    }
    res.json(allQuestions);
  });

  // Mount Stream Control routes
  app.use('/api/stream', streamControlRoutes);

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });

  setupWebSocketTerminals(server);
}

startServer();
