import React, { useEffect, useState } from 'react';
import { Play, Square, Settings, Upload, Trash2, Edit, Save, Plus, Copy, Link, Server } from 'lucide-react';
import { useStore, YTLesson, YTSection, YTLiveState } from './store';

const DEFAULT_LESSON: YTLesson = {
  id: '',
  topic: 'New Lesson',
  category: 'GK',
  language: 'hi',
  voice: 'female',
  boardStyle: 'green',
  typingStyle: 'coaching',
  sections: [
    {
      id: 'section-1',
      title: 'Introduction',
      content: 'Hello students, today we will learn about a new topic.',
      speak: true,
      typingSpeed: 50,
      pauseAfter: 1000,
      highlightWords: []
    }
  ]
};

export default function YTNotesAdmin() {
  const [lessons, setLessons] = useState<YTLesson[]>([]);
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);
  const [editorState, setEditorState] = useState<YTLesson | null>(null);
  
  const ytLiveState = useStore(s => s.ytLiveState);
  const pushYTLiveState = useStore(s => s.pushYTLiveState);

  useEffect(() => {
    fetchLessons();
  }, []);

  const fetchLessons = async () => {
    const res = await fetch('/api/yt-notes/lessons');
    const data = await res.json();
    setLessons(data);
  };

  const handleCreateNew = () => {
    const newLesson = { ...DEFAULT_LESSON, id: `lesson-${Date.now()}` };
    setEditorState(newLesson);
    setSelectedLessonId(newLesson.id);
  };

  const handleSelectLesson = (id: string) => {
    const lesson = lessons.find(l => l.id === id);
    if (lesson) {
      setEditorState(JSON.parse(JSON.stringify(lesson)));
      setSelectedLessonId(id);
    }
  };

  const handleSave = async () => {
    if (!editorState) return;
    await fetch(`/api/yt-notes/lessons/${editorState.id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editorState)
    });
    fetchLessons();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this lesson?')) return;
    await fetch(`/api/yt-notes/lessons/${id}`, { method: 'DELETE' });
    if (selectedLessonId === id) {
      setSelectedLessonId(null);
      setEditorState(null);
    }
    fetchLessons();
  };

  // Live Controls
  const handleGoLive = () => {
    if (!editorState) return;
    pushYTLiveState({
      isActive: true,
      currentLessonId: editorState.id,
      currentSectionIdx: 0,
      phase: 'typing'
    });
  };

  const handleStopLive = () => {
    pushYTLiveState({
      isActive: false,
      phase: 'idle'
    });
  };

  const handleNextSection = () => {
     if (ytLiveState.isActive && activeLessonMeta) {
         const nextIdx = ytLiveState.currentSectionIdx + 1;
         if (nextIdx < activeLessonMeta.sections.length) {
             pushYTLiveState({ currentSectionIdx: nextIdx, phase: 'typing' });
         } else {
             pushYTLiveState({ phase: 'done' });
         }
     }
  };

  const handlePrevSection = () => {
     if (ytLiveState.isActive && activeLessonMeta) {
         const prevIdx = Math.max(0, ytLiveState.currentSectionIdx - 1);
         pushYTLiveState({ currentSectionIdx: prevIdx, phase: 'typing' });
     }
  };

  const activeLessonMeta = ytLiveState.isActive ? lessons.find(l => l.id === ytLiveState.currentLessonId) : null;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-300 font-sans flex flex-col pt-16">
      <div className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 grid grid-cols-1 md:grid-cols-4 gap-6">
        
        {/* Left Sidebar - Files */}
        <div className="bg-slate-900 border border-slate-800 rounded-lg flex flex-col">
          <div className="p-4 border-b border-slate-800 flex justify-between items-center">
            <h2 className="font-bold text-white flex items-center gap-2">
              <Server className="w-5 h-5 text-indigo-400" />
              Lessons
            </h2>
            <button onClick={handleCreateNew} className="p-1 bg-indigo-600 hover:bg-indigo-500 rounded text-white" title="New Lesson">
              <Plus className="w-4 h-4" />
            </button>
          </div>
          <div className="p-2 flex-1 overflow-y-auto space-y-1">
            {lessons.map(lesson => (
              <div 
                key={lesson.id} 
                className={`p-3 rounded cursor-pointer whitespace-nowrap overflow-hidden text-ellipsis flex justify-between items-center group
                  ${selectedLessonId === lesson.id ? 'bg-indigo-900/50 border border-indigo-500/30 text-white' : 'hover:bg-slate-800 text-slate-400 border border-transparent'}`}
                onClick={() => handleSelectLesson(lesson.id)}
              >
                <div className="truncate pr-2">
                    <span className="text-xs px-2 py-0.5 bg-slate-950 rounded text-slate-500 mr-2 uppercase">{lesson.category}</span>
                    {lesson.topic}
                </div>
                {selectedLessonId === lesson.id && (
                  <button onClick={(e) => { e.stopPropagation(); handleDelete(lesson.id); }} className="text-red-400 hover:text-red-300">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Center/Right - Editor & Controls */}
        <div className="md:col-span-3 flex flex-col gap-6">
          
          {/* Stream Controls Panel */}
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 flex items-center justify-between shadow-lg relative overflow-hidden">
             <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 to-purple-600"></div>
             <div>
                <h3 className="text-lg font-bold text-white">Live Stream Controller</h3>
                <p className="text-sm text-slate-500">
                  {ytLiveState.isActive && activeLessonMeta ? `LIVE: ${activeLessonMeta.topic} | Section ${ytLiveState.currentSectionIdx + 1}` : 'Stream is offline.'}
                </p>
             </div>
             
             <div className="flex gap-3">
               <button 
                onClick={handlePrevSection}
                disabled={!ytLiveState.isActive || ytLiveState.currentSectionIdx === 0}
                className={`px-3 py-2 font-bold rounded shadow-lg transition-all ${!ytLiveState.isActive || ytLiveState.currentSectionIdx === 0 ? 'bg-slate-800 text-slate-600' : 'bg-slate-700 text-white hover:bg-slate-600'}`}>
                 &lt; PREV
               </button>
               <button 
                onClick={handleNextSection}
                disabled={!ytLiveState.isActive || !activeLessonMeta || ytLiveState.currentSectionIdx >= activeLessonMeta.sections.length - 1}
                className={`px-3 py-2 font-bold rounded shadow-lg transition-all ${!ytLiveState.isActive || !activeLessonMeta || ytLiveState.currentSectionIdx >= activeLessonMeta.sections.length - 1 ? 'bg-slate-800 text-slate-600' : 'bg-slate-700 text-white hover:bg-slate-600'}`}>
                 NEXT &gt;
               </button>
               <button 
                onClick={handleStopLive}
                disabled={!ytLiveState.isActive}
                className={`flex items-center gap-2 px-4 py-2 font-bold rounded shadow-lg transition-all ${!ytLiveState.isActive ? 'bg-slate-800 text-slate-600' : 'bg-red-900/80 text-red-100 hover:bg-red-800 border border-red-700'}`}>
                 <Square className="w-4 h-4" /> STOP TEACHING
               </button>
               <button 
                onClick={handleGoLive}
                disabled={!editorState || (ytLiveState.isActive && ytLiveState.currentLessonId === editorState.id)}
                className={`flex items-center gap-2 px-6 py-2 font-bold rounded shadow-lg transition-all ${!editorState || (ytLiveState.isActive && ytLiveState.currentLessonId === editorState.id) ? 'bg-slate-800 text-slate-600' : 'bg-green-600 text-white hover:bg-green-500 shadow-[0_0_15px_rgba(22,163,74,0.4)]'}`}>
                 <Play className="w-4 h-4" /> START TEACHING
               </button>
             </div>
          </div>

          {/* Editor */}
          {editorState ? (
            <div className="bg-slate-900 border border-slate-800 rounded-lg flex-1 flex flex-col overflow-hidden">
               <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
                  <div className="flex gap-4 items-center">
                      <input 
                        type="text" 
                        value={editorState.topic} 
                        onChange={e => setEditorState({...editorState, topic: e.target.value})}
                        className="bg-transparent border-none text-2xl font-bold text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded px-2 w-[400px]"
                        placeholder="Lesson Topic..."
                      />
                  </div>
                  <button onClick={handleSave} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded flex items-center gap-2 font-bold transition-colors">
                     <Save className="w-4 h-4" /> Save Lesson
                  </button>
               </div>
               
               <div className="p-4 overflow-y-auto flex-1 space-y-6">
                 
                 {/* Metadata Grid */}
                 <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-slate-950 rounded border border-slate-800">
                    <div>
                        <label className="text-xs text-slate-500 font-bold mb-1 block uppercase">Category</label>
                        <input 
                           type="text"
                           value={editorState.category}
                           onChange={e => setEditorState({...editorState, category: e.target.value})}
                           className="w-full bg-slate-900 border border-slate-800 text-slate-300 rounded p-2 text-sm focus:border-indigo-500 outline-none"
                        />
                    </div>
                    <div>
                        <label className="text-xs text-slate-500 font-bold mb-1 block uppercase">Language</label>
                        <select 
                           value={editorState.language}
                           onChange={e => setEditorState({...editorState, language: e.target.value as 'hi'|'en'})}
                           className="w-full bg-slate-900 border border-slate-800 text-slate-300 rounded p-2 text-sm focus:border-indigo-500 outline-none"
                        >
                           <option value="hi">Hindi</option>
                           <option value="en">English</option>
                        </select>
                    </div>
                    <div>
                        <label className="text-xs text-slate-500 font-bold mb-1 block uppercase">Board Style</label>
                        <select 
                           value={editorState.boardStyle}
                           onChange={e => setEditorState({...editorState, boardStyle: e.target.value as any})}
                           className="w-full bg-slate-900 border border-slate-800 text-slate-300 rounded p-2 text-sm focus:border-indigo-500 outline-none"
                        >
                           <option value="black">Black Chalkboard</option>
                           <option value="green">Green Chalkboard</option>
                           <option value="smart">Smart Digital</option>
                        </select>
                    </div>
                    <div>
                        <label className="text-xs text-slate-500 font-bold mb-1 block uppercase">Typing Style</label>
                        <select 
                           value={editorState.typingStyle}
                           onChange={e => setEditorState({...editorState, typingStyle: e.target.value as any})}
                           className="w-full bg-slate-900 border border-slate-800 text-slate-300 rounded p-2 text-sm focus:border-indigo-500 outline-none"
                        >
                           <option value="coaching">Coaching Match (Natural)</option>
                           <option value="slow">Slow Teacher</option>
                           <option value="exam">Exam Marathon (Fast)</option>
                           <option value="detailed">Detailed Explanation</option>
                        </select>
                    </div>
                 </div>

                 {/* Sections Builder */}
                 <div className="space-y-4">
                    <h4 className="text-lg font-bold text-white border-b border-slate-800 pb-2 flex justify-between items-center">
                        Sections Builder
                        <button 
                            onClick={() => setEditorState({
                                ...editorState, 
                                sections: [...editorState.sections, { id: `s-${Date.now()}`, title: '', content: '', speak: true, typingSpeed: 50, pauseAfter: 1500, highlightWords: [] }]
                            })}
                            className="text-sm bg-slate-800 hover:bg-slate-700 px-3 py-1 rounded border border-slate-700 flex items-center gap-1">
                            <Plus className="w-3 h-3" /> Add Section
                        </button>
                    </h4>
                    
                    {editorState.sections.map((section, idx) => (
                        <div key={section.id} className="bg-slate-950 border border-slate-800 rounded p-4 relative group">
                            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                                <button 
                                    onClick={() => {
                                        const newS = [...editorState.sections];
                                        newS.splice(idx, 1);
                                        setEditorState({...editorState, sections: newS});
                                    }}
                                    className="p-1.5 bg-red-900/50 text-red-400 hover:bg-red-900 rounded"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                            
                            <div className="grid grid-cols-1 gap-4">
                                <div className="flex items-center gap-4">
                                    <span className="font-bold text-slate-500 w-8">#{idx + 1}</span>
                                    <input 
                                        type="text"
                                        placeholder="Section Title (e.g. Introduction)"
                                        value={section.title}
                                        onChange={e => {
                                            const newS = [...editorState.sections];
                                            newS[idx].title = e.target.value;
                                            setEditorState({...editorState, sections: newS});
                                        }}
                                        className="flex-1 bg-slate-900 border border-slate-800 rounded p-2 text-white font-bold outline-none focus:border-indigo-500"
                                    />
                                    
                                    <label className="flex items-center gap-2 text-sm text-slate-400">
                                        <input 
                                            type="checkbox" 
                                            checked={section.speak}
                                            onChange={e => {
                                                const newS = [...editorState.sections];
                                                newS[idx].speak = e.target.checked;
                                                setEditorState({...editorState, sections: newS});
                                            }}
                                            className="w-4 h-4 accent-indigo-500"
                                        />
                                        Speak Output
                                    </label>
                                </div>
                                
                                <textarea 
                                    placeholder="The actual content to be spoken and written on the board..."
                                    value={section.content}
                                    onChange={e => {
                                        const newS = [...editorState.sections];
                                        newS[idx].content = e.target.value;
                                        setEditorState({...editorState, sections: newS});
                                    }}
                                    className="w-full h-32 bg-slate-900 border border-slate-800 rounded p-3 text-slate-300 font-mono text-sm leading-relaxed outline-none focus:border-indigo-500 resize-y"
                                />
                                
                            </div>
                        </div>
                    ))}
                 </div>
               </div>
            </div>
          ) : (
             <div className="bg-slate-900 border border-slate-800 rounded-lg flex-1 flex flex-col items-center justify-center text-slate-500 p-8">
                 <Server className="w-16 h-16 mb-4 opacity-20" />
                 <p className="text-lg">Select a lesson to edit or create a new one.</p>
             </div>
          )}
        </div>
      </div>
    </div>
  );
}

