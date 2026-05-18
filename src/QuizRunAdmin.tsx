import React, { useState, useEffect } from 'react';
import { Activity, Tv, Play, Square, Settings, Terminal, Monitor, Cpu, Loader2, Menu, Server, CheckCircle2, AlertTriangle, XCircle, Box, RefreshCw } from 'lucide-react';
import ProcessMonitorPanel from './ProcessMonitorPanel';
import TerminalPanel from './TerminalPanel';
import TmuxManagerPanel from './TmuxManagerPanel';

export default function QuizRunAdmin() {
    const [envVars, setEnvVars] = useState<any>({});
    const [loading, setLoading] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'dashboard' | 'monitor' | 'terminal' | 'tmux'>('dashboard');
    const [validation, setValidation] = useState<Record<string, boolean>>({});

    const fetchEnv = async () => {
        try {
            const res = await fetch('/api/stream/env');
            const vars = await res.json();
            setEnvVars(vars);
        } catch (e) {}
    };

    const fetchValidation = async () => {
        try {
            const res = await fetch('/api/stream/validate');
            setValidation(await res.json());
        } catch (e) {}
    };

    useEffect(() => {
        fetchEnv();
        fetchValidation();
        const interval = setInterval(fetchValidation, 3000);

        const handleAttach = (e: any) => {
            setActiveTab('terminal');
            setTimeout(() => {
                window.dispatchEvent(new CustomEvent('terminal-input', { detail: `tmux attach -t ${e.detail}\n` }));
            }, 500);
        };

        window.addEventListener('attach-tmux', handleAttach);

        return () => {
            clearInterval(interval);
            window.removeEventListener('attach-tmux', handleAttach);
        };
    }, []);

    const handleAction = async (action: string) => {
        setLoading(action);
        try {
            await fetch('/api/stream/action', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action })
            });
            setTimeout(fetchValidation, 1000);
        } catch (e) {
            console.error(e);
        }
        setLoading(null);
    };

    const saveEnv = async () => {
        setLoading('save-env');
        try {
            await fetch('/api/stream/env', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(envVars)
            });
            alert('Settings saved to .env');
        } catch (e) {
            alert('Failed to save settings');
        }
        setLoading(null);
    };

    const ControlCard = ({ title, statusKey, startAction, killAction, command, description }: any) => {
        const isOk = statusKey ? validation[statusKey] : false;
        return (
            <div className="border border-slate-800 rounded-lg p-5 bg-slate-900/50 shadow-lg relative overflow-hidden flex flex-col h-full">
                <div className={`absolute top-0 left-0 w-1 h-full ${isOk ? 'bg-green-500' : 'bg-slate-700'}`}></div>
                <div className="flex justify-between items-start mb-4">
                    <h3 className="text-white font-bold tracking-widest uppercase text-sm">{title}</h3>
                    {statusKey && (
                        <div className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${isOk ? 'bg-green-950 text-green-400 border border-green-800/50' : 'bg-slate-950 text-slate-500 border border-slate-800'}`}>
                            {isOk ? 'ONLINE' : 'OFFLINE'}
                        </div>
                    )}
                </div>
                
                <div className="flex-grow">
                    {description && <div className="text-[10px] text-slate-500 mb-3 leading-relaxed italic">{description}</div>}
                    <div className="bg-black/40 rounded p-2 text-[10px] text-cyan-500/70 mb-4 font-mono break-all line-clamp-2 border border-slate-800/50 select-all">
                        {command}
                    </div>
                </div>

                <div className="flex gap-2 mt-auto">
                    {startAction && (
                        <button 
                            disabled={!!loading}
                            onClick={() => handleAction(startAction)}
                            className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-cyan-400 font-bold rounded text-[10px] uppercase transition-all disabled:opacity-50 border border-slate-700"
                        >
                            {loading === startAction ? <Loader2 className="w-3 h-3 animate-spin mx-auto" /> : 'START'}
                        </button>
                    )}
                    {killAction && (
                        <button 
                            disabled={!!loading}
                            onClick={() => handleAction(killAction)}
                            className="w-16 py-2 bg-red-950/20 hover:bg-red-900/40 text-red-500 font-bold rounded text-[10px] uppercase transition-all disabled:opacity-50 border border-red-900/30"
                        >
                            {loading === killAction ? <Loader2 className="w-3 h-3 animate-spin mx-auto" /> : 'KILL'}
                        </button>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-slate-950 text-slate-300 p-4 md:p-6 font-mono pt-16">
            <div className="max-w-7xl mx-auto space-y-6">
                
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-800 pb-4 gap-4">
                    <div className="flex items-center gap-3">
                        <Monitor className="text-cyan-500 w-8 h-8" />
                        <h1 className="text-2xl font-bold text-white tracking-widest uppercase">Streaming Admin</h1>
                    </div>
                    
                    <div className="flex gap-2 flex-wrap">
                        <button onClick={() => setActiveTab('dashboard')} className={`py-2 px-4 font-bold rounded flex items-center gap-2 transition-colors text-xs uppercase ${activeTab === 'dashboard' ? 'bg-cyan-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}>
                           <Activity className="w-4 h-4" /> DASHBOARD
                        </button>
                        <button onClick={() => setActiveTab('monitor')} className={`py-2 px-4 font-bold rounded flex items-center gap-2 transition-colors text-xs uppercase ${activeTab === 'monitor' ? 'bg-cyan-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}>
                           <Server className="w-4 h-4" /> PROCESS & LOGS
                        </button>
                        <button onClick={() => setActiveTab('tmux')} className={`py-2 px-4 font-bold rounded flex items-center gap-2 transition-colors text-xs uppercase ${activeTab === 'tmux' ? 'bg-cyan-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}>
                           <Box className="w-4 h-4" /> TMUX SESSIONS
                        </button>
                        <button onClick={() => setActiveTab('terminal')} className={`py-2 px-4 font-bold rounded flex items-center gap-2 transition-colors text-xs uppercase ${activeTab === 'terminal' ? 'bg-cyan-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}>
                           <Terminal className="w-4 h-4" /> TERMINAL
                        </button>
                    </div>
                </div>

                {activeTab === 'dashboard' && (
                    <div className="space-y-6">
                        {/* Summary Status */}
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                            <div className={`p-3 border rounded text-[10px] font-bold flex flex-col gap-1 ${validation['Xvfb'] ? 'bg-green-950/30 border-green-900 text-green-400' : 'bg-slate-900 border-slate-800 text-slate-600'}`}>
                                <span>XVFB</span>
                                <span>{validation['Xvfb'] ? 'ONLINE' : 'OFFLINE'}</span>
                            </div>
                            <div className={`p-3 border rounded text-[10px] font-bold flex flex-col gap-1 ${validation['PulseAudio'] ? 'bg-green-950/30 border-green-900 text-green-400' : 'bg-slate-900 border-slate-800 text-slate-600'}`}>
                                <span>PULSE</span>
                                <span>{validation['PulseAudio'] ? 'ONLINE' : 'OFFLINE'}</span>
                            </div>
                            <div className={`p-3 border rounded text-[10px] font-bold flex flex-col gap-1 ${validation['Browser'] ? 'bg-green-950/30 border-green-900 text-green-400' : 'bg-slate-900 border-slate-800 text-slate-600'}`}>
                                <span>CHROME</span>
                                <span>{validation['Browser'] ? 'ONLINE' : 'OFFLINE'}</span>
                            </div>
                            <div className={`p-3 border rounded text-[10px] font-bold flex flex-col gap-1 ${validation['FFmpeg'] ? 'bg-green-950/30 border-green-900 text-green-400' : 'bg-slate-900 border-slate-800 text-slate-600'}`}>
                                <span>FFMPEG</span>
                                <span>{validation['FFmpeg'] ? 'STREAMING' : 'IDLE'}</span>
                            </div>
                            <div className={`p-3 border rounded text-[10px] font-bold flex flex-col gap-1 ${validation['VNC'] ? 'bg-green-950/30 border-green-900 text-green-400' : 'bg-slate-900 border-slate-800 text-slate-600'}`}>
                                <span>VNC</span>
                                <span>{validation['VNC'] ? 'ENABLED' : 'DISABLED'}</span>
                            </div>
                            <div className={`p-3 border rounded text-[10px] font-bold flex flex-col gap-1 ${validation['noVNC'] ? 'bg-green-950/30 border-green-900 text-green-400' : 'bg-slate-900 border-slate-800 text-slate-600'}`}>
                                <span>NOVNC</span>
                                <span>{validation['noVNC'] ? 'ONLINE' : 'OFFLINE'}</span>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            <ControlCard 
                                title="1. Kill Services" 
                                startAction="kill-services" 
                                description="Gracefully stop all streaming and background services."
                                command="pkill chrome; pkill chromium; pkill ffmpeg; pkill Xvfb; pkill openbox; pkill pulseaudio; pkill x11vnc; pkill websockify"
                            />
                            
                            <ControlCard 
                                title="2. Start PulseAudio" 
                                statusKey="PulseAudio"
                                startAction="start-pulse" 
                                killAction="kill-pulse"
                                description="Initialize audio driver and virtual stream sink."
                                command="pkill -9 pulseaudio; rm -rf /tmp/pulse-*; pulseaudio --daemonize=yes; pactl load-module module-null-sink sink_name=stream"
                            />

                            <ControlCard 
                                title="3. Start VNC stack" 
                                statusKey="Xvfb"
                                startAction="start-vnc-stack" 
                                killAction="kill-vnc-stack"
                                description="Start virtual display, window manager, and VNC gateway."
                                command="Xvfb :99 -screen 0 1280x720x16; openbox; x11vnc -display :99; websockify 6080"
                            />

                            <ControlCard 
                                title="4. Start Browser" 
                                statusKey="Browser"
                                startAction="start-browser" 
                                killAction="kill-browser"
                                description="Launch Chrome in kiosk mode on virtual display."
                                command="google-chrome --no-sandbox --window-size=1280,720 --kiosk http://127.0.0.1:3000"
                            />

                            <ControlCard 
                                title="5. Start FFmpeg" 
                                statusKey="FFmpeg"
                                startAction="start-ffmpeg" 
                                killAction="kill-ffmpeg"
                                description="Capture audio/video and push to RTMP endpoint."
                                command="ffmpeg -f x11grab -i :99.0 -f pulse -i stream.monitor -c:v libx264 -f flv $YOUTUBE_RTMP_URL"
                            />

                            {/* RTMP Settings Card */}
                            <div className="border border-slate-800 rounded-lg p-5 bg-slate-900/50 shadow-lg relative overflow-hidden flex flex-col h-full border-cyan-900/50">
                                <div className="absolute top-0 left-0 w-1 h-full bg-cyan-600"></div>
                                <h3 className="text-white font-bold tracking-widest uppercase text-sm mb-4">6. RTMP Settings</h3>
                                
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-slate-500 font-bold mb-1.5 text-[10px] uppercase">RTMP URL + KEY</label>
                                        <input 
                                            type="password" 
                                            value={envVars.YOUTUBE_RTMP_URL || ''} 
                                            onChange={(e) => setEnvVars({...envVars, YOUTUBE_RTMP_URL: e.target.value})} 
                                            placeholder="rtmp://a.rtmp.youtube.com/live2/xxxx-xxxx-xxxx-xxxx"
                                            className="w-full bg-black/40 border border-slate-800 rounded p-2 text-cyan-300 text-xs font-mono outline-none focus:border-cyan-500/50" 
                                        />
                                    </div>
                                    <div className="p-2 bg-blue-950/20 border border-blue-900/30 rounded text-[9px] text-blue-400 italic">
                                        Saved to .env. Used as $YOUTUBE_RTMP_URL in FFmpeg.
                                    </div>
                                    <button 
                                        onClick={saveEnv} 
                                        disabled={loading === 'save-env'}
                                        className="w-full py-2 bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-400 font-bold rounded text-[10px] uppercase tracking-widest border border-cyan-800 transition-all disabled:opacity-50"
                                    >
                                        {loading === 'save-env' ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'SAVE SETTINGS'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'monitor' && <div className="h-[75vh]"><ProcessMonitorPanel /></div>}
                {activeTab === 'tmux' && <div className="h-[75vh]"><TmuxManagerPanel /></div>}
                {activeTab === 'terminal' && <div className="h-[75vh]"><TerminalPanel /></div>}

            </div>
        </div>
    );
}
