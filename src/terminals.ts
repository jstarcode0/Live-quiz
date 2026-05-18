import { WebSocketServer, WebSocket } from 'ws';
import os from 'os';
import { spawn } from 'child_process';

let pty: any = null;
try {
    pty = require('node-pty');
} catch (e) {
    console.warn('node-pty not found. Falling back to basic spawn shell.');
}

export function setupWebSocketTerminals(server: any) {
    const wss = new WebSocketServer({ server, path: '/api/terminal' });

    wss.on('connection', (ws: WebSocket) => {
        const shellCmd = os.platform() === 'win32' ? 'powershell.exe' : 'bash';
        const startDir = '/root';
        
        if (pty) {
            // Full PTY mode
            const ptyProcess = pty.spawn(shellCmd, [], {
                name: 'xterm-256color',
                cols: 80,
                rows: 24,
                cwd: startDir,
                env: { ...process.env, TERM: 'xterm-256color', COLORTERM: 'truecolor' } as Record<string, string>
            });

            ptyProcess.onData((data: string) => {
                if (ws.readyState === WebSocket.OPEN) {
                    ws.send(data);
                }
            });

            ws.on('message', (msg: Buffer) => {
                try {
                    const data = JSON.parse(msg.toString());
                    if (data.type === 'resize') {
                        if (data.cols && data.rows) {
                            try { ptyProcess.resize(data.cols, data.rows); } catch (e) {}
                        }
                    } else if (data.type === 'input') {
                        ptyProcess.write(data.input);
                    }
                } catch (e) {
                    ptyProcess.write(msg.toString());
                }
            });

            ws.on('close', () => {
                try { ptyProcess.kill(); } catch (e) {}
            });

            ptyProcess.onExit(() => {
                if (ws.readyState === WebSocket.OPEN) {
                    ws.close();
                }
            });
        } else {
            // Fallback: Basic Spawn mode (No PTY)
            ws.send('\r\n\x1b[33m[NOTICE] node-pty not found. Using fallback interactive shell (No TTY).\x1b[0m\r\n');
            
            const shellProcess = spawn(shellCmd, ['-i'], {
                env: { ...process.env, TERM: 'xterm' },
                cwd: '/root',
                shell: true
            });

            shellProcess.stdout.on('data', (data) => {
                if (ws.readyState === WebSocket.OPEN) ws.send(data.toString());
            });

            shellProcess.stderr.on('data', (data) => {
                if (ws.readyState === WebSocket.OPEN) ws.send(data.toString());
            });

            ws.on('message', (msg: Buffer) => {
                try {
                    const data = JSON.parse(msg.toString());
                    if (data.type === 'input') {
                        shellProcess.stdin.write(data.input);
                    }
                } catch (e) {
                    shellProcess.stdin.write(msg.toString());
                }
            });

            ws.on('close', () => {
                shellProcess.kill();
            });

            shellProcess.on('exit', () => {
                if (ws.readyState === WebSocket.OPEN) ws.close();
            });
        }
    });
}
