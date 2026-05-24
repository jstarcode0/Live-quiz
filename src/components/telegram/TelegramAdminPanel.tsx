import React, { useState, useEffect } from 'react';
import { Settings, RefreshCw, Plus, Trash2, Database, Key, ShieldCheck, Activity, BarChart3, AlertTriangle, AlertCircle, Loader2, CheckCircle2, Phone, Lock, User, Terminal, LogOut, Power, Wifi, WifiOff } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function TelegramAdminPanel() {
    const [stats, setStats] = useState<any>(null);
    const [status, setStatus] = useState<any>(null);
    const [channels, setChannels] = useState<any[]>([]);
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

    const [dialogs, setDialogs] = useState<any[]>([]);
    const [discoverMode, setDiscoverMode] = useState(false);
    const [syncingAll, setSyncingAll] = useState(false);

    useEffect(() => {
        fetchStats();
        fetchStatus();
        fetchChannels();
        const interval = setInterval(() => {
            fetchStatus();
            fetchChannels(); // Also fetch channels to update progress
        }, 5000);
        return () => clearInterval(interval);
    }, []);

    const fetchChannels = async () => {
        try {
            const res = await fetch('/api/telegram/channels');
            if (!res.ok) throw new Error('Failed to fetch channels');
            const data = await res.json();
            if (Array.isArray(data)) {
                setChannels(data);
            }
        } catch (e) {
            console.error("Fetch Channels Error:", e);
        }
    };

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

    const discoverChannels = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/telegram/dialogs');
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Failed to fetch dialogs');
            }
            const data = await res.json();
            setDialogs(Array.isArray(data) ? data : []);
            setDiscoverMode(true);
        } catch (e: any) {
            console.error("Discovery Error:", e);
            alert(`Discovery Error: ${e.message}`);
        } finally {
            setLoading(false);
        }
    };

    const addChannelFromDialog = async (dialog: any) => {
        try {
            const res = await fetch('/api/telegram/channels/add', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    id: dialog.id, 
                    title: dialog.title, 
                    username: dialog.username, 
                    type: dialog.type 
                })
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Failed to add channel');
            }
            await fetchStats();
            await fetchChannels();
        } catch (e: any) {
            console.error("Add Channel Error:", e);
            alert(`Error: ${e.message}`);
        }
    };

    const toggleChannel = async (id: string, active: boolean) => {
        try {
            await fetch('/api/telegram/channels/toggle', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, active })
            });
            fetchStats();
            fetchChannels();
        } catch (e) {}
    };

    const startDeepSync = async (channelId: string) => {
        setSyncing(channelId);
        try {
            const res = await fetch('/api/telegram/sync', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ channelId })
            });
            if (res.ok) {
                fetchStats();
                fetchChannels();
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

    const syncAllActive = async () => {
        setSyncingAll(true);
        try {
            await fetch('/api/telegram/sync/all', { method: 'POST' });
            alert('Batch sync started in background');
        } catch (e) {
            alert('Batch sync failed');
        } finally {
            setSyncingAll(false);
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
                                status.status === 'Connected' ? (status.isBot ? 'bg-red-500 border-red-500/20 text-red-500' : 'bg-green-500 border-green-500/20 text-green-500') : 
                                status.status === 'Reconnecting' || status.status === 'DC Timeout' ? 'bg-amber-500 border-amber-500/20 text-amber-500' :
                                status.status === 'DC Migration' ? 'bg-blue-500 border-blue-500/20 text-blue-500' :
                                'bg-red-500 border-red-500/20 text-red-500'
                            }`}>
                                {status.status === 'Connected' ? (status.isBot ? <AlertTriangle className="w-4 h-4" /> : <Wifi className="w-4 h-4" />) : 
                                 status.status === 'Reconnecting' || status.status === 'DC Timeout' ? <RefreshCw className="w-4 h-4 animate-spin" /> :
                                 status.status === 'DC Migration' ? <Activity className="w-4 h-4 animate-pulse" /> :
                                 <WifiOff className="w-4 h-4" />}
                                <span className="text-[10px] font-black uppercase tracking-widest">
                                    {status.status === 'Connected' && status.isBot ? 'Bot Connected (Limited)' : status.status}
                                </span>
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
                                        <div className={`bg-black/40 p-4 rounded-2xl border ${status.isBot ? 'border-red-500/30' : 'border-white/5'}`}>
                                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Authenticated Account</p>
                                            <div className="flex items-center gap-3">
                                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${status.isBot ? 'bg-red-500/20 border-red-500/40' : 'bg-blue-600/20 border-blue-500/30'}`}>
                                                    {status.isBot ? <AlertCircle className="w-5 h-5 text-red-500" /> : <User className="w-5 h-5 text-blue-400" />}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-black text-white">{(status.firstName || '') + ' ' + (status.lastName || '') || 'Telegram Account'}</p>
                                                    <div className="flex items-center gap-2">
                                                        <p className="text-[10px] font-bold text-slate-400">@{status.username || 'unknown'}</p>
                                                        <span className={`text-[8px] px-1 py-0.5 rounded uppercase font-black tracking-tighter ${status.isBot ? 'bg-red-500 text-white' : 'bg-green-500/20 text-green-500'}`}>
                                                            {status.isBot ? 'BOT ACCOUNT' : 'USER ACCOUNT'}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                            {status.isBot && (
                                                <div className="mt-4 p-3 bg-red-500/10 rounded-xl border border-red-500/20">
                                                    <p className="text-[9px] text-red-400 font-bold uppercase tracking-widest leading-tight">
                                                        Warning: Bots cannot use GetDialogs. Syncing requires a real MTProto User Session (StringSession).
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                        <div className="bg-black/40 p-4 rounded-2xl border border-white/5">
                                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Infrastructure Info</p>
                                            <div className="space-y-1">
                                                <p className="text-xs text-slate-300 font-mono tracking-tight"><span className="text-slate-500 uppercase font-sans font-bold text-[9px]">ID:</span> {status.id}</p>
                                                <p className="text-xs text-slate-300 font-mono tracking-tight"><span className="text-slate-500 uppercase font-sans font-bold text-[9px]">DC ID:</span> {status.dcId || '1'}</p>
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
                        <section className="bg-zinc-900/40 border border-white/5 rounded-3xl p-8 shadow-2xl transition-all">
                            <div className="flex justify-between items-center mb-8">
                                <div className="flex items-center gap-3">
                                    <Database className="w-5 h-5 text-blue-500" />
                                    <h2 className="text-sm font-black uppercase tracking-widest italic">Inventory & Sync Sources</h2>
                                </div>
                                <div className="flex gap-2">
                                    <button 
                                        onClick={syncAllActive}
                                        disabled={!!syncingAll || status?.status !== 'Connected' || !channels?.length}
                                        className="bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-800 disabled:text-zinc-500 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all h-10 shadow-lg shadow-blue-600/20 flex items-center gap-2"
                                    >
                                        {syncingAll ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                                        Incremental Sync
                                    </button>
                                    <button 
                                        onClick={discoverChannels}
                                        disabled={status?.status !== 'Connected' || loading}
                                        className="bg-zinc-800 hover:bg-zinc-700 text-slate-300 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all h-10 border border-white/5 flex items-center gap-2"
                                    >
                                        <Plus className="w-4 h-4" />
                                        Discover Channels
                                    </button>
                                </div>
                            </div>

                            {discoverMode ? (
                                <motion.div 
                                    initial={{ opacity: 0, y: 10 }} 
                                    animate={{ opacity: 1, y: 0 }}
                                    className="space-y-4"
                                >
                                    <div className="flex items-center justify-between px-2">
                                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Available Channels & Groups ({dialogs.length})</p>
                                        <button 
                                            onClick={() => setDiscoverMode(false)}
                                            className="text-[10px] font-black text-blue-500 uppercase tracking-widest hover:underline"
                                        >
                                            Done
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                                        {dialogs?.map(d => {
                                            const isSaved = channels?.some((c: any) => c.id === d.id);
                                            return (
                                                <div key={d.id} className="flex items-center justify-between p-4 bg-black/40 border border-white/5 rounded-2xl">
                                                    <div className="flex items-center gap-3 overflow-hidden">
                                                        <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center text-[10px] font-black shrink-0">
                                                            {(d.title || '?')[0]}
                                                        </div>
                                                        <div className="overflow-hidden">
                                                            <p className="text-xs font-black text-white truncate">{d.title}</p>
                                                            <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">{d.type}</p>
                                                        </div>
                                                    </div>
                                                    <button 
                                                        onClick={() => addChannelFromDialog(d)}
                                                        disabled={isSaved}
                                                        className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${
                                                            isSaved ? 'bg-green-500/10 text-green-500' : 'bg-blue-600 hover:bg-blue-500 text-white'
                                                        }`}
                                                    >
                                                        {isSaved ? <CheckCircle2 className="w-3.5 h-3.5" /> : 'Add'}
                                                    </button>
                                                </div>
                                            );
                                        })}
                                        {dialogs?.length === 0 && (
                                            <div className="col-span-full py-10 text-center text-[10px] font-bold text-slate-600 uppercase tracking-widest">
                                                No channels detected
                                            </div>
                                        )}
                                    </div>
                                </motion.div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {channels?.map((chan: any) => (
                                        <div key={chan.id} className={`flex flex-col p-5 bg-black/40 border rounded-3xl transition-all group ${
                                            chan.sync_status === 'syncing' ? 'border-blue-500/40 shadow-xl shadow-blue-500/5' : 'border-white/5 hover:border-white/10'
                                        }`}>
                                            <div className="flex items-start justify-between mb-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center border border-blue-500/20 text-blue-400 font-black text-xs uppercase italic tracking-tighter shadow-inner">
                                                        {(chan.title || '?')[0]}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-black text-white leading-tight mb-0.5">{chan.title}</p>
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-[9px] font-black px-1.5 py-0.5 bg-zinc-800 text-slate-400 rounded uppercase tracking-tighter">{chan.type}</span>
                                                            {chan.username && <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">@{chan.username}</p>}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex gap-2">
                                                    <button 
                                                        onClick={() => startDeepSync(chan.id)}
                                                        disabled={syncing === chan.id || chan.sync_status === 'syncing'}
                                                        className="p-2 bg-blue-600/10 text-blue-500 hover:bg-blue-600 hover:text-white rounded-xl transition-all"
                                                        title="Deep History Sync"
                                                    >
                                                        <Database className={`w-4 h-4 ${chan.sync_status === 'syncing' ? 'animate-pulse' : ''}`} />
                                                    </button>
                                                    <button 
                                                        onClick={() => toggleChannel(chan.id, !chan.is_active)}
                                                        className={`p-2 rounded-xl transition-all ${
                                                            chan.is_active ? 'bg-green-500/10 text-green-500 hover:bg-green-500 hover:text-white' : 'bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white'
                                                        }`}
                                                    >
                                                        <Power className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>
                                            <div className="mt-auto space-y-4 pt-4 border-t border-white/5">
                                                <div className="flex justify-between items-center">
                                                    <div className="space-y-1">
                                                        <p className="text-[8px] font-black text-slate-600 uppercase tracking-[0.2em] mb-1">Current Activity</p>
                                                        <div className="flex items-center gap-2">
                                                            <div className={`w-1.5 h-1.5 rounded-full ${
                                                                chan.sync_status === 'syncing' ? 'bg-blue-500 animate-pulse shadow-[0_0_8px_#3b82f6]' : 
                                                                chan.sync_status === 'completed' ? 'bg-green-500' :
                                                                chan.sync_status === 'failed' ? 'bg-red-500' : 'bg-slate-700'
                                                            }`} />
                                                            <p className="text-[10px] font-black text-white italic uppercase tracking-tighter">{chan.sync_status}</p>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-[8px] font-black text-slate-600 uppercase tracking-[0.2em] mb-1">Messages</p>
                                                        <p className="text-[10px] font-mono text-blue-400 font-bold">{chan.last_sync_message_id}</p>
                                                    </div>
                                                </div>
                                                {chan.sync_progress && (
                                                    <div className="p-3 bg-black/60 rounded-xl border border-white/5">
                                                        <p className="text-[10px] font-mono text-slate-400 leading-tight">
                                                            <span className="text-blue-500 font-bold uppercase text-[8px] mr-2 tracking-widest">Progress:</span>
                                                            {chan.sync_progress}
                                                        </p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                    {(!stats?.channels || stats.channels.length === 0) && (
                                        <div className="col-span-full text-center py-20 border-2 border-dashed border-white/5 rounded-3xl group hover:border-white/10 transition-all cursor-pointer" onClick={discoverChannels}>
                                            <div className="w-16 h-16 bg-white/5 rounded-3xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                                                <Terminal className="w-8 h-8 text-slate-700" />
                                            </div>
                                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] mb-2">No data sources configured</p>
                                            <p className="text-xs text-slate-600 font-medium">Click to discover joined channels</p>
                                        </div>
                                    )}
                                </div>
                            )}
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
