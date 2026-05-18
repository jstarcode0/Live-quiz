import React, { useState, useEffect } from 'react';
import { Activity, Tv, Play, Square, Settings, Terminal, Monitor, Cpu, Loader2, Wrench, Menu, Server, CheckCircle2, AlertTriangle, XCircle, Box, RefreshCw } from 'lucide-react';
import ProcessMonitorPanel from './ProcessMonitorPanel';
import TerminalPanel from './TerminalPanel';
import ToolsCheckerPanel from './ToolsCheckerPanel';
import TmuxManagerPanel from './TmuxManagerPanel';

import WorkflowTracker from './WorkflowTracker';

export default function QuizRunAdmin() {
    const [envVars, setEnvVars] = useState<any>({});
    const [loading, setLoading] = useState(false);
    const [browser, setBrowser] = useState('chrome');
    const [activeTab, setActiveTab] = useState<'dashboard' | 'monitor' | 'terminal' | 'tools' | 'tmux'>('dashboard');
    const [validation, setValidation] = useState<Record<string, boolean>>({});
    const [audioMode, setAudioMode] = useState<'disabled' | 'auto' | 'enabled'>('disabled');

    const fetchEnv = async () => {
        try {
            const res = await fetch('/api/stream/env');
            const vars = await res.json();
            setEnvVars(vars);
            if (vars.BROWSER) setBrowser(vars.BROWSER);
            if (vars.AUDIO_MODE) setAudioMode(vars.AUDIO_MODE);
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
            // Give terminal time to mount if it's not active
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
        setLoading(true);
        try {
            await fetch('/api/stream/action', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action, browser, audioMode, streamKey: envVars.YOUTUBE_STREAM_KEY, rtmpUrl: envVars.YOUTUBE_RTMP_URL })
            });
            setTimeout(fetchValidation, 1000);
        } catch (e) {
            console.error(e);
        }
        setLoading(false);
    };

    const saveEnv = async () => {
        setLoading(true);
        try {
            await fetch('/api/stream/env', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...envVars, AUDIO_MODE: audioMode })
            });
            alert('Settings saved to .env');
        } catch (e) {
            alert('Failed to save settings');
        }
        setLoading(false);
    };

    const StatusItem = ({ label, isOk }: { label: string, isOk?: boolean }) => (
        <div className={`p-2 border rounded flex items-center justify-between text-xs font-bold ${isOk ? 'bg-green-950/30 border-green-900/50 text-green-400' : 'bg-red-950/30 border-red-900/50 text-red-400'}`}>
            <span>{label}</span>
            {isOk ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-950 text-slate-300 p-4 md:p-6 font-mono pt-16">
            <div className="max-w-7xl mx-auto space-y-6">
                
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-800 pb-4 gap-4">
                    <div className="flex items-center gap-3">
                        <Monitor className="text-cyan-500 w-8 h-8" />
                        <h1 className="text-2xl font-bold text-white tracking-widest">VPS STREAM CONTROL</h1>
                    </div>
                    
                    <div className="flex gap-2 flex-wrap">
                        <button
                           onClick={() => setActiveTab('dashboard')}
                           className={`py-2 px-4 font-bold rounded flex items-center justify-center gap-2 transition-colors text-xs uppercase ${activeTab === 'dashboard' ? 'bg-cyan-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-300'}`}
                        >
                           <Activity className="w-4 h-4" /> DASHBOARD
                        </button>
                        <button
                           onClick={() => setActiveTab('monitor')}
                           className={`py-2 px-4 font-bold rounded flex items-center justify-center gap-2 transition-colors text-xs uppercase ${activeTab === 'monitor' ? 'bg-cyan-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-300'}`}
                        >
                           <Server className="w-4 h-4" /> PROCESS & LOGS
                        </button>
                        <button
                           onClick={() => setActiveTab('tmux')}
                           className={`py-2 px-4 font-bold rounded flex items-center justify-center gap-2 transition-colors text-xs uppercase ${activeTab === 'tmux' ? 'bg-cyan-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-300'}`}
                        >
                           <Box className="w-4 h-4" /> TMUX SESSIONS
                        </button>
                        <button
                           onClick={() => setActiveTab('terminal')}
                           className={`py-2 px-4 font-bold rounded flex items-center justify-center gap-2 transition-colors text-xs uppercase ${activeTab === 'terminal' ? 'bg-cyan-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-300'}`}
                        >
                           <Terminal className="w-4 h-4" /> TERMINAL
                        </button>
                        <button
                           onClick={() => setActiveTab('tools')}
                           className={`py-2 px-4 font-bold rounded flex items-center justify-center gap-2 transition-colors text-xs uppercase ${activeTab === 'tools' ? 'bg-cyan-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-300'}`}
                        >
                           <Wrench className="w-4 h-4" /> TOOLS INSTALLER
                        </button>
                    </div>
                </div>

                {activeTab === 'dashboard' && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="col-span-1 lg:col-span-3">
                            <WorkflowTracker />
                        </div>
                        {/* Stream Action Panel */}
                        <div className="border border-slate-800 rounded-lg p-5 bg-slate-900/50 relative overflow-hidden group col-span-1 lg:col-span-2 shadow-lg">
                            <div className="absolute top-0 left-0 w-1 bg-gradient-to-b from-cyan-500 to-blue-600 h-full"></div>
                            
                            <h2 className="text-xl font-bold text-white mb-6 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <Play className="text-green-500 w-6 h-6" /> MASTER STREAM CONTROLS
                                </div>
                                {loading && <Loader2 className="w-5 h-5 text-cyan-500 animate-spin" />}
                            </h2>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                <button onClick={() => handleAction('start-full-stream')} className="py-4 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-lg shadow-[0_0_20px_rgba(8,145,178,0.3)] transition-all flex justify-center items-center gap-2 text-lg">
                                    <Play className="w-6 h-6" /> START FULL WORKFLOW
                                </button>
                                <button onClick={() => handleAction('stop-full-stream')} className="py-4 bg-red-900/50 hover:bg-red-800 text-red-100 font-bold border border-red-800 rounded-lg transition-all flex justify-center items-center gap-2 text-lg">
                                    <Square className="w-6 h-6" /> STOP EVERYTHING
                                </button>
                                <button onClick={() => { handleAction('stop-full-stream'); setTimeout(() => handleAction('start-full-stream'), 2000); }} className="py-4 bg-slate-800 hover:bg-slate-700 text-cyan-400 font-bold border border-slate-700 rounded-lg transition-all flex justify-center items-center gap-2 text-lg">
                                    <RefreshCw className="w-6 h-6" /> RESTART WORKFLOW
                                </button>
                            </div>

                            <div className="mt-8 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 pt-6 border-t border-slate-800/50">
                                <div className="border border-slate-800 p-3 rounded bg-slate-900/80">
                                    <div className="text-xs text-slate-500 font-bold mb-3 uppercase tracking-wider">Display</div>
                                    <div className="flex flex-col gap-2">
                                        <button onClick={() => handleAction('start-xvfb')} className="w-full py-1.5 bg-slate-800 hover:bg-slate-700 text-cyan-400 font-bold rounded text-xs transition-colors">START XVFB</button>
                                        <button onClick={() => handleAction('stop-xvfb')} className="w-full py-1.5 bg-red-900/30 hover:bg-red-900/50 text-red-400 font-bold rounded text-xs transition-colors">RESTART</button>
                                    </div>
                                </div>
                                <div className="border border-slate-800 p-3 rounded bg-slate-900/80">
                                    <div className="text-xs text-slate-500 font-bold mb-3 uppercase tracking-wider">Audio</div>
                                    <div className="flex flex-col gap-2">
                                        <button onClick={() => handleAction('start-pulse')} className="w-full py-1.5 bg-slate-800 hover:bg-slate-700 text-cyan-400 font-bold rounded text-xs transition-colors">START AUDIO</button>
                                        <button onClick={() => { handleAction('start-pulse'); setTimeout(() => handleAction('create-sink'), 2000); }} className="w-full py-1.5 bg-slate-800 hover:bg-slate-700 text-indigo-400 font-bold rounded text-xs border border-indigo-900/50 transition-colors">RESTART</button>
                                    </div>
                                </div>
                                <div className="border border-slate-800 p-3 rounded bg-slate-900/80">
                                    <div className="text-xs text-slate-500 font-bold mb-3 uppercase tracking-wider">Browser</div>
                                    <div className="flex flex-col gap-2">
                                        <button onClick={() => handleAction('start-browser')} className="w-full py-1.5 bg-slate-800 hover:bg-slate-700 text-cyan-400 font-bold rounded text-xs transition-colors">START BROWSER</button>
                                        <button onClick={() => { handleAction('stop-browser'); setTimeout(() => handleAction('start-browser'), 1000); }} className="w-full py-1.5 bg-orange-950/30 hover:bg-orange-900/50 text-orange-400 font-bold rounded text-xs transition-colors">RESTART</button>
                                    </div>
                                </div>
                                <div className="border border-slate-800 p-3 rounded bg-slate-900/80">
                                    <div className="text-xs text-slate-500 font-bold mb-3 uppercase tracking-wider">Stream</div>
                                    <div className="flex flex-col gap-2">
                                        <button onClick={() => handleAction('start-ffmpeg')} className="w-full py-1.5 bg-slate-800 hover:bg-slate-700 text-cyan-400 font-bold rounded text-xs transition-colors">START FFMPEG</button>
                                        <button onClick={() => { handleAction('stop-ffmpeg'); setTimeout(() => handleAction('start-ffmpeg'), 1000); }} className="w-full py-1.5 bg-orange-950/30 hover:bg-orange-900/50 text-orange-400 font-bold rounded text-xs transition-colors">RESTART</button>
                                    </div>
                                </div>
                                <div className="border border-slate-800 p-3 rounded bg-slate-900/80 text-center flex flex-col justify-center">
                                    <div className="text-xs text-slate-500 font-bold mb-3 uppercase tracking-wider">Remote Management</div>
                                    <div className="flex flex-col gap-2">
                                        <button onClick={() => { handleAction('start-vnc'); handleAction('start-websockify'); }} className="w-full py-1.5 bg-slate-800 hover:bg-slate-700 text-cyan-400 font-bold rounded text-xs transition-colors">START VNC</button>
                                        <button onClick={() => { handleAction('stop-vnc'); handleAction('stop-websockify'); setTimeout(() => { handleAction('start-vnc'); handleAction('start-websockify'); }, 1000); }} className="w-full py-1.5 bg-red-900/30 hover:bg-red-900/50 text-red-400 font-bold rounded text-xs transition-colors">RESTART</button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* YouTube Settings */}
                        <div className="flex flex-col gap-6">
                            <div className="border border-slate-800 rounded-lg p-5 bg-slate-900/50 shadow-lg">
                                 <h2 className="text-lg font-bold text-white mb-6 flex items-center justify-between border-b border-slate-800 pb-3">
                                    <div className="flex items-center gap-2">
                                        <Settings className="text-yellow-500 w-5 h-5" /> STREAM SETTINGS
                                    </div>
                                </h2>
                                <div className="space-y-4 text-sm">
                                    <div>
                                        <label className="block text-slate-500 font-bold mb-1.5 text-xs uppercase">RTMP URL</label>
                                        <input type="text" value={envVars.YOUTUBE_RTMP_URL || 'rtmp://a.rtmp.youtube.com/live2'} onChange={(e) => setEnvVars({...envVars, YOUTUBE_RTMP_URL: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded p-2.5 text-cyan-300 focus:border-cyan-500 outline-none" />
                                    </div>
                                    <div>
                                        <label className="block text-slate-500 font-bold mb-1.5 text-xs uppercase">STREAM KEY</label>
                                        <input type="password" value={envVars.YOUTUBE_STREAM_KEY || ''} onChange={(e) => setEnvVars({...envVars, YOUTUBE_STREAM_KEY: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded p-2.5 text-cyan-300 focus:border-cyan-500 outline-none" />
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-slate-500 font-bold mb-1.5 text-xs uppercase">RESOLUTION</label>
                                            <input type="text" value={envVars.RESOLUTION || '1280x720'} onChange={(e) => setEnvVars({...envVars, RESOLUTION: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded p-2.5 text-slate-300 outline-none" />
                                        </div>
                                        <div>
                                            <label className="block text-slate-500 font-bold mb-1.5 text-xs uppercase">FPS</label>
                                            <input type="text" value={envVars.FPS || '8'} onChange={(e) => setEnvVars({...envVars, FPS: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded p-2.5 text-slate-300 outline-none" />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-slate-500 font-bold mb-1.5 text-xs uppercase">BROWSER ENGINE</label>
                                        <select value={browser} onChange={(e) => { setBrowser(e.target.value); setEnvVars({...envVars, BROWSER: e.target.value}); }} className="w-full bg-slate-950 border border-slate-800 rounded p-2.5 text-slate-300 outline-none font-bold">
                                            <option value="chrome">Google Chrome</option>
                                            <option value="chromium">Chromium</option>
                                            <option value="firefox">Firefox</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-slate-500 font-bold mb-1.5 text-xs uppercase">AUDIO MODE</label>
                                        <select value={audioMode} onChange={(e) => setAudioMode(e.target.value as any)} className="w-full bg-slate-950 border border-slate-800 rounded p-2.5 text-slate-300 outline-none font-bold">
                                            <option value="disabled">🔇 DISABLED (Video Only)</option>
                                            <option value="auto">🔄 AUTO (Detect Audio)</option>
                                            <option value="enabled">🔊 ENABLED (Force Audio)</option>
                                        </select>
                                        <div className="mt-1 text-[9px] text-slate-500 italic">"DISABLED" (default) is recommended for low-end VPS.</div>
                                    </div>
                                    <button onClick={saveEnv} className="w-full mt-4 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded transition-colors text-xs font-bold border border-slate-700 uppercase tracking-widest">
                                        SAVE TO .ENV
                                    </button>
                                </div>
                            </div>
                            
                            <div className="border border-slate-800 rounded-lg p-5 bg-slate-900/50 shadow-lg">
                                 <h2 className="text-lg font-bold text-white mb-4 flex items-center justify-between border-b border-slate-800 pb-3">
                                    <div className="flex items-center gap-2">
                                        <AlertTriangle className="text-orange-500 w-5 h-5" /> VPS STATUS
                                    </div>
                                </h2>
                                <div className="grid grid-cols-2 gap-2">
                                    <StatusItem label="Xvfb" isOk={validation['Xvfb']} />
                                    <StatusItem label="Openbox" isOk={validation['Openbox']} />
                                    <StatusItem label="Audio" isOk={validation['PulseAudio']} />
                                    <StatusItem label="Sink" isOk={validation['StreamSink']} />
                                    <StatusItem label="Browser" isOk={validation['Browser']} />
                                    <StatusItem label="FFmpeg" isOk={validation['FFmpeg']} />
                                    <StatusItem label="VNC" isOk={validation['VNC']} />
                                    <StatusItem label="noVNC" isOk={validation['noVNC']} />
                                </div>
                                <div className="mt-4 pt-4 border-t border-slate-800 text-xs text-slate-500 font-bold leading-relaxed">
                                    {audioMode === 'disabled' && <div className="text-slate-400 mb-1 flex items-center gap-1">🔇 AUDIO DISABLED (Video only mode)</div>}
                                    {audioMode !== 'disabled' && !validation['PulseAudio'] && <div className="text-orange-400 mb-1 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> AUDIO FAIL: FFmpeg will fallback to video-only.</div>}
                                    {audioMode !== 'disabled' && validation['PulseAudio'] && !validation['StreamSink'] && <div className="text-orange-400 mb-1 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> SINK MISSING: Livestream may be silent.</div>}
                                    
                                    {Object.values(validation).every(v => v) ? (
                                        <span className="text-green-500 flex items-center gap-2"><CheckCircle2 className="w-4 h-4" /> ALL SYSTEMS GO</span>
                                    ) : (
                                        <span className="text-orange-400">STATUS: Monitoring active streams.</span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'monitor' && <div className="h-[75vh]"><ProcessMonitorPanel /></div>}
                {activeTab === 'tmux' && <div className="h-[75vh]"><TmuxManagerPanel /></div>}
                {activeTab === 'terminal' && <div className="h-[75vh]"><TerminalPanel /></div>}
                {activeTab === 'tools' && <div className="h-[75vh]"><ToolsCheckerPanel /></div>}

            </div>
        </div>
    );
}
