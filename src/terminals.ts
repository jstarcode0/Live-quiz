import { WebSocketServer, WebSocket } from 'ws';
import * as pty from 'node-pty';
import os from 'os';

export function setupWebSocketTerminals(server: any) {
    const wss = new WebSocketServer({ server, path: '/api/terminal' });

    wss.on('connection', (ws: WebSocket) => {
        const shell = os.platform() === 'win32' ? 'powershell.exe' : 'bash';
        
        const ptyProcess = pty.spawn(shell, [], {
            name: 'xterm-256color',
            cols: 80,
            rows: 24,
            cwd: process.env.HOME || process.cwd(),
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
                // If not JSON, write raw
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
    });
}
