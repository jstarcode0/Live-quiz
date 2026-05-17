import { Question } from '../store';

export interface TemplateProps {
  question: Question;
  currentIdx: number;
  totalQuestions: number;
  phase: 'reading' | 'waiting' | 'revealing' | 'done';
  timeLeft: number;
  timerDuration: number;
  selectedId: string | null;
  isAnswered: boolean;
  streamTitle: string;
  sscTitle: string;
  headerText: string;
  footerText: string;
  telegramText: string;
  bannerText: string;
  motivationalText: string;
  viewerCount: number;
  liveBadgeText: string;
  catName: string;
  headerTextDisplay: string;
  speechEnabled: boolean;
  setSpeechEnabled: (val: boolean) => void;
  scale: number;
  theme: any;
}
