import React, { useEffect, useState, useRef } from 'react';
import { useStore, YTSection } from './store';

export default function YTNotesView() {
  const { ytLiveState } = useStore();
  const [lessonData, setLessonData] = useState<any>(null);
  
  const [displayedText, setDisplayedText] = useState('');
  const [displayedTitle, setDisplayedTitle] = useState('');
  
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const typingTimerRef = useRef<any>(null);

  // Fetch lesson data when currentLessonId changes
  useEffect(() => {
    if (!ytLiveState.currentLessonId) {
      setLessonData(null);
      setDisplayedText('');
      setDisplayedTitle('');
      window.speechSynthesis.cancel();
      return;
    }
    
    fetch(`/api/yt-notes/lessons/${ytLiveState.currentLessonId}`)
      .then(res => {
        if (!res.ok) throw new Error(`YT Notes fetch failed: ${res.status}`);
        return res.json();
      })
      .then(data => setLessonData(data))
      .catch(e => console.error("Failed to load lesson", e));
  }, [ytLiveState.currentLessonId]);

  // Handle phase changes
  useEffect(() => {
    if (!lessonData || !ytLiveState.isActive) return;

    if (ytLiveState.phase === 'typing') {
      const section = lessonData.sections[ytLiveState.currentSectionIdx];
      if (!section) return;
      
      startDiff2Typing(section, lessonData.language, lessonData.voice);
    }
    
    return () => {
       if (typingTimerRef.current) clearInterval(typingTimerRef.current);
       window.speechSynthesis.cancel();
    }
  }, [ytLiveState.phase, ytLiveState.currentSectionIdx, lessonData]);

  const startDiff2Typing = async (section: YTSection, lang: string, voiceType: string) => {
    // Reset displays
    setDisplayedTitle(section.title);
    setDisplayedText('');
    
    if (audioElementRef.current) {
        audioElementRef.current.pause();
        audioElementRef.current = null;
    }
    if (typingTimerRef.current) clearInterval(typingTimerRef.current);
    window.speechSynthesis.cancel();
    
    const textToSpeak = section.content;
    const words = textToSpeak.split(' ');
    
    if (section.speak) {
       try {
           const res = await fetch('/api/tts', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                 text: textToSpeak,
                 lang: lang,
                 gender: voiceType || 'female',
                 rate: 1.0,
                 volume: 1.0
              })
           });
           const data = await res.json();
           if (data.url) {
               const audio = new Audio(data.url);
               audioElementRef.current = audio;
               
               audio.addEventListener('loadedmetadata', () => {
                   const durationMs = (audio.duration * 1000) * 0.95; // 5% faster buffer
                   const intervalTime = Math.max(durationMs / words.length, 50);
                   
                   audio.play();
                   
                   let wIdx = 0;
                   typingTimerRef.current = setInterval(() => {
                      if (wIdx < words.length) {
                          setDisplayedText(prev => prev + (prev.length > 0 ? ' ' : '') + words[wIdx]);
                          wIdx++;
                      } else {
                          clearInterval(typingTimerRef.current);
                      }
                   }, intervalTime);
               });
               
               audio.addEventListener('ended', () => {
                   setDisplayedText(textToSpeak);
                   clearInterval(typingTimerRef.current);
               });
           }
       } catch (e) {
           console.error("TTS Failed:", e);
           // Fallback typing
           startFallbackTyping(words, textToSpeak, section.typingSpeed);
       }
    } else {
       // Just type it
       startFallbackTyping(words, textToSpeak, section.typingSpeed);
    }
  }

  const startFallbackTyping = (words: string[], fullText: string, speed: number) => {
      let wIdx = 0;
      typingTimerRef.current = setInterval(() => {
         if (wIdx < words.length) {
             setDisplayedText(prev => prev + (prev.length > 0 ? ' ' : '') + words[wIdx]);
             wIdx++;
         } else {
             setDisplayedText(fullText);
             clearInterval(typingTimerRef.current);
         }
      }, speed || 50);
  }

  if (!ytLiveState.isActive || !lessonData) {
     return (
        <div className="w-full h-screen bg-slate-900 flex items-center justify-center">
            <h1 className="text-slate-500 font-bold text-2xl tracking-widest uppercase">Classroom Standby</h1>
        </div>
     );
  }

  // Board Styling
  let boardClasses = "w-full h-screen flex flex-col p-12 overflow-hidden ";
  let textClasses = "font-sans leading-relaxed whitespace-pre-wrap ";
  let titleClasses = "text-4xl font-bold mb-8 uppercase tracking-wide ";

  if (lessonData.boardStyle === 'black') {
      boardClasses += 'bg-[#1a1c20] text-[#f5f5f5]';
      textClasses += 'text-3xl text-slate-100 drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]';
      titleClasses += 'text-yellow-400 border-b-2 border-slate-700 pb-4';
  } else if (lessonData.boardStyle === 'green') {
      boardClasses += 'bg-[#1a4a38] text-[#e0e0e0]'; // Chalkboard Green
      textClasses += 'text-3xl text-white opacity-95';
      titleClasses += 'text-yellow-300 border-b-2 border-green-800 pb-4 shadow-sm';
  } else {
      boardClasses += 'bg-[#fcfcfc] text-[#111827]'; // Smart Board
      textClasses += 'text-3xl text-slate-800 font-medium';
      titleClasses += 'text-indigo-700 border-b-2 border-slate-200 pb-4';
  }

  return (
    <div className={boardClasses} style={{ backgroundImage: lessonData.boardStyle !== 'smart' ? 'url("data:image/svg+xml,%3Csvg width=\\"100\\" height=\\"100\\" viewBox=\\"0 0 100 100\\" xmlns=\\"http://www.w3.org/2000/svg\\" preserveAspectRatio=\\"none\\"%3E%3Cfilter id=\\"noise\\"%3E%3CfeTurbulence type=\\"fractalNoise\\" baseFrequency=\\"0.8\\" numOctaves=\\"4\\" stitchTiles=\\"stitch\\"%3E%3C/feTurbulence%3E%3C/filter%3E%3Crect width=\\"100\\" height=\\"100\\" filter=\\"url(%23noise)\\" opacity=\\"0.05\\"%3E%3C/rect%3E%3C/svg%3E")' : 'none' }}>
        
        {/* Animated Header */}
        {displayedTitle && (
            <h1 className={titleClasses}>
                {displayedTitle}
            </h1>
        )}

        {/* Content Area */}
        <div className="flex-1 w-full max-w-5xl mx-auto overflow-y-auto pr-4 custom-scrollbar flex flex-col gap-8 pb-32">
            
            {/* Typing Base Text */}
            <div className={textClasses}>
                {displayedText}
                <span className="inline-block w-3 h-8 bg-current ml-2 animate-pulse align-middle opacity-50"></span>
            </div>
            
            {/* Display Tables if any and if typing is complete or we just reveal them at start/end */}
            {lessonData.sections[ytLiveState.currentSectionIdx]?.tables?.map((table: any, tIdx: number) => (
                <div key={tIdx} className="w-full bg-slate-900/40 border border-slate-500/50 rounded-lg overflow-hidden shadow-2xl mt-4">
                    {table.title && <h3 className="bg-slate-800/80 px-4 py-2 font-bold text-xl border-b border-slate-500/50 text-indigo-300 uppercase tracking-widest">{table.title}</h3>}
                    <table className="w-full text-left border-collapse">
                        {table.headers && (
                           <thead className="bg-slate-800/50">
                               <tr>
                                   {table.headers.map((h: string, i: number) => (
                                       <th key={i} className="p-4 border-b border-slate-600/50 font-bold text-xl text-yellow-500/90 tracking-wide">{h}</th>
                                   ))}
                               </tr>
                           </thead>
                        )}
                        <tbody>
                            {table.rows?.map((row: string[], rIdx: number) => (
                                <tr key={rIdx} className="hover:bg-slate-800/30 transition-colors">
                                    {row.map((cell: string, cIdx: number) => (
                                        <td key={cIdx} className="p-4 border-b border-slate-700/50 text-lg opacity-90">{cell}</td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ))}
        </div>

        {/* Optional Branding or Footer representing Coaching Institute */}
        <div className="absolute bottom-6 right-8 opacity-40 font-mono text-sm tracking-widest font-bold">
            {lessonData.category} - {lessonData.topic}
        </div>
    </div>
  );
}
