import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { TemplateProps } from './types';
import { CheckCircle2 } from 'lucide-react';

export default function ExamGKSlideQuiz({
  question,
  currentIdx,
  totalQuestions,
  phase,
  timeLeft,
  timerDuration,
  selectedId,
  isAnswered,
  catName,
  headerTextDisplay,
  footerText,
  scale
}: TemplateProps) {
  return (
    <div 
      className="relative flex flex-col shrink-0 origin-center bg-[#F0F4F8] font-sans overflow-hidden"
      style={{
        width: '1920px',
        height: '1080px',
        transform: `scale(${scale})`,
      }}
    >
      {/* Thick Blue Header */}
      <header className="w-full h-[140px] bg-[#003366] flex items-center justify-between px-16 shadow-xl z-20">
        <div className="flex flex-col">
          <span className="text-white text-[48px] font-black tracking-wider uppercase">{headerTextDisplay || "EXAM GK PREPARATION"}</span>
          <span className="text-[#88BBDD] text-[20px] font-bold tracking-widest uppercase mt-1">{catName} - Q. {Number.isFinite(currentIdx) && currentIdx >= 0 ? currentIdx + 1 : 1}/{totalQuestions || 1}</span>
        </div>
        
        {/* Timer Box */}
        <div className="bg-[#002244] border-4 border-[#004488] rounded-2xl px-12 py-4 flex items-center justify-center shadow-inner">
           <span className={`text-[64px] font-black tabular-nums tracking-tight ${timeLeft <= 5 ? 'text-[#FF4444] animate-pulse' : 'text-white'}`}>
              00:{String(Math.max(0, Number(timeLeft) || 0)).padStart(2, '0')}
           </span>
        </div>
      </header>

      {/* Main Slide Area */}
      <main className="flex-1 w-full px-20 py-12 flex flex-col z-10 relative">
        <div className="absolute inset-0 bg-white opacity-50 m-12 rounded-3xl shadow-lg border border-[#E2E8F0]"></div>
        
        <div className="relative z-10 flex flex-col h-full">
          {/* Question Segment */}
          <div className="w-full pb-10 border-b-4 border-[#E2E8F0]">
            <h2 className="text-[64px] font-extrabold text-[#002244] leading-tight font-devanagari">
              {question.hi}
            </h2>
            <h3 className="text-[36px] mt-6 font-bold text-[#335577] leading-snug">
              {question.en}
            </h3>
          </div>

          {/* Options Segment - 2x2 Grid */}
          <div className="flex-1 w-full mt-12">
            <AnimatePresence mode="wait">
              <motion.div 
                 key={currentIdx}
                 initial={{opacity: 0, y: 20}}
                 animate={{opacity: 1, y: 0}}
                 className="grid grid-cols-2 gap-x-12 gap-y-10 h-full content-start"
              >
                {question.options?.map((opt, i) => {
                    const badge = ['A', 'B', 'C', 'D'][i] || `${i+1}`;
                    const isSelected = selectedId === opt.id;
                    const isCorrect = isAnswered && opt.id === question.correctOption;
                    const isWrong = isAnswered && isSelected && opt.id !== question.correctOption;

                    let bgClass = "bg-white";
                    let borderClass = "border-[#CBD5E1] shadow-md";
                    let textHi = "text-[#0F172A]";
                    let textEn = "text-[#475569]";
                    let badgeBg = "bg-[#E2E8F0] text-[#0F172A]";

                    if (isCorrect) {
                        bgClass = "bg-[#DCFCE7]";
                        borderClass = "border-[#22C55E] shadow-xl shadow-[#22C55E]/20";
                        textHi = "text-[#166534]";
                        textEn = "text-[#166534]/80";
                        badgeBg = "bg-[#22C55E] text-white";
                    } else if (isWrong) {
                        bgClass = "bg-[#FEE2E2]";
                        borderClass = "border-[#EF4444]";
                        textHi = "text-[#991B1B]";
                        textEn = "text-[#991B1B]/80";
                        badgeBg = "bg-[#EF4444] text-white";
                    } else if (isSelected && !isAnswered) {
                        bgClass = "bg-[#F1F5F9]";
                        borderClass = "border-[#94A3B8]";
                    }

                    return (
                      <div key={opt.id} className={`w-full p-8 border-4 rounded-[2em] flex items-center transition-all min-h-[160px] ${bgClass} ${borderClass}`}>
                         <div className={`w-[80px] h-[80px] rounded-full flex items-center justify-center text-[36px] font-black mr-6 shrink-0 ${badgeBg}`}>
                           {badge}
                         </div>
                         <div className="flex flex-col flex-1 pl-4 border-l-4 border-black/5">
                            <span className={`text-[46px] font-bold font-devanagari leading-tight ${textHi}`}>
                              {opt.hi}
                            </span>
                            <span className={`text-[24px] mt-2 font-semibold ${textEn}`}>
                              {opt.en}
                           </span>
                         </div>
                         {isCorrect && (
                           <div className="pl-6 pr-2 shrink-0">
                             <CheckCircle2 size={64} className="text-[#22C55E]" strokeWidth={4} />
                           </div>
                         )}
                      </div>
                    );
                })}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </main>

      {/* Solid Dark Blue Footer */}
      <footer className="w-full h-[100px] bg-[#002244] border-t-8 border-[#003366] flex items-center px-16 z-20">
         {/* Ticker container */}
         <div className="w-full overflow-hidden whitespace-nowrap relative">
           <div className="text-white text-[32px] font-bold uppercase tracking-widest flex gap-32">
             <span className="flex-1 text-center">{footerText || "SSC CGL CHSL MTS NDA CDS AFCAT LIVE CLASSES"}</span>
           </div>
         </div>
      </footer>
    </div>
  );
}
