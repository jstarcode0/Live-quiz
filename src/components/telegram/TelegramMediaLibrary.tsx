import React, { useState, useEffect, useRef } from 'react';
import { Search, Filter, Play, Download, FileText, Image as ImageIcon, Music, Archive, File, Loader2, ChevronRight, Bookmark, History, TrendingUp } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface MediaItem {
    id: string;
    file_name: string;
    clean_title: string;
    caption: string;
    file_size: number;
    mime_type: string;
    category: string;
    message_date: string;
    channel_name: string;
    part_number?: number;
    teacher?: string;
    batch?: string;
}

interface Category {
    id: string;
    name: string;
    icon: string;
    media_count: number;
    video_count: number;
    pdf_count: number;
}

interface Topic {
    id: string;
    name: string;
    media_count: number;
}

export default function TelegramMediaLibrary() {
    const [view, setView] = useState<'categories' | 'topics' | 'subtopics' | 'media'>('categories');
    const [path, setPath] = useState<{id: string, name: string, type: string}[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [topics, setTopics] = useState<Topic[]>([]);
    const [subTopics, setSubTopics] = useState<Topic[]>([]);
    const [media, setMedia] = useState<MediaItem[]>([]);
    
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedMedia, setSelectedMedia] = useState<MediaItem | null>(null);

    useEffect(() => {
        if (searchQuery) {
            fetchMediaBySearch();
        } else {
            loadViewData();
        }
    }, [view, path, searchQuery]);

    const loadViewData = async () => {
        setLoading(true);
        try {
            if (view === 'categories') {
                const res = await fetch('/api/telegram/categories');
                setCategories(await res.json());
            } else if (view === 'topics') {
                const categoryId = path[path.length - 1].id;
                const res = await fetch(`/api/telegram/topics/${categoryId}`);
                setTopics(await res.json());
            } else if (view === 'subtopics') {
                const mainTopicId = path[path.length - 1].id;
                const res = await fetch(`/api/telegram/subtopics/${mainTopicId}`);
                setSubTopics(await res.json());
            } else if (view === 'media') {
                const subTopicId = path[path.length - 1].id;
                const res = await fetch(`/api/telegram/media/hierarchy/${subTopicId}`);
                setMedia(await res.json());
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const fetchMediaBySearch = async () => {
        setLoading(true);
        try {
            const url = new URL('/api/telegram/media', window.location.origin);
            url.searchParams.append('q', searchQuery);
            const res = await fetch(url.toString());
            setMedia(await res.json());
            if (view !== 'media') setView('media');
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

    const navigateTo = (id: string, name: string, type: string) => {
        setPath([...path, { id, name, type }]);
        if (type === 'category') setView('topics');
        else if (type === 'topic') setView('subtopics');
        else if (type === 'subtopic') setView('media');
    };

    const goBack = (index: number) => {
        const newPath = path.slice(0, index + 1);
        setPath(newPath);
        const last = newPath[newPath.length - 1];
        if (!last) setView('categories');
        else if (last.type === 'category') setView('topics');
        else if (last.type === 'topic') setView('subtopics');
        else if (last.type === 'subtopic') setView('media');
    };

    return (
        <div className="flex flex-col h-full bg-[#0a0a0a] text-white overflow-hidden font-sans">
            {/* Nav & Search */}
            <header className="p-6 border-b border-white/5 bg-black/40 backdrop-blur-2xl sticky top-0 z-20">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row gap-6 justify-between items-center">
                    <div className="flex items-center gap-4 cursor-pointer" onClick={() => { setPath([]); setView('categories'); setSearchQuery(''); }}>
                        <div className="w-11 h-11 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-2xl shadow-blue-500/20">
                            <Play className="w-6 h-6 text-white fill-current" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-black tracking-tighter uppercase italic bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60">ACADEMY</h1>
                            <p className="text-[9px] text-blue-500 font-bold uppercase tracking-[0.2em] leading-none">Cloud Streaming Flow</p>
                        </div>
                    </div>

                    <div className="relative w-full max-w-xl group">
                        <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-blue-500 transition-colors" />
                        <input
                            type="text"
                            placeholder="Quantum Physics, English Grammar, Modernism..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-2xl py-3.5 pl-14 pr-6 text-sm focus:outline-none focus:border-blue-500/50 focus:bg-white/10 transition-all font-medium placeholder:text-slate-600"
                        />
                    </div>
                </div>

                {/* Breadcrumbs */}
                {path.length > 0 && !searchQuery && (
                    <div className="max-w-7xl mx-auto mt-6 flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide text-[10px] font-black uppercase tracking-widest">
                        <button 
                            onClick={() => { setPath([]); setView('categories'); }}
                            className="text-slate-500 hover:text-white transition-colors"
                        >
                            Library
                        </button>
                        {path.map((p, i) => (
                            <React.Fragment key={p.id}>
                                <ChevronRight className="w-3 h-3 text-slate-700" />
                                <button 
                                    onClick={() => goBack(i)}
                                    className={`${i === path.length - 1 ? 'text-blue-500' : 'text-slate-400 hover:text-white'} transition-colors whitespace-nowrap`}
                                >
                                    {p.name}
                                </button>
                            </React.Fragment>
                        ))}
                    </div>
                )}
            </header>

            {/* Main Content Area */}
            <main className="flex-1 overflow-y-auto p-6 md:p-10">
                <div className="max-w-7xl mx-auto">
                    <AnimatePresence mode="wait">
                        {loading ? (
                            <motion.div 
                                key="loader"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="flex flex-col items-center justify-center h-[60vh]"
                            >
                                <div className="relative">
                                    <Loader2 className="w-12 h-12 text-blue-500 animate-spin mb-4" />
                                    <div className="absolute inset-0 blur-xl bg-blue-500/20 animate-pulse" />
                                </div>
                                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.3em]">Synching Course Library</p>
                            </motion.div>
                        ) : (
                            <motion.div 
                                key={view + path.length + searchQuery}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.4 }}
                            >
                                {searchQuery || view === 'media' ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 xxl:grid-cols-5 gap-6">
                                        {media.map((item) => (
                                            <MediaCard 
                                                key={item.id} 
                                                item={item} 
                                                formatSize={formatSize}
                                                onSelect={() => setSelectedMedia(item)}
                                            />
                                        ))}
                                    </div>
                                ) : view === 'categories' ? (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                        {categories.map((cat) => (
                                            <CategoryCard key={cat.id} category={cat} onClick={() => navigateTo(cat.id, cat.name, 'category')} />
                                        ))}
                                    </div>
                                ) : view === 'topics' ? (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                        {topics.map((topic) => (
                                            <TopicCard key={topic.id} topic={topic} onClick={() => navigateTo(topic.id, topic.name, 'topic')} />
                                        ))}
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                        {subTopics.map((sub) => (
                                            <TopicCard key={sub.id} topic={sub} onClick={() => navigateTo(sub.id, sub.name, 'subtopic')} isSubtopic />
                                        ))}
                                    </div>
                                )}

                                {((view === 'media' && media.length === 0) || (view === 'categories' && categories.length === 0)) && !loading && (
                                    <div className="flex flex-col items-center justify-center h-[50vh] text-slate-700">
                                        <Archive className="w-16 h-16 mb-6 opacity-10" />
                                        <p className="text-lg font-black tracking-tighter uppercase italic">No Content Discovered</p>
                                        <button 
                                            onClick={() => { setPath([]); setView('categories'); setSearchQuery(''); }}
                                            className="mt-6 px-8 py-3 bg-white/5 border border-white/10 rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all text-slate-400"
                                        >
                                            Return to Library
                                        </button>
                                    </div>
                                )}
                            </motion.div>
                        )}
                    </AnimatePresence>
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

function CategoryCard({ category, onClick }: { category: Category, onClick: () => void, key?: React.Key }) {
    return (
        <motion.div 
            whileHover={{ y: -5, scale: 1.02 }}
            onClick={onClick}
            className="group relative h-64 bg-zinc-900/40 rounded-3xl p-8 border border-white/5 cursor-pointer overflow-hidden backdrop-blur-sm"
        >
            <div className="absolute top-0 right-0 p-8 text-white/5 group-hover:text-blue-500/20 transition-colors uppercase font-black text-6xl italic -rotate-12 pointer-events-none">
                {category.name.substring(0, 3)}
            </div>
            
            <div className="relative z-10 flex flex-col h-full justify-between">
                <div className="w-14 h-14 bg-white/5 rounded-2xl flex items-center justify-center border border-white/10 group-hover:bg-blue-600 transition-all group-hover:shadow-xl group-hover:shadow-blue-600/30">
                    <FileText className="w-6 h-6 text-slate-400 group-hover:text-white" />
                </div>
                
                <div>
                    <h3 className="text-2xl font-black tracking-tight text-white mb-2 group-hover:text-blue-400 transition-colors">{category.name}</h3>
                    <div className="flex items-center gap-4">
                        <span className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-slate-500">
                            <Play className="w-3 h-3 fill-current" /> {category.video_count} Lessons
                        </span>
                        <span className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-slate-500">
                            <FileText className="w-3 h-3" /> {category.pdf_count} Notes
                        </span>
                    </div>
                </div>
            </div>
            
            <div className="absolute inset-0 bg-blue-600 opacity-0 group-hover:opacity-[0.03] transition-opacity" />
        </motion.div>
    );
}

function TopicCard({ topic, onClick, isSubtopic }: { topic: Topic, onClick: () => void, isSubtopic?: boolean, key?: React.Key }) {
    return (
        <motion.div 
            whileHover={{ x: 5 }}
            onClick={onClick}
            className="group flex items-center justify-between p-5 bg-zinc-900/30 border border-white/5 rounded-2xl cursor-pointer hover:border-blue-500/30 transition-all hover:bg-white/5"
        >
            <div className="flex items-center gap-4">
                <div className={`w-10 h-10 ${isSubtopic ? 'bg-indigo-600/20' : 'bg-blue-600/10'} rounded-xl flex items-center justify-center border border-white/5`}>
                    <Archive className={`w-4 h-4 ${isSubtopic ? 'text-indigo-400' : 'text-blue-500'}`} />
                </div>
                <div>
                    <h4 className="text-sm font-bold text-white group-hover:text-blue-400 transition-colors">{topic.name}</h4>
                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{topic.media_count} Items</p>
                </div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-700 group-hover:text-blue-500 transition-colors" />
        </motion.div>
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
            case 'video': return <Play className="w-5 h-5 fill-current" />;
            case 'pdf': return <FileText className="w-5 h-5" />;
            case 'image': return <ImageIcon className="w-5 h-5" />;
            case 'audio': return <Music className="w-5 h-5" />;
            default: return <File className="w-5 h-5" />;
        }
    };

    const hasThumbnail = item.category === 'image' || item.category === 'video';

    return (
        <motion.div 
            layout
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="group relative bg-[#121212] border border-white/[0.03] rounded-2xl overflow-hidden hover:border-blue-500/40 transition-all cursor-pointer shadow-xl"
            onClick={onSelect}
        >
            <div className="aspect-[16/9] bg-zinc-900 flex items-center justify-center relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent z-10" />
                
                {hasThumbnail ? (
                   <img 
                      src={`/api/telegram/thumb/${item.id}`} 
                      alt="" 
                      className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-1000 opacity-70 group-hover:opacity-100"
                      onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                      }}
                   />
                ) : (
                   <div className="text-white/10 transform group-hover:scale-110 transition-transform duration-500">
                       {getIcon()}
                   </div>
                )}
                
                {item.part_number && (
                    <div className="absolute top-3 left-3 z-20">
                        <span className="text-[9px] font-black bg-blue-600 text-white px-2 py-0.5 rounded-lg shadow-2xl uppercase tracking-tighter">
                            L-{item.part_number}
                        </span>
                    </div>
                )}
                
                <div className="absolute top-3 right-3 z-20">
                    <span className="text-[8px] font-black bg-white/10 backdrop-blur-md text-white/60 px-2 py-0.5 rounded-lg uppercase tracking-tighter border border-white/5">
                        {item.category || 'file'}
                    </span>
                </div>
                
                <div className="absolute bottom-4 left-4 right-4 z-20">
                    <h4 className="text-sm font-black text-white truncate drop-shadow-xl tracking-tight leading-tight mb-1 group-hover:text-blue-400 transition-colors">
                        {item.clean_title || item.file_name}
                    </h4>
                    <div className="flex items-center gap-2 opacity-50">
                        <p className="text-[9px] font-bold text-slate-300 truncate tracking-widest uppercase">
                            {item.teacher || item.channel_name}
                        </p>
                    </div>
                </div>
            </div>
            
            <div className="px-4 py-3 pb-4 flex justify-between items-center bg-[#121212]">
                <div className="flex flex-col">
                    <span className="text-[10px] font-black text-slate-400">{formatSize(item.file_size)}</span>
                </div>
                <div className="flex gap-1">
                    <button className="p-2 hover:bg-blue-600/20 text-slate-500 hover:text-blue-500 rounded-xl transition-all">
                        <Download className="w-4 h-4" onClick={(e) => {
                            e.stopPropagation();
                            window.open(`/api/telegram/stream/${item.id}`, '_blank');
                        }} />
                    </button>
                    <button className="p-2 hover:bg-blue-600/20 text-slate-500 hover:text-blue-500 rounded-xl transition-all">
                        <Bookmark className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </motion.div>
    );
}

function MediaViewer({ item, onClose }: { item: MediaItem; onClose: () => void }) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [relatedPDFs, setRelatedPDFs] = useState<MediaItem[]>([]);

    useEffect(() => {
        if (item.category === 'video') {
            fetchRelatedPDFs();
        }
    }, [item.id]);

    const fetchRelatedPDFs = async () => {
        try {
            const q = item.clean_title || item.file_name.split('.')[0];
            const url = new URL('/api/telegram/media', window.location.origin);
            url.searchParams.append('q', q);
            const res = await fetch(url.toString());
            const data = await res.json();
            setRelatedPDFs(data.filter((p: MediaItem) => p.id !== item.id && p.mime_type === 'application/pdf'));
        } catch (e) {
            console.error(e);
        }
    };

    return (
        <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/98 backdrop-blur-3xl flex items-center justify-center p-4 md:p-8"
        >
            <div className="absolute inset-0" onClick={onClose} />
            
            <motion.div 
                initial={{ scale: 0.95, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 20 }}
                className="w-full max-w-[1400px] bg-[#0c0c0c] border border-white/5 rounded-[2rem] overflow-hidden shadow-2xl relative z-10 flex flex-col lg:flex-row h-[90vh]"
            >
                <button 
                    onClick={onClose}
                    className="absolute top-6 right-6 z-40 p-3 bg-white/5 text-white/50 rounded-2xl hover:bg-white/10 hover:text-white transition-all border border-white/5 active:scale-90"
                >
                    <Archive className="w-5 h-5 rotate-45" />
                </button>

                <div className="flex-[3] bg-black flex items-center justify-center relative border-r border-white/5">
                    {item.category === 'video' ? (
                        <video 
                            ref={videoRef}
                            controls 
                            autoPlay
                            className="w-full h-full object-contain"
                            src={`/api/telegram/stream/${item.id}`}
                            poster={`/api/telegram/thumb/${item.id}`}
                        >
                            Your browser does not support the video tag.
                        </video>
                    ) : item.category === 'image' ? (
                        <img 
                            src={`/api/telegram/stream/${item.id}`} 
                            alt={item.file_name}
                            className="max-w-full max-h-full object-contain p-8"
                        />
                    ) : item.category === 'pdf' ? (
                        <iframe 
                            src={`/api/telegram/stream/${item.id}#toolbar=1`} 
                            className="w-full h-full bg-[#1a1a1a]"
                            title={item.file_name}
                        />
                    ) : (
                        <div className="flex flex-col items-center justify-center text-slate-500">
                            <File className="w-24 h-24 mb-6 opacity-10" />
                            <p className="text-xs font-black uppercase tracking-[0.4em] mb-8">Stream Ready</p>
                            <a 
                                href={`/api/telegram/stream/${item.id}`} 
                                target="_blank" 
                                rel="noreferrer"
                                className="px-10 py-4 bg-white text-black rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all flex items-center gap-3 shadow-xl shadow-white/5"
                            >
                                <Play className="w-4 h-4 fill-current" />
                                Launch Application
                            </a>
                        </div>
                    )}
                </div>

                <div className="flex-1 p-10 flex flex-col justify-between overflow-y-auto bg-[#0c0c0c]">
                    <div className="space-y-10">
                        <div className="space-y-4">
                            <div className="flex items-center gap-3">
                                <span className="px-3 py-1 bg-blue-600/10 text-blue-500 text-[9px] font-black uppercase tracking-widest rounded-lg border border-blue-500/20">
                                    {item.category}
                                </span>
                                {item.part_number && (
                                    <span className="px-3 py-1 bg-white/5 text-slate-400 text-[9px] font-black uppercase tracking-widest rounded-lg border border-white/5">
                                        Lecture {item.part_number}
                                    </span>
                                )}
                            </div>
                            
                            <h2 className="text-3xl font-black tracking-tight text-white leading-[1.1]">{item.clean_title || item.file_name}</h2>
                            <p className="text-[11px] text-blue-500 font-bold uppercase tracking-widest">{item.teacher || item.channel_name}</p>
                        </div>
                        
                        {item.caption && (
                            <div className="space-y-3">
                                <h4 className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Metadata</h4>
                                <div className="p-5 bg-white/5 rounded-2xl border border-white/5">
                                    <p className="text-xs text-slate-400 font-medium leading-relaxed italic">{item.caption}</p>
                                </div>
                            </div>
                        )}

                        {relatedPDFs.length > 0 && (
                            <div className="space-y-4">
                                <h4 className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Related Course Material</h4>
                                <div className="space-y-2">
                                    {relatedPDFs.map(pdf => (
                                        <div key={pdf.id} className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5 hover:border-blue-500/30 transition-colors group">
                                            <div className="flex items-center gap-3 truncate pr-4">
                                                <div className="w-8 h-8 bg-black/40 rounded-lg flex items-center justify-center border border-white/5">
                                                    <FileText className="w-4 h-4 text-slate-500 group-hover:text-blue-500" />
                                                </div>
                                                <span className="text-[11px] font-bold text-slate-300 truncate">{pdf.clean_title || pdf.file_name}</span>
                                            </div>
                                            <button onClick={() => window.open(`/api/telegram/stream/${pdf.id}`, '_blank')} className="p-2 hover:bg-blue-600/20 text-slate-600 hover:text-blue-500 transition-all">
                                                <Download className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="space-y-4 pt-4 border-t border-white/5">
                            <div className="flex justify-between items-center">
                                <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Storage</span>
                                <span className="text-xs font-mono text-slate-300">{(item.file_size / (1024*1024)).toFixed(2)} MB</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Asset Date</span>
                                <span className="text-xs text-slate-400">{new Date(item.message_date).toLocaleDateString()}</span>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 pt-12">
                        <button 
                            onClick={() => window.open(`/api/telegram/stream/${item.id}`, '_blank')}
                            className="flex items-center justify-center gap-3 py-4 bg-white text-black rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all shadow-xl active:scale-95"
                        >
                            <Download className="w-4 h-4" />
                            Offline Port
                        </button>
                        <button className="flex items-center justify-center gap-3 py-4 bg-zinc-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-zinc-800 transition-all border border-white/5 active:scale-95">
                            <Bookmark className="w-4 h-4" />
                            Enroll/Fav
                        </button>
                    </div>
                </div>
            </motion.div>
        </motion.div>
    );
}
