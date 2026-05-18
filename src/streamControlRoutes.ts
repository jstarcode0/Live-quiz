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
        'x11vnc', 'websockify', 'git', 'curl', 'wget', 'nano', 'htop', 'python3', 'pip'
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
    if (['ffmpeg', 'pulseaudio', 'xvfb', 'openbox', 'x11vnc', 'websockify', 'git', 'curl', 'wget', 'nano', 'htop', 'python3', 'python3-pip', 'surf', 'chromium'].includes(tool)) {
        installCmd = `dpkg --configure -a && ${aptOpts} --fix-broken install && ${aptOpts} update && ${aptOpts} install ${tool === 'xvfb' ? 'xvfb' : tool}`;
    } else if (tool === 'google-chrome') {
        installCmd = `dpkg --configure -a && ${aptOpts} --fix-broken install && wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - && sh -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list' && ${aptOpts} update && ${aptOpts} install google-chrome-stable`;
    } else if (tool === 'edge-tts') {
        installCmd = `pip install edge-tts`;
    } else if (tool === 'all') {
        installCmd = `dpkg --configure -a && ${aptOpts} --fix-broken install && ${aptOpts} update && ${aptOpts} install ffmpeg pulseaudio xvfb openbox x11vnc websockify git curl wget nano htop python3 python3-pip chromium && pip install edge-tts`;
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
        { name: 'StreamSink', cmd: 'env XDG_RUNTIME_DIR=/tmp/runtime-root pactl list short sinks | grep stream' },
        { name: 'Browser', cmd: 'pgrep -f chrome || pgrep -f chromium || pgrep -f firefox' },
        { name: 'FFmpeg', cmd: 'pgrep ffmpeg' }
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
    let cmd = '';

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
        : `${browser === 'chromium' ? 'chromium' : 'google-chrome'} --no-sandbox --window-position=0,0 --window-size=960,540 --kiosk http://127.0.0.1:3000`;

    const rtmpUrl = req.body.rtmpUrl || 'rtmp://a.rtmp.youtube.com/live2';
    const key = req.body.streamKey || 'dummy_key';
    const ffmpegCmd = `env XDG_RUNTIME_DIR=/tmp/runtime-root ffmpeg -f x11grab -video_size 960x540 -framerate 6 -i :99.0 -f pulse -i stream.monitor -c:v libx264 -preset ultrafast -tune zerolatency -pix_fmt yuv420p -r 6 -g 12 -b:v 350k -maxrate 350k -bufsize 700k -crf 36 -c:a aac -b:a 32k -ar 44100 -threads 1 -f flv "${rtmpUrl}/${key}"`;

    switch (action) {
        case 'start-xvfb':
            cmd = `if pgrep Xvfb > /dev/null; then echo 'Xvfb running'; else rm -f /tmp/.X99-lock && Xvfb :99 -screen 0 960x540x24 -ac & fi`;
            break;
        case 'stop-xvfb':
            cmd = 'pkill Xvfb; rm -f /tmp/.X99-lock';
            break;
        case 'start-pulse':
            cmd = `if pgrep pulseaudio > /dev/null; then echo 'Pulse runs'; else rm -rf /tmp/runtime-root && mkdir -p /tmp/runtime-root && chmod 700 /tmp/runtime-root && env XDG_RUNTIME_DIR=/tmp/runtime-root pulseaudio --system --disallow-exit --exit-idle-time=-1 --daemonize=yes; fi`;
            break;
        case 'create-sink':
            cmd = `env XDG_RUNTIME_DIR=/tmp/runtime-root pactl load-module module-null-sink sink_name=stream`;
            break;
        case 'start-browser':
            cmd = `if pgrep -f ${browserExec} > /dev/null; then echo 'Browser running'; else ${bcmd} & fi`;
            break;
        case 'stop-browser':
            cmd = 'pkill -f chrome; pkill -f chromium; pkill -f firefox';
            break;
        case 'start-ffmpeg':
            cmd = `if pgrep ffmpeg > /dev/null; then echo 'FFmpeg running'; else ${ffmpegCmd} & fi`;
            break;
        case 'stop-ffmpeg':
            cmd = 'pkill ffmpeg';
            break;
        case 'start-full-stream':
             let fullCmd = '';
             fullCmd += `if pgrep Xvfb > /dev/null; then echo 'Xvfb ok'; else rm -f /tmp/.X99-lock && Xvfb :99 -screen 0 960x540x24 -ac & sleep 2; fi; `;
             fullCmd += `if pgrep pulseaudio > /dev/null; then echo 'Pulse ok'; else rm -rf /tmp/runtime-root && mkdir -p /tmp/runtime-root && chmod 700 /tmp/runtime-root && env XDG_RUNTIME_DIR=/tmp/runtime-root pulseaudio --system --disallow-exit --exit-idle-time=-1 --daemonize=yes && sleep 2; fi; `;
             fullCmd += `if env XDG_RUNTIME_DIR=/tmp/runtime-root pactl list short sinks | grep -q stream; then echo 'Sink ok'; else env XDG_RUNTIME_DIR=/tmp/runtime-root pactl load-module module-null-sink sink_name=stream && sleep 1; fi; `;
             fullCmd += `if pgrep -f ${browserExec} > /dev/null; then echo 'Browser ok'; else ${bcmd} & sleep 3; fi; `;
             fullCmd += `if pgrep ffmpeg > /dev/null; then echo 'FFmpeg ok'; else ${ffmpegCmd} & fi`;
             cmd = fullCmd;
             break;
        case 'stop-full-stream':
             cmd = 'pkill ffmpeg; pkill -f chrome; pkill -f chromium; pkill -f firefox; pkill pulseaudio; pkill Xvfb; rm -f /tmp/.X99-lock';
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

export default router;
