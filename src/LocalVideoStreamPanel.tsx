import React, { useState, useEffect } from 'react';
import { Folder, FileVideo, Download, Play, Trash2, ArrowLeft, RefreshCw, Loader2, HardDrive, Search, Link, Activity, Film, Terminal, Info, XCircle, CheckCircle2, AlertTriangle } from 'lucide-react';

export default function LocalVideoStreamPanel({ envVars }: { envVars: any }) {
    const [currentPath, setCurrentPath] = useState('');
    const [files, setFiles] = useState<any[]>([]);
    const [allVideos, setAllVideos] = useState<any[]>([]);
    const [loading, setLoading] = useState<string | null>(null);
    const [downloads, setDownloads] = useState<any[]>([]);
    const [downloadUrl, setDownloadUrl] = useState('');
    const [downloadMethod, setDownloadMethod] = useState<'wget' | 'curl'>('wget');
    const [metadata, setMetadata] = useState<Record<string, any>>({});
    const [streamStatus, setStreamStatus] = useState<Record<string, boolean>>({});
    const [ffmpegOutput, setFfmpegOutput] = useState<string>('');
    const [activeVideoName, setActiveVideoName] = useState<string>(localStorage.getItem('activeStreamVideo') || 'None');

    const fetchMetadata = async (filePath: string) => {
        if (metadata[filePath]) return;
        try {
            const res = await fetch(`/api/stream/video-metadata?filePath=${encodeURIComponent(filePath)}`);
            const data = await res.json();
            setMetadata(prev => ({ ...prev, [filePath]: data }));
        } catch (e) {}
    };

    const fetchFiles = async (path?: string) => {
        setLoading('files');
        try {
            const res = await fetch(`/api/stream/files?path=${encodeURIComponent(path || currentPath)}`);
            const data = await res.json();
            if (data.files) {
                setFiles(data.files);
                setCurrentPath(data.currentPath);
            }
        } catch (e) {}
        setLoading(null);
    };

    const fetchAllVideos = async () => {
        try {
            const res = await fetch('/api/stream/all-videos');
            const data = await res.json();
            setAllVideos(data);
            data.forEach((v: any) => fetchMetadata(v.path));
        } catch (e) {}
    };

    const fetchStreamStatus = async () => {
        try {
            const res = await fetch('/api/stream/validate');
            setStreamStatus(await res.json());
        } catch (e) {}
    };

    const fetchFfmpegLogs = async () => {
        try {
            const res = await fetch('/api/stream/tmux/logs/quiz-ffmpeg');
            const data = await res.json();
            if (data.output) setFfmpegOutput(data.output);
        } catch (e) {}
    };

    const fetchDownloads = async () => {
        try {
            const res = await fetch('/api/stream/download-status');
            const data = await res.json();
            setDownloads(data);
            // If any download just finished, refresh videos
            const justFinished = data.some((d: any) => d.status === 'finished' && !downloads.find(prev => prev.id === d.id && prev.status === 'finished'));
            if (justFinished) {
                fetchAllVideos();
                fetchFiles();
            }
        } catch (e) {}
    };

    useEffect(() => {
        fetchFiles();
        fetchAllVideos();
        fetchDownloads();
        fetchStreamStatus();
        
        const intervalFast = setInterval(() => {
            fetchDownloads();
            fetchStreamStatus();
        }, 2000);

        const intervalLogs = setInterval(fetchFfmpegLogs, 3000);

        return () => {
            clearInterval(intervalFast);
            clearInterval(intervalLogs);
        };
    }, []);

    const navigateTo = (path: string) => {
        fetchFiles(path);
    };

    const goBack = () => {
        const parts = currentPath.split('/');
        parts.pop();
        navigateTo(parts.join('/') || '/');
    };

    const startDownload = async () => {
        if (!downloadUrl) return;
        setLoading('download');
        try {
            await fetch('/api/stream/download', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url: downloadUrl, method: downloadMethod })
            });
            setDownloadUrl('');
        } catch (e) {}
        setLoading(null);
        fetchDownloads();
    };

    const stopDownload = async (id: string) => {
        try {
            await fetch('/api/stream/download/stop', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id })
            });
        } catch (e) {}
        fetchDownloads();
    };

    const deleteFile = async (filePath: string) => {
        if (!confirm('Are you sure you want to delete this file?')) return;
        try {
            await fetch('/api/stream/delete-file', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ filePath })
            });
            fetchFiles();
            fetchAllVideos();
        } catch (e) {}
    };

    const startStream = async (videoPath: string, videoName: string) => {
        setLoading('stream-' + videoPath);
        try {
            await fetch('/api/stream/action', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    action: 'start-local-stream',
                    videoPath,
                })
            });
            setActiveVideoName(videoName);
            localStorage.setItem('activeStreamVideo', videoName);
            setTimeout(fetchStreamStatus, 1500);
        } catch (e) {}
        setLoading(null);
    };

    const stopStream = async () => {
        try {
            await fetch('/api/stream/action', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'kill-ffmpeg' })
            });
            setActiveVideoName('None');
            localStorage.removeItem('activeStreamVideo');
            setStreamStatus(prev => ({ ...prev, FFmpeg: false }));
        } catch (e) {}
    };

    const formatSize = (bytes: number) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const isVideo = (name: string) => {
        const ext = name.split('.').pop()?.toLowerCase();
        return ext ? ['mp4', 'mkv', 'mov', 'webm', 'avi'].includes(ext) : false;
    };

    return (
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 h-full overflow-hidden">
            {/* Left Column: Video Library & Browser */}
            <div className="xl:col-span-2 flex flex-col gap-6 overflow-hidden h-full">
                {/* Available Videos Search / Library */}
                <div className="flex flex-col flex-shrink-0 bg-slate-900/50 border border-slate-800 rounded-lg overflow-hidden h-[45%]">
                    <div className="p-4 border-b border-slate-800 bg-slate-950/50 flex justify-between items-center">
                        <div className="flex items-center gap-3">
                            <Film className="text-cyan-500 w-5 h-5" />
                            <h3 className="text-white font-bold tracking-widest uppercase text-xs">AVAILABLE VIDEOS</h3>
                        </div>
                        <button onClick={fetchAllVideos} className="text-slate-500 hover:text-white transition-colors">
                            <RefreshCw className="w-4 h-4" />
                        </button>
                    </div>
                    <div className="flex-grow overflow-y-auto p-2">
                        {allVideos.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-slate-600 gap-2 opacity-50">
                                <FileVideo className="w-8 h-8" />
                                <span className="text-[10px] uppercase font-bold">No videos detected yet</span>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 gap-2">
                                {allVideos.map(video => (
                                    <div key={video.path} className="group bg-slate-950/60 border border-slate-800 rounded-xl overflow-hidden hover:border-cyan-500/50 transition-all flex flex-col">
                                        <div className="p-4 flex justify-between items-start">
                                            <div className="flex flex-col min-w-0 flex-grow pr-4">
                                                <span className="text-[13px] text-white font-bold truncate tracking-tight">{video.name}</span>
                                                <div className="flex gap-2 items-center mt-1">
                                                    <span className="text-[10px] text-slate-500 uppercase font-bold">{formatSize(video.size)}</span>
                                                    {metadata[video.path] && (
                                                        <>
                                                            <span className="text-slate-800">•</span>
                                                            <span className="text-[10px] text-cyan-600 font-black">
                                                                {metadata[video.path].width}x{metadata[video.path].height} 
                                                            </span>
                                                            <span className="text-slate-800">•</span>
                                                            <span className="text-[10px] text-slate-500">
                                                                {Math.floor(metadata[video.path].duration / 60)}m {Math.floor(metadata[video.path].duration % 60)}s
                                                            </span>
                                                        </>
                                                    )}
                                                </div>
                                                <span className="text-[9px] text-slate-700 font-mono truncate mt-1 bg-black/30 px-2 py-0.5 rounded">{video.path}</span>
                                            </div>
                                            <button 
                                                onClick={() => deleteFile(video.path)}
                                                className="p-2 text-slate-600 hover:text-red-500 hover:bg-red-500/10 rounded transition-all"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                        <div className="px-4 pb-4">
                                            <button 
                                                onClick={() => startStream(video.path, video.name)}
                                                disabled={!!loading}
                                                className="w-full py-2.5 bg-green-600 hover:bg-green-500 text-white rounded-lg text-[11px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-lg shadow-green-900/20 active:scale-[0.98]"
                                            >
                                                {loading === 'stream-' + video.path ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                                                START LIVE STREAM
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Folder Browser */}
                <div className="flex flex-col flex-grow bg-slate-900/50 border border-slate-800 rounded-lg overflow-hidden h-[50%]">
                    <div className="p-3 border-b border-slate-800 bg-slate-950/20 flex justify-between items-center">
                        <div className="flex items-center gap-2 overflow-hidden">
                            <Folder className="text-yellow-500 w-4 h-4 flex-shrink-0" />
                            <span className="text-[9px] text-slate-500 font-mono truncate">{currentPath}</span>
                        </div>
                        <div className="flex gap-1.5">
                            <button onClick={goBack} className="p-1 px-2 bg-slate-800 hover:bg-slate-700 rounded text-slate-400 text-[10px] flex items-center gap-1">
                                <ArrowLeft className="w-3 h-3" /> BACK
                            </button>
                            <button onClick={() => fetchFiles()} className="p-1.5 hover:bg-slate-800 rounded text-slate-400">
                                <RefreshCw className={`w-3 h-3 ${loading === 'files' ? 'animate-spin' : ''}`} />
                            </button>
                        </div>
                    </div>
                    <div className="flex-grow overflow-y-auto p-1">
                        <div className="grid grid-cols-1 gap-0.5">
                            {files.map(file => (
                                <div key={file.path} className={`flex items-center justify-between p-1.5 px-3 rounded hover:bg-slate-800/50 cursor-pointer group transition-colors`} onClick={() => file.isDir ? navigateTo(file.path) : null}>
                                    <div className="flex items-center gap-2 overflow-hidden">
                                        {file.isDir ? <Folder className="w-3 h-3 text-yellow-600" /> : <FileVideo className={`w-3 h-3 ${isVideo(file.name) ? 'text-cyan-600' : 'text-slate-700'}`} />}
                                        <span className={`text-[10px] truncate ${file.isDir ? 'text-slate-300 font-bold' : 'text-slate-500'}`}>{file.name}</span>
                                    </div>
                                    {!file.isDir && <span className="text-[8px] text-slate-700">{formatSize(file.size)}</span>}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Right Column: Download & Integrated FFmpeg Status */}
            <div className="flex flex-col gap-6 xl:col-span-2 overflow-hidden h-full">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-full overflow-hidden">
                    {/* Integrated Streaming Status & Controls */}
                    <div className="flex flex-col bg-slate-900 border border-slate-700 rounded-lg overflow-hidden shadow-2xl relative h-full">
                        <div className={`h-1 w-full ${streamStatus.FFmpeg ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
                        <div className="p-5 flex flex-col h-full gap-4">
                            <div className="flex justify-between items-center">
                                <h3 className="text-white font-black tracking-widest text-xs flex items-center gap-2">
                                    <Activity className={`w-4 h-4 ${streamStatus.FFmpeg ? 'text-green-500' : 'text-slate-600'}`} /> LOCAL STREAM ENGINE
                                </h3>
                                <div className="flex items-center gap-2">
                                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${streamStatus.FFmpeg ? 'bg-green-500/10 text-green-500 border-green-500/30' : 'bg-red-500/10 text-red-500 border-red-500/30'}`}>
                                        {streamStatus.FFmpeg ? 'LIVE' : 'OFFLINE'}
                                    </span>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                                <div className="bg-black/40 border border-slate-800 p-2 rounded col-span-2">
                                    <span className="block text-[8px] text-slate-600 font-bold uppercase tracking-tighter">ACTIVE VIDEO</span>
                                    <span className="text-[10px] text-white font-bold truncate block">{activeVideoName}</span>
                                </div>
                                <div className="bg-black/40 border border-slate-800 p-2 rounded">
                                    <span className="block text-[8px] text-slate-600 font-bold uppercase tracking-tighter">RESOLUTION</span>
                                    <span className="text-xs text-cyan-500 font-mono">854x480</span>
                                </div>
                                <div className="bg-black/40 border border-slate-800 p-2 rounded">
                                    <span className="block text-[8px] text-slate-600 font-bold uppercase tracking-tighter">FPS TARGET</span>
                                    <span className="text-xs text-cyan-500 font-mono">8 FPS</span>
                                </div>
                            </div>

                            <div className="flex-grow flex flex-col gap-3 min-h-0">
                                <span className="text-[9px] text-slate-500 font-black uppercase flex items-center gap-2">
                                    <Terminal className="w-3 h-3" /> FFMPEG REAL-TIME LOGS
                                </span>
                                <div className="flex-grow bg-black/80 rounded border border-slate-800 p-3 font-mono text-[9px] text-slate-400 overflow-y-auto leading-tight whitespace-pre-wrap">
                                    {ffmpegOutput || 'Awaiting stream start...'}
                                </div>
                            </div>

                            <div className="flex gap-3">
                                {streamStatus.FFmpeg ? (
                                    <button 
                                        onClick={stopStream}
                                        className="flex-grow py-3 bg-red-600 hover:bg-red-700 text-white font-black rounded text-[10px] uppercase tracking-widest shadow-xl transition-all flex items-center justify-center gap-2"
                                    >
                                        <XCircle className="w-4 h-4" /> STOP LIVESTREAM
                                    </button>
                                ) : (
                                    <div className="flex-grow flex items-center justify-center py-3 bg-slate-800 text-slate-500 rounded text-[10px] font-bold uppercase tracking-widest border border-slate-700 italic">
                                        Select video to start stream
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Download & Stats Column */}
                    <div className="flex flex-col gap-6 overflow-hidden">
                        {/* Download Video Section */}
                        <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-5 shadow-lg relative overflow-hidden flex-shrink-0">
                            <div className="absolute top-0 left-0 w-1 h-full bg-cyan-600"></div>
                            <h3 className="text-white font-bold tracking-widest uppercase text-xs mb-4 flex items-center gap-2">
                                <Download className="w-4 h-4 text-cyan-500" /> DOWNLOAD TOOL
                            </h3>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-slate-500 font-bold mb-1.5 text-[9px] uppercase tracking-wider">VIDEO URL</label>
                                    <input 
                                        type="text"
                                        value={downloadUrl}
                                        onChange={(e) => setDownloadUrl(e.target.value)}
                                        placeholder="Enter mp4/mkv URL..."
                                        className="w-full bg-black/40 border border-slate-800 rounded p-2 text-slate-300 text-[11px] outline-none focus:border-cyan-500/50"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-2">
                                    <button 
                                        onClick={() => setDownloadMethod('wget')}
                                        className={`py-1.5 text-[10px] font-bold rounded border transition-all ${downloadMethod === 'wget' ? 'bg-cyan-600 text-white border-cyan-500' : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700'}`}
                                    >
                                        WGET
                                    </button>
                                    <button 
                                        onClick={() => setDownloadMethod('curl')}
                                        className={`py-1.5 text-[10px] font-bold rounded border transition-all ${downloadMethod === 'curl' ? 'bg-cyan-600 text-white border-cyan-500' : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700'}`}
                                    >
                                        CURL
                                    </button>
                                </div>

                                <button 
                                    onClick={startDownload}
                                    disabled={!downloadUrl || loading === 'download'}
                                    className="w-full py-2 bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-400 font-bold rounded text-[10px] uppercase tracking-widest border border-cyan-900/50 transition-all disabled:opacity-50"
                                >
                                    {loading === 'download' ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'START DOWNLOAD'}
                                </button>
                            </div>

                            {/* Active Downloads list */}
                            {downloads.length > 0 && (
                                <div className="mt-6 space-y-3 pt-4 border-t border-slate-800 max-h-48 overflow-y-auto pr-1">
                                    {downloads.map(dl => (
                                        <div key={dl.id} className="space-y-1.5">
                                            <div className="flex justify-between items-center text-[10px]">
                                                <span className="text-slate-400 truncate flex-grow mr-2">{dl.fileName}</span>
                                                <div className="flex items-center gap-2">
                                                    <span className={`font-bold ${dl.status === 'finished' ? 'text-green-500' : dl.status === 'error' ? 'text-red-500' : 'text-cyan-500'}`}>
                                                        {dl.status === 'downloading' ? `${dl.percent}%` : dl.status.toUpperCase()}
                                                    </span>
                                                    {dl.status === 'downloading' && (
                                                        <button onClick={() => stopDownload(dl.id)} className="text-red-500 hover:text-red-400">
                                                            <Trash2 className="w-3 h-3" />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden">
                                                <div 
                                                    className={`h-full transition-all duration-500 ${dl.status === 'finished' ? 'bg-green-500' : dl.status === 'error' ? 'bg-red-500' : 'bg-cyan-500'}`}
                                                    style={{ width: `${dl.percent}%` }}
                                                ></div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Stream Analytics Panel */}
                        <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-5 shadow-lg relative flex-grow overflow-y-auto">
                            <h3 className="text-white font-bold tracking-widest uppercase text-[10px] mb-4 flex items-center gap-2 border-b border-slate-800 pb-2">
                                <Info className="w-3 h-3 text-slate-500" /> SYSTEM ARCHITECTURE
                            </h3>
                            <div className="space-y-4">
                                <div className="flex flex-col gap-1">
                                    <span className="text-[8px] text-slate-600 font-bold uppercase">Stream Destination</span>
                                    <span className="text-[10px] text-slate-400 truncate">{envVars.YOUTUBE_RTMP_URL ? 'RTMP Endpoint Detected' : 'RTMP DISCONNECTED (Check .env)'}</span>
                                </div>
                                <div className="flex flex-col gap-1">
                                    <span className="text-[8px] text-slate-600 font-bold uppercase">Streaming Mode</span>
                                    <span className="text-[10px] text-cyan-600 font-bold">DIRECT FILE &rarr; X264 &rarr; RTMP</span>
                                </div>
                                <div className="pt-4 border-t border-slate-800 space-y-2">
                                    <div className="flex items-center gap-2">
                                        <CheckCircle2 className="w-3 h-3 text-green-500" />
                                        <span className="text-[9px] text-slate-500">Recursive Video Logic Active</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <CheckCircle2 className="w-3 h-3 text-green-500" />
                                        <span className="text-[9px] text-slate-500">Auto FFmpeg Lifecycle Mgmt</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-yellow-500">
                                        <AlertTriangle className="w-3 h-3" />
                                        <span className="text-[9px]">Ensure .env contains YOUTUBE_RTMP_URL</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
