import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { TemplateProps } from './types';

export default function KBCStyleQuiz({
  question,
  currentIdx,
  phase,
  timeLeft,
  timerDuration,
  selectedId,
  isAnswered,
  motivationalText,
  footerText,
  scale
}: TemplateProps) {
  // Complex radial background
  return (
    <div 
      className="relative flex flex-col shrink-0 origin-center text-white overflow-hidden font-sans"
      style={{
        width: '1920px',
        height: '1080px',
        transform: `scale(${scale})`,
        background: 'radial-gradient(circle at center 30%, #1a004a 0%, #05001a 70%, #000000 100%)'
      }}
    >
      {/* Background radial glowing effects */}
      <div className="absolute inset-0 flex items-center justify-center opacity-40 pointer-events-none mix-blend-screen">
          <div className="w-[1200px] h-[1200px] bg-gradient-to-c from-indigo-500/20 via-transparent to-transparent rounded-full blur-[100px]"></div>
      </div>
      
      {/* KBC Style Spotlight */}
      <div className="absolute top-[-20%] left-1/2 -translate-x-1/2 w-[150%] h-[80%] bg-[radial-gradient(ellipse_at_top,rgba(100,150,255,0.1)_0%,transparent_70%)] pointer-events-none"></div>

      <header className="absolute top-0 left-0 right-0 h-[100px] flex justify-between items-center px-20 pt-8 z-20">
         <div className="text-[28px] font-bold text-[#b3ccff] tracking-[0.3em] uppercase drop-shadow-md">
            QUESTION {Number.isFinite(currentIdx) && currentIdx >= 0 ? currentIdx + 1 : 1}
         </div>
      </header>

      {/* Main KBC Content Area */}
      <main className="flex-1 w-full flex flex-col items-center justify-center z-10 -mt-20">
         
         {/* KBC Timer Center Ring */}
         <div className="w-[200px] h-[200px] mb-12 flex items-center justify-center relative">
            <div className="absolute inset-0 rounded-full border-[8px] border-[#334488]/30"></div>
            <motion.svg className="absolute inset-0 w-full h-full -rotate-90">
                <circle cx="100" cy="100" r="92" fill="none" stroke="rgba(255, 255, 255, 0.05)" strokeWidth="8"/>
                <motion.circle 
                   cx="100" cy="100" r="92" fill="none" 
                   stroke={timeLeft <= 5 ? '#ffaa00' : '#88bbff'} 
                   strokeWidth="8" 
                   strokeLinecap="round" 
                   strokeDasharray={578} 
                   strokeDashoffset={578 - (Math.max(0, Number(timeLeft) || 0) / Math.max(1, Number(timerDuration) || 15)) * 578}
                   transition={{ duration: 1, ease: "linear" }}
                   style={{ filter: 'drop-shadow(0 0 10px rgba(136, 187, 255, 0.8))' }}
                />
            </motion.svg>
            <div className={`text-[72px] font-black tabular-nums filter drop-shadow-[0_0_15px_rgba(255,255,255,0.5)] ${timeLeft <= 5 ? 'text-[#ffaa00] animate-pulse' : 'text-white'}`}>
                {String(Math.max(0, Number(timeLeft) || 0)).padStart(2, '0')}
            </div>
         </div>

         {/* Question Shape (Hexagon/Pill) */}
         <AnimatePresence mode="wait">
           <motion.div 
             key={currentIdx}
             initial={{scale: 0.9, opacity: 0}}
             animate={{scale: 1, opacity: 1}}
             className="w-[1600px] flex flex-col gap-10"
           >
             {/* Question Box */}
             <div className="w-full min-h-[220px] bg-gradient-to-b from-[#0a1133] to-[#04081c] border-2 border-[#5577cc] rounded-[100px] relative flex flex-col items-center justify-center px-32 py-10 shadow-[0_15px_50px_rgba(0,0,0,0.8),inset_0_0_40px_rgba(85,119,204,0.3)]">
                {/* Horizontal Golden Lines connecting to edges */}
                <div className="absolute top-1/2 left-[-200px] w-[200px] h-[3px] bg-gradient-to-r from-transparent to-[#88bbff] shadow-[0_0_10px_#88bbff]"></div>
                <div className="absolute top-1/2 right-[-200px] w-[200px] h-[3px] bg-gradient-to-l from-transparent to-[#88bbff] shadow-[0_0_10px_#88bbff]"></div>

                <h2 className="text-[52px] font-extrabold text-white leading-snug font-devanagari text-center drop-shadow-[0_2px_10px_rgba(0,0,0,1)]">
                  {question.hi}
                </h2>
                <h3 className="text-[28px] mt-4 font-bold text-[#b3ccff] text-center drop-shadow-md">
                  {question.en}
                </h3>
             </div>

             {/* Options 2x2 Grid */}
             <div className="grid grid-cols-2 gap-x-16 gap-y-10 px-12 mt-4 relative">
                {question.options?.map((opt, i) => {
                    const badge = ['A', 'B', 'C', 'D'][i] || `${i+1}`;
                    const isSelected = selectedId === opt.id;
                    const isCorrect = isAnswered && opt.id === question.correctOption;
                    const isWrong = isAnswered && isSelected && opt.id !== question.correctOption;

                    let bgClass = "from-[#0a1133] to-[#04081c]";
                    let borderClass = "border-[#5577cc]";
                    let badgeColor = "text-[#ffaa00]";
                    let innerShadow = "inset_0_0_20px_rgba(85,119,204,0.2)";

                    if (isCorrect) {
                        bgClass = "from-[#114422] to-[#05220c]";
                        borderClass = "border-[#33ff77]";
                        badgeColor = "text-[#33ff77]";
                        innerShadow = "inset_0_0_30px_rgba(51,255,119,0.3)";
                    } else if (isWrong) {
                        bgClass = "from-[#441111] to-[#220505]";
                        borderClass = "border-[#ff3333]";
                        badgeColor = "text-[#ff3333]";
                        innerShadow = "inset_0_0_30px_rgba(255,51,51,0.3)";
                    } else if (isSelected && !isAnswered) {
                        bgClass = "from-[#332200] to-[#1a1100]";
                        borderClass = "border-[#ffaa00]";
                        badgeColor = "text-[#ffaa00]";
                        innerShadow = "inset_0_0_30px_rgba(255,170,0,0.3)";
                    }

                    return (
                        <div key={opt.id} className="relative flex items-center">
                           {/* Connecting lines from center */}
                           <div className={`absolute top-1/2 ${i%2===0 ? 'right-[-32px] w-[32px]' : 'left-[-32px] w-[32px]'} h-[3px] bg-[#5577cc]/50`}></div>
                           
                           <div className={`flex-1 p-8 rounded-[60px] border-2 bg-gradient-to-b ${bgClass} ${borderClass} flex items-center transition-all duration-300 shadow-[0_10px_30px_rgba(0,0,0,0.5),${innerShadow}]`}>
                               <span className={`text-[36px] font-black mr-8 drop-shadow-[0_0_5px_currentColor] ${badgeColor}`}>{badge} ⋄</span>
                               <div className="flex flex-col flex-1 border-l-2 border-[#b3ccff]/10 pl-6">
                                  <span className="text-[40px] font-black text-white font-devanagari drop-shadow-md">
                                     {opt.hi}
                                  </span>
                                  <span className="text-[22px] mt-1 font-semibold text-[#b3ccff] drop-shadow-md">
                                     {opt.en}
                                  </span>
                               </div>
                           </div>
                        </div>
                    );
                })}
             </div>
           </motion.div>
         </AnimatePresence>

      </main>

      {/* Golden Separator Line */}
      <div className="w-full h-[4px] bg-gradient-to-r from-transparent via-[#ffcc00] to-transparent shadow-[0_0_15px_#ffcc00] z-20"></div>
      
      {/* Footer */}
      <footer className="h-[90px] bg-[#02000a] w-full flex items-center justify-between px-20 z-20">
         <div className="text-[24px] font-bold text-[#b3ccff] tracking-widest uppercase">
            {footerText || "SSC CHAMPIONS LEAGUE"}
         </div>
         <div className="text-[24px] font-black text-[#ffcc00] tracking-[0.2em] italic drop-shadow-[0_0_10px_rgba(255,204,0,0.5)] uppercase">
            {motivationalText || "PLAY AND WIN"}
         </div>
      </footer>
    </div>
  );
}
