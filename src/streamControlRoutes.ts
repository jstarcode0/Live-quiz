import express from 'express';
import { exec, spawn, ChildProcess } from 'child_process';
import os from 'os';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';

const router = express.Router();

export const streamLogs: { timestamp: string, type: string, message: string }[] = [];
export function addLog(source: string, message: string) {
    const timestamp = new Date().toISOString();
    streamLogs.push({ timestamp, type: source, message });
    if (streamLogs.length > 500) streamLogs.shift();
}

const activeDownloads: Record<string, {
    process: ChildProcess;
    url: string;
    targetPath: string;
    progress: string;
    speed: string;
    eta: string;
    percent: number;
    status: 'downloading' | 'finished' | 'error' | 'stopped';
}> = {};

router.get('/sysinfo', (req, res) => {
    const memTotal = os.totalmem();
    const memFree = os.freemem();
    const memUsed = memTotal - memFree;
    res.json({
        cpu: os.loadavg(),
        ram: {
            total: memTotal,
            free: memFree,
            used: memUsed,
            percent: Math.round((memUsed / memTotal) * 100)
        },
        uptime: os.uptime(),
        platform: os.platform()
    });
});

router.get('/processes', (req, res) => {
    exec('ps aux', (err, stdout) => {
        if (err) {
            return res.json({ error: err.message });
        }
        res.json({ output: stdout });
    });
});

router.get('/logs', (req, res) => {
    res.json({ logs: streamLogs });
});

router.get('/tools-check', async (req, res) => {
    const tools = [
        'node', 'npm', 'ffmpeg', 'google-chrome', 'chromium', 
        'firefox', 'surf', 'pulseaudio', 'Xvfb', 'openbox', 
        'x11vnc', 'websockify', 'git', 'curl', 'wget', 'nano', 'htop', 'python3', 'pip', 'tmux'
    ];
    
    const results: Record<string, boolean> = {};
    
    const checkTool = (tool: string) => new Promise<void>((resolve) => {
        exec(`which ${tool}`, (err, stdout) => {
            results[tool] = !err && stdout.trim().length > 0;
            resolve();
        });
    });

    await Promise.all(tools.map(checkTool));
    res.json(results);
});

// Recursive file search for videos
async function findVideos(dir: string): Promise<any[]> {
    let results: any[] = [];
    const videoExts = ['.mp4', '.mkv', '.mov', '.webm', '.avi'];
    
    try {
        const list = await fs.readdir(dir, { withFileTypes: true });
        for (const file of list) {
            const res = path.resolve(dir, file.name);
            if (file.isDirectory()) {
                if (file.name === 'node_modules' || file.name === '.git' || file.name === 'dist') continue;
                results = results.concat(await findVideos(res));
            } else {
                const ext = path.extname(file.name).toLowerCase();
                if (videoExts.includes(ext)) {
                    let size = 0;
                    try {
                        const stats = await fs.stat(res);
                        size = stats.size;
                    } catch (e) {}
                    results.push({
                        name: file.name,
                        path: res,
                        size,
                        ext
                    });
                }
            }
        }
    } catch (e) {}
    return results;
}

router.get('/all-videos', async (req, res) => {
    const rootDir = process.cwd();
    const downloadDir = '/root/downloads';
    
    let videos = await findVideos(rootDir);
    
    // Also try to scan /root/downloads if it exists
    try {
        await fs.access(downloadDir);
        const downloadVideos = await findVideos(downloadDir);
        // Avoid duplicates if /root/downloads is somehow inside rootDir
        downloadVideos.forEach(dv => {
            if (!videos.find(v => v.path === dv.path)) {
                videos.push(dv);
            }
        });
    } catch (e) {}

    res.json(videos);
});

// File Management APIs
router.get('/files', async (req, res) => {
    const dirPath = (req.query.path as string) || process.cwd();
    try {
        const fullPath = path.resolve(dirPath);
        // Security check: ensure the path is within the app or in /root if we allow it
        // For simplicity and user request "browsing parent directories", we allow full access within permissions
        
        const entries = await fs.readdir(fullPath, { withFileTypes: true });
        const files = await Promise.all(entries.map(async entry => {
            const entryPath = path.join(fullPath, entry.name);
            let size = 0;
            try {
                const stats = await fs.stat(entryPath);
                size = stats.size;
            } catch (e) {}

            return {
                name: entry.name,
                path: entryPath,
                isDir: entry.isDirectory(),
                size
            };
        }));

        res.json({
            currentPath: fullPath,
            files: files.sort((a, b) => {
                if (a.isDir && !b.isDir) return -1;
                if (!a.isDir && b.isDir) return 1;
                return a.name.localeCompare(b.name);
            })
        });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

router.post('/delete-file', async (req, res) => {
    const { filePath } = req.body;
    if (!filePath) return res.status(400).json({ error: 'filePath is required' });
    try {
        await fs.unlink(filePath);
        res.json({ success: true });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

// Download API
router.post('/download', async (req, res) => {
    const { url, method = 'wget' } = req.body;
    if (!url) return res.status(400).json({ error: 'url is required' });

    const downloadDir = '/root/downloads';
    try {
        await fs.mkdir(downloadDir, { recursive: true });
    } catch (e) {
        addLog('DOWNLOAD_ERROR', `Failed to create /root/downloads, falling back to local downloads folder. Error: ${e instanceof Error ? e.message : String(e)}`);
    }
    
    // Check if /root/downloads is actually writable/created
    let finalDownloadDir = downloadDir;
    try {
        await fs.access(downloadDir);
    } catch (e) {
        finalDownloadDir = path.resolve(process.cwd(), 'downloads');
        await fs.mkdir(finalDownloadDir, { recursive: true });
    }

    const fileName = url.split('/').pop()?.split('?')[0] || `download-${Date.now()}`;
    const targetPath = path.join(finalDownloadDir, fileName);
    const id = Date.now().toString();

    let child: ChildProcess;
    if (method === 'curl') {
        child = spawn('curl', ['-L', '-o', targetPath, url]);
    } else {
        // wget with progress output
        child = spawn('wget', ['-O', targetPath, '--progress=dot:giga', url]);
    }

    activeDownloads[id] = {
        process: child,
        url,
        targetPath,
        progress: 'Starting...',
        speed: '-',
        eta: '-',
        percent: 0,
        status: 'downloading'
    };

    child.stdout.on('data', (data) => {
        const msg = data.toString();
        addLog(`DOWNLOAD_${id}`, msg);
    });

    child.stderr.on('data', (data) => {
        const msg = data.toString();
        // wget output progress to stderr usually
        activeDownloads[id].progress = msg;
        
        // Very basic parsing for wget progress
        const percentMatch = msg.match(/(\d+)%/);
        if (percentMatch) activeDownloads[id].percent = parseInt(percentMatch[1]);
        
        addLog(`DOWNLOAD_${id}_PROGRESS`, msg);
    });

    child.on('close', (code) => {
        if (code === 0) {
            activeDownloads[id].status = 'finished';
            addLog(`DOWNLOAD_${id}`, `Finished successfully: ${fileName}`);
        } else {
            activeDownloads[id].status = 'error';
            addLog(`DOWNLOAD_${id}`, `Failed with code ${code}`);
        }
    });

    res.json({ success: true, id, fileName });
});

router.get('/download-status', (req, res) => {
    const status = Object.entries(activeDownloads).map(([id, data]) => ({
        id,
        url: data.url,
        fileName: path.basename(data.targetPath),
        percent: data.percent,
        progress: data.progress,
        status: data.status
    }));
    res.json(status);
});

router.post('/download/stop', (req, res) => {
    const { id } = req.body;
    if (activeDownloads[id]) {
        activeDownloads[id].process.kill();
        activeDownloads[id].status = 'stopped';
        res.json({ success: true });
    } else {
        res.status(404).json({ error: 'Download not found' });
    }
});

router.get('/video-metadata', (req, res) => {
    const { filePath } = req.query;
    if (!filePath) return res.status(400).json({ error: 'filePath is required' });

    const cmd = `ffprobe -v error -select_streams v:0 -show_entries stream=width,height,duration -of json "${filePath}"`;
    exec(cmd, (err, stdout) => {
        if (err) return res.status(500).json({ error: err.message });
        try {
            const data = JSON.parse(stdout);
            res.json(data.streams[0] || {});
        } catch (e) {
            res.status(500).json({ error: 'Failed to parse metadata' });
        }
    });
});

router.post('/install-tool', (req, res) => {
    const { tool } = req.body;
    if (!tool) return res.status(400).json({ error: 'tool is required' });

    let installCmd = '';
    const aptOpts = 'DEBIAN_FRONTEND=noninteractive apt-get -y -o Dpkg::Options::="--force-confdef" -o Dpkg::Options::="--force-confold"';

    // We assume Debian/Ubuntu for apt
    if (['ffmpeg', 'pulseaudio', 'xvfb', 'openbox', 'x11vnc', 'websockify', 'git', 'curl', 'wget', 'nano', 'htop', 'python3', 'python3-pip', 'surf', 'chromium', 'tmux'].includes(tool)) {
        installCmd = `dpkg --configure -a && ${aptOpts} --fix-broken install && ${aptOpts} update && ${aptOpts} install ${tool === 'xvfb' ? 'xvfb' : tool}`;
    } else if (tool === 'google-chrome') {
        installCmd = `dpkg --configure -a && ${aptOpts} --fix-broken install && wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - && sh -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list' && ${aptOpts} update && ${aptOpts} install google-chrome-stable`;
    } else if (tool === 'edge-tts') {
        installCmd = `pip install edge-tts`;
    } else if (tool === 'all') {
        installCmd = `dpkg --configure -a && ${aptOpts} --fix-broken install && ${aptOpts} update && ${aptOpts} install ffmpeg pulseaudio xvfb openbox x11vnc websockify git curl wget nano htop python3 python3-pip chromium tmux && pip install edge-tts`;
    } else if (tool === 'custom' && req.body.command) {
        installCmd = req.body.command.includes('apt-get') || req.body.command.includes('dpkg') ? 
            `DEBIAN_FRONTEND=noninteractive ` + req.body.command : req.body.command;
    } else {
        return res.status(400).json({ error: 'Unknown tool' });
    }

    addLog('INSTALL', `Starting installation for: ${tool}`);
    const child = spawn(installCmd, [], { shell: true });
    
    child.stdout.on('data', (data) => {
        addLog('INSTALL_STDOUT', data.toString());
    });
    
    child.stderr.on('data', (data) => {
        addLog('INSTALL_STDERR', data.toString());
    });
    
    child.on('close', (code) => {
        addLog('INSTALL', `Finished installation for ${tool} with code ${code}`);
    });

    res.json({ success: true, message: `Installation started for ${tool}`, command: installCmd });
});

let activeStreamVideoName = 'None';

router.get('/validate', async (req, res) => {
    const checks = [
        { name: 'Xvfb', cmd: 'pgrep Xvfb' },
        { name: 'PulseAudio', cmd: 'pgrep pulseaudio' },
        { name: 'StreamSink', cmd: 'pactl list short sinks | grep stream' },
        { name: 'Browser', cmd: 'pgrep -f chrome || pgrep -f chromium || pgrep -f firefox' },
        { name: 'FFmpeg', cmd: 'pgrep ffmpeg' },
        { name: 'Openbox', cmd: 'pgrep openbox' },
        { name: 'VNC', cmd: 'pgrep x11vnc' },
        { name: 'noVNC', cmd: 'pgrep -f websockify' }
    ];

    const results: any = {};
    for (const check of checks) {
        await new Promise((resolve) => {
            exec(check.cmd, (err) => {
                results[check.name] = !err;
                resolve(null);
            });
        });
    }

    if (!results.FFmpeg) {
        activeStreamVideoName = 'None';
    }

    results.activeVideoName = activeStreamVideoName;
    res.json(results);
});

router.post('/action', (req, res) => {
    const { action, resolution, fps } = req.body;
    let cmd = '';

    const resWidth = (resolution || '854x480').split('x')[0];
    const resHeight = (resolution || '854x480').split('x')[1];
    const streamFps = fps || '8';
    
    // Heuristic for bitrate based on resolution
    let bitrate = '800k';
    if (parseInt(resWidth) <= 640) bitrate = '400k';
    else if (parseInt(resWidth) <= 854) bitrate = '800k';
    else if (parseInt(resWidth) <= 960) bitrate = '1200k';
    else if (parseInt(resWidth) <= 1280) bitrate = '2500k';
    else bitrate = '4500k';

    switch (action) {
        case 'kill-services':
            cmd = 'pkill chrome; pkill chromium; pkill ffmpeg; pkill Xvfb; pkill openbox; pkill pulseaudio; pkill x11vnc; pkill websockify';
            break;
        case 'start-pulse':
            cmd = `
pkill -9 pulseaudio 2>/dev/null || true
rm -rf /tmp/pulse-* /tmp/runtime-root

export DISPLAY=:99
export XDG_RUNTIME_DIR=/tmp/runtime-root
export PULSE_RUNTIME_PATH=/tmp/runtime-root/pulse

mkdir -p $XDG_RUNTIME_DIR
chmod 700 $XDG_RUNTIME_DIR

pulseaudio --daemonize=yes --system=false --exit-idle-time=-1
sleep 3

pactl info

pactl load-module module-null-sink sink_name=stream
pactl load-module module-null-sink sink_name=stream sink_properties=device.description=stream

pactl list short sinks
            `.trim();
            break;

        case 'start-vnc-stack':
            cmd = `
tmux kill-session -t quiz-xvfb 2>/dev/null || true
tmux new-session -d -s quiz-xvfb "Xvfb :99 -screen 0 ${resWidth}x${resHeight}x16 & openbox & wait"

tmux kill-session -t quiz-vnc 2>/dev/null || true
tmux new-session -d -s quiz-vnc "x11vnc -display :99 -forever -nopw -listen 0.0.0.0 -xkb & wait"

tmux kill-session -t quiz-websockify 2>/dev/null || true
tmux new-session -d -s quiz-websockify "websockify --web=/usr/share/novnc/ 6080 localhost:5900 & wait"
            `.trim();
            break;

        case 'start-browser':
            cmd = `
tmux kill-session -t quiz-browser 2>/dev/null || true
tmux new-session -d -s quiz-browser "export DISPLAY=:99; google-chrome \\
--no-sandbox \\
--disable-gpu \\
--disable-gpu-compositing \\
--disable-accelerated-2d-canvas \\
--disable-software-rasterizer \\
--disable-dev-shm-usage \\
--disable-extensions \\
--disable-background-networking \\
--disable-sync \\
--disable-background-timer-throttling \\
--disable-renderer-backgrounding \\
--disable-backgrounding-occluded-windows \\
--disable-features=TranslateUI \\
--autoplay-policy=no-user-gesture-required \\
--window-size=${resWidth},${resHeight} \\
--kiosk \\
http://127.0.0.1:3000 & wait"
            `.trim();
            break;

        case 'start-ffmpeg':
            activeStreamVideoName = 'Browser Capture';
            const ffmpegSessionCmd = `
export DISPLAY=:99;
export XDG_RUNTIME_DIR=/tmp/runtime-root;

set -a;
source .env;
set +a;

if [ -z "$YOUTUBE_RTMP_URL" ]; then
  echo 'RTMP URL missing in .env';
  exit 1;
fi;

ffmpeg \\
-f x11grab \\
-video_size ${resWidth}x${resHeight} \\
-framerate ${streamFps} \\
-i :99.0 \\
-f pulse \\
-i stream.monitor \\
-c:v libx264 \\
-preset ultrafast \\
-tune zerolatency \\
-pix_fmt yuv420p \\
-c:a aac \\
-b:v ${bitrate} \\
-b:a 128k \\
-r ${streamFps} \\
-f flv \\
"$YOUTUBE_RTMP_URL"
            `.trim();
            cmd = `tmux kill-session -t quiz-ffmpeg 2>/dev/null || true; tmux new-session -d -s quiz-ffmpeg "${ffmpegSessionCmd.replace(/"/g, '\\"').replace(/\$/g, '\\$')}"`;
            break;

        case 'kill-pulse':
            cmd = 'pkill -9 pulseaudio; rm -rf /tmp/pulse-* /tmp/runtime-root';
            break;
        case 'kill-vnc-stack':
            cmd = 'tmux kill-session -t quiz-xvfb; tmux kill-session -t quiz-vnc; tmux kill-session -t quiz-websockify; pkill Xvfb; pkill openbox; pkill x11vnc; pkill websockify';
            break;
        case 'kill-browser':
            cmd = 'tmux kill-session -t quiz-browser; pkill chrome; pkill chromium; pkill firefox';
            break;
        case 'start-local-stream':
            const { videoPath: localVideoPath } = req.body;
            if (!localVideoPath) {
                return res.status(400).json({ success: false, message: 'videoPath is required' });
            }
            activeStreamVideoName = path.basename(localVideoPath);

            // Kill EVERYTHING first to ensure NO browser capture is running
            const cleanupCmd = `
pkill -9 chrome 2>/dev/null || true; 
pkill -9 chromium 2>/dev/null || true; 
pkill -9 Xvfb 2>/dev/null || true; 
pkill -9 ffmpeg 2>/dev/null || true; 
tmux kill-session -t quiz-ffmpeg 2>/dev/null || true;
tmux kill-session -t quiz-xvfb 2>/dev/null || true;
tmux kill-session -t quiz-browser 2>/dev/null || true;
tmux kill-session -t quiz-vnc 2>/dev/null || true;
tmux kill-session -t quiz-websockify 2>/dev/null || true;
`.trim().replace(/\n/g, ' ');

            const ffmpegCommand = `
set -a;
source .env;
set +a;

if [ -z "$YOUTUBE_RTMP_URL" ]; then
  echo 'RTMP URL missing in .env';
  exit 1;
fi;

VIDEO_PATH="${localVideoPath}"

ffmpeg \\
-re \\
-stream_loop -1 \\
-i "$VIDEO_PATH" \\
-c:v libx264 \\
-preset ultrafast \\
-tune zerolatency \\
-pix_fmt yuv420p \\
-c:a aac \\
-b:v 700k \\
-r 8 \\
-s 854x480 \\
-f flv \\
"$YOUTUBE_RTMP_URL"
            `.trim();

            const tmuxFullCmd = `tmux new-session -d -s quiz-ffmpeg "${ffmpegCommand.replace(/"/g, '\\"').replace(/\$/g, '\\$')}"`;
            cmd = `${cleanupCmd} ${tmuxFullCmd}`;
            break;
        case 'kill-ffmpeg':
            activeStreamVideoName = 'None';
            cmd = 'tmux kill-session -t quiz-ffmpeg; pkill ffmpeg';
            break;
    }

    if (cmd) {
        addLog('ACTION', `Executing: ${cmd}`);
        exec(cmd, { env: { ...process.env, DISPLAY: ':99' } }, (err, stdout, stderr) => {
            if (err) addLog('ERROR', err.message);
            if (stdout) addLog('STDOUT', stdout);
            if (stderr) addLog('STDERR', stderr);
        });
        res.json({ success: true, message: `Executed action: ${action}` });
    } else {
        res.status(400).json({ success: false, message: 'Unknown action' });
    }
});

// Update env vars API
router.post('/env', async (req, res) => {
    try {
        const envPath = path.resolve(process.cwd(), '.env');
        let currentEnv = '';
        try {
            currentEnv = await fs.readFile(envPath, 'utf-8');
        } catch (e) {}

        const lines = currentEnv.split('\n');
        const updates = req.body;
        
        for (const [key, value] of Object.entries(updates)) {
            const idx = lines.findIndex(l => l.startsWith(`${key}=`));
            if (idx >= 0) lines[idx] = `${key}=${value}`;
            else lines.push(`${key}=${value}`);
        }
        
        await fs.writeFile(envPath, lines.join('\n'));
        res.json({ success: true });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

router.get('/env', async (req, res) => {
    try {
        const envPath = path.resolve(process.cwd(), '.env');
        const content = await fs.readFile(envPath, 'utf-8');
        const parsed: Record<string, string> = {};
        content.split('\n').forEach(line => {
            const [k, v] = line.split('=');
            if (k && v !== undefined) parsed[k.trim()] = v.trim();
        });
        res.json(parsed);
    } catch (e) {
        res.json({});
    }
});

// TMUX Management
router.get('/tmux/sessions', (req, res) => {
    exec('tmux list-sessions -F "#{session_name}|#{session_created}|#{session_attached}|#{session_activity}" 2>/dev/null', (err, stdout) => {
        if (err) {
            return res.json([]);
        }
        const sessions = stdout.trim().split('\n').filter(l => l).map(line => {
            const [name, created, attached, activity] = line.split('|');
            return {
                name,
                created: parseInt(created),
                attached: attached === '1',
                activity: parseInt(activity)
            };
        });
        res.json(sessions);
    });
});

router.post('/tmux/action', (req, res) => {
    const { action, session, command } = req.body;
    if (!action) return res.status(400).json({ error: 'action required' });

    let tmuxCmd = '';
    switch (action) {
        case 'kill':
            if (!session) return res.status(400).json({ error: 'session required' });
            tmuxCmd = `tmux kill-session -t ${session}`;
            break;
        case 'create':
            if (!session || !command) return res.status(400).json({ error: 'session and command required' });
            tmuxCmd = `if tmux has-session -t ${session} 2>/dev/null; then echo "Already exists"; else tmux new-session -d -s ${session} "${command.replace(/"/g, '\\"')}"; fi`;
            break;
    }

    if (tmuxCmd) {
        exec(tmuxCmd, (err) => {
            if (err) return res.json({ success: false, error: err.message });
            res.json({ success: true });
        });
    } else {
        res.json({ success: false, error: 'Unknown action' });
    }
});

router.get('/tmux/logs/:session', (req, res) => {
    const { session } = req.params;
    exec(`tmux capture-pane -pt ${session}`, (err, stdout) => {
        if (err) return res.json({ error: err.message });
        res.json({ output: stdout });
    });
});

export default router;
