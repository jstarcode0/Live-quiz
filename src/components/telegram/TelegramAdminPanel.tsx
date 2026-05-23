import React, { useState, useEffect } from 'react';
import { Settings, RefreshCw, Plus, Trash2, Database, Key, ShieldCheck, Activity, BarChart3, AlertTriangle, Loader2, CheckCircle2 } from 'lucide-react';
import { motion } from 'motion/react';

export default function TelegramAdminPanel() {
    const [stats, setStats] = useState<any>(null);
    const [syncing, setSyncing] = useState<string | null>(null);
    const [newChannel, setNewChannel] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchStats();
    }, []);

    const fetchStats = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/telegram/stats');
            const data = await res.json();
            setStats(data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const syncChannel = async (channel: string) => {
        setSyncing(channel);
        try {
            const res = await fetch('/api/telegram/sync', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ channel })
            });
            if (res.ok) {
                fetchStats();
            } else {
                const err = await res.json();
                alert(err.error);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setSyncing(null);
        }
    };

    const totalFiles = stats?.totalFiles?.count || 0;

    return (
        <div className="flex flex-col h-full bg-[#050505] text-white overflow-y-auto">
            <header className="p-8 border-b border-white/5 bg-zinc-950/50 backdrop-blur-xl">
                <div className="max-w-7xl mx-auto flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-2xl shadow-indigo-500/20">
                            <Settings className="w-7 h-7 text-white" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-black tracking-tighter uppercase italic">Telegram Admin</h1>
                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em] leading-none mt-1">Infrastructure Control Center</p>
                        </div>
                    </div>
                    
                    <div className="flex gap-4">
                        <button 
                            onClick={fetchStats}
                            className="p-3 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 transition-all group"
                        >
                            <RefreshCw className={`w-5 h-5 text-slate-400 group-hover:text-indigo-400 transition-colors ${loading ? 'animate-spin text-indigo-500' : ''}`} />
                        </button>
                    </div>
                </div>
            </header>

            <main className="flex-1 p-8">
                <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
                    
                    {/* Main Settings & Sync */}
                    <div className="lg:col-span-2 space-y-8">
                        {/* Channel Management */}
                        <section className="bg-zinc-900/40 border border-white/5 rounded-3xl p-8 shadow-2xl">
                            <div className="flex justify-between items-center mb-8">
                                <div className="flex items-center gap-3">
                                    <Database className="w-5 h-5 text-indigo-500" />
                                    <h2 className="text-sm font-black uppercase tracking-widest italic">Source Channels</h2>
                                </div>
                                <div className="flex gap-2">
                                    <input 
                                        type="text" 
                                        placeholder="@channel_username" 
                                        value={newChannel}
                                        onChange={(e) => setNewChannel(e.target.value)}
                                        className="bg-[#0a0a0a] border border-white/10 rounded-xl px-4 py-2 text-xs font-mono focus:border-indigo-500/50 outline-none w-48"
                                    />
                                    <button 
                                        onClick={() => syncChannel(newChannel)}
                                        disabled={!newChannel || !!syncing}
                                        className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-800 disabled:text-zinc-500 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all h-10 flex items-center gap-2"
                                    >
                                        {syncing === newChannel ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                                        Add & Sync
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-3">
                                {stats?.channels?.map((chan: any) => (
                                    <div key={chan.id} className="flex items-center justify-between p-4 bg-black/40 border border-white/5 rounded-2xl hover:border-white/10 transition-all">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 bg-indigo-500/10 rounded-xl flex items-center justify-center border border-indigo-500/20 text-indigo-400 font-black text-xs">
                                                {chan.username[0].toUpperCase()}
                                            </div>
                                            <div>
                                                <p className="text-[13px] font-black tracking-tight text-white">{chan.title}</p>
                                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">@{chan.username}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <div className="text-right">
                                                <p className="text-[10px] font-black text-indigo-500 uppercase tracking-tighter">Last Message Indexed</p>
                                                <p className="text-[11px] font-mono text-slate-400">ID: {chan.last_sync_message_id}</p>
                                            </div>
                                            <button 
                                                onClick={() => syncChannel(chan.username)}
                                                disabled={!!syncing}
                                                className="p-2.5 bg-indigo-600/10 text-indigo-500 hover:bg-indigo-600 hover:text-white rounded-xl transition-all"
                                            >
                                                {syncing === chan.username ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                                            </button>
                                            <button className="p-2.5 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-xl transition-all">
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                                {(!stats?.channels || stats.channels.length === 0) && (
                                    <div className="text-center py-12 border-2 border-dashed border-white/5 rounded-3xl">
                                        <Database className="w-10 h-10 text-slate-800 mx-auto mb-4" />
                                        <p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.3em]">No synced channels found</p>
                                    </div>
                                )}
                            </div>
                        </section>

                        {/* Security & API Status */}
                        <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="bg-zinc-900/40 border border-white/5 rounded-3xl p-6">
                                <div className="flex items-center gap-3 mb-6">
                                    <Key className="w-4 h-4 text-orange-500" />
                                    <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">MTProto Authorization</h3>
                                </div>
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between p-3 bg-black/40 rounded-xl border border-white/5">
                                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">Session State</span>
                                        <div className="flex items-center gap-2">
                                            <div className="w-2 h-2 bg-green-500 rounded-full shadow-[0_0_10px_#22c55e]" />
                                            <span className="text-[11px] font-black text-green-500 uppercase italic">Active</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between p-3 bg-black/40 rounded-xl border border-white/5">
                                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">API Credentials</span>
                                        <span className="text-[10px] font-mono text-slate-400">********-****-4a...</span>
                                    </div>
                                    <button className="w-full py-3 bg-zinc-800 hover:bg-zinc-700 text-slate-300 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border border-white/5">
                                         Re-authorize Account
                                    </button>
                                </div>
                            </div>

                            <div className="bg-zinc-900/40 border border-white/5 rounded-3xl p-6">
                                <div className="flex items-center gap-3 mb-6">
                                    <ShieldCheck className="w-4 h-4 text-emerald-500" />
                                    <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Internal Security</h3>
                                </div>
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between p-3 bg-black/40 rounded-xl border border-white/5">
                                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">Range Requests</span>
                                        <span className="text-[11px] font-black text-slate-300 uppercase tracking-tighter">ENABLED</span>
                                    </div>
                                    <div className="flex items-center justify-between p-3 bg-black/40 rounded-xl border border-white/5">
                                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">API Proxy Layer</span>
                                        <span className="text-[11px] font-black text-emerald-500 uppercase italic tracking-tighter">ENCRYPTED</span>
                                    </div>
                                    <button className="w-full py-3 bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-500 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border border-emerald-500/10">
                                         Regenerate API Tokens
                                    </button>
                                </div>
                            </div>
                        </section>
                    </div>

                    {/* Stats Sidebar */}
                    <div className="space-y-8">
                        <section className="bg-gradient-to-br from-indigo-900/20 to-purple-900/20 border border-indigo-500/20 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-4 opacity-10">
                                <BarChart3 className="w-20 h-20 text-indigo-500" />
                            </div>
                            <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-indigo-400 mb-2">Network Capacity</h3>
                            <p className="text-4xl font-black text-white tracking-tighter mb-1">{totalFiles}</p>
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-6">Total Media Indexed</p>
                            
                            <div className="space-y-4">
                                {stats?.byCategory?.map((cat: any) => (
                                    <div key={cat.category} className="space-y-1">
                                        <div className="flex justify-between items-center px-1">
                                            <span className="text-[10px] font-black uppercase text-slate-400 italic tracking-tighter">{cat.category || 'other'}</span>
                                            <span className="text-[10px] font-mono text-indigo-400">{cat.count} items</span>
                                        </div>
                                        <div className="h-1.5 bg-black/40 rounded-full overflow-hidden">
                                            <div 
                                                className="h-full bg-indigo-500" 
                                                style={{ width: `${Math.min(100, (cat.count / Math.max(1, totalFiles)) * 100)}%` }}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>

                        <section className="bg-zinc-900/40 border border-white/5 rounded-3xl p-6">
                            <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 mb-6 flex items-center gap-2">
                                <Activity className="w-4 h-4 text-amber-500" />
                                System Health
                            </h3>
                            <div className="space-y-4">
                                <div className="p-4 bg-zinc-950/40 border border-white/5 rounded-2xl flex items-center gap-3">
                                    <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse shadow-[0_0_10px_#22c55e]" />
                                    <div>
                                        <p className="text-[11px] font-black text-white italic">DB Engine: Online</p>
                                        <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">SQLite v3.x Optimized</p>
                                    </div>
                                </div>
                                <div className="p-4 bg-zinc-950/40 border border-white/5 rounded-2xl flex items-center gap-3">
                                    <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse shadow-[0_0_10px_#22c55e]" />
                                    <div>
                                        <p className="text-[11px] font-black text-white italic">Stream Proxy: Operational</p>
                                        <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">Range Requests Support active</p>
                                    </div>
                                </div>
                                <div className="p-4 bg-zinc-950/40 border border-white/5 rounded-2xl flex items-center gap-3">
                                    <div className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse shadow-[0_0_10px_#f59e0b]" />
                                    <div>
                                        <p className="text-[11px] font-black text-white italic">Worker Node: Standby</p>
                                        <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">Auto-Sync check in 14m</p>
                                    </div>
                                </div>
                            </div>
                        </section>

                        <div className="p-6 bg-red-950/10 border border-red-500/20 rounded-3xl flex items-start gap-3">
                             <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />
                             <div>
                                 <p className="text-[10px] font-black text-red-500 uppercase tracking-widest mb-1 italic">Warning Terminal</p>
                                 <p className="text-[11px] text-slate-400 font-medium leading-tight">Syncing large channels (&gt;1000 messages) may trigger Telegram flood limits. Use limit settings for mass sync.</p>
                             </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
