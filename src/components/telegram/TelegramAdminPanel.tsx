import React, { useState, useEffect } from 'react';
import { Settings, RefreshCw, Plus, Trash2, Database, Key, ShieldCheck, Activity, BarChart3, AlertTriangle, Loader2, CheckCircle2, Phone, Lock, User, Terminal, LogOut, Power, Wifi, WifiOff } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function TelegramAdminPanel() {
    const [stats, setStats] = useState<any>(null);
    const [status, setStatus] = useState<any>(null);
    const [syncing, setSyncing] = useState<string | null>(null);
    const [newChannel, setNewChannel] = useState('');
    const [loading, setLoading] = useState(true);

    // Connection Form
    const [apiId, setApiId] = useState('');
    const [apiHash, setApiHash] = useState('');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [otp, setOtp] = useState('');
    const [password, setPassword] = useState('');
    const [loginStep, setLoginStep] = useState<'creds' | 'otp' | 'manual'>('creds');
    const [sessionString, setSessionString] = useState('');
    const [phoneCodeHash, setPhoneCodeHash] = useState('');
    const [loginLoading, setLoginLoading] = useState(false);

    useEffect(() => {
        fetchStats();
        fetchStatus();
        const interval = setInterval(fetchStatus, 10000); // Poll status every 10s
        return () => clearInterval(interval);
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

    const fetchStatus = async () => {
        try {
            const res = await fetch('/api/telegram/status');
            const data = await res.json();
            setStatus(data);
        } catch (e) {
            console.error(e);
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

    const handleSendOtp = async () => {
        setLoginLoading(true);
        try {
            const res = await fetch('/api/telegram/login/send-code', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phoneNumber, apiId, apiHash })
            });
            const data = await res.json();
            if (res.ok) {
                setPhoneCodeHash(data.phoneCodeHash);
                setLoginStep('otp');
            } else {
                alert(data.error || 'Failed to send OTP');
            }
        } catch (e) {
            alert('Error sending OTP');
        } finally {
            setLoginLoading(false);
        }
    };

    const handleVerifyOtp = async () => {
        setLoginLoading(true);
        try {
            const res = await fetch('/api/telegram/login/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phoneNumber, phoneCodeHash, code: otp, password })
            });
            const data = await res.json();
            if (res.ok) {
                alert('Connected successfully!');
                setLoginStep('creds');
                setOtp('');
                setPassword('');
                fetchStatus();
            } else {
                alert(data.error || 'Verification failed');
            }
        } catch (e) {
            alert('Error verifying OTP');
        } finally {
            setLoginLoading(false);
        }
    };

    const handleManualSave = async () => {
        setLoginLoading(true);
        try {
            const res = await fetch('/api/telegram/credentials/save', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ apiId, apiHash, session: sessionString })
            });
            const data = await res.json();
            if (res.ok) {
                alert('Session restored and connected!');
                setLoginStep('creds');
                setSessionString('');
                fetchStatus();
            } else {
                alert(data.error || 'Failed to save credentials');
            }
        } catch (e) {
            alert('Error updating credentials');
        } finally {
            setLoginLoading(false);
        }
    };

    const handleDisconnect = async () => {
        if (!confirm('Disconnect Telegram session?')) return;
        try {
            await fetch('/api/telegram/disconnect', { method: 'POST' });
            fetchStatus();
        } catch (e) {}
    };

    const totalFiles = stats?.totalFiles?.count || 0;

    return (
        <div className="flex flex-col h-full bg-[#050505] text-white overflow-y-auto font-sans">
            <header className="p-8 border-b border-white/5 bg-zinc-950/50 backdrop-blur-xl">
                <div className="max-w-7xl mx-auto flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center shadow-2xl shadow-blue-500/20">
                            <Settings className="w-7 h-7 text-white" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-black tracking-tighter uppercase italic">Telegram Admin</h1>
                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em] leading-none mt-1">Infrastructure Control Center</p>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                        {status && (
                            <div className={`px-4 py-2 rounded-full flex items-center gap-2 border transition-all duration-500 bg-opacity-10 ${
                                status.status === 'Connected' ? 'bg-green-500 border-green-500/20 text-green-500' : 
                                status.status === 'Reconnecting' || status.status === 'DC Timeout' ? 'bg-amber-500 border-amber-500/20 text-amber-500' :
                                status.status === 'DC Migration' ? 'bg-blue-500 border-blue-500/20 text-blue-500' :
                                'bg-red-500 border-red-500/20 text-red-500'
                            }`}>
                                {status.status === 'Connected' ? <Wifi className="w-4 h-4" /> : 
                                 status.status === 'Reconnecting' || status.status === 'DC Timeout' ? <RefreshCw className="w-4 h-4 animate-spin" /> :
                                 status.status === 'DC Migration' ? <Activity className="w-4 h-4 animate-pulse" /> :
                                 <WifiOff className="w-4 h-4" />}
                                <span className="text-[10px] font-black uppercase tracking-widest">{status.status}</span>
                            </div>
                        )}
                        <button 
                            onClick={() => { fetchStats(); fetchStatus(); }}
                            className="p-3 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 transition-all group"
                        >
                            <RefreshCw className={`w-5 h-5 text-slate-400 group-hover:text-blue-400 transition-colors ${loading ? 'animate-spin text-blue-500' : ''}`} />
                        </button>
                    </div>
                </div>
            </header>

            <main className="flex-1 p-8">
                <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
                    
                    {/* Main Settings & Sync */}
                    <div className="lg:col-span-2 space-y-8">
                        
                        {/* Connection Manager */}
                        <section className="bg-zinc-900/40 border border-white/5 rounded-3xl p-8 shadow-2xl overflow-hidden relative">
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-600 to-indigo-600" />
                            <div className="flex items-center gap-3 mb-8">
                                <Key className="w-5 h-5 text-blue-500" />
                                <h2 className="text-sm font-black uppercase tracking-widest italic">MTProto Connection Manager</h2>
                            </div>

                             {status?.status === 'Connected' ? (
                                <div className="space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="bg-black/40 p-4 rounded-2xl border border-white/5">
                                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Authenticated Account</p>
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-blue-600/20 rounded-xl flex items-center justify-center border border-blue-500/30">
                                                    <User className="w-5 h-5 text-blue-400" />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-black text-white">{(status.firstName || '') + ' ' + (status.lastName || '') || 'Telegram User'}</p>
                                                    <p className="text-[10px] font-bold text-slate-400">@{status.username || 'unknown'}</p>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="bg-black/40 p-4 rounded-2xl border border-white/5">
                                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Security Info</p>
                                            <div className="space-y-1">
                                                <p className="text-xs text-slate-300 font-mono tracking-tight"><span className="text-slate-500 uppercase font-sans font-bold text-[9px]">ID:</span> {status.id}</p>
                                                <p className="text-xs text-slate-300 font-mono tracking-tight"><span className="text-slate-500 uppercase font-sans font-bold text-[9px]">Phone:</span> +{status.phone}</p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex gap-4">
                                        <button 
                                            onClick={() => { fetchStatus(); }}
                                            className="flex-1 py-4 bg-zinc-800 hover:bg-zinc-700 text-slate-300 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border border-white/5 flex items-center justify-center gap-2"
                                        >
                                            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                                            Refresh Connection
                                        </button>
                                        <button 
                                            onClick={handleDisconnect}
                                            className="flex-1 py-4 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border border-red-500/20 flex items-center justify-center gap-2"
                                        >
                                            <LogOut className="w-4 h-4" />
                                            Terminate Session
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <AnimatePresence mode="wait">
                                    {loginStep === 'creds' ? (
                                        <motion.div 
                                            key="creds"
                                            initial={{ opacity: 0, x: -20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, x: 20 }}
                                            className="space-y-4"
                                        >
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div className="space-y-1.5">
                                                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-4">Telegram API ID</label>
                                                    <div className="relative">
                                                        <Terminal className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
                                                        <input 
                                                            type="text" 
                                                            placeholder="e.g. 1234567"
                                                            value={apiId}
                                                            onChange={(e) => setApiId(e.target.value)}
                                                            className="w-full bg-black/40 border border-white/10 rounded-2xl py-3.5 pl-12 pr-4 text-xs font-mono focus:border-blue-500/50 transition-all outline-none"
                                                        />
                                                    </div>
                                                </div>
                                                <div className="space-y-1.5">
                                                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-4">Telegram API Hash</label>
                                                    <div className="relative">
                                                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
                                                        <input 
                                                            type="text" 
                                                            placeholder="API HASH STRING"
                                                            value={apiHash}
                                                            onChange={(e) => setApiHash(e.target.value)}
                                                            className="w-full bg-black/40 border border-white/10 rounded-2xl py-3.5 pl-12 pr-4 text-xs font-mono focus:border-blue-500/50 transition-all outline-none"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-4">Telegram Phone Number (required for OTP)</label>
                                                <div className="relative">
                                                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
                                                    <input 
                                                        type="text" 
                                                        placeholder="+1222333444"
                                                        value={phoneNumber}
                                                        onChange={(e) => setPhoneNumber(e.target.value)}
                                                        className="w-full bg-black/40 border border-white/10 rounded-2xl py-3.5 pl-12 pr-4 text-xs font-mono focus:border-blue-500/50 transition-all outline-none"
                                                    />
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <button 
                                                    onClick={handleSendOtp}
                                                    disabled={loginLoading || !apiId || !apiHash || !phoneNumber}
                                                    className="py-4 bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-800 disabled:text-zinc-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-blue-600/20 transition-all active:scale-95 flex items-center justify-center gap-2"
                                                >
                                                    {loginLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Power className="w-4 h-4" />}
                                                    Send Login OTP
                                                </button>
                                                <button 
                                                    onClick={() => setLoginStep('manual')}
                                                    className="py-4 bg-zinc-800 hover:bg-zinc-700 text-slate-300 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border border-white/10 flex items-center justify-center gap-2"
                                                >
                                                    <ShieldCheck className="w-4 h-4" />
                                                    Manual Session
                                                </button>
                                            </div>
                                        </motion.div>
                                    ) : loginStep === 'manual' ? (
                                        <motion.div 
                                            key="manual"
                                            initial={{ opacity: 0, x: 20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, x: -20 }}
                                            className="space-y-4"
                                        >
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div className="space-y-1.5">
                                                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-4">Telegram API ID</label>
                                                    <input 
                                                        type="text" 
                                                        placeholder="e.g. 1234567"
                                                        value={apiId}
                                                        onChange={(e) => setApiId(e.target.value)}
                                                        className="w-full bg-black/40 border border-white/10 rounded-2xl py-3.5 px-6 text-xs font-mono focus:border-blue-500/50 transition-all outline-none"
                                                    />
                                                </div>
                                                <div className="space-y-1.5">
                                                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-4">Telegram API Hash</label>
                                                    <input 
                                                        type="text" 
                                                        placeholder="API HASH STRING"
                                                        value={apiHash}
                                                        onChange={(e) => setApiHash(e.target.value)}
                                                        className="w-full bg-black/40 border border-white/10 rounded-2xl py-3.5 px-6 text-xs font-mono focus:border-blue-500/50 transition-all outline-none"
                                                    />
                                                </div>
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-4">Telegram Session String (DC Restorable)</label>
                                                <textarea 
                                                    placeholder="Paste your base64 session string here..."
                                                    value={sessionString}
                                                    onChange={(e) => setSessionString(e.target.value)}
                                                    className="w-full bg-black/40 border border-white/10 rounded-2xl py-4 px-6 text-xs font-mono focus:border-blue-500/50 transition-all outline-none min-h-[100px] resize-none"
                                                />
                                            </div>
                                            <div className="flex gap-4">
                                                <button 
                                                    onClick={() => setLoginStep('creds')}
                                                    className="flex-1 py-4 bg-zinc-800 hover:bg-zinc-700 text-slate-400 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all"
                                                >
                                                    Back
                                                </button>
                                                <button 
                                                    onClick={handleManualSave}
                                                    disabled={loginLoading || !apiId || !apiHash || !sessionString}
                                                    className="flex-[2] py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-blue-600/20 transition-all flex items-center justify-center gap-2"
                                                >
                                                    {loginLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                                                    Save & Connect Instantly
                                                </button>
                                            </div>
                                        </motion.div>
                                    ) : (
                                        <motion.div 
                                            key="otp"
                                            initial={{ opacity: 0, x: 20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, x: -20 }}
                                            className="space-y-6"
                                        >
                                            <div className="p-4 bg-blue-600/10 border border-blue-500/20 rounded-2xl flex items-center gap-3">
                                                <AlertTriangle className="w-5 h-5 text-blue-400" />
                                                <p className="text-xs font-medium text-slate-300 tracking-tight">Login verification code sent to <span className="text-white font-bold">{phoneNumber}</span>. Check your Telegram app.</p>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-1 gap-6">
                                                <div className="space-y-1.5">
                                                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-4">Verification Code (OTP)</label>
                                                    <input 
                                                        type="text" 
                                                        placeholder="Enter OTP"
                                                        value={otp}
                                                        onChange={(e) => setOtp(e.target.value)}
                                                        className="w-full bg-black/40 border border-white/10 rounded-2xl py-4 px-6 text-xl tracking-[0.5em] text-center font-black text-blue-500 focus:border-blue-500 outline-none"
                                                    />
                                                </div>
                                                <div className="space-y-1.5">
                                                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-4">Two-Factor Password (If enabled)</label>
                                                    <input 
                                                        type="password" 
                                                        placeholder="Cloud Password"
                                                        value={password}
                                                        onChange={(e) => setPassword(e.target.value)}
                                                        className="w-full bg-black/40 border border-white/10 rounded-2xl py-3.5 px-6 text-xs focus:border-blue-500 outline-none"
                                                    />
                                                </div>
                                            </div>

                                            <div className="flex gap-4">
                                                <button 
                                                    onClick={() => setLoginStep('creds')}
                                                    className="flex-1 py-4 bg-zinc-800 hover:bg-zinc-700 text-slate-400 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all"
                                                >
                                                    Back
                                                </button>
                                                <button 
                                                    onClick={handleVerifyOtp}
                                                    disabled={loginLoading || !otp}
                                                    className="flex-[2] py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-blue-600/20 transition-all flex items-center justify-center gap-2"
                                                >
                                                    {loginLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                                                    Complete Authentication
                                                </button>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            )}
                        </section>

                        {/* Channel Management */}
                        <section className="bg-zinc-900/40 border border-white/5 rounded-3xl p-8 shadow-2xl">
                            <div className="flex justify-between items-center mb-8">
                                <div className="flex items-center gap-3">
                                    <Database className="w-5 h-5 text-blue-500" />
                                    <h2 className="text-sm font-black uppercase tracking-widest italic">Inventory Sources</h2>
                                </div>
                                <div className="flex gap-2">
                                    <button 
                                        onClick={() => stats?.channels?.forEach((c: any) => syncChannel(c.username))}
                                        disabled={!!syncing || status?.status !== 'Connected' || !stats?.channels?.length}
                                        className="bg-zinc-800 hover:bg-zinc-700 text-slate-300 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all h-10 border border-white/5"
                                    >
                                        Sync All
                                    </button>
                                    <input 
                                        type="text" 
                                        placeholder="@channel_username" 
                                        value={newChannel}
                                        onChange={(e) => setNewChannel(e.target.value)}
                                        className="bg-[#0a0a0a] border border-white/10 rounded-xl px-4 py-2 text-xs font-mono focus:border-blue-500/50 outline-none w-48"
                                    />
                                    <button 
                                        onClick={() => syncChannel(newChannel)}
                                        disabled={!newChannel || !!syncing || status?.status !== 'Connected'}
                                        className="bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-800 disabled:text-zinc-500 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all h-10 flex items-center gap-2"
                                    >
                                        {syncing === newChannel ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                                        Add Channel
                                    </button>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {stats?.channels?.map((chan: any) => (
                                    <div key={chan.id} className="flex flex-col p-5 bg-black/40 border border-white/5 rounded-2xl hover:border-white/10 transition-all group">
                                        <div className="flex items-start justify-between mb-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center border border-blue-500/20 text-blue-400 font-black text-xs uppercase italic tracking-tighter">
                                                    {chan.username[0]}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-black text-white leading-tight">{chan.title}</p>
                                                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">@{chan.username}</p>
                                                </div>
                                            </div>
                                            <div className="flex gap-2">
                                                <button 
                                                    onClick={() => syncChannel(chan.username)}
                                                    disabled={!!syncing || status?.status !== 'Connected'}
                                                    className="p-2 bg-blue-600/10 text-blue-500 hover:bg-blue-600 hover:text-white rounded-lg transition-all"
                                                >
                                                    {syncing === chan.username ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                                                </button>
                                                <button className="p-2 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-lg transition-all">
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        </div>
                                        <div className="flex justify-between items-end pt-4 border-t border-white/5">
                                            <div>
                                                <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest mb-1">Last Sync Progress</p>
                                                <p className="text-[10px] font-mono text-blue-400">Idx: {chan.last_sync_message_id}</p>
                                            </div>
                                            <div className="text-right">
                                                 <span className="text-[9px] font-black px-2 py-0.5 bg-green-500/10 text-green-500 rounded-full border border-green-500/20 uppercase tracking-tighter">
                                                     Ready
                                                 </span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {(!stats?.channels || stats.channels.length === 0) && (
                                    <div className="col-span-full text-center py-12 border-2 border-dashed border-white/5 rounded-3xl">
                                        <Database className="w-12 h-12 text-slate-800 mx-auto mb-4" />
                                        <p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.3em]">No data sources defined</p>
                                    </div>
                                )}
                            </div>
                        </section>
                    </div>

                    {/* Stats Sidebar */}
                    <div className="space-y-8">
                        <section className="bg-gradient-to-br from-blue-900/20 to-indigo-900/20 border border-blue-500/20 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-4 opacity-10">
                                <BarChart3 className="w-20 h-20 text-blue-500" />
                            </div>
                            <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-blue-400 mb-2">Cloud Storage Load</h3>
                            <p className="text-5xl font-black text-white tracking-tighter mb-1">{totalFiles}</p>
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-8">Files in Indexed Cloud</p>
                            
                            <div className="space-y-5">
                                {stats?.byCategory?.map((cat: any) => (
                                    <div key={cat.category} className="space-y-2">
                                        <div className="flex justify-between items-center px-1">
                                            <div className="flex items-center gap-2">
                                                <div className={`w-1.5 h-1.5 rounded-full ${
                                                    cat.category === 'video' ? 'bg-red-500' :
                                                    cat.category === 'image' ? 'bg-blue-500' :
                                                    cat.category === 'archive' ? 'bg-amber-500' : 'bg-slate-500'
                                                }`} />
                                                <span className="text-[10px] font-black uppercase text-slate-400 italic tracking-tighter">{cat.category || 'misc'}</span>
                                            </div>
                                            <span className="text-[10px] font-mono text-blue-400 font-black">{cat.count}</span>
                                        </div>
                                        <div className="h-1.5 bg-black/40 rounded-full overflow-hidden">
                                            <motion.div 
                                                initial={{ width: 0 }}
                                                animate={{ width: `${Math.min(100, (cat.count / Math.max(1, totalFiles)) * 100)}%` }}
                                                className={`h-full ${
                                                    cat.category === 'video' ? 'bg-red-500' :
                                                    cat.category === 'image' ? 'bg-blue-500' :
                                                    cat.category === 'archive' ? 'bg-amber-500' : 'bg-blue-600'
                                                }`}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>

                        <section className="bg-zinc-900/40 border border-white/5 rounded-3xl p-6">
                            <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 mb-6 flex items-center gap-2">
                                <Activity className="w-4 h-4 text-blue-500" />
                                MTProto Node Pulse
                            </h3>
                            <div className="space-y-4">
                                <div className="p-4 bg-zinc-950/40 border border-white/5 rounded-2xl flex items-center gap-3">
                                    <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse shadow-[0_0_10px_#22c55e]" />
                                    <div>
                                        <p className="text-[11px] font-black text-white italic">DB Engine: Active</p>
                                        <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">Persistence layer operational</p>
                                    </div>
                                </div>
                                <div className="p-4 bg-zinc-950/40 border border-white/5 rounded-2xl flex items-center gap-3">
                                    <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse shadow-[0_0_10px_#3b82f6]" />
                                    <div>
                                        <p className="text-[11px] font-black text-white italic">Protocol: WebSocket</p>
                                        <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">Binary bridge connected</p>
                                    </div>
                                </div>
                            </div>
                        </section>
                    </div>
                </div>
            </main>
        </div>
    );
}
