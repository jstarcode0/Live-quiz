import React, { useState, useRef, useEffect } from 'react';
import { useStore, Question, Category } from '../store';
import { 
  Settings, List, PlayCircle, LogOut, CheckCircle, Save, Plus, Trash2, 
  Edit2, Volume2, ArrowUp, ArrowDown, Copy as IconCopy, Database, 
  Folder, Upload, Download, FileJson, AlertCircle, RefreshCcw, Search,
  Tv, Info, XCircle, CheckCircle2, SkipForward, ArrowRight, Radio, Users, VolumeX, Archive
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import QuizView from '../QuizView';

const Login = ({ onLogin }: { onLogin: () => void }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (username === 'admin' && password === 'admin') {
      localStorage.setItem('admin_auth', 'true');
      onLogin();
    } else {
      setError('Invalid credentials');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 text-slate-100">
      <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl w-full max-w-md shadow-2xl">
        <h1 className="text-2xl font-bold mb-6 text-cyan-400">Admin Control Panel</h1>
        {error && <div className="bg-red-950/50 text-red-400 p-3 rounded-lg border border-red-900/50 mb-4">{error}</div>}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1">Username</label>
            <input 
              type="text" 
              value={username}
              onChange={e => setUsername(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-cyan-500" 
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1">Password</label>
            <input 
              type="password" 
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-cyan-500" 
            />
          </div>
          <button type="submit" className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-3 rounded-lg mt-4 transition-colors">
            Login to Dashboard
          </button>
        </form>
      </div>
    </div>
  );
};

export default function AdminPanel() {
  const [isAuthenticated, setIsAuthenticated] = useState(() => localStorage.getItem('admin_auth') === 'true');
  const [activeTab, setActiveTab] = useState<'control' | 'questions' | 'categories' | 'import' | 'settings'>('control');
  const store = useStore();

  // Global Sync Polling
  useEffect(() => {
    if (!isAuthenticated) return;
    store.refreshState();
    const interval = setInterval(store.refreshState, 2000);
    return () => clearInterval(interval);
  }, [isAuthenticated, store.refreshState]);

  if (!isAuthenticated) {
    return <Login onLogin={() => setIsAuthenticated(true)} />;
  }

  const handleLogout = () => {
    localStorage.removeItem('admin_auth');
    setIsAuthenticated(false);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans flex flex-col">
      <header className="bg-slate-900 border-b border-slate-800 h-16 px-6 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3 text-cyan-400 font-bold text-lg tracking-wider">
            <Settings size={20} />
            SSC QUIZ ADMIN
          </div>
          <div className="h-8 w-px bg-slate-800 hidden md:block" />
          <div className="hidden lg:flex items-center gap-3">
             <Database size={16} className="text-slate-500" />
             <select 
               value={store.adminSelectedCategoryId}
               onChange={(e) => store.setAdminSelectedCategoryId(e.target.value)}
               className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-cyan-500 min-w-[150px]"
             >
                {store.categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
             </select>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-slate-950 p-1 rounded-lg border border-slate-800 overflow-x-auto max-w-[50vw] sm:max-w-none no-scrollbar">
          {[
            { id: 'control', label: 'Live Control', icon: PlayCircle },
            { id: 'categories', label: 'Manage Categories', icon: Folder },
            { id: 'questions', label: 'Bank', icon: List },
            { id: 'import', label: 'Import', icon: FileJson },
            { id: 'settings', label: 'Settings', icon: Settings },
            { id: 'telegram', label: 'Telegram', icon: Archive },
          ].map(tab => (
            <button 
              key={tab.id}
              onClick={() => {
                if (tab.id === 'telegram') {
                  window.location.href = '/telegram/admin';
                  return;
                }
                setActiveTab(tab.id as any);
              }}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors whitespace-nowrap flex items-center gap-2 ${activeTab === tab.id ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-900/20' : 'text-slate-400 hover:text-white'}`}
            >
              <tab.icon size={14} />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>

        <button onClick={handleLogout} className="text-slate-400 hover:text-red-400 transition-colors flex items-center gap-2 text-sm font-medium">
          <LogOut size={16} /> <span className="hidden sm:inline">Logout</span>
        </button>
      </header>

      <main className="flex-1 p-6 max-w-7xl mx-auto w-full">
        <AnimatePresence mode="wait">
          {activeTab === 'control' && <LiveControlTab key="control" />}
          {activeTab === 'questions' && <QuestionsTab key="questions" />}
          {activeTab === 'categories' && <CategoriesTab key="categories" setActiveTab={setActiveTab} />}
          {activeTab === 'import' && <ImportTab key="import" />}
          {activeTab === 'settings' && <SettingsTab key="settings" />}
        </AnimatePresence>
      </main>
    </div>
  );
}

function LiveControlTab() {
  const store = useStore();
  
  const liveCategories = store.categories.filter(c => store.liveCategoryIds.includes(c.id));
  const currentCategoryName = store.questions[store.currentIdx]?.categoryName || 'GENERAL';

  return (
    <motion.div initial={{opacity:0, y:20}} animate={{opacity:1, y:0}} exit={{opacity:0, y:-20}} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <h2 className="text-xl font-bold mb-4 text-white flex items-center gap-2">
          <PlayCircle className="text-cyan-400" /> Live Status
        </h2>

        {/* ACTIVE LIVE CATEGORY BOX */}
        <div className="bg-cyan-950/20 border border-cyan-800/50 p-4 rounded-xl mb-6 space-y-4">
           <div className="flex items-center justify-between">
              <div>
                 <div className="text-cyan-500 text-[10px] font-black uppercase tracking-widest mb-1">LIVE SEQUENCE</div>
                 <div className="flex flex-wrap gap-1">
                    {liveCategories.map(c => (
                       <span key={c.id} className="bg-cyan-500/20 text-cyan-400 text-[10px] font-black px-2 py-0.5 rounded border border-cyan-500/30 uppercase">
                          {c.name}
                       </span>
                    ))}
                 </div>
              </div>
              <div className="text-right">
                 <div className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-1">Total LIVE Questions</div>
                 <div className="text-xl font-black text-cyan-400">{store.questions.length}</div>
              </div>
           </div>
           <div className="pt-3 border-t border-cyan-800/30">
              <div className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-1">Currently Playing From</div>
              <div className="text-lg font-black text-white italic">{currentCategoryName}</div>
           </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl">
            <div className="text-slate-500 text-xs font-bold uppercase mb-1">Current Question</div>
            <div className="text-2xl font-black text-cyan-400">{store.currentIdx + 1} / {store.questions.length}</div>
          </div>
          <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl">
            <div className="text-slate-500 text-xs font-bold uppercase mb-1">Phase</div>
            <div className="text-xl font-black text-white uppercase">{store.phase}</div>
          </div>
          <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl col-span-2">
            <div className="text-slate-500 text-xs font-bold uppercase mb-1">Timer Left</div>
            <div className={`text-4xl font-black ${store.timeLeft <= 5 ? 'text-red-400' : 'text-white'}`}>{store.timeLeft}s</div>
          </div>
        </div>

         <div className="flex flex-wrap gap-3">
          <button 
            onClick={() => store.setIsTimerPaused(!store.isTimerPaused)}
            className={`flex-1 font-bold py-3 px-4 rounded-lg transition-colors border ${store.isTimerPaused ? 'bg-amber-600/20 text-amber-500 border-amber-600/50' : 'bg-slate-800 text-white border-slate-700 hover:bg-slate-700'}`}
          >
            {store.isTimerPaused ? 'Resume Timer' : 'Pause Timer'}
          </button>
          <button 
            onClick={() => store.setPhase('revealing')}
            className="flex-1 font-bold py-3 px-4 rounded-lg bg-indigo-600/20 text-indigo-400 border border-indigo-600/50 hover:bg-indigo-600/30 transition-colors"
          >
            Force Reveal
          </button>
          <button 
            onClick={() => {
              store.setPhase('done');
              store.setCurrentIdx((store.currentIdx + 1) % store.questions.length);
            }}
            className="flex-1 font-bold py-3 px-4 rounded-lg bg-cyan-600/20 text-cyan-400 border border-cyan-600/50 hover:bg-cyan-600/30 transition-colors"
          >
            Skip to Next
          </button>
          <button 
             onClick={() => {
               store.setPhase('reading');
               store.setCurrentIdx(0);
               store.setIsTimerPaused(false);
             }}
             className="flex-1 font-bold py-3 px-4 rounded-lg border border-red-900/50 text-red-500 hover:bg-red-950 hover:text-red-400 transition-colors"
          >
             Restart Quiz
          </button>
        </div>
        
        <div className="mt-8 border-t border-slate-800 pt-6">
           <h3 className="text-lg font-bold mb-4 text-slate-300">Jump to Question</h3>
           <div className="flex flex-wrap gap-2">
              {store.questions.map((_, idx) => (
                 <button 
                   key={idx}
                   onClick={() => store.setCurrentIdx(idx)}
                   className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-sm transition-all ${idx === store.currentIdx ? 'bg-cyan-500 text-white font-black scale-110' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
                 >
                   {idx + 1}
                 </button>
              ))}
           </div>
        </div>
      </div>
      
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-8">
        <div>
          <h2 className="text-xl font-bold mb-4 text-white flex items-center gap-2">
             <Volume2 className="text-cyan-400" /> Narration Language Mode
          </h2>
          <div className="grid grid-cols-2 gap-3 mb-4">
             <button 
               onClick={() => store.setNarrationLanguage('hi')}
               className={`py-6 rounded-2xl border-2 transition-all flex flex-col items-center justify-center gap-3 ${store.narrationLanguage === 'hi' ? 'bg-cyan-600 border-cyan-400 text-white shadow-[0_0_20px_rgba(8,145,178,0.3)]' : 'bg-slate-950 border-slate-800 text-slate-500 hover:border-slate-700'}`}
             >
                <span className="text-2xl font-black">HINDI</span>
                <span className={`text-[10px] font-bold uppercase tracking-widest ${store.narrationLanguage === 'hi' ? 'text-cyan-200' : 'text-slate-600'}`}>Primary Hindi Mode</span>
             </button>
             <button 
               onClick={() => store.setNarrationLanguage('en')}
               className={`py-6 rounded-2xl border-2 transition-all flex flex-col items-center justify-center gap-3 ${store.narrationLanguage === 'en' ? 'bg-cyan-600 border-cyan-400 text-white shadow-[0_0_20px_rgba(8,145,178,0.3)]' : 'bg-slate-950 border-slate-800 text-slate-500 hover:border-slate-700'}`}
             >
                <span className="text-2xl font-black">ENGLISH</span>
                <span className={`text-[10px] font-bold uppercase tracking-widest ${store.narrationLanguage === 'en' ? 'text-cyan-200' : 'text-slate-600'}`}>Primary English Mode</span>
             </button>
          </div>

          <h2 className="text-xl font-bold mb-4 text-white flex items-center gap-2 mt-8">
             <Settings className="text-cyan-400" /> TTS Voice Gender
          </h2>
          <div className="grid grid-cols-2 gap-3">
             <button 
               onClick={() => store.setTtsVoiceGender('male')}
               className={`py-6 rounded-2xl border-2 transition-all flex flex-col items-center justify-center gap-3 ${store.ttsVoiceGender === 'male' ? 'bg-cyan-600 border-cyan-400 text-white shadow-[0_0_20px_rgba(8,145,178,0.3)]' : 'bg-slate-950 border-slate-800 text-slate-500 hover:border-slate-700'}`}
             >
                <span className="text-2xl font-black">MALE</span>
                <span className={`text-[10px] font-bold uppercase tracking-widest ${store.ttsVoiceGender === 'male' ? 'text-cyan-200' : 'text-slate-600'}`}>Energetic Host</span>
             </button>
             <button 
               onClick={() => store.setTtsVoiceGender('female')}
               className={`py-6 rounded-2xl border-2 transition-all flex flex-col items-center justify-center gap-3 ${store.ttsVoiceGender === 'female' ? 'bg-cyan-600 border-cyan-400 text-white shadow-[0_0_20px_rgba(8,145,178,0.3)]' : 'bg-slate-950 border-slate-800 text-slate-500 hover:border-slate-700'}`}
             >
                <span className="text-2xl font-black">FEMALE</span>
                <span className={`text-[10px] font-bold uppercase tracking-widest ${store.ttsVoiceGender === 'female' ? 'text-cyan-200' : 'text-slate-600'}`}>Clear & Natural</span>
             </button>
          </div>
        </div>

        <div>
          <h2 className="text-xl font-bold mb-4 text-white flex items-center gap-2">
             <RefreshCcw size={20} className="text-cyan-400" /> Live Features
          </h2>
          
          <div className="flex flex-col gap-6">
             <label className="flex items-center justify-between bg-slate-950 border border-slate-800 p-4 rounded-xl cursor-pointer">
                <div>
                   <div className="font-bold text-white">Auto TTS Narration</div>
                   <div className="text-sm text-slate-400">Automatically read questions and options</div>
                </div>
                <div className={`w-12 h-6 rounded-full transition-colors relative ${store.speechEnabled ? 'bg-cyan-500' : 'bg-slate-700'}`} onClick={() => store.setSpeechEnabled(!store.speechEnabled)}>
                   <div className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${store.speechEnabled ? 'translate-x-6' : 'translate-x-0'}`} />
                </div>
             </label>
             
             <label className="flex items-center justify-between bg-slate-950 border border-slate-800 p-4 rounded-xl cursor-pointer">
                <div>
                   <div className="font-bold text-white">Human Expressions</div>
                   <div className="text-sm text-slate-400">Natural filler words and timer warnings</div>
                </div>
                <div className={`w-12 h-6 rounded-full transition-colors relative ${store.humanExpressionsEnabled ? 'bg-cyan-500' : 'bg-slate-700'}`} onClick={() => store.setHumanExpressionsEnabled(!store.humanExpressionsEnabled)}>
                   <div className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${store.humanExpressionsEnabled ? 'translate-x-6' : 'translate-x-0'}`} />
                </div>
             </label>
             
             <div>
                <label className="block text-sm font-bold text-slate-300 mb-2">Narration Language</label>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => store.setNarrationLanguage('hi')} className={`p-2 rounded-lg text-sm font-bold transition-all ${store.narrationLanguage === 'hi' ? 'bg-cyan-600 text-white' : 'bg-slate-900 text-slate-400 hover:bg-slate-800'}`}>HINDI (hi-IN)</button>
                  <button onClick={() => store.setNarrationLanguage('en')} className={`p-2 rounded-lg text-sm font-bold transition-all ${store.narrationLanguage === 'en' ? 'bg-cyan-600 text-white' : 'bg-slate-900 text-slate-400 hover:bg-slate-800'}`}>ENGLISH (en-US)</button>
                </div>
             </div>

             <div>
                <label className="block text-sm font-bold text-slate-300 mb-2">Voice Gender</label>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => store.setTtsVoiceGender('female')} className={`p-2 rounded-lg text-sm font-bold transition-all ${store.ttsVoiceGender === 'female' ? 'bg-cyan-600 text-white' : 'bg-slate-900 text-slate-400 hover:bg-slate-800'}`}>FEMALE (Swara/Jenny)</button>
                  <button onClick={() => store.setTtsVoiceGender('male')} className={`p-2 rounded-lg text-sm font-bold transition-all ${store.ttsVoiceGender === 'male' ? 'bg-cyan-600 text-white' : 'bg-slate-900 text-slate-400 hover:bg-slate-800'}`}>MALE (Madhur/Guy)</button>
                </div>
             </div>
             
             <div>
                <label className="block text-sm font-bold text-slate-300 mb-2">Voice Mode</label>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => store.setVoiceMode('browser')} className={`p-2 rounded-lg text-[10px] font-bold transition-all ${store.voiceMode === 'browser' ? 'bg-cyan-600 text-white' : 'bg-slate-900 text-slate-400 hover:bg-slate-800'}`}>BROWSER TTS</button>
                  <button onClick={() => store.setVoiceMode('edge-tts')} className={`p-2 rounded-lg text-[10px] font-bold transition-all ${store.voiceMode === 'edge-tts' ? 'bg-cyan-600 text-white' : 'bg-slate-900 text-slate-400 hover:bg-slate-800'}`}>EDGE-TTS (MP3)</button>
                </div>
             </div>

             <div>
                <div className="flex justify-between text-sm mb-2 font-bold text-slate-300">
                   <span>Speech Rate</span>
                   <span className="text-cyan-400">{store.ttsRate}x</span>
                </div>
                <input type="range" min="0.5" max="1.5" step="0.1" value={store.ttsRate} onChange={(e) => store.setTtsRate(parseFloat(e.target.value))} className="w-full h-2 rounded-lg appearance-none cursor-pointer border-slate-800 bg-slate-800 accent-cyan-500" />
             </div>
             
             <div>
                <div className="flex justify-between text-sm mb-2 font-bold text-slate-300">
                   <span>Volume</span>
                   <span className="text-cyan-400">{Math.round(store.ttsVolume * 100)}%</span>
                </div>
                <input type="range" min="0" max="1" step="0.1" value={store.ttsVolume} onChange={(e) => store.setTtsVolume(parseFloat(e.target.value))} className="w-full h-2 rounded-lg appearance-none cursor-pointer border-slate-800 bg-slate-800 accent-cyan-500" />
             </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function CategoriesTab({ setActiveTab }: { setActiveTab: (tab: any) => void, key?: any }) {
  const store = useStore();
  const [newCatName, setNewCatName] = useState('');

  const handleAdd = async () => {
    if (!newCatName.trim()) return;
    const id = newCatName.toLowerCase().replace(/[^a-z0-9]/g, '-');
    await fetch('/api/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, name: newCatName.toUpperCase() })
    });
    await store.refreshState();
    setNewCatName('');
  };

  const handleExport = async (id: string, name: string) => {
    try {
      const resp = await fetch(`/api/questions/${id}`);
      const questions = await resp.json();
      const blob = new Blob([JSON.stringify(questions, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${name.toLowerCase().replace(/\s+/g, '-')}-questions.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert('Export failed');
    }
  };

  const handleDelete = async (id: string, name: string) => {
    const protectedIds = ['default', 'ssc-cgl', 'ssc-gd', 'general-knowledge'];
    if (protectedIds.includes(id.toLowerCase())) {
        return; // Already protected in store but double safety
    }
    
    if (confirm(`CRITICAL ACTION: Are you sure you want to PERMANENTLY DELETE the category "${name.toUpperCase()}" and ALL of its questions? This cannot be undone.`)) {
       await store.deleteCategory(id);
       if (store.liveCategoryIds.includes(id)) {
          await store.toggleLiveCategory(id);
       }
    }
  };

  const isProtected = (id: string) => false;

  return (
    <motion.div initial={{opacity:0, y:20}} animate={{opacity:1, y:0}} exit={{opacity:0, y:-20}} className="max-w-6xl mx-auto pb-20">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
           <div>
              <h2 className="text-3xl font-black text-white flex items-center gap-3">
                <Folder className="text-cyan-400" size={32} /> Category Management
              </h2>
              <p className="text-slate-500 font-medium mt-1">Create, manage and activate categories for your live stream.</p>
           </div>
           <div className="flex gap-2">
              <input 
                type="text" 
                placeholder="Category Name..."
                value={newCatName}
                onChange={e => setNewCatName(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-2xl px-5 py-3 text-white focus:outline-none focus:border-cyan-500 min-w-[250px]"
              />
              <button 
                onClick={handleAdd}
                className="bg-cyan-600 hover:bg-cyan-500 text-white font-black px-6 rounded-2xl transition-all flex items-center gap-2 shadow-lg shadow-cyan-900/40"
              >
                <Plus size={20} /> CREATE
              </button>
           </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {store.categories.map(cat => {
            const isLive = store.liveCategoryIds.includes(cat.id);
            const isSelected = store.adminSelectedCategoryId === cat.id;

            return (
              <div 
                key={cat.id} 
                className={`flex flex-col rounded-3xl border-2 transition-all overflow-hidden ${isLive ? 'bg-cyan-950/20 border-cyan-500/50 shadow-[0_0_30px_rgba(34,211,238,0.1)]' : 'bg-slate-950 border-slate-900 hover:border-slate-800'}`}
              >
                <div className="p-6 flex-1">
                   <div className="flex justify-between items-start mb-4">
                      <div className={`p-3 rounded-2xl ${isLive ? 'bg-cyan-500 text-white' : 'bg-slate-900 text-slate-500'}`}>
                         <FileJson size={24} />
                      </div>
                      {isLive && (
                        <span className="bg-red-600 text-[10px] px-3 py-1 rounded-full text-white font-black animate-pulse shadow-lg shadow-red-900/50">LIVE NOW</span>
                      )}
                   </div>
                   
                   <h3 className="text-xl font-black text-white mb-1 uppercase tracking-tight line-clamp-1">{cat.name}</h3>
                   <div className="flex flex-col gap-1 text-xs text-slate-500 font-bold">
                      <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1"><Database size={12} /> {cat.questionCount || 0} Questions</span>
                        <span>•</span>
                        <span className="uppercase tracking-widest text-[10px] opacity-100 text-cyan-500">{cat.id}</span>
                      </div>
                      {cat.lastUpdated && (
                        <div className="opacity-40 text-[9px] uppercase tracking-tighter">Updated: {new Date(cat.lastUpdated).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</div>
                      )}
                   </div>
                </div>

                <div className="px-6 py-4 bg-slate-900/50 border-t border-slate-900 flex items-center justify-between gap-3">
                   <div className="flex items-center gap-1">
                      <button 
                        onClick={() => handleExport(cat.id, cat.name)}
                        className="p-2 text-slate-500 hover:text-cyan-400 transition-colors"
                        title="Export JSON"
                      >
                        <Download size={18} />
                      </button>
                      <button 
                         onClick={() => handleDelete(cat.id, cat.name)}
                         className={`p-2 transition-colors text-slate-500 hover:text-red-500`}
                         title={"Delete Category"}
                      >
                         <Trash2 size={18} />
                      </button>
                   </div>
                   
                   <div className="flex gap-2">
                       <button 
                         onClick={() => {
                           if (cat.questionCount === 0 && !isLive) {
                              if (!confirm(`Warning: Category "${cat.name}" has 0 questions. Going live will show an empty screen. Continue?`)) return;
                           }
                           store.toggleLiveCategory(cat.id);
                         }}
                         className={`text-[10px] font-black px-4 py-2 rounded-xl border transition-all ${isLive ? 'bg-red-600 border-red-500 text-white' : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-cyan-500 hover:text-cyan-400'}`}
                       >
                         {isLive ? 'STOP LIVE' : 'GO LIVE'}
                       </button>
                       <button 
                         onClick={() => {
                           store.setAdminSelectedCategoryId(cat.id);
                           setActiveTab('questions');
                         }}
                         className={`text-[10px] font-black px-4 py-2 rounded-xl border transition-all ${isSelected ? 'bg-cyan-600 border-cyan-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'}`}
                       >
                         ADD QUESTIONS
                       </button>
                   </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}

function ImportTab() {
  const store = useStore();
  const [jsonInput, setJsonInput] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeCategoryName = store.categories.find(c => c.id === store.adminSelectedCategoryId)?.name || 'Default';

  const SAMPLE_JSON = [
    {
      "hi": "भारत का संविधान कब लागू हुआ?",
      "en": "When was the Constitution of India implemented?",
      "options": {
        "A": { "hi": "1947", "en": "1947" },
        "B": { "hi": "1948", "en": "1948" },
        "C": { "hi": "1950", "en": "1950" },
        "D": { "hi": "1952", "en": "1952" }
      },
      "correctOption": "C",
      "explanation": {
        "hi": "भारतीय संविधान 26 जनवरी 1950 को लागू हुआ था।",
        "en": "The Indian Constitution was implemented on 26 January 1950."
      }
    }
  ];

  const handleCopySample = () => {
    const jsonStr = JSON.stringify(SAMPLE_JSON, null, 2);
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(jsonStr).catch(() => {});
      } else {
        const textArea = document.createElement("textarea");
        textArea.value = jsonStr;
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        textArea.remove();
      }
    } catch (e) {
      // ignore
    }
    setJsonInput(jsonStr);
    setSuccess('Sample JSON loaded into the Editor below! (Also copied to clipboard if allowed)');
    setTimeout(() => setSuccess(''), 4000);
  };

  const validateAndImport = async (data: any) => {
    try {
      setIsImporting(true);
      setError('');
      setSuccess('');

      const questionsToImport: Question[] = [];
      const rawArray = Array.isArray(data) ? data : [data];

      rawArray.forEach((item, idx) => {
        const qNum = idx + 1;
        
        // Validation Checks
        if (!item.hi && !item.en) throw new Error(`Question ${qNum}: Missing text (hi or en).`);
        if (!item.correctOption) throw new Error(`Question ${qNum}: missing 'correctOption'.`);
        if (!item.options) throw new Error(`Question ${qNum}: missing 'options' object.`);

        // Determine option format
        let finalOptions = [];
        if (Array.isArray(item.options)) {
          finalOptions = item.options.map((opt: any) => ({
            id: opt.id || '?',
            hi: opt.hi || '',
            en: opt.en || ''
          }));
        } else {
          // Object format: { "A": { "hi": "...", "en": "..." } } or { "A": "string" }
          finalOptions = ['A', 'B', 'C', 'D'].map(id => {
            const opt = item.options[id];
            if (!opt) throw new Error(`Question ${qNum}: Option ${id} is missing.`);
            
            if (typeof opt === 'object') {
              return { id, hi: opt.hi || '', en: opt.en || '' };
            } else {
              return { id, hi: String(opt), en: String(opt) };
            }
          });
        }

        const q: Question = {
          id: Date.now() + idx,
          hi: item.hi || '',
          en: item.en || '',
          options: finalOptions,
          correctOption: item.correctOption,
          explanation: {
            hi: (item.explanation && item.explanation.hi) || item.explanationHindi || '',
            en: (item.explanation && item.explanation.en) || item.explanationEnglish || ''
          },
          timerSettings: item.timer || item.timerSettings
        };
        
        questionsToImport.push(q);
      });

      const newQuestions = [...store.adminQuestions, ...questionsToImport];
      await store.saveAdminQuestions(store.adminSelectedCategoryId, newQuestions);
      setSuccess(`Success! Imported ${questionsToImport.length} questions.`);
      setJsonInput('');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsImporting(false);
    }
  };

  const handlePasteImport = () => {
    try {
      if (!jsonInput.trim()) return;
      const parsed = JSON.parse(jsonInput);
      validateAndImport(parsed);
    } catch (e) {
      setError('Invalid JSON: Please check for missing commas or brackets.');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        validateAndImport(json);
      } catch (e) {
        setError('Failed to parse JSON file.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <motion.div initial={{opacity:0, y:20}} animate={{opacity:1, y:0}} exit={{opacity:0, y:-20}} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
           <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-white flex items-center gap-3">
                <FileJson className="text-cyan-400" /> JSON Question Importer
              </h3>
              <button 
                onClick={handleCopySample}
                className="text-[10px] bg-slate-800 hover:bg-slate-700 text-cyan-400 font-bold px-3 py-1.5 rounded-lg border border-cyan-500/20 transition-all flex items-center gap-2"
              >
                <IconCopy size={12} /> COPY SAMPLE JSON
              </button>
           </div>
           
           <p className="text-sm text-slate-400 mb-6 font-medium">
             Target Category: <span className="text-cyan-400 font-bold">{activeCategoryName}</span>
           </p>

           <textarea 
             className="w-full h-96 bg-slate-950 border border-slate-800 rounded-xl p-4 text-cyan-50 font-mono text-xs outline-none focus:border-cyan-500/50 transition-colors styled-scrollbar"
             placeholder='Paste your JSON array here...'
             value={jsonInput}
             onChange={e => setJsonInput(e.target.value)}
           />

           <div className="flex gap-4 mt-6">
              <button 
                onClick={handlePasteImport}
                disabled={isImporting || !jsonInput.trim()}
                className="flex-1 bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-800 text-white font-bold py-4 rounded-xl transition-all flex items-center justify-center gap-2 uppercase tracking-widest"
              >
                {isImporting ? <RefreshCcw className="animate-spin" /> : <Database size={20} />} 
                Import Questions
              </button>
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="bg-slate-800 hover:bg-slate-700 text-white font-bold px-8 rounded-xl transition-all flex items-center gap-2"
              >
                <Upload size={20} /> UPLOAD FILE
              </button>
              <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".json" className="hidden" />
           </div>

           {error && (
             <div className="mt-6 p-4 bg-red-950/30 border border-red-900/50 rounded-xl flex items-center gap-3 text-red-400 text-sm font-bold">
                <AlertCircle size={20} /> ERROR: {error}
             </div>
           )}
           {success && (
             <div className="mt-6 p-4 bg-green-950/30 border border-green-900/50 rounded-xl flex items-center gap-3 text-green-400 text-sm font-bold">
                <CheckCircle size={20} /> {success}
             </div>
           )}
        </div>
      </div>

      <div className="space-y-6">
         <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
            <h3 className="text-lg font-bold mb-4 text-white flex items-center gap-2">
               <Info size={20} className="text-cyan-400" /> Format Guide
            </h3>
            <div className="space-y-4 text-sm text-slate-400 leading-relaxed">
               <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                  <div className="text-cyan-400 font-bold mb-2 text-xs uppercase tracking-widest">Required Schema</div>
                  <ul className="space-y-2 text-[11px]">
                    <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-cyan-500" /> <code className="text-white">hi / en</code> (string): Question text</li>
                    <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-cyan-500" /> <code className="text-white">options</code> (object): A, B, C, D</li>
                    <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-cyan-500" /> <code className="text-white">correctOption</code> (string): A-D</li>
                  </ul>
               </div>

               <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                  <div className="text-indigo-400 font-bold mb-2 text-xs uppercase tracking-widest">Nested Options Example</div>
                  <pre className="text-[10px] text-indigo-300/80 overflow-x-auto font-mono">
{`"options": {
  "A": { "hi": "...", "en": "..." },
  "B": { "hi": "...", "en": "..." },
  ...
}`}
                  </pre>
               </div>

               <div className="p-4 rounded-xl bg-amber-950/20 border border-amber-900/30 text-amber-500 text-[11px] font-medium italic">
                 Pro Tip: Ensure your JSON starts with [ and ends with ] for bulk imports.
               </div>
            </div>
         </div>
      </div>
    </motion.div>
  );
}

function SettingsTab() {
  const store = useStore();
  const [showThemeModal, setShowThemeModal] = useState(false);
  
  return (
    <motion.div initial={{opacity:0, y:20}} animate={{opacity:1, y:0}} exit={{opacity:0, y:-20}} className="grid grid-cols-1 lg:grid-cols-12 gap-8 pb-20">
      
      {/* Left Column: Branding Controls */}
      <div className="lg:col-span-4 space-y-6">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
          <h2 className="text-xl font-bold mb-6 text-white flex items-center gap-3">
            <Settings size={20} className="text-cyan-400" /> Branding
          </h2>
          
          <div className="space-y-5">
            <div>
              <label className="block text-[10px] font-black text-slate-500 mb-1.5 uppercase tracking-widest">Logo Title</label>
              <input 
                type="text" 
                value={store.streamTitle}
                onChange={(e) => store.updateBranding({ streamTitle: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white focus:border-cyan-500 outline-none transition-all text-sm" 
              />
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-500 mb-1.5 uppercase tracking-widest">Logo Subtitle</label>
              <input 
                type="text" 
                value={store.sscTitle}
                onChange={(e) => store.updateBranding({ sscTitle: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white focus:border-cyan-500 outline-none transition-all text-sm" 
              />
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-500 mb-1.5 uppercase tracking-widest">Main Header Text</label>
              <input 
                type="text" 
                value={store.headerText}
                onChange={(e) => store.updateBranding({ headerText: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white focus:border-cyan-500 outline-none transition-all text-sm" 
              />
            </div>
            <div>
               <label className="block text-[10px] font-black text-slate-500 mb-1.5 uppercase tracking-widest">Footer Text</label>
               <input 
                 type="text" 
                 value={store.footerText}
                 onChange={(e) => store.updateBranding({ footerText: e.target.value })}
                 className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white focus:border-cyan-500 outline-none transition-all text-sm" 
               />
            </div>
            <div>
               <label className="block text-[10px] font-black text-slate-500 mb-1.5 uppercase tracking-widest">Banner Text</label>
               <input 
                 type="text" 
                 value={store.bannerText}
                 onChange={(e) => store.updateBranding({ bannerText: e.target.value })}
                 className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white focus:border-cyan-500 outline-none transition-all text-sm" 
               />
            </div>
            <div>
               <label className="block text-[10px] font-black text-slate-500 mb-1.5 uppercase tracking-widest">Telegram Text</label>
               <input 
                 type="text" 
                 value={store.telegramText}
                 onChange={(e) => store.updateBranding({ telegramText: e.target.value })}
                 className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white focus:border-cyan-500 outline-none transition-all text-sm" 
               />
            </div>
            <div>
               <label className="block text-[10px] font-black text-slate-500 mb-1.5 uppercase tracking-widest">Motivational Text</label>
               <input 
                 type="text" 
                 value={store.motivationalText}
                 onChange={(e) => store.updateBranding({ motivationalText: e.target.value })}
                 className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white focus:border-cyan-500 outline-none transition-all text-sm" 
               />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-black text-slate-500 mb-1.5 uppercase tracking-widest">Default Timer (s)</label>
                <input 
                  type="number" 
                  value={store.globalTimerDuration}
                  onChange={(e) => store.setGlobalTimerDuration(parseInt(e.target.value) || 15)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white focus:border-cyan-500 outline-none transition-all text-sm" 
                />
              </div>
              <div>
                 <label className="block text-[10px] font-black text-slate-500 mb-1.5 uppercase tracking-widest">Live Badge</label>
                 <input 
                   type="text" 
                   value={store.liveBadgeText}
                   onChange={(e) => store.updateBranding({ liveBadgeText: e.target.value })}
                   className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white focus:border-cyan-500 outline-none transition-all text-sm" 
                 />
              </div>
            </div>

            <div className="pt-4 border-t border-slate-800">
               <label className="block text-[10px] font-black text-slate-500 mb-3 uppercase tracking-widest">Streaming Themes</label>
               <div className="grid grid-cols-2 gap-3">
                  <button 
                    onClick={() => {
                        store.pushState({ themeMode: 'PREMIUM_BROADCAST' });
                    }}
                    className={`py-3 rounded-xl border-2 font-bold text-[10px] transition-all ${['dark', 'cyan-default', 'PREMIUM_BROADCAST'].includes(store.themeMode) ? 'bg-cyan-600 text-white border-cyan-400 shadow-lg shadow-cyan-900/40' : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'}`}
                  >
                    PREMIUM BROADCAST
                  </button>
                  
                  <button 
                    onClick={() => {
                        store.pushState({ themeMode: 'SSC_SMARTBOARD' });
                    }}
                    className={`py-3 rounded-xl border-2 font-bold text-[10px] transition-all ${store.themeMode === 'SSC_SMARTBOARD' ? 'bg-yellow-600 text-white border-yellow-400 shadow-lg shadow-yellow-900/40' : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'}`}
                  >
                    SSC SMARTBOARD
                  </button>

                  <button 
                    onClick={() => {
                        store.pushState({ themeMode: 'EXAM_GK_SLIDE' });
                    }}
                    className={`py-3 rounded-xl border-2 font-bold text-[10px] transition-all ${store.themeMode === 'EXAM_GK_SLIDE' ? 'bg-blue-600 text-white border-blue-400 shadow-lg shadow-blue-900/40' : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'}`}
                  >
                    EXAM GK SLIDE
                  </button>

                  <button 
                    onClick={() => {
                        store.pushState({ themeMode: 'KBC_STYLE' });
                    }}
                    className={`py-3 rounded-xl border-2 font-bold text-[10px] transition-all ${store.themeMode === 'KBC_STYLE' ? 'bg-indigo-600 text-white border-indigo-400 shadow-lg shadow-indigo-900/40' : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'}`}
                  >
                    KBC STYLE QUIZ
                  </button>
               </div>
            </div>

            <div className="pt-4 border-t border-slate-800">
               <button 
                  onClick={() => setShowThemeModal(true)}
                  className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-black py-4 rounded-xl transition-all shadow-lg shadow-cyan-900/40 flex items-center justify-center gap-3 uppercase tracking-widest text-xs"
               >
                  <RefreshCcw size={16} /> Open Advanced Theme Customizer
               </button>
            </div>
          </div>
        </div>
      </div>

      {/* Middle Column: Real-Time Preview Area */}
      <div className="lg:col-span-8 flex flex-col gap-6">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex-1 flex flex-col min-h-[600px]">
           <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white flex items-center gap-3">
                 <PlayCircle size={20} className="text-cyan-400" /> Real-Time Stream Preview
              </h2>
              <div className="flex items-center gap-2 px-3 py-1 bg-slate-800 rounded-full border border-slate-700">
                 <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                 <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Live Sync Enabled</span>
              </div>
           </div>

           {/* The Iframe Preview or Mockup */}
           <div className="flex-1 bg-black rounded-xl overflow-hidden shadow-2xl relative border border-white/5 aspect-video mx-auto w-full max-w-full">
              <QuizView isPreview={true} />
              
              {/* Overlay Label */}
              <div className="absolute top-4 left-4 z-50 bg-black/60 backdrop-blur-md px-4 py-1.5 rounded-lg border border-white/10 text-[10px] font-black text-white/50 tracking-widest uppercase">
                Admin Preview Screen
              </div>
           </div>

           <div className="mt-6 p-4 bg-slate-950 border border-slate-800 rounded-xl flex items-center gap-4">
              <div className="w-10 h-10 bg-cyan-500/10 rounded-lg flex items-center justify-center text-cyan-400">
                 <AlertCircle size={20} />
              </div>
              <p className="text-xs text-slate-400 font-medium">This preview accurately represents how the stream looks for viewers. Any changes made to the theme or branding will appear here instantly.</p>
           </div>
        </div>
      </div>

      {/* Modal: Theme Editor */}
      <AnimatePresence>
        {showThemeModal && (
          <ThemeEditorModal onClose={() => setShowThemeModal(false)} />
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function ThemeEditorModal({ onClose }: { onClose: () => void }) {
  const store = useStore();
  const [localTheme, setLocalTheme] = useState(store.theme);
  const debounceRef = useRef<any>(null);
  
  const theme = localTheme;

  useEffect(() => {
    // Only sync from store if we are NOT currently making changes to prevent jumping
    if (!debounceRef.current) {
        setLocalTheme(store.theme);
    }
  }, [store.theme]);

  const updateTheme = (updates: Partial<typeof localTheme>) => {
    const newTheme = { ...localTheme, ...updates };
    setLocalTheme(newTheme);
    
    // Instantly update the frontend without API lag
    store.updateTheme(newTheme); 
    
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      // Allow syncing again
      debounceRef.current = null;
    }, 500);
  };

  const ColorInput = ({ label, value, field }: { label: string, value: string, field: keyof typeof localTheme }) => (
    <div className="flex flex-col gap-1.5 p-3 bg-slate-950 rounded-xl border border-slate-800">
       <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{label}</label>
       <div className="flex items-center gap-3">
          <input 
            type="color" 
            value={value} 
            onChange={(e) => updateTheme({ [field]: e.target.value })}
            className="w-10 h-10 rounded-lg cursor-pointer bg-transparent"
          />
          <input 
             type="text" 
             value={value} 
             onChange={(e) => updateTheme({ [field]: e.target.value })}
             className="bg-transparent text-sm font-mono text-white focus:outline-none w-20"
          />
       </div>
    </div>
  );

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
    >
       <motion.div 
         initial={{ scale: 0.95, y: 20 }}
         animate={{ scale: 1, y: 0 }}
         exit={{ scale: 0.95, y: 20 }}
         className="bg-slate-900 border border-slate-700 w-full max-w-5xl h-[90vh] rounded-3xl flex flex-col shadow-2xl overflow-hidden"
       >
          <div className="p-6 border-b border-slate-800 flex items-center justify-between">
             <div>
                <h2 className="text-2xl font-black text-white flex items-center gap-3">
                   <RefreshCcw size={24} className="text-cyan-400" /> Advanced Theme Customizer
                </h2>
                <p className="text-slate-500 text-xs mt-1">Changes are pushed globally to all connected viewers in real-time.</p>
             </div>
             <button onClick={onClose} className="p-3 hover:bg-slate-800 rounded-2xl transition-colors text-slate-400 hover:text-white">
                <Trash2 size={24} className="rotate-45" /> {/* Close icon workaround if needed */}
                <span className="sr-only">Close</span>
             </button>
          </div>

          <div className="flex-1 flex overflow-hidden">
             {/* Options Panel */}
             <div className="w-[400px] border-r border-slate-800 p-6 overflow-y-auto styled-scrollbar space-y-8 bg-slate-950/20">
                
                <section>
                   <h3 className="text-xs font-black text-white/40 uppercase tracking-[0.2em] mb-4">Core Branding</h3>
                   <div className="grid grid-cols-2 gap-3">
                      <ColorInput label="Accent Color" value={theme.accentColor} field="accentColor" />
                      <ColorInput label="Glow Color" value={theme.glowColor} field="glowColor" />
                      <ColorInput label="Correct Color" value={theme.correctColor} field="correctColor" />
                      <ColorInput label="Wrong Color" value={theme.wrongColor} field="wrongColor" />
                   </div>
                   <div className="mt-4">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 block">Neon Intensity ({theme.neonIntensity})</label>
                      <input type="range" min="0" max="1" step="0.1" value={theme.neonIntensity} onChange={e => updateTheme({ neonIntensity: parseFloat(e.target.value) })} className="w-full accent-cyan-500" />
                   </div>
                </section>

                <section>
                   <h3 className="text-xs font-black text-white/40 uppercase tracking-[0.2em] mb-4">Global Surfaces</h3>
                   <div className="grid grid-cols-2 gap-3">
                      <ColorInput label="Main BG" value={theme.bgPrimary} field="bgPrimary" />
                      <ColorInput label="Sub BG" value={theme.bgSecondary} field="bgSecondary" />
                      <ColorInput label="Text Primary" value={theme.textPrimary} field="textPrimary" />
                      <ColorInput label="Text Secondary" value={theme.textSecondary} field="textSecondary" />
                   </div>
                </section>

                <section>
                   <h3 className="text-xs font-black text-white/40 uppercase tracking-[0.2em] mb-4">Header & Footer</h3>
                   <div className="grid grid-cols-2 gap-3">
                      <ColorInput label="Header BG" value={theme.headerBg} field="headerBg" />
                      <ColorInput label="Header Text" value={theme.headerText} field="headerText" />
                      <ColorInput label="Footer BG" value={theme.footerBg} field="footerBg" />
                      <ColorInput label="Footer Text" value={theme.footerText} field="footerText" />
                   </div>
                </section>

                <section>
                   <h3 className="text-xs font-black text-white/40 uppercase tracking-[0.2em] mb-4">Explanation & UI</h3>
                   <div className="grid grid-cols-2 gap-3">
                      <ColorInput label="Expl. BG" value={theme.explanationBg} field="explanationBg" />
                      <ColorInput label="Expl. Text" value={theme.explanationText} field="explanationText" />
                      <ColorInput label="Progess Bar" value={theme.progressBarColor} field="progressBarColor" />
                      <ColorInput label="Live Badge" value={theme.liveBadgeColor} field="liveBadgeColor" />
                   </div>
                </section>

                <div className="pt-6 border-t border-slate-800 space-y-3">
                   <button 
                     onClick={() => updateTheme({
                        accentColor: '#22d3ee',
                        glowColor: '#1e3a8a',
                        correctColor: '#22c55e',
                        wrongColor: '#ef4444',
                        bgPrimary: '#050505',
                        bgSecondary: '#020202',
                        textPrimary: '#ffffff',
                        textSecondary: '#94a3b8',
                        headerBg: '#ffffff',
                        headerText: '#0f172a',
                        footerBg: '#0a0a0a',
                        footerText: '#0891b2',
                        explanationBg: '#ffffff',
                        explanationText: '#0f172a',
                        progressBarColor: '#22d3ee',
                        liveBadgeColor: '#ef4444',
                        neonIntensity: 0.5
                     })}
                     className="w-full py-3 rounded-xl border border-slate-700 text-slate-400 font-bold hover:text-white transition-all text-sm mb-2"
                   >
                     Reset to Default Theme
                   </button>
                   <div className="flex gap-2">
                      <button className="flex-1 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs uppercase tracking-widest">Export Theme</button>
                      <button className="flex-1 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs uppercase tracking-widest">Import JSON</button>
                   </div>
                </div>
             </div>

             {/* Preview Panel */}
             <div className="flex-1 bg-slate-950 p-10 flex flex-col items-center justify-center relative overflow-hidden">
                <div className="absolute top-4 left-6 z-20 pointer-events-none">
                   <div className="bg-cyan-500/10 text-cyan-400 px-3 py-1 rounded-md text-[10px] font-black uppercase tracking-[0.2em] border border-cyan-500/20">
                      LIVE PREVIEW SCREEN
                   </div>
                </div>
                <div className="w-full h-full max-w-full max-h-full flex items-center justify-center p-4">
                  <div className="w-full aspect-video rounded-2xl overflow-hidden shadow-[0_0_100px_rgba(0,0,0,0.5)] border border-white/5 relative">
                     <QuizView isPreview={true} />
                  </div>
                </div>
             </div>
          </div>
       </motion.div>
    </motion.div>
  );
}

function QuestionEditor({ q, onSave, onCancel }: { q: Question; onSave: (q: Question) => void; onCancel: () => void }) {
  const [formData, setFormData] = useState<Question>(q);
  
  const updateOption = (id: string, field: 'hi' | 'en', value: string) => {
     setFormData({
       ...formData,
       options: formData.options.map(o => o.id === id ? { ...o, [field]: value } : o)
     });
  };

  const handleSave = () => {
     onSave(formData);
  };

  return (
    <div className="bg-slate-900 border-2 border-cyan-500/50 rounded-2xl p-6 shadow-[0_0_40px_rgba(34,211,238,0.1)]">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div>
          <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Question (Hindi)</label>
          <textarea className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-white text-lg focus:border-cyan-500 outline-none min-h-[100px]" value={formData.hi} onChange={e => setFormData({...formData, hi: e.target.value})} />
        </div>
        <div>
          <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Question (English)</label>
          <textarea className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-white text-lg focus:border-cyan-500 outline-none min-h-[100px]" value={formData.en} onChange={e => setFormData({...formData, en: e.target.value})} />
        </div>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {formData.options.map((opt) => (
          <div key={opt.id} className={`p-4 rounded-xl border transition-all ${formData.correctOption === opt.id ? 'bg-green-500/10 border-green-500/50' : 'bg-slate-950 border-slate-800'}`}>
             <div className="flex items-center justify-between mb-3">
                <span className="font-black text-xs text-cyan-400">OPTION {opt.id}</span>
                <label className="flex items-center gap-2 cursor-pointer">
                   <input type="radio" checked={formData.correctOption === opt.id} onChange={() => setFormData({...formData, correctOption: opt.id})} className="accent-green-500 scale-125 transition-transform" />
                   <span className={`text-[10px] font-black uppercase ${formData.correctOption === opt.id ? 'text-green-500' : 'text-slate-500'}`}>Correct</span>
                </label>
             </div>
             <input type="text" className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-white mb-2 text-sm focus:border-cyan-500 outline-none" placeholder="Hindi" value={opt.hi} onChange={e => updateOption(opt.id, 'hi', e.target.value)} />
             <input type="text" className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-white text-xs focus:border-cyan-500 outline-none" placeholder="English" value={opt.en} onChange={e => updateOption(opt.id, 'en', e.target.value)} />
          </div>
        ))}
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div>
          <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Explanation (Hindi)</label>
          <textarea className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-white text-sm focus:border-cyan-500 outline-none min-h-[100px]" value={formData.explanation.hi} onChange={e => setFormData({...formData, explanation: {...formData.explanation, hi: e.target.value}})} />
        </div>
        <div>
          <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Explanation (English)</label>
          <textarea className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-white text-sm focus:border-cyan-500 outline-none min-h-[100px]" value={formData.explanation.en} onChange={e => setFormData({...formData, explanation: {...formData.explanation, en: e.target.value}})} />
        </div>
      </div>
      
      <div className="flex justify-end gap-3 pt-6 border-t border-slate-800">
         <button onClick={onCancel} className="px-6 py-3 rounded-xl text-slate-400 font-bold hover:bg-slate-800 transition-all">Discard Changes</button>
         <button onClick={handleSave} className="bg-green-600 hover:bg-green-500 text-white font-bold px-10 py-3 rounded-xl flex items-center gap-3 transition-all shadow-lg shadow-green-900/20">
            <Save size={20} /> Apply & Save
         </button>
      </div>
    </div>
  );
}

function QuestionsTab() {
  const store = useStore();
  const [editingId, setEditingId] = useState<string | number | null>(null);
  const [toastMessage, setToastMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const activeCategory = store.categories.find(c => c.id === store.adminSelectedCategoryId);

  const filteredQuestions = store.adminQuestions.filter(q => 
    q.hi.toLowerCase().includes(searchQuery.toLowerCase()) || 
    q.en.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSave = (updatedQ: Question) => {
     let existing = store.adminQuestions.find(q => q.id === updatedQ.id);
     if (existing) {
       store.updateQuestion(updatedQ.id, updatedQ);
       showToast('Question saved successfully');
     } else {
       store.addQuestion(updatedQ);
       showToast('Question added successfully');
     }
     setEditingId(null);
  };
  
  const showToast = (msg: string) => {
     setToastMessage(msg);
     setTimeout(() => setToastMessage(''), 3000);
  };

  const handleAddNew = () => {
    const newId = Date.now();
    const newQ: Question = {
       id: newId,
       hi: 'New Question Hindi',
       en: 'New Question English',
       options: [
         { id: 'A', hi: 'Option A Hindi', en: 'Option A English' },
         { id: 'B', hi: 'Option B Hindi', en: 'Option B English' },
         { id: 'C', hi: 'Option C Hindi', en: 'Option C English' },
         { id: 'D', hi: 'Option D Hindi', en: 'Option D English' }
       ],
       correctOption: 'A',
       explanation: { hi: '', en: '' }
    };
    store.addQuestion(newQ);
    setEditingId(newId);
  };

  const handleDelete = (id: string | number) => {
    if (confirm('Are you sure you want to delete this question?')) {
      store.deleteQuestion(id);
      showToast('Question deleted');
    }
  };

  return (
    <motion.div initial={{opacity:0, y:20}} animate={{opacity:1, y:0}} exit={{opacity:0, y:-20}} className="pb-20">
      <AnimatePresence>
         {toastMessage && (
            <motion.div initial={{opacity:0, y:-20}} animate={{opacity:1, y:0}} exit={{opacity:0, y:-20}} className="fixed top-24 left-1/2 -translate-x-1/2 bg-green-500 text-white font-bold px-6 py-3 rounded-xl shadow-xl z-[100] flex items-center gap-2 border-2 border-green-400">
               <CheckCircle size={20} /> {toastMessage}
            </motion.div>
         )}
      </AnimatePresence>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8 bg-slate-900 border border-slate-800 p-6 rounded-3xl shadow-xl">
        <div>
          <h2 className="text-2xl font-black text-white flex items-center gap-3">
             <List className="text-cyan-400" /> {activeCategory?.name || 'Question Bank'}
             <span className="text-slate-600 font-bold">({store.adminQuestions.length})</span>
          </h2>
          <div className="flex items-center gap-2 mt-2">
             <span className="bg-slate-950 text-slate-500 text-[10px] font-black px-2 py-1 rounded border border-slate-800 uppercase tracking-widest">{store.adminSelectedCategoryId}.json</span>
          </div>
        </div>
        
        <div className="flex gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-80">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
            <input 
              type="text" 
              placeholder="Search in category..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-2xl pl-12 pr-4 py-3 text-white focus:outline-none focus:border-cyan-500/50 transition-all font-medium"
            />
          </div>
          <button onClick={handleAddNew} className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-3 px-8 rounded-2xl flex items-center gap-2 transition-all whitespace-nowrap shadow-lg shadow-cyan-900/20">
             <Plus size={22} /> Add New
          </button>
        </div>
      </div>
      
      <div className="space-y-6">
        {filteredQuestions.length === 0 && (
           <div className="bg-slate-900 border border-slate-800 border-dashed rounded-3xl p-20 flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 rounded-2xl bg-slate-800 flex items-center justify-center mb-6 text-slate-500">
                 <AlertCircle size={32} />
              </div>
              <h3 className="text-xl font-bold text-white mb-2 uppercase tracking-tight">This category has no questions</h3>
              <p className="text-slate-500 max-w-sm font-medium">Add a question manually or use the <span className="text-cyan-400">Import Tab</span> to load a JSON file.</p>
           </div>
        )}
        {filteredQuestions.map((q, i) => {
           if (editingId === q.id) {
              return (
                <div key={q.id}>
                  <QuestionEditor q={q} onSave={handleSave} onCancel={() => { setEditingId(null); }} />
                </div>
              );
           }

           return (
             <div key={q.id} className="bg-slate-900 border border-slate-800 rounded-3xl p-8 flex gap-8 items-start shadow-xl hover:border-slate-700 transition-all group">
               <div className="bg-slate-950 w-14 h-14 rounded-2xl flex items-center justify-center font-black text-cyan-400 border border-slate-800 flex-shrink-0 text-xl shadow-inner group-hover:scale-105 transition-transform">
                 {i + 1}
               </div>
               <div className="flex-1">
                  <div className="font-bold text-2xl text-white mb-3 leading-tight tracking-tight">{q.hi}</div>
                  <div className="text-slate-500 text-base mb-8 pb-8 border-b border-slate-800/50 font-medium italic">{q.en}</div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                     {q.options.map((opt) => (
                       <div key={opt.id} className={`p-5 rounded-2xl border text-sm flex flex-col gap-2 transition-all ${q.correctOption === opt.id ? 'bg-green-500/10 border-green-500/30 ring-1 ring-green-500/20' : 'bg-slate-950 border-slate-800 text-slate-500'}`}>
                          <div className="flex items-center justify-between mb-1">
                            <span className={`font-black text-[10px] tracking-widest ${q.correctOption === opt.id ? 'text-green-500' : 'text-slate-600'}`}>OPTION {opt.id}</span>
                            {q.correctOption === opt.id && <CheckCircle size={16} className="text-green-500" />}
                          </div>
                          <div className={`font-bold text-lg leading-tight ${q.correctOption === opt.id ? 'text-slate-100' : 'text-slate-400'}`}>{opt.hi}</div>
                          <div className="text-[11px] opacity-60 leading-tight font-medium truncate">{opt.en}</div>
                       </div>
                     ))}
                  </div>
               </div>
               
               <div className="flex flex-col gap-3 shrink-0">
                  <div className="flex gap-2">
                     <button onClick={() => store.reorderQuestion(q.id, 'up')} disabled={i === 0} className="p-3 border border-slate-800 text-slate-500 hover:bg-slate-800 hover:text-white rounded-2xl transition-all disabled:opacity-10 shadow-lg">
                       <ArrowUp size={20} />
                     </button>
                     <button onClick={() => store.reorderQuestion(q.id, 'down')} disabled={i === store.questions.length - 1} className="p-3 border border-slate-800 text-slate-500 hover:bg-slate-800 hover:text-white rounded-2xl transition-all disabled:opacity-10 shadow-lg">
                       <ArrowDown size={20} />
                     </button>
                  </div>
                  <div className="w-full h-px bg-slate-800 my-2"></div>
                  <button onClick={() => setEditingId(q.id)} className="p-3 border border-slate-800 text-cyan-400 hover:bg-cyan-500/10 hover:text-cyan-300 rounded-2xl transition-all flex justify-center shadow-lg">
                    <Edit2 size={24} />
                  </button>
                  <button onClick={() => { store.duplicateQuestion(q.id); showToast('Question duplicated'); }} className="p-3 border border-slate-800 text-purple-400 hover:bg-slate-800 hover:text-purple-300 rounded-2xl transition-all flex justify-center shadow-lg">
                    <IconCopy size={24} />
                  </button>
                  <button onClick={() => handleDelete(q.id)} className="p-3 border border-red-900/40 text-red-500 hover:bg-red-950 hover:text-red-400 rounded-2xl transition-all flex justify-center shadow-lg">
                    <Trash2 size={24} />
                  </button>
               </div>
             </div>
           );
        })}
      </div>
    </motion.div>
  );
}
