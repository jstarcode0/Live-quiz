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

    const results: Record<string, boolean> = {};
    for (const check of checks) {
        await new Promise((resolve) => {
            exec(check.cmd, (err) => {
                results[check.name] = !err;
                resolve(null);
            });
        });
    }
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
        case 'kill-ffmpeg':
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
