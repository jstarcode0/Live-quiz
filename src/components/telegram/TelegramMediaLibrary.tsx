import React, { useState, useEffect, useRef } from 'react';
import { Search, Filter, Play, Download, FileText, Image as ImageIcon, Music, Archive, File, Loader2, ChevronRight, Bookmark, History, TrendingUp } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface MediaItem {
    id: string;
    file_name: string;
    caption: string;
    file_size: number;
    mime_type: string;
    category: string;
    message_date: string;
    channel_name: string;
}

export default function TelegramMediaLibrary() {
    const [media, setMedia] = useState<MediaItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [category, setCategory] = useState('');
    const [selectedMedia, setSelectedMedia] = useState<MediaItem | null>(null);

    const categories = [
        { id: '', label: 'All', icon: <File className="w-4 h-4" /> },
        { id: 'video', label: 'Videos', icon: <Play className="w-4 h-4" /> },
        { id: 'pdf', label: 'PDFs', icon: <FileText className="w-4 h-4" /> },
        { id: 'image', label: 'Images', icon: <ImageIcon className="w-4 h-4" /> },
        { id: 'audio', label: 'Audio', icon: <Music className="w-4 h-4" /> },
        { id: 'archive', label: 'Archives', icon: <Archive className="w-4 h-4" /> },
    ];

    useEffect(() => {
        fetchMedia();
    }, [searchQuery, category]);

    const fetchMedia = async () => {
        setLoading(true);
        try {
            const url = new URL('/api/telegram/media', window.location.origin);
            if (searchQuery) url.searchParams.append('q', searchQuery);
            if (category) url.searchParams.append('category', category);
            
            const res = await fetch(url.toString());
            const data = await res.json();
            setMedia(data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const formatSize = (bytes: number) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    return (
        <div className="flex flex-col h-full bg-black text-white overflow-hidden">
            {/* Header / Search */}
            <header className="p-6 border-b border-white/10 bg-black/50 backdrop-blur-xl sticky top-0 z-10">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row gap-4 justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-900/20">
                            <Archive className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h1 className="text-xl font-black tracking-tighter uppercase italic">Telegram Media</h1>
                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest leading-none">Cloud Streaming Engine</p>
                        </div>
                    </div>

                    <div className="relative w-full max-w-md">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                        <input
                            type="text"
                            placeholder="Search files, titles, keywords..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-full py-2.5 pl-12 pr-4 text-sm focus:outline-none focus:border-blue-500/50 transition-all font-medium"
                        />
                    </div>
                </div>

                <div className="max-w-7xl mx-auto mt-6 flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                    {categories.map((cat) => (
                        <button
                            key={cat.id}
                            onClick={() => setCategory(cat.id)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${
                                category === cat.id 
                                ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/40' 
                                : 'bg-white/5 text-slate-400 hover:bg-white/10'
                            }`}
                        >
                            {cat.icon}
                            {cat.label}
                        </button>
                    ))}
                </div>
            </header>

            {/* Media Grid */}
            <main className="flex-1 overflow-y-auto p-6">
                <div className="max-w-7xl mx-auto">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center h-[50vh]">
                            <Loader2 className="w-8 h-8 text-blue-500 animate-spin mb-4" />
                            <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Indexing Telegram Cloud...</p>
                        </div>
                    ) : media.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-[50vh] text-slate-600">
                            <Archive className="w-12 h-12 mb-4 opacity-20" />
                            <p className="text-sm font-bold tracking-tight">No media found in your library</p>
                            <p className="text-[10px] uppercase tracking-widest mt-2">Try adjusting your search or sync settings</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                            {media.map((item) => (
                                <MediaCard 
                                    key={item.id} 
                                    item={item} 
                                    formatSize={formatSize}
                                    onSelect={() => setSelectedMedia(item)}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </main>

            <AnimatePresence>
                {selectedMedia && (
                    <MediaViewer 
                        item={selectedMedia} 
                        onClose={() => setSelectedMedia(null)} 
                    />
                )}
            </AnimatePresence>
        </div>
    );
}

interface MediaCardProps {
    key?: React.Key;
    item: MediaItem;
    formatSize: (bytes: number) => string;
    onSelect: () => void;
}

function MediaCard({ item, formatSize, onSelect }: MediaCardProps) {
    const getIcon = () => {
        switch(item.category) {
            case 'video': return <Play className="w-5 h-5" />;
            case 'pdf': return <FileText className="w-5 h-5" />;
            case 'image': return <ImageIcon className="w-5 h-5" />;
            case 'audio': return <Music className="w-5 h-5" />;
            default: return <File className="w-5 h-5" />;
        }
    };

    return (
        <motion.div 
            layout
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="group bg-zinc-900/50 border border-white/5 rounded-xl overflow-hidden hover:border-blue-500/50 transition-all cursor-pointer relative"
            onClick={onSelect}
        >
            <div className="aspect-[16/10] bg-zinc-800 flex items-center justify-center relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent z-10" />
                <div className="text-white/20 transform group-hover:scale-110 transition-transform duration-500">
                    {getIcon()}
                </div>
                
                <div className="absolute top-2 right-2 z-20">
                    <span className="text-[8px] font-black bg-blue-600 text-white px-1.5 py-0.5 rounded shadow-lg uppercase tracking-tighter">
                        {item.category || 'file'}
                    </span>
                </div>
                
                <div className="absolute bottom-2 left-2 right-2 z-20">
                    <p className="text-[10px] font-black text-white truncate drop-shadow-md tracking-tight leading-none mb-1">
                        {item.file_name}
                    </p>
                    <p className="text-[8px] font-bold text-slate-400 truncate opacity-70 tracking-tighter uppercase">
                        {item.channel_name}
                    </p>
                </div>
            </div>
            
            <div className="p-3 flex justify-between items-center bg-black/40 border-t border-white/5">
                <div className="flex flex-col">
                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-tighter">Size</span>
                    <span className="text-[10px] font-black text-slate-300">{formatSize(item.file_size)}</span>
                </div>
                <div className="flex gap-1">
                    <button className="p-1.5 hover:bg-blue-600/20 text-slate-400 hover:text-blue-500 rounded transition-colors">
                        <Bookmark className="w-3.5 h-3.5" />
                    </button>
                    <button className="p-1.5 hover:bg-blue-600/20 text-slate-400 hover:text-blue-500 rounded transition-colors">
                        <Download className="w-3.5 h-3.5" />
                    </button>
                </div>
            </div>
        </motion.div>
    );
}

function MediaViewer({ item, onClose }: { item: MediaItem; onClose: () => void }) {
    return (
        <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/95 backdrop-blur-2xl flex items-center justify-center p-4 md:p-8"
        >
            <div className="absolute inset-0" onClick={onClose} />
            
            <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="w-full max-w-5xl bg-zinc-900 border border-white/10 rounded-2xl overflow-hidden shadow-2xl relative z-10 flex flex-col md:flex-row h-[80vh]"
            >
                {/* Close Button */}
                <button 
                    onClick={onClose}
                    className="absolute top-4 right-4 z-30 p-2 bg-black/50 text-white rounded-full hover:bg-white/10 transition-colors"
                >
                    <Archive className="w-5 h-5 rotate-45" />
                </button>

                {/* Player/Preview Area */}
                <div className="flex-[2] bg-black flex items-center justify-center relative">
                    {item.category === 'video' ? (
                        <video 
                            controls 
                            autoPlay
                            className="w-full h-full object-contain"
                            src={`/api/telegram/stream/${item.id}`}
                        />
                    ) : item.category === 'image' ? (
                        <img 
                            src={`/api/telegram/stream/${item.id}`} 
                            alt={item.file_name}
                            className="max-w-full max-h-full object-contain shadow-2xl"
                        />
                    ) : (
                        <div className="flex flex-col items-center justify-center text-slate-500">
                            <FileText className="w-20 h-20 mb-4 opacity-10" />
                            <p className="text-sm font-bold uppercase tracking-widest underline decoration-blue-500 underline-offset-4">Preview not supported in modal</p>
                            <a 
                                href={`/api/telegram/stream/${item.id}`} 
                                target="_blank" 
                                rel="noreferrer"
                                className="mt-6 px-8 py-3 bg-blue-600 text-white rounded-full text-xs font-black uppercase tracking-widest shadow-lg shadow-blue-600/30 hover:scale-105 transition-transform"
                            >
                                Open Full Window
                            </a>
                        </div>
                    )}
                </div>

                {/* Details Sidebar */}
                <div className="flex-1 p-8 border-l border-white/5 flex flex-col justify-between overflow-y-auto">
                    <div>
                        <div className="flex items-center gap-2 mb-6">
                            <span className="px-2 py-1 bg-blue-600/10 text-blue-500 text-[10px] font-black uppercase tracking-tighter rounded border border-blue-500/20">
                                {item.category}
                            </span>
                            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{item.channel_name}</span>
                        </div>
                        
                        <h2 className="text-2xl font-black tracking-tight text-white leading-tight mb-4">{item.file_name}</h2>
                        
                        {item.caption && (
                            <div className="p-4 bg-white/5 rounded-xl border border-white/5 mb-8">
                                <p className="text-sm text-slate-400 font-medium leading-relaxed italic">"{item.caption}"</p>
                            </div>
                        )}

                        <div className="space-y-4">
                            <div className="flex justify-between items-center py-2 border-b border-white/5">
                                <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest">File Size</span>
                                <span className="text-sm font-mono text-slate-300">{(item.file_size / (1024*1024)).toFixed(2)} MB</span>
                            </div>
                            <div className="flex justify-between items-center py-2 border-b border-white/5">
                                <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Mime Type</span>
                                <span className="text-xs font-mono text-slate-400 truncate max-w-[150px]">{item.mime_type}</span>
                            </div>
                            <div className="flex justify-between items-center py-2 border-b border-white/5">
                                <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Date</span>
                                <span className="text-xs text-slate-300">{new Date(item.message_date).toLocaleDateString()}</span>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-8">
                        <button className="flex items-center justify-center gap-2 py-3 bg-white text-black rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-colors shadow-lg active:scale-95">
                            <Download className="w-4 h-4" />
                            Download
                        </button>
                        <button className="flex items-center justify-center gap-2 py-3 bg-zinc-800 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-zinc-700 transition-colors border border-white/5 shadow-lg active:scale-95">
                            <Bookmark className="w-4 h-4" />
                            Favorite
                        </button>
                    </div>
                </div>
            </motion.div>
        </motion.div>
    );
}
