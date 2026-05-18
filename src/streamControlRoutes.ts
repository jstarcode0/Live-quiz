import express from 'express';
import { exec, spawn, ChildProcess } from 'child_process';
import os from 'os';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import { WorkflowManager } from './WorkflowManager';

const router = express.Router();
const workflow = WorkflowManager.getInstance();

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

router.get('/workflow/status', (req, res) => {
    res.json(workflow.getStatus());
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
    const { action, browser } = req.body;
    const rtmpUrl = req.body.rtmpUrl || 'rtmp://a.rtmp.youtube.com/live2';
    const streamKey = req.body.streamKey || 'dummy_key';
    let cmd = '';

    if (action === 'start-full-stream') {
        const audioMode = req.body.audioMode || 'disabled';
        workflow.startWorkflow(rtmpUrl, streamKey, browser, audioMode);
        return res.json({ success: true, message: 'Workflow started' });
    }

    if (action && action.startsWith('kill-pid-')) {
        const pid = action.replace('kill-pid-', '');
        if (/^\d+$/.test(pid)) {
            exec(`kill -9 ${pid}`, (err) => {
                if (err) return res.json({ success: false, error: err.message });
                return res.json({ success: true });
            });
            return;
        }
    }

    const browserExec = browser === 'chromium' ? 'chromium' : (browser === 'firefox' ? 'firefox' : 'chrome');
    const bcmd = browser === 'firefox' 
        ? 'firefox --kiosk http://127.0.0.1:3000'
        : `${browser === 'chromium' ? 'chromium' : 'google-chrome'} --no-sandbox --disable-gpu --disable-gpu-compositing --disable-accelerated-2d-canvas --disable-software-rasterizer --disable-dev-shm-usage --disable-extensions --disable-background-networking --disable-sync --disable-background-timer-throttling --disable-renderer-backgrounding --disable-backgrounding-occluded-windows --disable-features=TranslateUI --autoplay-policy=no-user-gesture-required --window-size=1280,720 --kiosk http://127.0.0.1:3000`;

    // Improved FFmpeg commands (Full vs Video Only)
    const ffmpegFull = `ffmpeg -thread_queue_size 4096 -use_wallclock_as_timestamps 1 -fflags nobuffer+genpts -f x11grab -draw_mouse 0 -video_size 1280x720 -framerate 8 -i :99.0 -thread_queue_size 4096 -f pulse -i stream.monitor -af aresample=async=1:min_hard_comp=0.100:first_pts=0 -c:v libx264 -preset ultrafast -tune zerolatency -pix_fmt yuv420p -r 8 -g 16 -b:v 450k -maxrate 450k -bufsize 900k -crf 35 -c:a aac -b:a 48k -ar 44100 -threads 1 -f flv "${rtmpUrl}/${streamKey}"`;
    const ffmpegVideoOnly = `ffmpeg -thread_queue_size 4096 -use_wallclock_as_timestamps 1 -fflags nobuffer+genpts -f x11grab -draw_mouse 0 -video_size 1280x720 -framerate 8 -i :99.0 -c:v libx264 -preset ultrafast -tune zerolatency -pix_fmt yuv420p -r 8 -g 16 -b:v 450k -maxrate 450k -bufsize 900k -crf 35 -threads 1 -f flv "${rtmpUrl}/${streamKey}"`;

    const wrapTmux = (session: string, command: string) => {
        return `if tmux has-session -t ${session} 2>/dev/null; then echo "Session ${session} already exists"; else tmux new-session -d -s ${session} "${command.replace(/"/g, '\\"')}"; fi`;
    };

    switch (action) {
        case 'start-xvfb':
            cmd = `rm -f /tmp/.X99-lock && ` + wrapTmux('quiz-xvfb', `Xvfb :99 -screen 0 1280x720x16 -ac`);
            break;
        case 'stop-xvfb':
            cmd = 'tmux kill-session -t quiz-xvfb; pkill Xvfb; rm -f /tmp/.X99-lock';
            break;
        case 'start-pulse':
            cmd = `rm -rf /tmp/runtime-root && mkdir -p /tmp/runtime-root && chmod 700 /tmp/runtime-root && (pulseaudio --start --exit-idle-time=-1 || echo "PulseAudio failed")`;
            break;
        case 'create-sink':
            cmd = `pactl load-module module-null-sink sink_name=stream`;
            break;
        case 'start-browser':
            cmd = wrapTmux('quiz-browser', bcmd);
            break;
        case 'stop-browser':
            cmd = 'tmux kill-session -t quiz-browser; pkill -f chrome; pkill -f chromium; pkill -f firefox';
            break;
        case 'start-ffmpeg':
            // Heuristic to decide if audio sink exists
            cmd = `if pactl list short sinks | grep -q stream; then ${wrapTmux('quiz-ffmpeg', ffmpegFull)}; else ${wrapTmux('quiz-ffmpeg', ffmpegVideoOnly)}; fi`;
            break;
        case 'stop-ffmpeg':
            cmd = 'tmux kill-session -t quiz-ffmpeg; pkill ffmpeg';
            break;
        case 'stop-full-stream':
             cmd = 'tmux kill-session -t quiz-ffmpeg; tmux kill-session -t quiz-browser; tmux kill-session -t quiz-vnc; tmux kill-session -t quiz-websockify; tmux kill-session -t quiz-xvfb; tmux kill-session -t quiz-openbox; pkill ffmpeg; pkill -f chrome; pkill -f chromium; pkill -f firefox; pkill pulseaudio; pkill Xvfb; pkill openbox; pkill x11vnc; pkill websockify; rm -f /tmp/.X99-lock';
             break;
        case 'start-vnc':
            cmd = wrapTmux('quiz-vnc', 'x11vnc -display :99 -forever -shared -bg -nopw -noxdamage -rfbport 5900');
            break;
        case 'stop-vnc':
            cmd = 'tmux kill-session -t quiz-vnc; pkill x11vnc';
            break;
        case 'start-websockify':
            cmd = wrapTmux('quiz-websockify', 'python3 -m websockify --web /usr/share/novnc 6080 localhost:5900');
            break;
        case 'stop-websockify':
            cmd = 'tmux kill-session -t quiz-websockify; pkill -f websockify';
            break;
        case 'cleanup-zombies':
             cmd = `ps -A -o stat,ppid | awk '/^[Zz]/ {print $2}' | sort -u | xargs -r -I {} sh -c 'if [ "{}" != "1" ]; then kill -SIGCHLD {} 2>/dev/null || kill -9 {} 2>/dev/null; fi'`;
             break;
    }

    if (cmd) {
        addLog('ACTION', `Executing: ${cmd}`);
        exec(cmd, { env: { ...process.env, DISPLAY: ':99' } }, (err, stdout, stderr) => {
            if (err) addLog('ERROR', err.message);
            if (stdout) addLog('STDOUT', stdout);
            if (stderr) addLog('STDERR', stderr);
        });
        res.json({ success: true, message: `Executed: ${cmd}` });
    } else {
        res.json({ success: !!(action === 'start-full-stream'), message: 'Action handled implicitly' });
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
