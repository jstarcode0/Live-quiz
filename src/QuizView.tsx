import React, { useEffect, useState, useRef } from 'react';

declare global {
  interface Window {
    __QUIZ_TICKER_ACTIVE__?: boolean;
  }
}
import { motion, AnimatePresence } from 'motion/react';
import { 
  Shield, 
  Users, 
  Tv, 
  SkipForward, 
  ArrowRight, 
  CheckCircle, 
  XCircle, 
  Radio, 
  Info,
  CheckCircle2,
  Volume2,
  VolumeX,
  Copy,
  Check
} from 'lucide-react';
import { useStore } from './store';

const CopyLogo = ({ streamTitle, sscTitle, theme }: { streamTitle: string, sscTitle: string, theme: any }) => {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div 
      onClick={handleCopy} 
      className="flex items-center gap-6 w-[450px] cursor-pointer group relative transition-transform hover:scale-[1.02]"
      title="Click to copy live link"
    >
      <div className="w-[84px] h-[84px] rounded-2xl flex items-center justify-center border-4 shadow-inner transition-all"
           style={{ backgroundColor: theme.bgSecondary, borderColor: `${theme.accentColor}30`, color: theme.accentColor }}>
        <Shield size={46} strokeWidth={2.5} />
      </div>
      <div>
        <div className="text-[34px] font-black tracking-[-0.04em] leading-tight transition-colors" style={{ color: theme.headerText }}>{streamTitle}</div>
        <div className="font-bold tracking-widest text-sm uppercase mt-1" style={{ color: theme.accentColor }}>{sscTitle}</div>
      </div>
      
      <AnimatePresence>
        {copied && (
          <motion.div 
            initial={{ opacity: 0, y: 10, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.9 }}
            className="absolute top-full left-0 mt-4 bg-slate-900 text-white text-sm font-bold px-4 py-2 rounded-lg flex items-center gap-2 shadow-xl whitespace-nowrap z-50 border border-slate-700"
          >
            <Check size={16} className="text-green-400" />
            Live stream link copied
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};


// QUES array has been moved to store.ts

function useContainerScale(containerRef: React.RefObject<HTMLDivElement>, isPreview: boolean = false) {
  const [scale, setScale] = useState(1);

  useEffect(() => {
    if (!containerRef.current) return;
    
    // Auto-fullscreen logic for broadcast
    const attemptFullscreen = () => {
      if (isPreview) return; // Do not auto-fullscreen in preview mode
      if (!document.fullscreenElement && containerRef.current) {
        containerRef.current.requestFullscreen().catch(() => {});
      }
    };
    
    // Try on mount
    attemptFullscreen();
    // Try on any click (requires user interaction for browser security)
    if (!isPreview) {
      window.addEventListener('click', attemptFullscreen);
    }

    const updateScale = () => {
      if (!containerRef.current) return;
      const { width, height } = containerRef.current.getBoundingClientRect();
      const scaleW = width / 1920;
      const scaleH = height / 1080;
      // We want to fit 1920x1080 into the container while maintaining aspect ratio
      setScale(Math.min(scaleW, scaleH));
    };

    const observer = new ResizeObserver(updateScale);
    observer.observe(containerRef.current);
    updateScale();
    
    window.addEventListener('resize', updateScale);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updateScale);
      window.removeEventListener('click', attemptFullscreen);
    };
  }, [containerRef]);

  return scale;
}

// Simple Web Audio API sound generator to avoid external assets
const playSound = (type: 'tick' | 'correct' | 'transition', soundEnabled: boolean) => {
  if (!soundEnabled) return;
  
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    osc.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    if (type === 'tick') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.1);
      gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
      osc.start();
      osc.stop(ctx.currentTime + 0.1);
    } else if (type === 'correct') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(400, ctx.currentTime);
      osc.frequency.setValueAtTime(600, ctx.currentTime + 0.1);
      osc.frequency.setValueAtTime(800, ctx.currentTime + 0.2);
      gainNode.gain.setValueAtTime(0.2, ctx.currentTime);
      gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.4);
      osc.start();
      osc.stop(ctx.currentTime + 0.4);
    } else if (type === 'transition') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(200, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(50, ctx.currentTime + 0.2);
      gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
      osc.start();
      osc.stop(ctx.currentTime + 0.2);
    }
  } catch (e) {
    console.error("Audio playback error", e);
  }
};

const AUTO_NEXT_DELAY = 2000;

import PremiumBroadcast from './templates/PremiumBroadcast';
import SSCSmartboardQuiz from './templates/SSCSmartboardQuiz';
import ExamGKSlideQuiz from './templates/ExamGKSlideQuiz';
import KBCStyleQuiz from './templates/KBCStyleQuiz';



const getVoice = (lang: 'hi' | 'en', gender: 'male' | 'female' = 'female') => {
  if (typeof window === 'undefined') return null;
  const voices = window.speechSynthesis.getVoices();
  
  const code = lang === 'hi' ? 'hi' : 'en';
  const filtered = voices.filter(v => v.lang.toLowerCase().includes(code));
  
  const isTargetGender = (name: string) => {
    name = name.toLowerCase();
    if (gender === 'male') {
       if (lang === 'hi') return name.includes('madhur') || name.includes('rishi') || name.includes('kumar');
       return name.includes('male') || name.includes('guy') || name.includes('david') || name.includes('andrew') || name.includes('brian');
    } else {
       if (lang === 'hi') return name.includes('swara') || name.includes('lekha') || name.includes('neerja');
       return name.includes('female') || name.includes('zira') || name.includes('aria') || name.includes('jenny');
    }
  }

  let bestVoice = filtered.find(v => (v.name.toLowerCase().includes('online') || v.name.toLowerCase().includes('natural') || v.name.toLowerCase().includes('neural')) && isTargetGender(v.name));
  
  if (!bestVoice) bestVoice = filtered.find(v => isTargetGender(v.name));
  if (!bestVoice) bestVoice = filtered.find(v => v.name.toLowerCase().includes('online') || v.name.toLowerCase().includes('natural') || v.name.toLowerCase().includes('neural'));
  if (!bestVoice) bestVoice = filtered[0];

  return bestVoice || null;
};

if (typeof window !== 'undefined' && window.speechSynthesis) {
  window.speechSynthesis.onvoiceschanged = () => {};
}

const activeAudioElements = new Set<HTMLAudioElement>();
let activeAudioQueueId = 0;

const playAudioUrl = (url: string, volume: number, onLoaded: (duration: number) => void): Promise<void> => {
   return new Promise((resolve) => {
      const audio = new Audio(url);
      audio.volume = Math.max(0, Math.min(1, volume));
      
      let resolved = false;
      const finish = () => {
         if (!resolved) {
            resolved = true;
            activeAudioElements.delete(audio);
            resolve();
         }
      };
      
      audio.onloadedmetadata = () => {
         if (audio.duration && audio.duration !== Infinity && !isNaN(audio.duration)) {
             onLoaded(audio.duration);
         }
      };

      audio.onended = finish;
      audio.onerror = finish;
      
      activeAudioElements.add(audio);
      
      audio.play().catch(e => {
         console.warn("Autoplay block or error:", e);
         finish();
      });
   });
};

const activeUtterances = new Set<SpeechSynthesisUtterance>();

const speakBrowserPromise = (text: string, rate: number, volume: number, lang: 'hi' | 'en', gender: 'male' | 'female', onLoaded: (duration: number) => void): Promise<void> => {
   return new Promise((resolve) => {
      if (!window.speechSynthesis || volume === 0 || !text) {
        resolve();
        return;
      }
      
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.voice = getVoice(lang, gender);
      utterance.lang = lang === 'hi' ? 'hi-IN' : 'en-US';
      utterance.rate = rate;
      utterance.volume = volume;
      
      let resolved = false;
      let fallbackTimeout: any;

      const finish = () => {
         if (!resolved) {
            resolved = true;
            clearTimeout(fallbackTimeout);
            activeUtterances.delete(utterance);
            resolve();
         }
      };
      
      activeUtterances.add(utterance);
      utterance.onend = finish;
      utterance.onerror = finish;
      
      fallbackTimeout = setTimeout(finish, (text.length * 100) / rate + 15000); // Generous fallback timeout
      
      setTimeout(() => {
          console.log(`Speaking (Browser TTS): ${text.substring(0, 50)}...`);
          window.speechSynthesis.speak(utterance);
      }, 50);
   });
};

const speakMergedPromise = async (text: string, rate: number, volume: number, lang: 'hi' | 'en', gender: 'male' | 'female', voiceMode: 'browser'|'edge-tts', onLoaded: (duration: number) => void): Promise<void> => {
   if (volume === 0 || !text) return;
   
   if (voiceMode === 'browser') {
      return speakBrowserPromise(text, rate, volume, lang, gender, onLoaded);
   }

   try {
     const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, lang, gender, rate, volume })
     });
     const data = await res.json();
     
     if (data && data.url) {
        await playAudioUrl(data.url, volume, onLoaded);
     }
   } catch (e) {
     console.error("Failed to fetch/play TTS:", e);
   }
};

const speakPromise = async (text: string, rate: number, volume: number, lang: 'hi' | 'en', gender: 'male' | 'female', voiceMode: 'browser'|'edge-tts', pitch: number = 1.0): Promise<void> => {
    return speakMergedPromise(text, rate, volume, lang, gender, voiceMode, () => {});
};

const speakFireAndForget = (text: string, rate: number, volume: number, lang: 'hi' | 'en', gender: 'male' | 'female', voiceMode: 'browser'|'edge-tts', pitch: number = 1.0) => {
   speakPromise(text, rate, volume, lang, gender, voiceMode, pitch);
};

const cancelAllSpeech = () => {
   activeAudioQueueId++;
   activeAudioElements.forEach(audio => {
      audio.pause();
      audio.currentTime = 0;
   });
   activeAudioElements.clear();
   
   if (window.speechSynthesis) {
       window.speechSynthesis.cancel();
   }
   activeUtterances.clear();
};


type Phase = 'reading' | 'waiting' | 'revealing' | 'done';

const INTRO_PHRASES_HI = [
  "अगला प्रश्न ध्यान से देखिए।",
  "ये प्रश्न बहुत महत्वपूर्ण है।",
  "यह प्रश्न परीक्षा में आ सकता है।",
  "इसे तो रट ही लो।",
  "इसका सही उत्तर आपको पता होना चाहिए।",
  "इस प्रकार के प्रश्न परीक्षा में पूछे जाते हैं।",
  "यह आसान प्रश्न है, देखते हैं कौन सही जवाब देता है।",
  "यह थोड़ा ट्रिकी प्रश्न है, ध्यान से सोचिए।"
];

const INTRO_PHRASES_EN = [
  "Pay attention to the next question.",
  "This is a very important question.",
  "This question could appear in the exam.",
  "Make sure you remember this one.",
  "You should know the correct answer to this.",
  "Such questions are frequently asked in exams.",
  "This is an easy one, let's see who answers correctly.",
  "This is a tricky question, think carefully."
];

const REVEAL_PHRASES_HI = [
  "चलिए देखते हैं सही उत्तर क्या होगा।",
  "अब सही उत्तर ध्यान से देखिए।",
  "तो सही जवाब है...",
  "देखते हैं कितने लोगों ने सही जवाब दिया।"
];

const REVEAL_PHRASES_EN = [
  "Let's see what the correct answer is.",
  "Now, look at the correct answer carefully.",
  "So, the correct answer is...",
  "Let's check how many of you got it right."
];

export default function QuizView({ isPreview = false }: { isPreview?: boolean }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const scale = useContainerScale(containerRef, isPreview);
  
  const store = useStore();
  const {
    questions,
    categories,
    liveCategoryIds,
    currentIdx: storeCurrentIdx,
    setCurrentIdx,
    phase: storePhase,
    setPhase,
    timeLeft: storeTimeLeft,
    setTimeLeft,
    speechEnabled,
    setSpeechEnabled,
    humanExpressionsEnabled,
    ttsRate,
    setTtsRate,
    ttsVolume,
    setTtsVolume,
    voiceMode,
    streamTitle,
    sscTitle,
    viewerCount,
    liveBadgeText,
    footerText,
    bannerText,
    telegramText,
    motivationalText,
    headerText,
    globalTimerDuration,
    isTimerPaused,
    quizCompletionMode,
    narrationLanguage,
    theme
  } = store;

  // Local state for preview mode to avoid messing with live store
  const [localPhase, setLocalPhase] = useState<Phase>('reading');
  const [localCurrentIdx, setLocalCurrentIdx] = useState(0);
  const [localTimeLeft, setLocalTimeLeft] = useState(globalTimerDuration);

  // Effectively use either local or store state
  const phase = isPreview ? localPhase : storePhase;
  const currentIdx = isPreview ? localCurrentIdx : storeCurrentIdx;
  const timeLeft = isPreview ? localTimeLeft : storeTimeLeft;

  const currentQuestionCategoryName = questions[currentIdx]?.categoryName || '';
  const activeCategory = categories.find(c => liveCategoryIds.includes(c.id));
  const catName = currentQuestionCategoryName || activeCategory?.name || 'SSC QUIZ';
  
  let defaultHeader = catName.toUpperCase().includes('SSC') 
    ? `${catName} 2024 LIVE MOCK TEST` 
    : `${catName} LIVE QUIZ`;

  const headerTextDisplay = (headerText || defaultHeader)
    .replace('{category}', catName)
    .toUpperCase();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showFullscreenHint, setShowFullscreenHint] = useState(false);
  const [isPortrait, setIsPortrait] = useState(window.innerHeight > window.innerWidth);
  
  // Singleton ticker to prevent multiple QuizView instances from ticking the same store
  // In preview mode, we always want to tick locally
  const isTickerRef = useRef(isPreview);
  useEffect(() => {
    if (isPreview) return;
    if (!window.__QUIZ_TICKER_ACTIVE__) {
      window.__QUIZ_TICKER_ACTIVE__ = true;
      isTickerRef.current = true;
    }
    return () => {
      if (isTickerRef.current && !isPreview) {
        window.__QUIZ_TICKER_ACTIVE__ = false;
      }
    };
  }, [isPreview]);

  // Wrap store actions to prevent previews from pushing state to server
  const safeSetPhase = (p: Phase) => {
    if (phase === p) return;
    if (isPreview) {
      setLocalPhase(p);
    } else {
      setPhase(p);
    }
  };

  const safeSetCurrentIdx = (idx: number) => {
    if (currentIdx === idx) return;
    if (isPreview) {
      setLocalCurrentIdx(idx);
    } else {
      setCurrentIdx(idx);
    }
  };

  const safePushState = (patch: any) => {
    if (isPreview) {
      if (patch.phase !== undefined) setLocalPhase(patch.phase);
      if (patch.currentIdx !== undefined) setLocalCurrentIdx(patch.currentIdx);
      if (patch.timeLeft !== undefined) setLocalTimeLeft(patch.timeLeft);
    } else {
      store.pushState(patch);
    }
  };

  const safeSetTimeLeft = (t: number | ((prev: number) => number)) => {
    if (isPreview) {
       setLocalTimeLeft(prev => typeof t === 'function' ? t(prev) : t);
    } else {
       setTimeLeft(t);
    }
  };

  useEffect(() => {
    const handleResize = () => setIsPortrait(window.innerHeight > window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const handleFirstInteraction = () => {
      // Unlock AudioContext
      try {
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContext) {
           const ctx = new AudioContext();
           ctx.resume();
        }
      } catch (e) {
        // ignore
      }
      
      // Unlock HTML5 Audio
      try {
        const silentAudio = new Audio();
        silentAudio.src = "data:audio/mp3;base64,//NExAAAAANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq";
        silentAudio.play().catch(() => {});
      } catch(e) {}
      
      // Unlock SpeechSynthesis (legacy fallback)
      try {
        if (window.speechSynthesis) {
           const utterance = new SpeechSynthesisUtterance('');
           utterance.volume = 0;
           window.speechSynthesis.speak(utterance);
        }
      } catch (e) {
        // ignore
      }

      window.removeEventListener('click', handleFirstInteraction);
      window.removeEventListener('keydown', handleFirstInteraction);
      window.removeEventListener('touchstart', handleFirstInteraction);
    };

    window.addEventListener('click', handleFirstInteraction);
    window.addEventListener('keydown', handleFirstInteraction);
    window.addEventListener('touchstart', handleFirstInteraction);

    return () => {
      window.removeEventListener('click', handleFirstInteraction);
      window.removeEventListener('keydown', handleFirstInteraction);
      window.removeEventListener('touchstart', handleFirstInteraction);
    };
  }, []);

  // Fullscreen logic
  const toggleFullscreen = () => {
    if (isPreview || !containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {
        setShowFullscreenHint(true);
      });
    } else {
      document.exitFullscreen();
    }
  };

  useEffect(() => {
    if (isPreview) return;
    const handleFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handleFsChange);
    
    // Auto-fullscreen attempt
    const attemptFullscreen = () => {
       if (containerRef.current) {
          containerRef.current.requestFullscreen().catch(() => {
             setShowFullscreenHint(true);
          });
       }
    };

    attemptFullscreen();

    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, [isPreview]);
  
  const speechEnabledRef = useRef(speechEnabled);
  useEffect(() => { speechEnabledRef.current = speechEnabled; }, [speechEnabled]);

  const humanExpressionsEnabledRef = useRef(humanExpressionsEnabled);
  useEffect(() => { humanExpressionsEnabledRef.current = humanExpressionsEnabled; }, [humanExpressionsEnabled]);

  const ttsRateRef = useRef(ttsRate);
  useEffect(() => { ttsRateRef.current = ttsRate; }, [ttsRate]);

  const ttsVolumeRef = useRef(ttsVolume);
  useEffect(() => { ttsVolumeRef.current = ttsVolume; }, [ttsVolume]);
  
  const isAnswered = phase === 'revealing' || phase === 'done';

  const question = questions && questions.length > 0 ? (questions[currentIdx] || questions[0]) : {
    id: 'empty',
    hi: 'No questions available.',
    en: 'Please add questions from the Admin Panel.',
    options: [],
    correctOption: '',
    explanation: { hi: '', en: '' }
  };

  const timerDuration = question.timerSettings || globalTimerDuration;
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const narrationLanguageRef = useRef(narrationLanguage);
  useEffect(() => { narrationLanguageRef.current = narrationLanguage; }, [narrationLanguage]);

  const ttsVoiceGenderRef = useRef(store.ttsVoiceGender);
  useEffect(() => { ttsVoiceGenderRef.current = store.ttsVoiceGender; }, [store.ttsVoiceGender]);

  const voiceModeRef = useRef(voiceMode);
  useEffect(() => { voiceModeRef.current = voiceMode; }, [voiceMode]);

  // Sequence controller
  useEffect(() => {
    if (phase !== 'reading') return;
    
    let isActive = true;
    safeSetTimeLeft(timerDuration);
    setSelectedId(null);

    const runReading = async () => {
        if (!isPreview) cancelAllSpeech();
        
        let initialTimeLeft = timerDuration;
        safeSetTimeLeft(initialTimeLeft);

        if (!speechEnabledRef.current) {
             safeSetPhase('waiting');
             if (!isPreview && !isTimerPaused) {
                store.pushState({ 
                   phase: 'waiting',
                   theme: { ...theme, timerStartTime: Date.now() },
                   timeLeft: timerDuration
                });
             }
             return;
        }
        
        await new Promise(r => setTimeout(r, isPreview ? 500 : 100));
        if (!isActive) return;

        const lang = narrationLanguageRef.current;
        const gender = ttsVoiceGenderRef.current;
        const currentVoiceMode = voiceModeRef.current;
        
        let textParts: string[] = [];

        if (humanExpressionsEnabledRef.current) {
          const phrases = lang === 'hi' ? INTRO_PHRASES_HI : INTRO_PHRASES_EN;
          textParts.push(phrases[Math.floor(Math.random() * phrases.length)]);
        }
        
        textParts.push(lang === 'hi' ? question.hi : question.en);
        
        const labelsHi = ["पहला विकल्प,", "दूसरा विकल्प,", "तीसरा विकल्प,", "चौथा विकल्प,"];
        const labelsEn = ["First option,", "Second option,", "Third option,", "Fourth option,"];
        const labels = lang === 'hi' ? labelsHi : labelsEn;

        for (let i = 0; i < (question.options?.length || 0); i++) {
            const optText = lang === 'hi' ? question.options[i].hi : question.options[i].en;
            textParts.push(`${labels[i]} ${optText}.`);
        }
        
        const fullText = textParts.join(' ');
        
        if (!isPreview) {
            console.log("Playing question narration...");
            
            // Wait for speech to complete entirely
            await speakMergedPromise(fullText, ttsRateRef.current, ttsVolumeRef.current, lang, gender, currentVoiceMode, () => {
                 // Ignore early duration callback to enforce strict sequential queue
            });
            
            if (isActive) {
                console.log("Question narration finished. Starting timer.");
                safeSetPhase('waiting');
                store.pushState({ 
                   phase: 'waiting',
                   theme: { ...theme, timerStartTime: Date.now() },
                   timeLeft: timerDuration,
                   globalTimerDuration: timerDuration
                });
            }
        } else {
            // In preview mode
            await new Promise(r => setTimeout(r, 2000));
            if (isActive) safeSetPhase('waiting');
        }
    };
    runReading();

    return () => {
       isActive = false;
       if (!isPreview) cancelAllSpeech();
    };
  }, [currentIdx, phase, timerDuration, isPreview, speechEnabled]); // Add phase and speechEnabled to dependencies

  // Timer Effect
  useEffect(() => {
      if (phase !== 'waiting' || isTimerPaused) {
        if (timerRef.current) clearInterval(timerRef.current);
        return;
      }
      
      const intervalId = setInterval(() => {
        // Calculate exact time left based on start time if available
        if (theme.timerStartTime) {
            const elapsed = Math.floor((Date.now() - theme.timerStartTime) / 1000);
            const calcLeft = Math.max(0, timerDuration - elapsed);
            
            if (calcLeft <= 0) {
              clearInterval(intervalId);
              safeSetPhase('revealing');
              safeSetTimeLeft(0);
              return;
            }

            if (calcLeft !== timeLeft) {
                safeSetTimeLeft(calcLeft);
            }

            // Sync sounds and logic using calcLeft
            if (humanExpressionsEnabledRef.current && speechEnabledRef.current && !isPreview) {
              const lang = narrationLanguageRef.current;
              const gender = ttsVoiceGenderRef.current;
              const currentVoiceMode = voiceModeRef.current;
              if (calcLeft === 10) {
                   const tones = lang === 'hi' ? ["ध्यान से सोचिए।", "जल्दी जवाब दीजिए।"] : ["Think carefully.", "Answer quickly."];
                   speakFireAndForget(tones[Math.floor(Math.random() * tones.length)], ttsRateRef.current, ttsVolumeRef.current, lang, gender, currentVoiceMode, 1.0);
              }
              if (calcLeft === 5) {
                   const msg = lang === 'hi' ? "जल्दी कीजिए, सिर्फ 5 सेकंड बचे हैं!" : "Hurry up, only 5 seconds left!";
                   speakFireAndForget(msg, ttsRateRef.current * 1.1, ttsVolumeRef.current, lang, gender, currentVoiceMode, 1.1);
              }
            }

            if (calcLeft <= 5 && calcLeft > 0) playSound('tick', speechEnabledRef.current && !isPreview);
        } else {
            // Fallback if no timerStartTime (unlikely with new flow, but good for local preview)
            safeSetTimeLeft(prev => {
              const current = typeof prev === 'function' ? (prev as any)(0) : prev;
              if (current <= 1) {
                clearInterval(intervalId);
                safeSetPhase('revealing');
                return 0;
              }
              return current - 1;
            });
        }
      }, 1000);
      
      timerRef.current = intervalId;
      return () => {
        if (timerRef.current) clearInterval(timerRef.current);
      }
  }, [phase, isTimerPaused, isPreview, theme.timerStartTime]);

  // Reveal effect
  useEffect(() => {
      if (phase !== 'revealing') return;
      
      let isActive = true;
      playSound('correct', speechEnabledRef.current);

      const runReveal = async () => {
          if (!isPreview) cancelAllSpeech();
          const lang = narrationLanguageRef.current;
          const gender = ttsVoiceGenderRef.current;
          const currentVoiceMode = voiceModeRef.current;
          
          if (speechEnabledRef.current) {
              let textParts: string[] = [];
              const phrases = lang === 'hi' ? REVEAL_PHRASES_HI : REVEAL_PHRASES_EN;
              textParts.push(phrases[Math.floor(Math.random() * phrases.length)]);
              
              const correctOpt = question.options.find(o => o.id === question.correctOption);
              if (correctOpt) {
                 const label = lang === 'hi' ? 'विकल्प' : 'Option';
                 const optValue = lang === 'hi' ? correctOpt.hi : correctOpt.en;
                 textParts.push(`${label} ${correctOpt.id}. ${optValue}.`);
              }
              const fullText = textParts.join(' ');
              
              if (!isPreview) {
                 await speakMergedPromise(fullText, ttsRateRef.current, ttsVolumeRef.current, lang, gender, currentVoiceMode, () => {});
              } else {
                 await new Promise(r => setTimeout(r, 2000));
              }
          } else {
              await new Promise(r => setTimeout(r, 1000));
          }
          if (isActive) {
              const delay = quizCompletionMode === 'stop' && currentIdx >= questions.length - 1 ? 5000 : AUTO_NEXT_DELAY;
              setTimeout(() => {
                   if (isActive) handleNext();
              }, isPreview ? 3000 : delay);
          }
      };
      
      runReveal();

      return () => {
          isActive = false;
          if (!isPreview) cancelAllSpeech();
      };
  }, [phase]);

  const handleReveal = () => {
    if (isAnswered) return;
    safePushState({ phase: 'revealing', timeLeft: 0 });
  };

  const handleSkip = () => {
    handleNext();
  };

  const handleNext = () => {
    if (!isPreview) cancelAllSpeech();
    playSound('transition', speechEnabledRef.current);
    
    if (quizCompletionMode === 'stop' && currentIdx >= questions.length - 1) {
       safePushState({ phase: 'done' });
       return;
    }
    
    const nextIdx = currentIdx >= questions.length - 1 ? 0 : currentIdx + 1;
    safePushState({ phase: 'reading', currentIdx: nextIdx });
  };

  const handleOptionClick = (id: string) => {
    if (isAnswered) return;
    setSelectedId(id);
  };


  return (
    <div 
      ref={containerRef} 
      className={`w-full h-full flex items-center justify-center overflow-hidden select-none relative font-sans`}
      style={{ backgroundColor: '#020617' }} // Deep black/slate-950
    >
      
      {/* Empty State Guard - Coming Soon Screen */}
      {questions.length === 0 && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center p-20 text-center bg-[#020617]/90 backdrop-blur-2xl">
            <div className="absolute inset-0 z-0 flex items-center justify-center">
               <div className="w-[800px] h-[800px] rounded-full blur-[120px] opacity-20 bg-neon-cyan"></div>
            </div>
            <div className="relative z-10 flex flex-col items-center">
               <div className="mb-10 w-32 h-32 rounded-3xl flex items-center justify-center border-4 border-cyan-500/40 shadow-[0_0_40px_rgba(6,182,212,0.5)] bg-slate-900/50 text-cyan-400">
                  <Shield size={64} strokeWidth={2} />
               </div>
               <h1 className="text-7xl font-black text-white mb-6 uppercase tracking-tight text-glow-cyan">Coming Soon</h1>
               <p className="text-3xl font-medium tracking-wide text-cyan-400">
                 Live Quiz Session Will Start Shortly
               </p>
            </div>
        </div>
      )}

      {/* TEMPLATE RENDERER */}
      {(() => {
        const props = {
          question,
          currentIdx,
          totalQuestions: questions.length,
          phase,
          timeLeft,
          timerDuration,
          selectedId,
          isAnswered,
          streamTitle,
          sscTitle,
          headerText,
          footerText,
          telegramText,
          bannerText,
          motivationalText,
          viewerCount,
          liveBadgeText,
          catName,
          headerTextDisplay,
          speechEnabled,
          setSpeechEnabled,
          scale,
          theme
        };
        switch (store.themeMode) {
          case 'SSC_SMARTBOARD':
            return <SSCSmartboardQuiz {...props} />;
          case 'EXAM_GK_SLIDE':
            return <ExamGKSlideQuiz {...props} />;
          case 'KBC_STYLE':
            return <KBCStyleQuiz {...props} />;
          case 'PREMIUM_BROADCAST':
          default:
            return <PremiumBroadcast {...props} />;
        }
      })()}
    </div>
  );
}
