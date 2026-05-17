import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { TemplateProps } from './types';
import { CheckCircle2 } from 'lucide-react';

export default function SSCSmartboardQuiz({
  question,
  currentIdx,
  totalQuestions,
  phase,
  timeLeft,
  timerDuration,
  selectedId,
  isAnswered,
  bannerText,
  footerText,
  catName,
  scale
}: TemplateProps) {
  return (
    <div 
      className="relative flex flex-col shrink-0 origin-center bg-black font-serif overflow-hidden"
      style={{
        width: '1920px',
        height: '1080px',
        transform: `scale(${scale})`,
      }}
    >
      {/* Board Reflection & Texture */}
      <div className="absolute inset-0 bg-[#0a0a0a] pointer-events-none">
        {/* Subtle chalk dust texture */}
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.65%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E")' }}></div>
        {/* Top light reflection */}
        <div className="absolute top-0 left-0 right-0 h-[400px] bg-gradient-to-b from-white/[0.04] to-transparent"></div>
      </div>

      {/* Main Board Area with Thin White Border */}
      <div className="flex-1 m-6 border-[3px] border-white/20 rounded-xl flex flex-col relative z-10">
        
        {/* Top Header Row within the board */}
        <div className="flex justify-between items-center px-10 py-6 border-b-[2px] border-white/10">
          <div className="text-white text-3xl font-bold uppercase tracking-wider">{catName} QUIZ</div>
          <div className="text-white text-3xl font-bold uppercase">QUESTION. {Number.isFinite(currentIdx) && currentIdx >= 0 ? currentIdx + 1 : 1}/{totalQuestions || 1}</div>
          <div className={`text-5xl font-black tabular-nums transition-colors ${timeLeft <= 5 ? 'text-red-500 animate-pulse' : 'text-white'}`}>
             {String(Math.max(0, Number(timeLeft) || 0)).padStart(2, '0')}
          </div>
        </div>

        {/* Question Area */}
        <div className="px-16 pt-12 pb-8 flex flex-col">
          <h2 className="text-[64px] font-black text-[#FFD700] leading-tight font-devanagari tracking-wide drop-shadow-md">
            Q{Number.isFinite(currentIdx) && currentIdx >= 0 ? currentIdx + 1 : 1}. {question.hi}
          </h2>
          <h3 className="text-[32px] mt-4 font-bold text-[#FFD700]/80 leading-snug">
            {question.en}
          </h3>
        </div>

        {/* Options Area - Stretched vertically */}
        <div className="flex-1 px-16 pb-12 flex flex-col justify-center gap-6">
          <AnimatePresence mode="wait">
             <motion.div 
               key={currentIdx}
               initial={{opacity: 0, x: -20}}
               animate={{opacity: 1, x: 0}}
               className="flex flex-col gap-6 w-full max-w-[1500px]"
             >
                {question.options?.map((opt, i) => {
                  const badge = ['A', 'B', 'C', 'D'][i] || `${i+1}`;
                  const isSelected = selectedId === opt.id;
                  const isCorrect = isAnswered && opt.id === question.correctOption;
                  const isWrong = isAnswered && isSelected && opt.id !== question.correctOption;

                  let bgClass = "bg-transparent";
                  let borderClass = "border-white/20";
                  let textHi = "text-white";
                  let textEn = "text-white/70";
                  let badgeClass = "text-white border-white/40";

                  if (isCorrect) {
                      bgClass = "bg-[#22c55e]/20";
                      borderClass = "border-[#22c55e] shadow-[0_0_20px_rgba(34,197,94,0.3)]";
                      textHi = "text-[#22c55e] font-black text-shadow-sm";
                      textEn = "text-[#22c55e]/90 font-bold";
                      badgeClass = "bg-[#22c55e] text-black border-[#22c55e]";
                  } else if (isWrong) {
                      bgClass = "bg-red-500/10";
                      borderClass = "border-red-500/50";
                      textHi = "text-red-400";
                      textEn = "text-red-400/70";
                      badgeClass = "text-red-400 border-red-500/50";
                  } else if (isSelected && !isAnswered) {
                      bgClass = "bg-white/10";
                      borderClass = "border-white/60";
                  }

                  return (
                    <div key={opt.id} className={`w-full p-6 border-[3px] rounded-2xl flex items-center transition-all ${bgClass} ${borderClass}`}>
                       <div className={`w-[80px] h-[80px] rounded-xl flex items-center justify-center text-[40px] font-black mr-8 border-[3px] ${badgeClass}`}>
                         {badge}
                       </div>
                       <div className="flex flex-col flex-1 pl-2">
                          <span className={`text-[46px] font-black font-devanagari leading-tight tracking-wide ${textHi}`}>
                            {opt.hi}
                          </span>
                          <span className={`text-[26px] mt-2 font-medium tracking-wide ${textEn}`}>
                            {opt.en}
                          </span>
                       </div>
                       {isCorrect && (
                         <div className="pl-6 pr-4">
                           <CheckCircle2 size={64} className="text-[#22c55e]" strokeWidth={3} />
                         </div>
                       )}
                    </div>
                  );
                })}
             </motion.div>
          </AnimatePresence>
        </div>

      </div>

      {/* BOTTOM FOOTER ZONES */}
      <div className="w-full flex flex-col shrink-0">
        {/* Bright yellow editable banner */}
        <div className="w-full bg-[#FFD700] py-4 px-10 flex items-center justify-center font-bold text-black text-[36px] tracking-wide uppercase">
          {bannerText || "WELCOME TO SSC SMARTBOARD LIVE CLASS"}
        </div>
        {/* Red editable text from admin panel */}
        <div className="w-full bg-[#cc0000] py-4 px-10 flex items-center justify-center font-bold text-white text-[28px] tracking-widest uppercase shadow-[0_-5px_20px_rgba(204,0,0,0.4)]">
           {footerText || "IMPORTANT: LIKE AND SUBSCRIBE"}
        </div>
      </div>

    </div>
  );
}
