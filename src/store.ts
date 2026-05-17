import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Question {
  id: number | string;
  hi: string;
  en: string;
  options: { id: string; hi: string; en: string }[];
  correctOption: string;
  explanation: { hi: string; en: string };
  timerSettings?: number;
  categoryId?: string;
  categoryName?: string;
}

export interface Category {
  id: string;
  name: string;
  questionCount?: number;
  lastUpdated?: string;
}

export interface AppState {
  // Live State
  questions: Question[];
  categories: Category[];
  liveCategoryIds: string[];
  narrationLanguage: 'hi' | 'en';
  ttsVoiceGender: 'male' | 'female';
  voiceMode: 'browser' | 'edge-tts';
  currentIdx: number;
  phase: 'reading' | 'waiting' | 'revealing' | 'done';
  timeLeft: number;
  speechEnabled: boolean;
  humanExpressionsEnabled: boolean;
  ttsRate: number;
  ttsVolume: number;
  streamTitle: string;
  sscTitle: string;
  headerText: string;
  viewerCount: number;
  liveBadgeText: string;
  logoUrl: string;
  footerText: string;
  telegramText: string;
  bannerText: string;
  motivationalText: string;
  globalTimerDuration: number;
  isTimerPaused: boolean;
  quizCompletionMode: 'loop' | 'stop';

  // Theme Settings
  theme: {
    bgPrimary: string;
    bgSecondary: string;
    textPrimary: string;
    textSecondary: string;
    accentColor: string;
    timerColor: string;
    correctColor: string;
    wrongColor: string;
    explanationBg: string;
    explanationText: string;
    headerBg: string;
    headerText: string;
    footerBg: string;
    footerText: string;
    progressBarColor: string;
    glowColor: string;
    liveBadgeColor: string;
    neonIntensity: number;
    timerStartTime: number | null;
  };
  themeMode: 'light' | 'dark' | 'PREMIUM_BROADCAST' | 'SSC_SMARTBOARD' | 'EXAM_GK_SLIDE' | 'KBC_STYLE';

  // Admin Specific (Client-side mainly, except for fetching questions)
  adminSelectedCategoryId: string;
  adminQuestions: Question[];
  
  // Actions
  setQuestions: (q: Question[]) => void;
  setCategories: (c: Category[]) => void;
  setLiveCategoryIds: (ids: string[]) => Promise<void>;
  toggleLiveCategory: (id: string) => Promise<void>;
  setNarrationLanguage: (lang: 'hi' | 'en') => void;
  setTtsVoiceGender: (gender: 'male' | 'female') => void;
  setVoiceMode: (mode: 'browser' | 'edge-tts') => void;
  setAdminSelectedCategoryId: (id: string) => void;
  setCurrentIdx: (idx: number) => void;
  setPhase: (phase: 'reading' | 'waiting' | 'revealing' | 'done') => void;
  setTimeLeft: (t: number | ((prev: number) => number)) => void;
  setSpeechEnabled: (b: boolean) => void;
  setHumanExpressionsEnabled: (b: boolean) => void;
  setTtsRate: (r: number) => void;
  setTtsVolume: (v: number) => void;
  updateBranding: (branding: Partial<AppState>) => void;
  setGlobalTimerDuration: (t: number) => void;
  setIsTimerPaused: (b: boolean) => void;
  setQuizCompletionMode: (mode: 'loop' | 'stop') => void;
  updateTheme: (theme: Partial<AppState['theme']>) => void;
  
  // Question management for Admin (target adminQuestions based on adminSelectedCategoryId)
  loadAdminQuestions: (categoryId: string) => Promise<void>;
  saveAdminQuestions: (categoryId: string, q: Question[]) => Promise<void>;
  addQuestion: (q: Question) => void;
  updateQuestion: (id: string | number, updated: Partial<Question>) => void;
  deleteQuestion: (id: string | number) => void;
  duplicateQuestion: (id: string | number) => void;
  reorderQuestion: (id: string | number, direction: 'up' | 'down') => void;
  deleteCategory: (id: string) => Promise<void>;

  // Global Sync
  refreshState: () => Promise<void>;
  pushState: (patch: Partial<AppState>) => Promise<void>;
}

const API_BASE = '/api';

export const useStore = create<AppState>()((set, get) => ({
  questions: [],
  categories: [],
  liveCategoryIds: ['default'],
  narrationLanguage: 'hi',
  ttsVoiceGender: 'female',
  voiceMode: 'browser',
  currentIdx: 0,
  phase: 'reading',
  timeLeft: 15,
  speechEnabled: true,
  humanExpressionsEnabled: true,
  ttsRate: 0.9,
  ttsVolume: 1.0,

  streamTitle: 'SSC LIVE QUIZ',
  sscTitle: 'Premium Platform',
  headerText: 'SSC CGL 2024 LIVE MOCK TEST',
  viewerCount: 15420,
  liveBadgeText: 'LIVE',
  logoUrl: '',
  footerText: 'System Ops: Nominal | Broadcast Res: 1080P60 | Latency: 12ms',
  telegramText: 'Join Telegram: @ssc_live',
  bannerText: 'Welcome to Live SSC Mock Test!',
  motivationalText: 'Keep Learning, Keep Growing',
  globalTimerDuration: 15,
  isTimerPaused: false,
  quizCompletionMode: 'loop',

  theme: {
    bgPrimary: '#050505',
    bgSecondary: '#020202',
    textPrimary: '#ffffff',
    textSecondary: '#94a3b8',
    accentColor: '#0ea5e9',
    timerColor: '#ef4444',
    correctColor: '#22c55e',
    wrongColor: '#ef4444',
    explanationBg: '#0f172a',
    explanationText: '#f8fafc',
    headerBg: '#000000',
    headerText: '#ffffff',
    footerBg: '#000000',
    footerText: '#64748b',
    progressBarColor: '#0ea5e9',
    glowColor: '#0ea5e9',
    liveBadgeColor: '#ef4444',
    neonIntensity: 0.5,
    timerStartTime: null,
  },
  themeMode: 'PREMIUM_BROADCAST',

  adminSelectedCategoryId: 'default',
  adminQuestions: [],

  refreshState: async () => {
    try {
      const stateRes = await fetch(`${API_BASE}/state`);
      const serverState = await stateRes.json();
      
      const catsRes = await fetch(`${API_BASE}/categories`);
      const categories = await catsRes.json();

      // Fetch combined questions for multiple categories
      const activeIds = serverState.activeCategoryIds || ['default'];
      const questionsRes = await fetch(`${API_BASE}/questions-multi/${activeIds.join(',')}`);
      const questions = await questionsRes.json() || [];

      // If we have a timerStartTime in the theme, calculate timeLeft locally
      // to avoid jitter from polling the server every second.
      const serverTimeLeft = serverState.timeLeft;
      const startTime = serverState.theme?.timerStartTime;
      const duration = serverState.streamingSettings?.globalTimerDuration || get().globalTimerDuration;
      
      let finalTimeLeft = serverTimeLeft;
      if (startTime && serverState.phase === 'waiting') {
          const elapsed = Math.floor((Date.now() - startTime) / 1000);
          finalTimeLeft = Math.max(0, duration - elapsed);
      }

      const currentState = get();
      // Jitter protection: if we are in the middle of a countdown, 
      // don't let it jump "up" back to 15 or previous values due to polling lag.
      if (
        currentState.phase === 'waiting' && 
        serverState.phase === 'waiting' && 
        currentState.timeLeft > 0 && 
        finalTimeLeft > currentState.timeLeft &&
        finalTimeLeft > duration - 2
      ) {
         finalTimeLeft = currentState.timeLeft;
      }

      const isDebouncingTheme = (window as any)._isDebouncingTheme;

      const streamingSettingsToApply = { ...serverState.streamingSettings };
      
      if (isDebouncingTheme) {
        delete streamingSettingsToApply.theme;
        delete streamingSettingsToApply.themeMode;
      }

      set((prev) => {
        const nextPartial: any = {
          ...streamingSettingsToApply,
          currentIdx: (questions.length > 0 && serverState.currentIdx >= questions.length) ? 0 : serverState.currentIdx,
          phase: serverState.phase,
          timeLeft: finalTimeLeft,
          isTimerPaused: serverState.isTimerPaused,
          narrationLanguage: serverState.narrationLanguage || 'hi',
          ttsVoiceGender: serverState.ttsVoiceGender || 'female',
          voiceMode: serverState.voiceMode || 'browser',
        };

        if (JSON.stringify(prev.liveCategoryIds) !== JSON.stringify(activeIds)) {
          nextPartial.liveCategoryIds = activeIds;
        }
        if (JSON.stringify(prev.categories) !== JSON.stringify(categories)) {
          nextPartial.categories = categories;
        }
        if (JSON.stringify(prev.questions) !== JSON.stringify(questions)) {
          nextPartial.questions = questions;
        }
        
        // Let's also check if streamingSettingsToApply actually changed anything
        let hasChanges = Object.keys(nextPartial).some(key => {
            if (typeof nextPartial[key] === 'object' && nextPartial[key] !== null) {
               return JSON.stringify(prev[key as keyof AppState]) !== JSON.stringify(nextPartial[key]);
            }
            return prev[key as keyof AppState] !== nextPartial[key];
        });

        return hasChanges ? nextPartial : prev;
      });
    } catch (e) {
      console.error('Failed to sync state:', e);
    }
  },

  pushState: async (patch) => {
    try {
      const serverPatch: any = {};
      const streamingKeys = [
        'streamTitle', 'sscTitle', 'headerText', 'viewerCount', 'liveBadgeText',
        'logoUrl', 'footerText', 'telegramText', 'bannerText', 'motivationalText',
        'globalTimerDuration', 'quizCompletionMode',
        'speechEnabled', 'humanExpressionsEnabled', 'ttsRate', 'ttsVolume',
        'narrationLanguage', 'ttsVoiceGender', 'voiceMode', 'theme', 'themeMode'
      ];

      const streamingSettingsPatch: any = {};
      Object.keys(patch).forEach(key => {
        if (streamingKeys.includes(key)) {
          streamingSettingsPatch[key] = (patch as any)[key];
          if (key === 'narrationLanguage') serverPatch.narrationLanguage = (patch as any)[key];
          if (key === 'ttsVoiceGender') serverPatch.ttsVoiceGender = (patch as any)[key];
          if (key === 'voiceMode') serverPatch.voiceMode = (patch as any)[key];
        } else if (key === 'liveCategoryIds') {
           serverPatch.activeCategoryIds = (patch as any).liveCategoryIds;
        } else {
          serverPatch[key] = (patch as any)[key];
        }
      });

      if (Object.keys(streamingSettingsPatch).length > 0) {
        serverPatch.streamingSettings = streamingSettingsPatch;
      }
      
      // Optimistic update
      set(patch as any);

      await fetch(`${API_BASE}/state`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(serverPatch)
      });
    } catch (e) {
      console.error('Failed to push state:', e);
    }
  },

  setLiveCategoryIds: async (ids) => {
    await get().pushState({ liveCategoryIds: ids, currentIdx: 0, phase: 'reading' });
    await get().refreshState();
  },

  toggleLiveCategory: async (id) => {
    const current = get().liveCategoryIds;
    const next = current.includes(id) 
      ? current.filter(i => i !== id)
      : [...current, id];
    
    // Ensure at least one is always live or default if empty
    const finalIds = next.length > 0 ? next : ['default'];
    await get().setLiveCategoryIds(finalIds);
  },

  setNarrationLanguage: (lang) => get().pushState({ narrationLanguage: lang }),
  setTtsVoiceGender: (gender: 'male' | 'female') => get().pushState({ ttsVoiceGender: gender }),
  setVoiceMode: (mode: 'browser' | 'edge-tts') => get().pushState({ voiceMode: mode }),

  setAdminSelectedCategoryId: (id) => {
    set({ adminSelectedCategoryId: id });
    get().loadAdminQuestions(id);
  },

  loadAdminQuestions: async (categoryId) => {
    try {
      const res = await fetch(`${API_BASE}/questions/${categoryId}`);
      const adminQuestions = await res.json();
      set({ adminQuestions });
    } catch (e) {
      console.error('Failed to load admin questions:', e);
    }
  },

  saveAdminQuestions: async (categoryId, q) => {
    await fetch(`${API_BASE}/questions/${categoryId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(q)
    });
    set({ adminQuestions: q });
    // Refresh to update category question counts and live state
    await get().refreshState();
  },

  setQuestions: async (q) => {
     // Legacy wrapper
     await get().saveAdminQuestions(get().adminSelectedCategoryId, q);
  },

  setCategories: (c) => set({ categories: c }),
  setCurrentIdx: (idx) => get().pushState({ currentIdx: idx }),
  setPhase: (phase) => get().pushState({ phase }),
  setTimeLeft: (t) => {
    const nextT = typeof t === 'function' ? t(get().timeLeft) : t;
    set({ timeLeft: Number(nextT) || 0 });
    // Note: We don't push every tick to avoid server spam, 
    // but the ticker will sync occasionally or use timerStartTime.
  },
  setSpeechEnabled: (b) => get().pushState({ speechEnabled: b }),
  setHumanExpressionsEnabled: (b) => get().pushState({ humanExpressionsEnabled: b }),
  setTtsRate: (r) => get().pushState({ ttsRate: r }),
  setTtsVolume: (v) => get().pushState({ ttsVolume: v }),
  updateBranding: (b) => get().pushState(b),
  setGlobalTimerDuration: (t) => get().pushState({ globalTimerDuration: t }),
  setIsTimerPaused: (b) => get().pushState({ isTimerPaused: b }),
  setQuizCompletionMode: (mode) => get().pushState({ quizCompletionMode: mode }),
  updateTheme: (themePatch) => {
    const newTheme = { ...get().theme, ...themePatch };
    // Immediately apply locally for instant preview/frontend
    set({ theme: newTheme });
    
    (window as any)._isDebouncingTheme = true;

    // Debounce the network push to prevent API spam on color drags
    if ((window as any)._themeDebounce) clearTimeout((window as any)._themeDebounce);
    (window as any)._themeDebounce = setTimeout(() => {
        get().pushState({ theme: newTheme }).finally(() => {
            (window as any)._isDebouncingTheme = false;
        });
    }, 500);
  },
  
  addQuestion: async (q) => {
    const newQs = [...get().adminQuestions, q];
    await get().saveAdminQuestions(get().adminSelectedCategoryId, newQs);
  },
  updateQuestion: async (id, updated) => {
    const newQs = get().adminQuestions.map(q => q.id === id ? { ...q, ...updated } : q);
    await get().saveAdminQuestions(get().adminSelectedCategoryId, newQs);
  },
  deleteQuestion: async (id) => {
    const newQs = get().adminQuestions.filter(q => q.id !== id);
    await get().saveAdminQuestions(get().adminSelectedCategoryId, newQs);
  },
  duplicateQuestion: async (id) => {
    const idx = get().adminQuestions.findIndex(q => q.id === id);
    if (idx === -1) return;
    const qToDuplicate = get().adminQuestions[idx];
    const newQ = { ...qToDuplicate, id: Date.now() };
    const newQuestions = [...get().adminQuestions];
    newQuestions.splice(idx + 1, 0, newQ);
    await get().saveAdminQuestions(get().adminSelectedCategoryId, newQuestions);
  },
  reorderQuestion: async (id, direction) => {
    const idx = get().adminQuestions.findIndex(q => q.id === id);
    if (idx === -1) return;
    const newQuestions = [...get().adminQuestions];
    if (direction === 'up' && idx > 0) {
       [newQuestions[idx - 1], newQuestions[idx]] = [newQuestions[idx], newQuestions[idx - 1]];
    } else if (direction === 'down' && idx < newQuestions.length - 1) {
       [newQuestions[idx + 1], newQuestions[idx]] = [newQuestions[idx], newQuestions[idx + 1]];
    }
    await get().saveAdminQuestions(get().adminSelectedCategoryId, newQuestions);
  },

  deleteCategory: async (id: string) => {
    if (get().liveCategoryIds.includes(id)) {
       alert('Cannot delete a category that is currently live or active. Please switch the live category first.');
       return;
    }
    
    try {
      await fetch(`${API_BASE}/categories/${id}`, { method: 'DELETE' });
      await get().refreshState();
    } catch (e) {
      console.error('Failed to delete category:', e);
    }
  },
}));

