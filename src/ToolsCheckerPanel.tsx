import React, { useEffect, useState, useRef } from 'react';
import { Settings, CheckCircle2, XCircle, Search, Download, Loader2, Terminal as TermIcon, AlertTriangle } from 'lucide-react';

export default function ToolsCheckerPanel() {
    const [tools, setTools] = useState<Record<string, boolean>>({});
    const [loading, setLoading] = useState(false);
    const [installing, setInstalling] = useState<string | null>(null);
    const [logs, setLogs] = useState<{timestamp: string, type: string, message: string}[]>([]);
    const [status, setStatus] = useState<string>('Idle');
    const logsEndRef = useRef<HTMLDivElement>(null);

    const fetchTools = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/stream/tools-check');
            setTools(await res.json());
        } catch (e) {}
        setLoading(false);
    };

    const fetchLogs = async () => {
        try {
            const res = await fetch('/api/stream/logs');
            const data = await res.json();
            const allLogs = data.logs || [];
            const installLogs = allLogs.filter((l: any) => l.type.startsWith('INSTALL'));
            setLogs(installLogs);

            if (installLogs.length > 0) {
                const latestLog = installLogs[installLogs.length - 1].message.toLowerCase();
                if (latestLog.includes('finished installation for') || latestLog.includes('success')) {
                    setStatus(latestLog.includes('code 0') ? 'Completed' : 'Failed');
                    if (installing) {
                        setInstalling(null);
                        fetchTools();
                    }
                } else if (latestLog.includes('error') || latestLog.includes('dpkg: error')) {
                    setStatus('Failed');
                } else if (latestLog.includes('downloading') || latestLog.includes('get:')) {
                    setStatus('Downloading...');
                } else if (latestLog.includes('setting up') || latestLog.includes('configuring')) {
                    setStatus('Configuring...');
                } else if (latestLog.includes('unpacking')) {
                    setStatus('Installing...');
                } else {
                    setStatus('Running...');
                }
            }
        } catch (e) {}
    };

    useEffect(() => {
        fetchTools();
        const interval = setInterval(fetchLogs, 2000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [logs]);

    const handleInstall = async (tool: string) => {
        setInstalling(tool);
        setStatus('Initializing...');
        try {
            await fetch('/api/stream/install-tool', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tool })
            });
        } catch (e) {
            console.error(e);
            setStatus('Failed to initiate installation');
            setInstalling(null);
        }
    };

    const handleRunCommand = async (cmd: string) => {
        try {
            await fetch('/api/stream/install-tool', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tool: 'custom', command: cmd })
            });
        } catch (e) {
            console.error(e);
        }
    };

    return (
        <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden flex flex-col h-full">
            <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
                <h3 className="font-bold text-white text-sm uppercase tracking-widest flex items-center gap-2">
                    <Search className="w-5 h-5 text-cyan-500" /> SYSTEM TOOLS CHECKER
                </h3>
                <div className="flex gap-2">
                    <button onClick={fetchTools} disabled={loading} className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded text-xs flex items-center gap-2 font-bold transition-colors">
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />} RECHECK
                    </button>
                    <button onClick={() => handleInstall('all')} disabled={!!installing} className="px-4 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded text-xs flex items-center gap-2 font-bold transition-colors shadow-[0_0_10px_rgba(8,145,178,0.4)]">
                        {installing === 'all' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />} INSTALL MISSING ALL
                    </button>
                </div>
            </div>
            
            <div className="flex-1 overflow-hidden flex flex-col lg:flex-row">
                <div className="p-4 overflow-y-auto flex-1 font-mono text-xs custom-scrollbar bg-[#0a0a0a]">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {Object.entries(tools).map(([tool, isInstalled]) => (
                            <div key={tool} className={`flex items-center justify-between p-3 border rounded ${isInstalled ? 'bg-green-950/20 border-green-900/50' : 'bg-red-950/20 border-red-900/50'}`}>
                                <div className="flex items-center gap-2 flex-wrap">
                                    {isInstalled ? <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" /> : <XCircle className="w-4 h-4 text-red-500 shrink-0" />}
                                    <span className={isInstalled ? 'text-green-100 font-bold break-all' : 'text-red-100 font-bold break-all'}>{tool}</span>
                                </div>
                                {!isInstalled && (
                                    <button 
                                        onClick={() => handleInstall(tool)} 
                                        disabled={!!installing}
                                        className="px-2 py-1 bg-red-900 hover:bg-red-800 text-red-100 rounded text-[10px] flex items-center gap-1 transition-colors shrink-0"
                                    >
                                        {installing === tool ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />} Install
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                <div className="w-full lg:w-1/2 flex flex-col border-t lg:border-t-0 lg:border-l border-slate-800 bg-[#050505]">
                    <div className="p-3 border-b border-slate-800 flex justify-between items-center bg-slate-800/50">
                        <h3 className="font-bold text-white text-xs uppercase tracking-widest flex items-center gap-2">
                            <TermIcon className="w-4 h-4 text-blue-500" /> Live Install Logs
                        </h3>
                        <div className={`px-2 py-1 rounded text-[10px] font-bold border ${status === 'Completed' ? 'bg-green-900/50 border-green-700 text-green-300' : status === 'Failed' ? 'bg-red-900/50 border-red-700 text-red-300' : status !== 'Idle' ? 'bg-blue-900/50 border-blue-700 text-blue-300' : 'bg-slate-800 border-slate-700 text-slate-400'}`}>
                            {status}
                        </div>
                    </div>

                    {status === 'Failed' && (
                        <div className="m-3 p-3 bg-red-950/50 border border-red-900/50 rounded flex flex-col gap-2">
                            <div className="text-red-400 text-xs font-bold flex items-center gap-2">
                                <AlertTriangle className="w-4 h-4" /> Installation Failed
                            </div>
                            <div className="text-red-200 text-xs">Try fixing broken dependencies automatically:</div>
                            <button onClick={() => handleRunCommand('dpkg --configure -a && apt-get --fix-broken install -y')} className="px-3 py-1.5 bg-red-900 hover:bg-red-800 text-red-100 rounded text-xs font-bold transition-colors w-fit border border-red-800">
                                FIX BROKEN & RETRY
                            </button>
                        </div>
                    )}
                    
                    <div className="p-3 overflow-y-auto flex-1 font-mono text-[10px] text-slate-400 custom-scrollbar flex flex-col gap-1">
                        {logs.length > 0 ? logs.map((L, i) => (
                            <div key={i} className="flex gap-2">
                                <span className="text-slate-600 shrink-0">[{new Date(L.timestamp).toLocaleTimeString()}]</span>
                                <span className={`shrink-0 font-bold ${L.type === 'INSTALL_STDERR' ? 'text-red-400' : 'text-blue-400'}`}>[{L.type.replace('INSTALL_', '')}]</span>
                                <span className="text-slate-300 break-words whitespace-pre-wrap">{L.message}</span>
                            </div>
                        )) : (
                            <div className="text-slate-600 italic">No installation active...</div>
                        )}
                        <div ref={logsEndRef} />
                    </div>
                </div>
            </div>
        </div>
    );
}
