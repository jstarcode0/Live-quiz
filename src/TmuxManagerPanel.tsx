import React, { useEffect, useState } from 'react';
import { Box, Play, Square, Activity, Clock, User, Terminal, RefreshCw, Loader2, Trash2, Layout, Maximize2, AlertTriangle, Monitor, HardDrive, Cpu, Ghost } from 'lucide-react';

interface TmuxSession {
    name: string;
    created: number;
    attached: boolean;
    activity: number;
}

export default function TmuxManagerPanel() {
    const [sessions, setSessions] = useState<TmuxSession[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedSession, setSelectedSession] = useState<string | null>(null);
    const [logs, setLogs] = useState<string>('');
    const [logLoading, setLogLoading] = useState(false);

    const fetchSessions = async () => {
        try {
            const res = await fetch('/api/stream/tmux/sessions');
            const data = await res.json();
            setSessions(data);
        } catch (e) {}
    };

    const fetchLogs = async (name: string) => {
        setLogLoading(true);
        try {
            const res = await fetch(`/api/stream/tmux/logs/${name}`);
            const data = await res.json();
            setLogs(data.output || data.error || '');
        } catch (e) {}
        setLogLoading(false);
    };

    useEffect(() => {
        fetchSessions();
        const interval = setInterval(fetchSessions, 5000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        if (selectedSession) {
            fetchLogs(selectedSession);
            const logInterval = setInterval(() => fetchLogs(selectedSession), 3000);
            return () => clearInterval(logInterval);
        }
    }, [selectedSession]);

    const handleAction = async (session: string, action: string) => {
        setLoading(true);
        try {
            await fetch('/api/stream/tmux/action', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action, session })
            });
            await fetchSessions();
            if (action === 'kill' && selectedSession === session) {
                setSelectedSession(null);
            }
        } catch (e) {}
        setLoading(false);
    };

    const formatUptime = (createdTs: number) => {
        const uptimeSeconds = Math.round(Date.now() / 1000) - createdTs;
        const h = Math.floor(uptimeSeconds / 3600);
        const m = Math.floor((uptimeSeconds % 3600) / 60);
        const s = uptimeSeconds % 60;
        return `${h}h ${m}m ${s}s`;
    };

    const [newSessionName, setNewSessionName] = useState('');
    const [newSessionCmd, setNewSessionCmd] = useState('');
    const [showCreate, setShowCreate] = useState(false);

    const handleCreateSession = async () => {
        if (!newSessionName || !newSessionCmd) return;
        setLoading(true);
        try {
            await fetch('/api/stream/tmux/action', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'create', session: newSessionName, command: newSessionCmd })
            });
            setNewSessionName('');
            setNewSessionCmd('');
            setShowCreate(false);
            await fetchSessions();
        } catch (e) {}
        setLoading(false);
    };

    return (
        <div className="flex flex-col lg:flex-row gap-6 h-full min-h-[600px]">
            {/* Sidebar: Session List */}
            <div className="w-full lg:w-1/3 flex flex-col gap-4">
                <div className="bg-slate-900 border border-slate-800 rounded-lg flex flex-col h-full overflow-hidden shadow-lg">
                    <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
                        <h3 className="font-bold text-white text-xs uppercase tracking-widest flex items-center gap-2">
                            <Layout className="w-4 h-4 text-cyan-500" /> ACTIVE SESSIONS
                        </h3>
                        <div className="flex gap-2">
                            <button onClick={() => setShowCreate(!showCreate)} className={`p-1 rounded transition-colors ${showCreate ? 'bg-cyan-600 text-white' : 'hover:bg-slate-800 text-slate-500'}`}>
                                <Play className="w-4 h-4" />
                            </button>
                            <button onClick={fetchSessions} className="p-1 hover:bg-slate-800 rounded transition-colors">
                                <RefreshCw className={`w-4 h-4 text-slate-500 ${loading ? 'animate-spin' : ''}`} />
                            </button>
                        </div>
                    </div>

                    {showCreate && (
                        <div className="p-4 bg-slate-800/50 border-b border-slate-800 space-y-3">
                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 mb-1">SESSION NAME</label>
                                <input 
                                    type="text" 
                                    value={newSessionName} 
                                    onChange={e => setNewSessionName(e.target.value)}
                                    placeholder="e.g. quiz-tunnel"
                                    className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1.5 text-xs text-white outline-none focus:border-cyan-500"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 mb-1">COMMAND</label>
                                <textarea 
                                    value={newSessionCmd} 
                                    onChange={e => setNewSessionCmd(e.target.value)}
                                    placeholder="e.g. cloudflared tunnel run"
                                    className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1.5 text-xs text-white outline-none focus:border-cyan-500 h-20 font-mono"
                                />
                            </div>
                            <button 
                                onClick={handleCreateSession}
                                disabled={!newSessionName || !newSessionCmd || loading}
                                className="w-full py-2 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white rounded text-xs font-bold transition-colors"
                            >
                                START SESSION
                            </button>
                        </div>
                    )}

                    <div className="flex-1 overflow-y-auto p-2 custom-scrollbar">
                        {sessions.length === 0 ? (
                            <div className="p-8 text-center text-slate-500 italic text-sm">
                                <Ghost className="w-12 h-12 mx-auto mb-4 opacity-10" />
                                No active tmux sessions.
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {sessions.map(s => (
                                    <div 
                                        key={s.name}
                                        onClick={() => setSelectedSession(s.name)}
                                        className={`p-3 rounded-lg border cursor-pointer transition-all ${selectedSession === s.name ? 'bg-cyan-900/30 border-cyan-500 shadow-[0_0_15px_rgba(8,145,178,0.2)]' : 'bg-slate-950 border-slate-800 hover:border-slate-700'}`}
                                    >
                                        <div className="flex justify-between items-start mb-2">
                                            <div className="font-black text-sm text-cyan-400 break-all">{s.name}</div>
                                            <div className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${s.attached ? 'bg-green-900/50 text-green-300 border border-green-700' : 'bg-slate-800 text-slate-500 border border-slate-700'}`}>
                                                {s.attached ? 'ATTACHED' : 'DETACHED'}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4 text-[10px] text-slate-500 font-bold">
                                            <div className="flex items-center gap-1.5"><Clock className="w-3 h-3" /> {formatUptime(s.created)}</div>
                                            <div className="flex items-center gap-1.5"><Activity className="w-3 h-3 text-green-500" /> ACTIVE</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="p-3 bg-slate-950 border-t border-slate-800">
                        <div className="flex items-center justify-between text-[10px] font-bold text-slate-600 uppercase tracking-tighter">
                            <span>TOTAL: {sessions.length}</span>
                            <span className="flex items-center gap-1">TMUX v3.x REQ</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Area: Logs & Actions */}
            <div className="flex-1 flex flex-col gap-4">
                {selectedSession ? (
                    <div className="flex flex-col h-full gap-4">
                        {/* Action Header */}
                        <div className="bg-slate-900 border border-slate-800 p-4 rounded-lg flex flex-wrap items-center justify-between gap-4 shadow-lg">
                            <div className="flex items-center gap-3">
                                <div className="bg-cyan-900/50 p-2 rounded">
                                    <Terminal className="w-5 h-5 text-cyan-400" />
                                </div>
                                <div>
                                    <div className="text-white font-black text-lg tracking-tight leading-none mb-1 uppercase">{selectedSession}</div>
                                    <div className="text-slate-500 text-[10px] font-bold flex items-center gap-2">
                                        <span className="text-green-500">● RUNNING</span>
                                        <span>PID UNKNOWN</span>
                                        <span>PERSISTENT</span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-2">
                                <button onClick={() => window.dispatchEvent(new CustomEvent('attach-tmux', { detail: selectedSession }))} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded font-bold text-xs flex gap-2 items-center transition-all shadow-lg shadow-indigo-900/20">
                                    <Maximize2 className="w-4 h-4" /> ATTACH TERMINAL
                                </button>
                                <button onClick={() => handleAction(selectedSession, 'kill')} className="px-4 py-2 bg-red-900/50 hover:bg-red-800 text-red-100 rounded font-bold text-xs flex gap-2 items-center transition-all border border-red-800">
                                    <Trash2 className="w-4 h-4" /> STOP SESSION
                                </button>
                            </div>
                        </div>

                        {/* Realtime Logs Viewer */}
                        <div className="flex-1 bg-[#050505] border border-slate-800 rounded-lg overflow-hidden flex flex-col shadow-inner relative group">
                            <div className="p-3 border-b border-slate-800 flex justify-between items-center bg-slate-900/80 backdrop-blur-sm z-10">
                                <h3 className="font-bold text-white text-[10px] uppercase tracking-widest flex items-center gap-2">
                                    <Activity className="w-3 h-3 text-cyan-500" /> REALTIME OUTPUT STREAM
                                </h3>
                                <div className="flex items-center gap-3">
                                    {logLoading && <Loader2 className="w-3 h-3 animate-spin text-cyan-500" />}
                                    <span className="text-[10px] text-slate-500 font-mono">PANEL CAPTURE</span>
                                </div>
                            </div>
                            <div className="flex-1 overflow-auto p-4 font-mono text-[11px] leading-relaxed custom-scrollbar whitespace-pre-wrap transition-opacity duration-300">
                                {logs ? (
                                    <pre className="text-slate-300">{logs}</pre>
                                ) : (
                                    <div className="flex flex-col items-center justify-center h-full text-slate-600 italic gap-4">
                                        <Loader2 className="w-8 h-8 animate-spin opacity-20" />
                                        Streaming from tmux pane...
                                    </div>
                                )}
                            </div>
                            
                            <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                <div className="bg-slate-900/90 border border-slate-700 px-3 py-1.5 rounded-full text-[10px] font-bold text-white flex items-center gap-2 shadow-2xl backdrop-blur-md">
                                    <Monitor className="w-3 h-3 text-cyan-400" /> LIVE PANE VIEW
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="bg-slate-900 border border-slate-800 rounded-lg flex-1 flex flex-col items-center justify-center p-12 text-center text-slate-500 shadow-xl border-dashed">
                        <div className="relative mb-6">
                            <div className="absolute -inset-4 bg-cyan-500/10 rounded-full blur-xl animate-pulse"></div>
                            <Layout className="w-16 h-16 text-slate-700 relative" />
                        </div>
                        <h3 className="text-white font-bold text-xl mb-3 tracking-tight uppercase">No Session Selected</h3>
                        <p className="max-w-xs text-sm leading-relaxed mb-8">
                            Select an active tmux session from the sidebar to view live logs, attach terminal, or manage process lifecycle.
                        </p>
                        <div className="flex flex-wrap justify-center gap-3">
                            <div className="px-3 py-1.5 bg-slate-950 border border-slate-800 rounded font-black text-[10px] text-cyan-500 uppercase tracking-tighter">Persist v2.0</div>
                            <div className="px-3 py-1.5 bg-slate-950 border border-slate-800 rounded font-black text-[10px] text-purple-500 uppercase tracking-tighter">Auto-Attach</div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
