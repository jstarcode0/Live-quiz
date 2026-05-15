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

function useContainerScale(containerRef: React.RefObject<HTMLDivElement>) {
  const [scale, setScale] = useState(1);

  useEffect(() => {
    if (!containerRef.current) return;
    
    // Auto-fullscreen logic for broadcast
    const attemptFullscreen = () => {
      if (!document.fullscreenElement && containerRef.current) {
        containerRef.current.requestFullscreen().catch(() => {});
      }
    };
    
    // Try on mount
    attemptFullscreen();
    // Try on any click (requires user interaction for browser security)
    window.addEventListener('click', attemptFullscreen);

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

const getVoice = (lang: 'hi' | 'en', gender: 'male' | 'female' = 'female') => {
  if (typeof window === 'undefined') return null;
  const voices = window.speechSynthesis.getVoices();
  
  const code = lang === 'hi' ? 'hi' : 'en';
  
  const filtered = voices.filter(v => v.lang.toLowerCase().includes(code));
  
  const isTargetGender = (name: string) => {
    name = name.toLowerCase();
    if (gender === 'male') {
       if (lang === 'hi') return name.includes('madhur') || name.includes('rishi') || name.includes('kumar');
       return name.includes('male') || name.includes('guy') || name.includes('david') || name.includes('andrew') || name.includes('brian') || name.includes('christopher') || name.includes('eric') || name.includes('daniel') || name.includes('alex') || name.includes('ryan') || name.includes('william') || name.includes('aaron');
    } else {
       if (lang === 'hi') return name.includes('swara') || name.includes('lekha') || name.includes('neerja');
       return name.includes('female') || name.includes('zira') || name.includes('aria') || name.includes('jenny') || name.includes('samantha') || name.includes('michelle') || name.includes('karen') || name.includes('victoria') || name.includes('monica');
    }
  }

  let bestVoice = filtered.find(v => (v.name.toLowerCase().includes('online') || v.name.toLowerCase().includes('natural') || v.name.toLowerCase().includes('neural')) && isTargetGender(v.name));
  
  if (!bestVoice) bestVoice = filtered.find(v => isTargetGender(v.name));
  if (!bestVoice) bestVoice = filtered.find(v => v.name.toLowerCase().includes('online') || v.name.toLowerCase().includes('natural') || v.name.toLowerCase().includes('neural'));
  if (!bestVoice) bestVoice = filtered[0];

  return bestVoice || null;
};

if (typeof window !== 'undefined' && window.speechSynthesis) {
  window.speechSynthesis.onvoiceschanged = () => {
     // Trigger voice detection
  };
}

const activeUtterances = new Set<SpeechSynthesisUtterance>();

const speakPromise = (text: string, rate: number, volume: number, lang: 'hi' | 'en', gender: 'male' | 'female', pitch: number = 1.0): Promise<void> => {
   return new Promise((resolve) => {
      if (!window.speechSynthesis || volume === 0) {
        resolve();
        return;
      }
      
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.voice = getVoice(lang);
      utterance.lang = lang === 'hi' ? 'hi-IN' : 'en-US';
      utterance.rate = rate;
      utterance.volume = volume;
      utterance.pitch = pitch;
      
      let resolved = false;
      let timeoutId: any;
      
      const finish = () => {
         if (!resolved) {
            resolved = true;
            clearTimeout(timeoutId);
            activeUtterances.delete(utterance);
            resolve();
         }
      };
      
      activeUtterances.add(utterance);
      utterance.onend = finish;
      utterance.onerror = finish;
      timeoutId = setTimeout(finish, (text.length * 150) / rate + 3000);
      
      window.speechSynthesis.speak(utterance);
   });
};

const speakFireAndForget = (text: string, rate: number, volume: number, lang: 'hi' | 'en', gender: 'male' | 'female', pitch: number = 1.0) => {
      if (!window.speechSynthesis || volume === 0) return;
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.voice = getVoice(lang, gender);
      utterance.lang = lang === 'hi' ? 'hi-IN' : 'en-US';
      utterance.rate = rate;
      utterance.volume = volume;
      utterance.pitch = pitch;
      window.speechSynthesis.speak(utterance);
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
  const scale = useContainerScale(containerRef);
  
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
    streamTitle,
    sscTitle,
    viewerCount,
    liveBadgeText,
    footerText,
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

  const isCyberpunk = store.themeMode === 'neon-purple';
  const isTvNews = store.themeMode === 'tv-news';
  const isEsports = store.themeMode === 'red-stream';
  const isGlassPremium = store.themeMode === 'glass-premium';

  const roundness = isEsports || isTvNews ? 'rounded-none' : (isGlassPremium ? 'rounded-[40px]' : 'rounded-3xl');
  const roundnessSm = isEsports || isTvNews ? 'rounded-none' : (isGlassPremium ? 'rounded-[24px]' : 'rounded-2xl');
  const fontFam = isCyberpunk ? 'font-mono' : 'font-sans';
  const clipPathOption = isEsports ? 'polygon(2% 0, 100% 0, 98% 100%, 0% 100%)' : 'none';
  const isGlass = isGlassPremium;
  const glassStyle = isGlass ? { backdropFilter: 'blur(24px)', backgroundColor: `${theme.bgSecondary}15`, border: `1px solid ${theme.bgSecondary}30` } : {};


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
      
      // Unlock SpeechSynthesis
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

  // Sequence controller
  useEffect(() => {
    if (phase !== 'reading') return;
    
    let isActive = true;
    safeSetTimeLeft(timerDuration);
    setSelectedId(null);

    const runReading = async () => {
        if (!isPreview) window.speechSynthesis.cancel();
        
        // Reset timer state effectively before starting narration
        safeSetTimeLeft(timerDuration);

        if (!speechEnabledRef.current) {
             safeSetPhase('waiting');
             // Trigger timer start for non-speech mode
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

        if (humanExpressionsEnabledRef.current) {
          const phrases = lang === 'hi' ? INTRO_PHRASES_HI : INTRO_PHRASES_EN;
          const introPhrase = phrases[Math.floor(Math.random() * phrases.length)];
          if (!isPreview) await speakPromise(introPhrase, ttsRateRef.current, ttsVolumeRef.current, lang, gender, 1.05);
          else await new Promise(r => setTimeout(r, 1000));
        }
        if (!isActive) return;
        
        if (speechEnabledRef.current) {
            const textToSpeak = lang === 'hi' ? question.hi : question.en;
            if (!isPreview) await speakPromise(textToSpeak, ttsRateRef.current, ttsVolumeRef.current, lang, gender, 1.0);
            else await new Promise(r => setTimeout(r, 1500));
        }
        if (!isActive) return;
        
        const labelsHi = ["पहला विकल्प,", "दूसरा विकल्प,", "तीसरा विकल्प,", "चौथा विकल्प,"];
        const labelsEn = ["First option,", "Second option,", "Third option,", "Fourth option,"];
        const labels = lang === 'hi' ? labelsHi : labelsEn;

        for (let i = 0; i < (question.options?.length || 0); i++) {
            if (!isActive) return;
            if (speechEnabledRef.current) {
                const optText = lang === 'hi' ? question.options[i].hi : question.options[i].en;
                if (!isPreview) await speakPromise(`${labels[i]} ${optText}`, ttsRateRef.current, ttsVolumeRef.current, lang, gender, 1.0);
                else await new Promise(r => setTimeout(r, 800));
            }
        }
        
        if (isActive) {
            safeSetPhase('waiting');
            // CRITICAL: The Master Start Point for the Timer
            if (!isPreview) {
                // We update the server with the start time precisely when narration ends
                store.pushState({ 
                   phase: 'waiting',
                   theme: { ...theme, timerStartTime: Date.now() },
                   timeLeft: timerDuration
                });
            }
        }
    };
    runReading();

    return () => {
       isActive = false;
       if (!isPreview) window.speechSynthesis.cancel();
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
              if (calcLeft === 10) {
                   const tones = lang === 'hi' ? ["ध्यान से सोचिए।", "जल्दी जवाब दीजिए।"] : ["Think carefully.", "Answer quickly."];
                   speakFireAndForget(tones[Math.floor(Math.random() * tones.length)], ttsRateRef.current, ttsVolumeRef.current, lang, gender, 1.0);
              }
              if (calcLeft === 5) {
                   const msg = lang === 'hi' ? "जल्दी कीजिए, सिर्फ 5 सेकंड बचे हैं!" : "Hurry up, only 5 seconds left!";
                   speakFireAndForget(msg, ttsRateRef.current * 1.1, ttsVolumeRef.current, lang, gender, 1.1);
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
          if (!isPreview) window.speechSynthesis.cancel();
          const lang = narrationLanguageRef.current;
          const gender = ttsVoiceGenderRef.current;
          
          if (speechEnabledRef.current) {
              const phrases = lang === 'hi' ? REVEAL_PHRASES_HI : REVEAL_PHRASES_EN;
              const revealPhrase = phrases[Math.floor(Math.random() * phrases.length)];
              if (!isPreview) await speakPromise(revealPhrase, ttsRateRef.current, ttsVolumeRef.current, lang, gender, 1.05);
              else await new Promise(r => setTimeout(r, 1000));
              if (!isActive) return;
              
              const correctOpt = question.options.find(o => o.id === question.correctOption);
              if (correctOpt) {
                 const label = lang === 'hi' ? 'विकल्प' : 'Option';
                 const optValue = lang === 'hi' ? correctOpt.hi : correctOpt.en;
                 if (!isPreview) await speakPromise(`${label} ${correctOpt.id}. ${optValue}`, ttsRateRef.current, ttsVolumeRef.current, lang, gender, 1.1);
                 else await new Promise(r => setTimeout(r, 1200));
              }
          } else {
              await new Promise(r => setTimeout(r, 1000));
          }
          if (isActive) {
              setTimeout(() => {
                   if (isActive) handleNext();
              }, isPreview ? 3000 : AUTO_NEXT_DELAY);
          }
      };
      
      runReveal();

      return () => {
          isActive = false;
          if (!isPreview) window.speechSynthesis.cancel();
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
    if (!isPreview) window.speechSynthesis.cancel();
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

      {/* PERFECT 16:9 1920x1080 CANVAS */}
      <div 
        className="relative flex flex-col shrink-0 origin-center bg-[#050b1a]"
        style={{
          width: '1920px',
          height: '1080px',
          transform: `scale(${scale})`,
        }}
      >
        {/* Cinematic Ambient Glow Elements */}
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/20 blur-[130px] rounded-full pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-cyan-600/20 blur-[150px] rounded-full pointer-events-none" />

        {/* ==================================== */}
        {/* HEADER */}
        {/* ==================================== */}
        <header className="h-[120px] w-full px-10 flex items-center justify-between relative z-10 bg-gradient-to-b from-[#010409]/90 to-[#010409]/50 backdrop-blur-xl border-b border-cyan-400/20 shadow-[0_5px_40px_rgba(6,182,212,0.1)]">
          <div className="flex items-center gap-5 w-[420px]">
            <div className="w-[72px] h-[72px] rounded-2xl flex items-center justify-center border-[2px] border-cyan-400/50 text-cyan-300 bg-cyan-900/20 shadow-[inset_0_0_20px_rgba(6,182,212,0.2)]">
              <Shield size={40} strokeWidth={2.5} className="drop-shadow-[0_0_8px_rgba(6,182,212,0.8)]" />
            </div>
            <div className="flex flex-col">
              <span className="text-[32px] font-black tracking-tight text-white leading-none text-glow-cyan text-shadow-md">{streamTitle || "SSC LIVE QUIZ"}</span>
              <span className="font-extrabold tracking-[0.25em] text-cyan-400 text-[13px] uppercase mt-2 drop-shadow-md">Premium Broadcast</span>
            </div>
          </div>

          <div className="flex-1 flex justify-center">
            <h1 className="text-[42px] font-black text-transparent bg-clip-text bg-gradient-to-b from-white via-cyan-100 to-cyan-500 uppercase tracking-wider filter drop-shadow-[0_0_15px_rgba(6,182,212,0.3)] text-shadow-md">
              {headerTextDisplay || "SSC CGL EXAM PREPARATION"}
            </h1>
          </div>

          <div className="flex items-center gap-6 w-[420px] justify-end">
            <div className="flex items-center gap-3 p-2.5 rounded-xl bg-black/50 border border-slate-800 shadow-inner">
              <button 
                  onClick={() => setSpeechEnabled(!speechEnabled)}
                  className={`p-2.5 rounded-lg transition-all duration-300 ${speechEnabled ? 'text-cyan-400 shadow-[inset_0_0_15px_rgba(6,182,212,0.3)] bg-cyan-900/30 border border-cyan-500/30' : 'text-slate-600'}`}
               >
                  {speechEnabled ? <Volume2 size={26} /> : <VolumeX size={26} />}
               </button>
            </div>
            
            <div className="flex items-center gap-3 px-6 py-2.5 rounded-xl border border-cyan-400/40 font-black text-2xl tracking-[0.15em] uppercase bg-cyan-950/40 text-cyan-300 shadow-[0_0_20px_rgba(6,182,212,0.15)]">
              <motion.div animate={{opacity: [1,0.2,1], scale: [1,1.2,1]}} transition={{repeat: Infinity, duration: 1.5, ease: "easeInOut"}} className="w-4 h-4 rounded-full bg-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.8)]" />
              {liveBadgeText || "LIVE"}
            </div>
            
            <div className="flex items-center gap-2.5 text-white px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-950/30 to-black border border-slate-700/50 font-bold text-2xl shadow-inner">
              <Users size={28} className="text-cyan-400 drop-shadow-[0_0_5px_rgba(6,182,212,0.5)]"/> 
              <span className="tracking-wider">{viewerCount.toLocaleString()}</span>
            </div>
          </div>
        </header>

        {/* ==================================== */}
        {/* MAIN BODY LAYOUT */}
        {/* ==================================== */}
        <main className="flex-1 w-full px-10 pt-8 pb-6 flex gap-10 relative z-10 overflow-hidden">
          
          {/* ------------------------------------ */}
          {/* LEFT PANEL : Question Area */}
          {/* ------------------------------------ */}
          <section className="flex-[3.5] flex flex-col gap-6 w-full max-w-[1350px]">
            
            {/* Cinematic Question Box */}
            <div className="flex-1 rounded-[32px] border border-cyan-500/20 bg-gradient-to-br from-[#050b1a]/95 to-[#010409]/95 backdrop-blur-3xl p-10 flex flex-col relative overflow-hidden shadow-[inset_0_0_100px_rgba(6,182,212,0.03),0_10px_30px_rgba(0,0,0,0.5)]">
              {/* Subtle ambient scanline overlay */}
              <div className="absolute inset-0 pointer-events-none opacity-[0.02] bg-[max(1px,0.1vw)_max(1px,0.1vw)]" style={{backgroundImage: 'linear-gradient(rgba(255, 255, 255, 0.5) 1px, transparent 1px)'}}></div>
              <div className="absolute top-0 right-0 w-[40%] h-full bg-gradient-to-l from-cyan-900/10 to-transparent pointer-events-none"></div>

              {/* Progress Bar */}
              <div className="flex items-center gap-6 mb-8 shrink-0 relative z-10">
                <div className="bg-cyan-950/40 border border-cyan-400/20 text-cyan-300 px-6 py-2.5 rounded-xl font-black tracking-widest text-xl uppercase flex items-center gap-4 shadow-[0_0_15px_rgba(6,182,212,0.1)]">
                  <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 glow-cyan"></div>
                  Q. {Number.isFinite(currentIdx) && currentIdx >= 0 ? currentIdx + 1 : 1}
                </div>
                <div className="flex-1 h-2 rounded-full bg-[#010409] overflow-hidden border border-white/5 relative shadow-inner">
                    <motion.div 
                      key="progress"
                      initial={{width: `${(questions.length > 0 ? (Number.isFinite(currentIdx) && currentIdx >= 0 ? currentIdx : 0)/questions.length : 0)*100}%`}} 
                      animate={{width: `${(questions.length > 0 ? ((Number.isFinite(currentIdx) && currentIdx >= 0 ? currentIdx : 0)+1)/questions.length : 0)*100}%`}} 
                      transition={{duration: 0.8, ease: "easeInOut"}}
                      className="absolute left-0 top-0 bottom-0 bg-cyan-400 shadow-[0_0_20px_#06b6d4]" 
                    />
                </div>
              </div>

              {/* Typography Box */}
              <AnimatePresence mode="wait">
                 <motion.div 
                    key={currentIdx}
                    initial={{opacity: 0, scale: 0.99, y: 10}}
                    animate={{opacity: 1, scale: 1, y: 0}}
                    exit={{opacity: 0, scale: 0.99, y: -10}}
                    transition={{duration: 0.4, ease: "easeOut"}}
                    className="flex flex-col flex-1 relative z-10 justify-between gap-8 h-full"
                 >
                    <div className="flex-1 flex flex-col justify-center max-w-[85%] pr-10">
                       <h2 className="text-[56px] tracking-tight leading-[1.25] font-extrabold text-white font-devanagari drop-shadow-xl antialiased optimizeLegibility" style={{ textShadow: '0 4px 15px rgba(0,0,0,0.8)' }}>{question.hi}</h2>
                       <h3 className="text-[26px] mt-6 font-semibold text-cyan-100/60 leading-[1.4] tracking-wide optimizeLegibility antialiased">{question.en}</h3>
                    </div>

                    {/* Options (Stacked) */}
                    <div className="flex flex-col gap-4 mt-auto shrink-0 pb-2">
                      {question.options?.map((opt, i) => {
                        const badges = ['A', 'B', 'C', 'D'];
                        const badge = badges[i] || `${i+1}`;
                        const isSelected = selectedId === opt.id;
                        const isCorrect = isAnswered && opt.id === question.correctOption;
                        const isWrong = isAnswered && isSelected && opt.id !== question.correctOption;

                        // Strict Black/White/Cyan palette
                        let bgClass = "bg-[#050b1a]/40 bg-gradient-to-r from-transparent to-[#0a132e]/40";
                        let borderClass = "border-slate-800/80";
                        let badgeBg = "bg-[#010409] border border-slate-700/50";
                        let badgeText = "text-cyan-500";
                        let textHi = "text-slate-200";
                        let textEn = "text-slate-400";
                        let glowClass = "hover:shadow-[0_0_20px_rgba(6,182,212,0.1)] hover:border-cyan-500/30 transition-all duration-300";
                        let innerGlow = "";

                        if (isCorrect) {
                            bgClass = "bg-cyan-950/40 bg-gradient-to-r from-cyan-900/60 to-[#050b1a]/90 relative overflow-hidden";
                            borderClass = "border-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.2)]";
                            badgeBg = "bg-cyan-500 border-none shadow-[0_0_15px_rgba(6,182,212,0.8)]";
                            badgeText = "text-white";
                            textHi = "text-white font-black drop-shadow-[0_0_8px_rgba(6,182,212,0.5)]";
                            textEn = "text-cyan-50 font-bold";
                            glowClass = "";
                            innerGlow = "shadow-[inset_0_0_20px_rgba(6,182,212,0.15)]";
                        } else if (isWrong) {
                            bgClass = "bg-[#010409]/80 opacity-40";
                            borderClass = "border-slate-800";
                            badgeBg = "bg-[#010409] border-slate-800";
                            badgeText = "text-slate-600";
                            textHi = "text-slate-500";
                            textEn = "text-slate-600";
                            glowClass = "";
                        } else if (isSelected && !isAnswered) {
                            bgClass = "bg-cyan-950/20 bg-gradient-to-r from-cyan-900/20 to-transparent";
                            borderClass = "border-cyan-500/50 shadow-[0_0_15px_rgba(6,182,212,0.1)]";
                            badgeBg = "bg-cyan-900 border border-cyan-500/50 text-cyan-100";
                            glowClass = "";
                            innerGlow = "shadow-[inset_0_0_10px_rgba(6,182,212,0.1)]";
                        }

                        return (
                          <motion.div 
                            key={opt.id}
                            className={`w-full text-left p-4 rounded-2xl border-2 flex items-center transition-all duration-500 ${bgClass} ${borderClass} ${glowClass} ${innerGlow}`}
                          >
                             {isCorrect && (
                                <motion.div 
                                  initial={{ x: '-100%', opacity: 0 }}
                                  animate={{ x: '100%', opacity: [0, 1, 0] }}
                                  transition={{ repeat: Infinity, duration: 1.5, ease: "easeOut" }}
                                  className="absolute inset-0 bg-gradient-to-r from-transparent via-cyan-200/10 to-transparent pointer-events-none"
                                />
                             )}
                             <div className={`w-[64px] h-[64px] rounded-xl flex items-center justify-center text-[30px] font-black mr-6 shrink-0 transition-colors z-10 ${badgeBg} ${badgeText}`}>
                               {badge}
                             </div>
                             <div className="flex flex-col flex-1 pl-2 z-10">
                                <span className={`text-[36px] font-black font-devanagari leading-tight tracking-wide antialiased optimizeLegibility ${textHi}`}>
                                  {opt.hi}
                                </span>
                                <span className={`text-[20px] mt-1.5 font-medium tracking-wide antialiased optimizeLegibility ${textEn}`}>
                                  {opt.en}
                                </span>
                             </div>
                             
                             {isCorrect && (
                               <motion.div initial={{scale:0, rotate: -45, opacity: 0}} animate={{scale:1, rotate: 0, opacity: 1}} transition={{type: "spring", stiffness: 150}} className="shrink-0 pl-6 pr-4 z-10">
                                 <motion.div animate={{scale: [1, 1.05, 1], filter: ['drop-shadow(0 0 10px rgba(6,182,212,0.8))', 'drop-shadow(0 0 20px rgba(6,182,212,1))', 'drop-shadow(0 0 10px rgba(6,182,212,0.8))']}} transition={{repeat: Infinity, duration: 2}}>
                                    <CheckCircle2 size={56} className="text-white" strokeWidth={2.5} />
                                 </motion.div>
                               </motion.div>
                             )}
                          </motion.div>
                        )
                      })}
                    </div>
                 </motion.div>
              </AnimatePresence>
            </div>

          </section>

          {/* ------------------------------------ */}
          {/* RIGHT PANEL : Timer + Logic */}
          {/* ------------------------------------ */}
          <aside className="w-[420px] shrink-0 flex flex-col gap-6">
            
            {/* EXACT Circular Timer - Strict cyan/white/black theme */}
            <div className="h-[280px] rounded-[32px] border border-cyan-500/10 bg-gradient-to-b from-[#050b1a]/95 to-[#010409]/95 backdrop-blur-2xl flex flex-col items-center justify-center relative shadow-[inset_0_0_50px_rgba(6,182,212,0.02),0_10px_30px_rgba(0,0,0,0.5)] overflow-hidden">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-cyan-500/10 blur-[60px] rounded-full pointer-events-none"></div>
                
                <div className="absolute top-6 left-0 right-0 flex justify-center items-center gap-3">
                   <div className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse"></div>
                   <h3 className="font-bold tracking-[0.2em] text-cyan-400/80 text-[11px] uppercase opacity-80">Live Countdown</h3>
                   <div className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse"></div>
                </div>
                
                <div className="relative w-[150px] h-[150px] flex items-center justify-center mt-4">
                 <svg className="absolute inset-0 w-full h-full -rotate-90">
                   {/* Background track */}
                   <circle cx="75" cy="75" r="68" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="4" />
                   {/* Progress stroke */}
                   <motion.circle 
                     cx="75" cy="75" r="68" fill="none" 
                     stroke={timeLeft <= 5 ? '#ffffff' : '#06b6d4'} 
                     strokeWidth="4" 
                     strokeLinecap="round" 
                     className={timeLeft <= 5 ? 'drop-shadow-[0_0_15px_rgba(255,255,255,0.8)]' : 'drop-shadow-[0_0_10px_rgba(6,182,212,0.5)]'}
                     strokeDasharray={427.25} 
                     strokeDashoffset={427.25 - (Math.max(0, Number(timeLeft) || 0) / Math.max(1, Number(timerDuration) || 15)) * 427.25}
                     transition={{ duration: 1, ease: "linear" }}
                   />
                 </svg>
                 <div className={`text-[68px] font-black tabular-nums tracking-tighter filter drop-shadow-lg z-10 ${timeLeft <= 5 ? 'text-white animate-pulse text-shadow-md' : 'text-cyan-50'}`}>
                   {String(Math.max(0, Number(timeLeft) || 0)).padStart(2, '0')}
                 </div>
               </div>
            </div>

            {/* Explanation / Premium Dark Glass Card */}
            <div className="flex-1 rounded-[32px] border border-cyan-500/10 bg-gradient-to-b from-[#050b1a]/95 to-[#010409]/95 backdrop-blur-2xl py-8 px-8 flex flex-col relative overflow-hidden shadow-[inset_0_0_40px_rgba(6,182,212,0.02),0_10px_30px_rgba(0,0,0,0.5)]">
              
              {isAnswered ? (
                <motion.div 
                   key={`exp-${currentIdx}`}
                   initial={{opacity:0, y:20}} 
                   animate={{opacity:1, y:0}} 
                   transition={{duration: 0.5, ease: "easeOut"}}
                   className="flex-1 flex flex-col h-full"
                >
                  <div className="inline-flex px-4 py-1.5 rounded-lg border border-cyan-500/30 bg-cyan-950/40 text-cyan-300 font-bold text-[13px] mb-6 items-center gap-2.5 uppercase tracking-widest self-start shadow-[0_0_10px_rgba(6,182,212,0.1)]">
                    <CheckCircle size={18} strokeWidth={2.5} /> <span className="opacity-90">Expert Analysis</span>
                  </div>
                  
                  <div className="overflow-y-auto styled-scrollbar pr-4 flex-1">
                    <div className="text-[28px] font-extrabold text-white font-devanagari leading-[1.4] mb-5 antialiased optimizeLegibility tracking-wide drop-shadow-sm">
                      {question.explanation.hi}
                    </div>
                    <div className="text-[18px] font-semibold text-slate-400 leading-relaxed antialiased optimizeLegibility">
                      {question.explanation.en}
                    </div>
                  </div>
                </motion.div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center opacity-70">
                  <div className="relative w-28 h-28 mb-8 flex items-center justify-center">
                    {/* Futuristic Analyzer Animation */}
                    <motion.div 
                       animate={{ rotate: 360 }} 
                       transition={{ repeat: Infinity, duration: 8, ease: "linear" }}
                       className="absolute inset-0 rounded-full border-[2px] border-dashed border-cyan-500/20"
                    />
                    <motion.div 
                       animate={{ rotate: -360 }} 
                       transition={{ repeat: Infinity, duration: 12, ease: "linear" }}
                       className="absolute inset-4 rounded-full border-[1px] border-cyan-500/30 glow-cyan"
                    />
                    
                    {/* Waveform Visualizer */}
                    <div className="flex items-end gap-1.5 h-8 z-10">
                       <motion.div animate={{height: ['20%', '80%', '40%', '100%', '20%']}} transition={{repeat: Infinity, duration: 1.2, ease: "easeInOut"}} className="w-1.5 bg-cyan-400/80 rounded-full glow-cyan" />
                       <motion.div animate={{height: ['60%', '20%', '100%', '40%', '60%']}} transition={{repeat: Infinity, duration: 1.4, ease: "easeInOut"}} className="w-1.5 bg-cyan-400/80 rounded-full glow-cyan" />
                       <motion.div animate={{height: ['40%', '100%', '20%', '80%', '40%']}} transition={{repeat: Infinity, duration: 1.1, ease: "easeInOut"}} className="w-1.5 bg-cyan-400/80 rounded-full glow-cyan" />
                       <motion.div animate={{height: ['100%', '40%', '80%', '20%', '100%']}} transition={{repeat: Infinity, duration: 1.3, ease: "easeInOut"}} className="w-1.5 bg-cyan-400/80 rounded-full glow-cyan" />
                       <motion.div animate={{height: ['80%', '20%', '100%', '60%', '80%']}} transition={{repeat: Infinity, duration: 1.5, ease: "easeInOut"}} className="w-1.5 bg-cyan-400/80 rounded-full glow-cyan" />
                    </div>
                  </div>
                  <p className="text-[18px] font-black text-cyan-200/80 text-center uppercase tracking-[0.2em] leading-relaxed drop-shadow-sm">
                    Synthesizing<br/>Live Insights
                  </p>
                  <div className="mt-6 flex gap-2 opacity-80">
                    <motion.div animate={{scale: [1,1.5,1], opacity: [0.3,1,0.3]}} transition={{repeat:Infinity, delay:0, duration:1.5}} className="w-1.5 h-1.5 rounded-full bg-cyan-400 glow-cyan" />
                    <motion.div animate={{scale: [1,1.5,1], opacity: [0.3,1,0.3]}} transition={{repeat:Infinity, delay:0.2, duration:1.5}} className="w-1.5 h-1.5 rounded-full bg-cyan-400 glow-cyan" />
                    <motion.div animate={{scale: [1,1.5,1], opacity: [0.3,1,0.3]}} transition={{repeat:Infinity, delay:0.4, duration:1.5}} className="w-1.5 h-1.5 rounded-full bg-cyan-400 glow-cyan" />
                  </div>
                </div>
              )}
            </div>

          </aside>
        </main>

        {/* ==================================== */}
        {/* BOTTOM INFO BAR */}
        {/* ==================================== */}
        <footer className="h-[76px] w-full px-10 py-0 border-t border-cyan-500/20 bg-gradient-to-r from-[#010409] via-[#050b1a] to-[#010409] flex items-center justify-between text-slate-400 relative z-10 shadow-[0_-15px_30px_rgba(0,0,0,0.8)] backdrop-blur-md">
           <div className="flex items-center h-full">
               <div className="flex items-center gap-4 h-full border-r border-slate-800/80 pr-10 hover:bg-white/5 transition-colors cursor-default">
                  <span className="font-bold text-[12px] tracking-[0.15em] uppercase text-slate-500">Live Subject</span>
                  <span className="font-black text-[22px] text-white tracking-wider drop-shadow-sm">Polity / GK</span>
               </div>
               <div className="flex items-center gap-4 h-full border-r border-slate-800/80 px-10 hover:bg-white/5 transition-colors cursor-default">
                  <span className="font-bold text-[12px] tracking-[0.15em] uppercase text-slate-500">Difficulty</span>
                  <span className="font-black text-[22px] text-cyan-200 tracking-wider flex items-center gap-2">
                     <div className="flex gap-1 opacity-80">
                        <div className="w-2 h-4 bg-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.5)]"></div>
                        <div className="w-2 h-4 bg-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.5)]"></div>
                        <div className="w-2 h-4 bg-slate-800"></div>
                     </div>
                     MODERATE
                  </span>
               </div>
               <div className="flex items-center gap-4 h-full border-r border-slate-800/80 px-10 hover:bg-white/5 transition-colors cursor-default">
                  <span className="font-bold text-[12px] tracking-[0.15em] uppercase text-slate-500">Avg Accuracy</span>
                  <span className="font-black text-[22px] text-white tracking-wider">68%</span>
               </div>
               <div className="flex items-center gap-4 h-full px-10 bg-cyan-950/20 relative overflow-hidden group hover:bg-cyan-950/40 transition-colors cursor-default">
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-cyan-400/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                  <span className="font-bold text-[12px] tracking-[0.15em] uppercase text-cyan-500/80">Predicted AIR</span>
                  <span className="font-black text-[24px] text-cyan-300 tracking-wider drop-shadow-[0_0_8px_rgba(6,182,212,0.5)]">#412</span>
               </div>
           </div>

           <div className="text-right flex items-center gap-6">
              <span className="font-black text-[24px] text-white tracking-widest italic text-glow-cyan drop-shadow-lg">सफलता मेहनत मांगती है!</span>
              <div className="w-1.5 h-1.5 rounded-full bg-cyan-500/80 glow-cyan"></div>
              <span className="font-extrabold text-[13px] uppercase tracking-[0.25em] text-[#0ea5e9]">Keep Learning, Keep Growing</span>
           </div>
        </footer>

      </div>
    </div>
  );
}
