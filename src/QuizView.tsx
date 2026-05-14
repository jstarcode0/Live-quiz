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
      className={`w-full h-full flex items-center justify-center overflow-hidden select-none relative ${fontFam}`}
      style={{ backgroundColor: theme.bgPrimary }}
    >
      
      {/* Empty State Guard - Coming Soon Screen */}
      {questions.length === 0 && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center p-20 text-center bg-black/90 backdrop-blur-2xl">
            <div className="absolute inset-0 z-0">
               <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full blur-[100px] opacity-20" style={{ backgroundColor: theme.accentColor }}></div>
            </div>
            <div className="relative z-10 flex flex-col items-center">
               <div className="mb-10 w-32 h-32 rounded-3xl flex items-center justify-center border-4 shadow-2xl animate-pulse" style={{ backgroundColor: theme.bgSecondary, borderColor: `${theme.accentColor}40`, color: theme.accentColor }}>
                  <Shield size={64} strokeWidth={2} />
               </div>
               <h1 className="text-7xl font-black text-white mb-6 uppercase tracking-[-0.05em]" style={{ textShadow: `0 0 40px ${theme.accentColor}80` }}>Coming Soon</h1>
               <p className="text-3xl font-medium tracking-wide" style={{ color: theme.accentColor }}>
                 Live Quiz Session Will Start Shortly
               </p>
               <div className="mt-16 flex items-center gap-4 px-8 py-4 rounded-full border-2 bg-black/50" style={{ borderColor: `${theme.liveBadgeColor}40` }}>
                  <div className="w-4 h-4 rounded-full animate-pulse" style={{ backgroundColor: theme.liveBadgeColor, boxShadow: `0 0 20px ${theme.liveBadgeColor}` }}></div>
                  <span className="text-xl font-bold uppercase tracking-widest" style={{ color: theme.liveBadgeColor }}>Stay Tuned</span>
               </div>
            </div>
        </div>
      )}

      {/* Mobile Orientation Hint */}
      <AnimatePresence>
        {isPortrait && !isPreview && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[300] bg-slate-950 flex flex-col items-center justify-center p-8 text-center"
          >
             <div className="w-20 h-20 bg-slate-900 border border-slate-800 rounded-2xl flex items-center justify-center mb-8 animate-pulse" style={{ backgroundColor: theme.bgSecondary }}>
                <motion.div
                  animate={{ rotate: 90 }}
                  transition={{ repeat: Infinity, duration: 2, repeatDelay: 1 }}
                >
                  <Tv size={40} style={{ color: theme.accentColor }} />
                </motion.div>
             </div>
             <h2 className="text-2xl font-black text-white mb-2 uppercase italic" style={{ color: theme.textPrimary }}>Landscape Mode Recommended</h2>
             <p className="text-slate-500 font-medium" style={{ color: theme.textSecondary }}>Please rotate your device for the full 16:9 streaming experience.</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Fullscreen Hint Overlay */}
      <AnimatePresence>
        {showFullscreenHint && !isFullscreen && !isPreview && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => {
              toggleFullscreen();
              setShowFullscreenHint(false);
            }}
            className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-md flex flex-col items-center justify-center p-10 text-center cursor-pointer"
          >
            <div className="w-24 h-24 rounded-full flex items-center justify-center mb-8 animate-bounce shadow-[0_0_50px_rgba(34,211,238,0.5)]" style={{ backgroundColor: theme.accentColor }}>
               <Tv size={48} className="text-black" />
            </div>
            <h2 className="text-4xl font-black text-white mb-4 uppercase tracking-tighter" style={{ color: theme.textPrimary }}>Enter Fullscreen Mode</h2>
            <p className="font-bold text-xl mb-8 max-w-md" style={{ color: theme.accentColor }}>Please tap anywhere to maximize the streaming canvas for the best experience.</p>
            <div className="px-10 py-4 bg-white text-black font-black text-2xl rounded-2xl uppercase tracking-widest shadow-xl">
               Start Live Stream
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* PERFECT 16:9 1920x1080 CANVAS */}
      <div 
        className="relative flex flex-col shrink-0 origin-center shadow-[0_0_150px_rgba(0,0,0,0.9)]"
        style={{
          width: '1920px',
          height: '1080px',
          transform: `scale(${scale})`,
          backgroundColor: theme.bgSecondary
        }}
      >
        {/* Cinematic Ambient Glow Elements */}
        <div className="absolute inset-x-0 -top-[200px] h-[400px] blur-[150px] pointer-events-none opacity-40" style={{ backgroundColor: theme.glowColor }} />
        <div className="absolute inset-x-0 -bottom-[200px] h-[400px] blur-[150px] pointer-events-none opacity-40" style={{ backgroundColor: theme.glowColor }} />
        <div className="absolute inset-y-0 -left-[100px] w-[300px] blur-[120px] pointer-events-none opacity-20" style={{ backgroundColor: theme.glowColor }} />
        <div className="absolute -inset-[2px] border-[2px] rounded-2xl pointer-events-none opacity-20" style={{ borderColor: theme.accentColor }} />

        {/* ==================================== */}
        {/* HEADER */}
        {/* ==================================== */}
        <header className={`h-[120px] w-[1840px] mt-8 mx-10 shrink-0 ${roundness} px-10 flex items-center justify-between relative z-10 shadow-[0_15px_40px_rgba(0,0,0,0.4)] border-b-[6px]`} style={{ backgroundColor: theme.headerBg, borderColor: theme.accentColor, color: theme.headerText, clipPath: clipPathOption }}>
          <CopyLogo streamTitle={streamTitle} sscTitle={sscTitle} theme={theme} />

          <div className="flex-1 flex flex-col items-center justify-center">
            <h1 className="text-[46px] font-black uppercase tracking-tight leading-tight" style={{ color: theme.headerText }}>{headerTextDisplay}</h1>
          </div>

          <div className="flex items-center gap-4 flex-1 justify-end">
             <div className="flex items-center gap-3 p-2 rounded-2xl border" style={{ backgroundColor: `${theme.accentColor}10`, borderColor: `${theme.accentColor}20` }}>
               <button 
                  onClick={() => setSpeechEnabled(!speechEnabled)}
                  className={`w-[52px] h-[52px] flex items-center justify-center rounded-xl transition-colors shrink-0 ${speechEnabled ? 'bg-white/10 text-white' : 'bg-white/5 text-white/40'}`}
                  title={speechEnabled ? "Disable Auto TTS" : "Enable Auto TTS"}
               >
                  {speechEnabled ? <Volume2 size={28} /> : <VolumeX size={28} />}
               </button>
               <div className="flex flex-col gap-1 w-24 px-2">
                 <div className="flex items-center gap-2 justify-between">
                   <span className="text-[11px] font-bold text-white/40 uppercase tracking-wider">Speed</span>
                   <span className="text-[11px] font-black text-white uppercase tracking-wider">{ttsRate}x</span>
                 </div>
                 <input type="range" min="0.5" max="1.5" step="0.1" value={ttsRate} onChange={e => setTtsRate(parseFloat(e.target.value))} className="w-full h-1" />
               </div>
               <div className="flex flex-col gap-1 w-24 px-2 border-l border-white/10 pl-4">
                 <div className="flex items-center gap-2 justify-between">
                   <span className="text-[11px] font-bold text-white/40 uppercase tracking-wider">Vol</span>
                   <span className="text-[11px] font-black text-white uppercase tracking-wider">{Math.round(ttsVolume * 10)}</span>
                 </div>
                 <input type="range" min="0" max="1" step="0.1" value={ttsVolume} onChange={e => setTtsVolume(parseFloat(e.target.value))} className="w-full h-1" />
               </div>
             </div>
            <div className="flex items-center gap-4 px-6 py-[14px] rounded-2xl border-2 font-black text-2xl tracking-widest uppercase" style={{ backgroundColor: `${theme.liveBadgeColor}15`, borderColor: `${theme.liveBadgeColor}30`, color: theme.liveBadgeColor }}>
              <motion.div animate={{opacity: [1,0.4,1]}} transition={{repeat: Infinity, duration: 1.5}} className="w-5 h-5 rounded-full shadow-[0_0_20px]" style={{ backgroundColor: theme.liveBadgeColor }} />
              {liveBadgeText}
            </div>
            <div className="flex items-center gap-3 text-white/80 px-6 py-[14px] rounded-2xl border font-bold text-2xl" style={{ backgroundColor: `${theme.accentColor}10`, borderColor: `${theme.accentColor}20` }}>
              <Users size={28} className="text-white/40"/> {viewerCount.toLocaleString()}
            </div>
          </div>
        </header>

        {/* ==================================== */}
        {/* MAIN BODY LAYOUT (TWO COLUMNS) */}
        {/* ==================================== */}
        <main className="flex-1 w-[1840px] mx-10 mt-8 flex gap-10 min-h-0 relative z-10">
          
          {/* ------------------------------------ */}
          {/* LEFT PANEL (~70%) : Question Area */}
          {/* ------------------------------------ */}
          <section className="w-[1250px] flex flex-col gap-5 min-h-0">
            
              {/* LARGE Cinematic Question Box */}
            <div 
                className={`flex-1 border-[2px] p-10 flex flex-col relative overflow-hidden min-h-0 ${roundness}`} 
                style={{ 
                    backgroundColor: theme.bgPrimary, 
                    borderColor: `${theme.accentColor}30`,
                    boxShadow: `0 0 ${40 * theme.neonIntensity + 20}px ${theme.glowColor}10`,
                    clipPath: clipPathOption,
                    ...glassStyle
                }}
            >
              
              {/* Box Top Actions / Progress */}
              <div className="flex items-center justify-between mb-6 pb-5 border-b border-white/5 shrink-0">
                <div className={`px-8 py-3 font-black tracking-widest text-xl flex items-center gap-4 border uppercase ${roundnessSm}`} style={{ backgroundColor: `${theme.accentColor}10`, color: theme.accentColor, borderColor: `${theme.accentColor}30` }}>
                  <div className="w-[10px] h-[10px] rounded-full" style={{ backgroundColor: theme.accentColor, boxShadow: `0 0 15px ${theme.accentColor}` }}></div>
                  Question {Number.isFinite(currentIdx) && currentIdx >= 0 ? currentIdx + 1 : 1} of {questions.length}
                </div>
                <div className="w-[450px]">
                  <div className="flex justify-between items-center mb-3 px-1">
                    <span className="font-bold text-lg uppercase tracking-widest" style={{ color: theme.textSecondary }}>Progress</span>
                    <span className="font-black text-xl" style={{ color: theme.accentColor }}>{questions.length > 0 ? Math.round((((Number.isFinite(currentIdx) && currentIdx >= 0 ? currentIdx : 0) + 1)/questions.length)*100) : 0}%</span>
                  </div>
                  <div className="h-4 w-full bg-white/5 rounded-full overflow-hidden border border-white/5 relative">
                    <motion.div 
                      key="progress"
                      initial={{width: `${(questions.length > 0 ? (Number.isFinite(currentIdx) && currentIdx >= 0 ? currentIdx : 0)/questions.length : 0)*100}%`}} 
                      animate={{width: `${(questions.length > 0 ? ((Number.isFinite(currentIdx) && currentIdx >= 0 ? currentIdx : 0)+1)/questions.length : 0)*100}%`}} 
                      className="absolute left-0 top-0 bottom-0" 
                      style={{ backgroundColor: theme.progressBarColor, boxShadow: `0 0 20px ${theme.progressBarColor}` }}
                    />
                  </div>
                </div>
              </div>

              <AnimatePresence mode="wait">
                 <motion.div 
                    key={currentIdx}
                    initial={{opacity: 0, x: 20}}
                    animate={{opacity: 1, x: 0}}
                    exit={{opacity: 0, x: -20}}
                    transition={{duration: 0.3}}
                    className="flex-1 flex flex-col min-h-0"
                 >
                    {/* Question Typography Container */}
                    <div className="mb-4 flex-col flex gap-2 shrink-0">
                      <h2 className="text-[38px] font-black leading-[1.2] shadow-black drop-shadow-xl" style={{ color: theme.textPrimary }}>{question.hi}</h2>
                      <h3 className="text-[24px] font-bold leading-snug" style={{ color: theme.textSecondary }}>{question.en}</h3>
                    </div>

                    {/* Options Container */}
                    <div className="flex-1 flex flex-col justify-start gap-2 min-h-0 overflow-y-auto styled-scrollbar pr-2 pb-2">
                      {question.options?.map(opt => {
                        const isSelected = selectedId === opt.id;
                        const isCorrect = isAnswered && opt.id === question.correctOption;
                        const isWrong = isAnswered && isSelected && opt.id !== question.correctOption;

                        let style: React.CSSProperties = {
                           borderWidth: '3px',
                           borderColor: `${theme.accentColor}20`,
                           backgroundColor: theme.bgSecondary,
                           color: theme.textPrimary
                        };
                        
                        if (isCorrect) {
                           style = { ...style, backgroundColor: theme.correctColor, borderColor: '#fff' };
                        } else if (isWrong) {
                           style = { ...style, backgroundColor: theme.wrongColor, borderColor: '#fff' };
                        } else if (isSelected && !isAnswered) {
                           style = { ...style, backgroundColor: `${theme.accentColor}20`, borderColor: theme.accentColor };
                        }

                        return (
                          <motion.button 
                            key={opt.id}
                            onClick={() => handleOptionClick(opt.id)}
                            whileHover={isAnswered ? {} : { scale: 1.01, x: 5 }} 
                            className={`w-full text-left py-2 px-5 border-[3px] flex items-center z-10 transition-all duration-300 outline-none min-h-0 shrink-0 ${roundnessSm}`}
                            style={{ ...style, clipPath: clipPathOption }}
                          >
                             <div className={`w-[50px] h-[50px] shrink-0 flex items-center justify-center text-[24px] font-black mr-5 transition-colors ${roundnessSm}`} style={{
                                backgroundColor: isCorrect || isWrong ? '#fff' : theme.bgPrimary,
                                color: isCorrect ? theme.correctColor : (isWrong ? theme.wrongColor : theme.accentColor),
                                border: `1px solid ${theme.accentColor}30`
                             }}>
                               {opt.id}
                             </div>
                             <div className="flex flex-col flex-1 pb-1 min-w-0">
                                <span className={`text-[26px] font-black leading-tight tracking-tight truncate ${isCorrect || isWrong ? 'text-white' : ''}`} style={{ color: isCorrect || isWrong ? '#fff' : theme.textPrimary }}>
                                  {opt.hi}
                                </span>
                                <span className={`text-[18px] mt-1 font-bold truncate`} style={{ color: isCorrect || isWrong ? '#fff' : theme.textSecondary }}>
                                  {opt.en}
                                </span>
                             </div>
                             {isCorrect && (
                               <motion.div initial={{scale:0, rotate:-180}} animate={{scale:1, rotate:0}} className="text-white pl-4 drop-shadow-xl shrink-0">
                                 <CheckCircle2 size={36} strokeWidth={2.5} />
                               </motion.div>
                             )}
                             {isWrong && (
                               <motion.div initial={{scale:0, rotate:180}} animate={{scale:1, rotate:0}} className="text-white pl-4 drop-shadow-xl shrink-0">
                                 <XCircle size={36} strokeWidth={2.5} />
                               </motion.div>
                             )}
                          </motion.button>
                        )
                      })}
                    </div>
                 </motion.div>
              </AnimatePresence>
            </div>

            {/* Bottom Actions */}
            <div className="h-[90px] shrink-0 flex justify-between gap-6 pb-2">
              <button 
                onClick={handleSkip} 
                disabled={isAnswered}
                className="flex-1 rounded-2xl border-2 font-black text-2xl uppercase tracking-widest transition-all flex items-center justify-center gap-4 disabled:opacity-40 disabled:pointer-events-none"
                style={{ backgroundColor: theme.bgPrimary, borderColor: `${theme.accentColor}30`, color: theme.textSecondary }}
              >
                <SkipForward size={32} /> Skip
              </button>
              
              <button 
                onClick={handleReveal} 
                disabled={isAnswered}
                className="flex-[1.5] rounded-2xl font-black text-[28px] uppercase tracking-[0.1em] transition-all flex items-center justify-center gap-4 disabled:opacity-30 disabled:pointer-events-none"
                style={{ backgroundColor: theme.accentColor, color: theme.bgSecondary, boxShadow: `0 0 40px ${theme.accentColor}40` }}
              >
                <Tv size={34} strokeWidth={2.5} /> Show Answer
              </button>
              
              <button 
                onClick={handleNext} 
                disabled={!isAnswered}
                className={`flex-1 rounded-2xl border-2 font-black text-2xl uppercase tracking-widest transition-all flex items-center justify-center gap-4
                  ${isAnswered 
                    ? 'shadow-[0_0_30px_rgba(34,211,238,0.2)] hover:shadow-[0_0_50px_rgba(34,211,238,0.5)]' 
                    : 'opacity-50 pointer-events-none grayscale'
                  }`}
                style={{ backgroundColor: isAnswered ? `${theme.accentColor}10` : 'transparent', borderColor: isAnswered ? theme.accentColor : `${theme.accentColor}20`, color: isAnswered ? theme.accentColor : theme.textSecondary }}
              >
                Next <ArrowRight size={32} />
              </button>
            </div>
            
          </section>


          {/* ------------------------------------ */}
          {/* RIGHT PANEL (~30%) : Timer + Logic */}
          {/* ------------------------------------ */}
          <aside className="w-[550px] flex flex-col gap-5 min-h-0">
            
            {/* TIMER CARD (Shorter height) */}
            <div className={`h-[250px] shrink-0 flex flex-col items-center justify-center shadow-xl border-[4px] relative overflow-hidden ${roundness}`} 
                 style={{ backgroundColor: theme.explanationBg, borderColor: theme.bgPrimary, clipPath: clipPathOption, ...glassStyle }}>
               {/* Decorative background element */}
               <div className={`absolute top-0 right-0 w-32 h-32 rounded-full blur-[40px] -mr-10 -mt-10 transition-colors duration-500`} style={{ backgroundColor: `${(Number(timeLeft) || 0) <= 5 ? theme.wrongColor : theme.accentColor}20` }} />
               <div className={`absolute bottom-0 left-0 w-32 h-32 rounded-full blur-[40px] -ml-10 -mb-10 transition-colors duration-500`} style={{ backgroundColor: `${(Number(timeLeft) || 0) <= 5 ? theme.wrongColor : theme.accentColor}20` }} />

               <div className="relative w-[140px] h-[140px] flex items-center justify-center mb-4 z-10 flex-shrink-0">
                 <svg className="absolute inset-0 w-full h-full -rotate-90 drop-shadow-md">
                   <circle cx="70" cy="70" r="60" fill="none" stroke={theme.textSecondary + '20'} strokeWidth="10" />
                   <motion.circle 
                     cx="70" cy="70" r="60" fill="none" 
                     stroke={timeLeft <= 5 ? theme.wrongColor : theme.accentColor} 
                     strokeWidth="10" 
                     strokeLinecap="round" 
                     strokeDasharray={376.99} 
                     strokeDashoffset={376.99 - (Math.max(0, Number(timeLeft) || 0) / Math.max(1, Number(timerDuration) || 15)) * 376.99}
                     transition={{ duration: 1, ease: "linear" }}
                   />
                 </svg>
                 <div className={`text-[72px] font-black tabular-nums tracking-tighter ${(Number(timeLeft) || 0) <= 5 ? 'animate-pulse' : ''}`} style={{ color: (Number(timeLeft) || 0) <= 5 ? theme.wrongColor : ((isCyberpunk || isEsports) ? theme.accentColor : theme.explanationText), textShadow: isCyberpunk ? `0 0 20px ${theme.accentColor}` : '' }}>
                   {String(Math.max(0, Number(timeLeft) || 0))}
                 </div>
               </div>

               <div className="text-slate-500 font-bold px-6 py-2 rounded-full text-sm tracking-widest uppercase border border-slate-200 z-10 shrink-0" style={{ backgroundColor: `${theme.bgPrimary}05` }}>
                 Per Question: {timerDuration} Sec
               </div>
            </div>

            {/* EXPLANATION CARD */}
            <div className={`flex-1 py-10 px-8 border-[4px] flex flex-col min-h-0 shadow-xl relative overflow-hidden ${roundness}`} style={{ backgroundColor: theme.explanationBg, color: theme.explanationText, borderColor: `${theme.accentColor}10`, clipPath: clipPathOption, ...glassStyle }}>
              
              <div className={`absolute top-0 right-8 text-white px-8 py-2 font-black tracking-[0.15em] text-sm shadow-[0_10px_20px_rgba(0,0,0,0.2)] border-x-2 border-b-2 z-20 ${roundnessSm}`} style={{ backgroundColor: theme.bgSecondary, borderColor: `${theme.accentColor}30`, borderTopRightRadius: 0, borderTopLeftRadius: 0 }}>
                EXPLANATION
              </div>

              {isAnswered ? (
                <motion.div 
                   key={`exp-${currentIdx}`}
                   initial={{opacity:0, x:20}} 
                   animate={{opacity:1, x:0}} 
                   transition={{duration: 0.4, type: "spring", bounce: 0.25}}
                   className="flex-1 flex flex-col styled-scrollbar overflow-y-auto pr-4 pt-2"
                >
                  {/* Correct Answer Header */}
                  <div className="inline-flex px-4 py-2 rounded-xl font-black text-base mb-5 items-center gap-2 border uppercase tracking-widest self-start shadow-sm shrink-0" style={{ backgroundColor: `${theme.correctColor}15`, borderColor: `${theme.correctColor}30`, color: theme.correctColor }}>
                    <CheckCircle size={20} strokeWidth={3} /> CORRECT ANSWER
                  </div>
                  
                  {/* Correct Option String */}
                  <div className="text-[34px] font-black mb-6 border-b-[3px] border-white/5 pb-6 leading-tight shrink-0" style={{ color: theme.textPrimary }}>
                    {question.options?.find(o => o.id === question.correctOption)?.hi || 'N/A'}
                  </div>

                  {/* Hindi Explanation (VERY LARGE) */}
                  <div className="text-[30px] leading-[1.4] font-black mb-5 drop-shadow-sm shrink-0" style={{ color: theme.textPrimary }}>
                    {question.explanation.hi}
                  </div>
                  
                  {/* English Explanation */}
                  <div className="text-[22px] leading-relaxed font-bold mb-6 shrink-0" style={{ color: theme.textSecondary }}>
                    {question.explanation.en}
                  </div>

                  {/* Reference marker */}
                  <div className="mt-auto pt-6 shrink-0">
                    <div className="bg-white/5 p-4 rounded-2xl flex items-center gap-4 font-black border-2 border-white/5 uppercase tracking-widest text-sm shadow-inner" style={{ color: theme.textSecondary }}>
                      <div className="bg-white/10 p-2 rounded-lg shadow-sm border border-white/5">
                        <Info style={{ color: theme.accentColor }} size={20} strokeWidth={2.5} />
                      </div>
                      Reference: SSC CGL Official
                    </div>
                  </div>
                </motion.div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center opacity-20 min-h-0" style={{ color: theme.textSecondary }}>
                  <Radio size={80} className="mb-6" strokeWidth={1.5} />
                  <p className="text-[24px] font-black text-center px-8 leading-snug">
                    Answer the question to unlock detailed explanation
                  </p>
                </div>
              )}
            </div>

          </aside>
        </main>

        {/* ==================================== */}
        {/* FOOTER BAR */}
        {/* ==================================== */}
        <footer className={`h-[44px] w-[1840px] mx-10 mt-auto mb-8 flex items-center justify-between px-10 border relative z-10 flex-shrink-0 ${roundnessSm}`} style={{ backgroundColor: theme.footerBg, borderColor: `${theme.accentColor}30`, color: theme.footerText, clipPath: clipPathOption }}>
          <div className="flex items-center gap-6 font-bold tracking-widest text-[13px] uppercase">
             <span className="flex items-center gap-2"><div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: theme.accentColor }}></div> {footerText}</span>
          </div>
          
          <div className="mx-8 opacity-20 flex gap-1">
             {[...Array(20)].map((_, i) => (
                <div key={i} className="w-1 h-3 bg-white mx-px rounded-full" />
             ))}
          </div>

          <div className="flex items-center gap-6 font-bold tracking-widest text-[13px] uppercase">
            <span className="flex items-center gap-2" style={{ color: theme.accentColor }}>
               <Users size={16} /> {viewerCount.toLocaleString()} {liveBadgeText}
            </span>
          </div>
        </footer>

      </div>
    </div>
  );
}
