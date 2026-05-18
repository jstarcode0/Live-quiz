import React, { useEffect, useState } from 'react';
import { Activity, Power, RefreshCw, Terminal, Monitor, HardDrive, Cpu, AlertCircle, Play, Square, Loader2, Ghost, Trash2 } from 'lucide-react';

interface ProcessInfo {
    user: string;
    pid: string;
    cpu: string;
    mem: string;
    vsz: string;
    rss: string;
    tty: string;
    stat: string;
    start: string;
    time: string;
    command: string;
    isZombie: boolean;
}

export default function ProcessMonitorPanel() {
    const [sysInfo, setSysInfo] = useState<any>(null);
    const [processes, setProcesses] = useState<ProcessInfo[]>([]);
    const [loading, setLoading] = useState(false);
    const [filter, setFilter] = useState<'all' | 'active' | 'zombie' | 'stream'>('active');
    const [hideDefunct, setHideDefunct] = useState(true);

    const fetchSysInfo = async () => {
        try {
            const res = await fetch('/api/stream/sysinfo');
            setSysInfo(await res.json());
        } catch (e) {}
    };

    const fetchProcesses = async () => {
        try {
            const res = await fetch('/api/stream/processes');
            const data = await res.json();
            if (data.output) {
                // Parse ps aux output
                const lines = data.output.split('\n').filter((l: string) => l.trim().length > 0);
                const parsed: ProcessInfo[] = [];
                for (let i = 1; i < lines.length; i++) {
                    const row = lines[i].trim().split(/\s+/);
                    if (row.length >= 11) {
                        const stat = row[7];
                        const command = row.slice(10).join(' ');
                        const isZombie = stat.startsWith('Z') || command.includes('<defunct>');
                        
                        parsed.push({
                            user: row[0],
                            pid: row[1],
                            cpu: row[2],
                            mem: row[3],
                            vsz: row[4],
                            rss: row[5],
                            tty: row[6],
                            stat,
                            start: row[8],
                            time: row[9],
                            command,
                            isZombie
                        });
                    }
                }
                
                setProcesses(parsed);
            }
        } catch (e) {}
    };

    const [logs, setLogs] = useState<{timestamp: string, type: string, message: string}[]>([]);

    const fetchLogs = async () => {
        try {
            const res = await fetch('/api/stream/logs');
            const data = await res.json();
            setLogs(data.logs || []);
        } catch (e) {}
    };

    useEffect(() => {
        fetchSysInfo();
        fetchProcesses();
        fetchLogs();

        const interval = setInterval(() => {
            fetchSysInfo();
            fetchProcesses();
            fetchLogs();
        }, 3000);

        return () => clearInterval(interval);
    }, []);

    const handleAction = async (action: string) => {
        setLoading(true);
        try {
            await fetch('/api/stream/action', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action })
            });
            setTimeout(fetchProcesses, 1000);
        } catch (e) {}
        setLoading(false);
    };

    const isStreamProcess = (cmd: string) => {
        return ['node', 'npm', 'tsx', 'vite', 'ffmpeg', 'chrome', 'chromium', 'firefox', 'Xvfb', 'pulse', 'x11vnc'].some(c => cmd.includes(c));
    };

    const filteredProcesses = processes.filter(p => {
        if (hideDefunct && p.isZombie) return false;
        if (filter === 'active') return !p.isZombie && isStreamProcess(p.command);
        if (filter === 'stream') return isStreamProcess(p.command);
        if (filter === 'zombie') return p.isZombie;
        return true;
    });

    const activeCount = processes.filter(p => !p.isZombie).length;
    const zombieCount = processes.filter(p => p.isZombie).length;
    const streamCount = processes.filter(p => isStreamProcess(p.command)).length;

    return (
        <div className="space-y-6">
            {/* SysInfo */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
               {sysInfo ? (
                   <>
                       <div className="bg-slate-900 border border-slate-800 p-4 rounded-lg">
                           <div className="text-slate-500 text-xs font-bold mb-1 uppercase tracking-widest flex items-center gap-2">
                               <Cpu className="w-4 h-4 text-cyan-400" /> CPU Load
                           </div>
                           <div className="text-2xl font-mono text-white">{sysInfo.cpu.map((c: number) => c.toFixed(2)).join(' ')}</div>
                       </div>
                       <div className="bg-slate-900 border border-slate-800 p-4 rounded-lg">
                           <div className="text-slate-500 text-xs font-bold mb-1 uppercase tracking-widest flex items-center gap-2">
                               <HardDrive className="w-4 h-4 text-purple-400" /> RAM Used
                           </div>
                           <div className="text-2xl font-mono text-white flex items-baseline gap-2">
                               {(sysInfo.ram.used / 1024/1024/1024).toFixed(1)}GB
                               <span className="text-xs text-slate-500">/ {(sysInfo.ram.total / 1024/1024/1024).toFixed(1)}GB ({sysInfo.ram.percent}%)</span>
                           </div>
                           <div className="w-full bg-slate-800 h-1 mt-2 rounded-full overflow-hidden">
                               <div className="bg-purple-500 h-full transition-all duration-500" style={{ width: `${sysInfo.ram.percent}%` }}></div>
                           </div>
                       </div>
                       <div className="bg-slate-900 border border-slate-800 p-4 rounded-lg">
                           <div className="text-slate-500 text-xs font-bold mb-1 uppercase tracking-widest flex items-center gap-2">
                               <Activity className="w-4 h-4 text-green-400" /> Uptime
                           </div>
                           <div className="text-2xl font-mono text-white">
                               {Math.floor(sysInfo.uptime / 3600)}h {Math.floor((sysInfo.uptime % 3600) / 60)}m
                           </div>
                       </div>
                       <div className="bg-slate-900 border border-slate-800 p-4 rounded-lg flex flex-col justify-center">
                           <div className="flex items-center justify-between mb-2">
                               <div className="text-slate-500 text-xs font-bold">ZOMBIES</div>
                               <div className={`text-sm font-black ${zombieCount > 0 ? 'text-orange-500' : 'text-green-500'}`}>{zombieCount}</div>
                           </div>
                           <div className="flex items-center justify-between">
                               <div className="text-slate-500 text-xs font-bold">STREAM PROCS</div>
                               <div className="text-sm font-black text-cyan-400">{streamCount}</div>
                           </div>
                       </div>
                   </>
               ) : (
                   <div className="col-span-4 bg-slate-900 border border-slate-800 p-4 rounded-lg text-slate-500 italic text-sm text-center">Loading sysinfo...</div>
               )}
            </div>

            {/* Quick Controls */}
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-lg flex flex-wrap gap-4 items-center justify-between">
                <div className="flex gap-2">
                    <button onClick={() => setFilter('active')} className={`px-3 py-1.5 rounded font-bold text-xs border ${filter === 'active' ? 'bg-cyan-900/50 text-cyan-300 border-cyan-700' : 'bg-slate-800 text-slate-400 border-slate-700'}`}>Active</button>
                    <button onClick={() => setFilter('stream')} className={`px-3 py-1.5 rounded font-bold text-xs border ${filter === 'stream' ? 'bg-cyan-900/50 text-cyan-300 border-cyan-700' : 'bg-slate-800 text-slate-400 border-slate-700'}`}>Stream Services</button>
                    <button onClick={() => setFilter('all')} className={`px-3 py-1.5 rounded font-bold text-xs border ${filter === 'all' ? 'bg-cyan-900/50 text-cyan-300 border-cyan-700' : 'bg-slate-800 text-slate-400 border-slate-700'}`}>All System</button>
                    <button onClick={() => setFilter('zombie')} className={`px-3 py-1.5 rounded font-bold text-xs border flex items-center gap-1 ${filter === 'zombie' ? 'bg-orange-900/50 text-orange-400 border-orange-700' : 'bg-slate-800 text-slate-400 border-slate-700'}`}>
                        <Ghost className="w-3 h-3" /> Zombies
                    </button>
                </div>
                <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-400">
                        <input type="checkbox" checked={hideDefunct} onChange={e => setHideDefunct(e.target.checked)} className="accent-cyan-500" />
                        Hide Defunct
                    </label>
                    <button onClick={() => handleAction('cleanup-zombies')} className="px-3 py-1.5 bg-orange-900/50 hover:bg-orange-800 text-orange-200 rounded font-bold text-xs flex gap-2 items-center border border-orange-800 transition-colors">
                        <Trash2 className="w-4 h-4" /> Cleanup Zombies
                    </button>
                </div>
            </div>

            {/* Process List */}
            <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden flex flex-col">
                <div className="p-3 border-b border-slate-800 flex justify-between items-center bg-slate-800/50">
                    <h3 className="font-bold text-white text-sm uppercase tracking-widest flex items-center gap-2">
                        <Terminal className="w-4 h-4 text-cyan-500" /> Process Manager
                    </h3>
                    <div className="flex items-center gap-3 text-xs">
                        {loading && <Loader2 className="w-4 h-4 animate-spin text-cyan-500" />}
                        <span className="text-slate-400">Showing: {filteredProcesses.length}</span>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm font-mono whitespace-nowrap">
                        <thead className="text-slate-500 bg-slate-950/50 text-xs border-b border-slate-800">
                            <tr>
                                <th className="p-3">PID</th>
                                <th className="p-3">STAT</th>
                                <th className="p-3">%CPU</th>
                                <th className="p-3">%MEM</th>
                                <th className="p-3 w-full">COMMAND</th>
                                <th className="p-3 text-right">ACTIONS</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800 text-slate-300">
                            {filteredProcesses.map((p, i) => (
                                <tr key={i} className={`hover:bg-slate-800/50 ${p.isZombie ? 'opacity-50 grayscale' : ''}`}>
                                    <td className="p-3 text-cyan-400">{p.pid}</td>
                                    <td className="p-3 font-black">
                                        <span className={p.isZombie ? 'text-orange-500' : 'text-slate-400'}>{p.stat}</span>
                                    </td>
                                    <td className="p-3">{p.cpu}</td>
                                    <td className="p-3">{p.mem}</td>
                                    <td className="p-3 truncate max-w-[200px] md:max-w-md">
                                        {p.isZombie && <span className="inline-block px-1 mr-2 bg-orange-900/50 text-orange-400 border border-orange-800 text-[10px] rounded leading-tight">ZOMBIE</span>}
                                        <span className={p.isZombie ? 'text-slate-500 italic' : (isStreamProcess(p.command) ? 'text-cyan-200' : 'text-slate-400')} title={p.command}>
                                            {p.command.length > 80 ? p.command.substring(0, 80) + '...' : p.command}
                                        </span>
                                    </td>
                                    <td className="p-3 text-right flex justify-end gap-2">
                                        {!p.isZombie ? (
                                            <button onClick={() => handleAction(`kill-pid-${p.pid}`)} className="px-2 py-1 bg-red-900/50 hover:bg-red-800 text-red-300 rounded text-xs border border-red-800/50 transition-colors">Kill</button>
                                        ) : (
                                            <span className="px-2 py-1 bg-transparent text-slate-600 rounded text-[10px] border border-slate-800 cursor-not-allowed" title="Zombie processes are already dead and waiting for parent. Killing will not work.">Dead</span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                            {filteredProcesses.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="p-6 text-center text-slate-500 italic">No matched processes.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Logs Viewer */}
            <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden flex flex-col h-64">
               <div className="p-3 border-b border-slate-800 flex justify-between items-center bg-slate-800/50">
                    <h3 className="font-bold text-white text-sm uppercase tracking-widest flex items-center gap-2">
                        <Terminal className="w-4 h-4 text-purple-500" /> Live Logs
                    </h3>
               </div>
               <div className="p-3 overflow-y-auto flex-1 font-mono text-xs flex flex-col-reverse group custom-scrollbar bg-[#0a0a0a]">
                   {logs.length > 0 ? (
                       <div className="flex flex-col gap-1">
                           {logs.map((L, i) => (
                               <div key={i} className="flex gap-2">
                                   <span className="text-slate-500 shrink-0">[{new Date(L.timestamp).toLocaleTimeString()}]</span>
                                   <span className={`shrink-0 font-bold ${L.type === 'ERROR' || L.type === 'STDERR' ? 'text-red-400' : 'text-indigo-400'}`}>[{L.type}]</span>
                                   <span className="text-slate-300 break-words whitespace-pre-wrap">{L.message}</span>
                               </div>
                           ))}
                       </div>
                   ) : (
                       <div className="text-slate-600 italic">No logs available...</div>
                   )}
               </div>
            </div>
        </div>
    );
}
