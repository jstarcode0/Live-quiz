import React, { useEffect, useRef } from 'react';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import 'xterm/css/xterm.css';

export default function TerminalPanel() {
    const terminalRef = useRef<HTMLDivElement>(null);
    const wsRef = useRef<WebSocket | null>(null);

    useEffect(() => {
        if (!terminalRef.current) return;

        const term = new Terminal({
            theme: {
                background: '#020617', // slate-950
                foreground: '#cbd5e1', // slate-300
                cursor: '#38bdf8', // light blue cursor
            },
            fontFamily: 'monospace',
            fontSize: 13,
            cursorBlink: true,
        });

        const fitAddon = new FitAddon();
        term.loadAddon(fitAddon);
        term.open(terminalRef.current);
        fitAddon.fit();

        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}/api/terminal`;
        
        let ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        const connectWs = () => {
             ws.onopen = () => {
                 term.writeln('\x1b[32m[Connected to VPS Terminal]\x1b[0m');
                 ws.send(JSON.stringify({ type: 'resize', cols: term.cols, rows: term.rows }));
             };

             ws.onmessage = (evt) => {
                 term.write(evt.data);
             };

             ws.onclose = () => {
                 term.writeln('\r\n\x1b[31m[Disconnected] Reconnecting...\x1b[0m');
                 setTimeout(() => {
                     if (terminalRef.current) {
                         ws = new WebSocket(wsUrl);
                         wsRef.current = ws;
                         connectWs();
                     }
                 }, 3000);
             };
        };

        connectWs();

        const handleTerminalInput = (e: any) => {
            if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
                wsRef.current.send(JSON.stringify({ type: 'input', input: e.detail }));
            }
        };
        window.addEventListener('terminal-input', handleTerminalInput);

        term.onData((data) => {
            if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
                wsRef.current.send(JSON.stringify({ type: 'input', input: data }));
            }
        });

        term.onResize((size) => {
            if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
                wsRef.current.send(JSON.stringify({ type: 'resize', cols: size.cols, rows: size.rows }));
            }
        });

        const handleResize = () => {
            fitAddon.fit();
        };

        window.addEventListener('resize', handleResize);

        // Initial fit in case container size changes just after mount
        setTimeout(() => fitAddon.fit(), 100);

        return () => {
            window.removeEventListener('resize', handleResize);
            window.removeEventListener('terminal-input', handleTerminalInput);
            if (wsRef.current) {
                wsRef.current.onclose = null;
                wsRef.current.close();
            }
            term.dispose();
            terminalRef.current = null;
        };
    }, []);

    return (
        <div className="bg-slate-950 border border-slate-800 rounded-lg p-2 h-full min-h-[500px] flex flex-col">
            <div className="text-xs text-slate-500 font-bold mb-2 uppercase tracking-widest pl-2">Root Terminal</div>
            <div ref={terminalRef} className="flex-1 overflow-hidden" />
        </div>
    );
}
