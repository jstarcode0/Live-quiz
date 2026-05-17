import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Shield, Users, Volume2, VolumeX, CheckCircle, CheckCircle2 } from 'lucide-react';
import { TemplateProps } from './types';

export default function PremiumBroadcast({
  question,
  currentIdx,
  totalQuestions,
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
}: TemplateProps) {
  return (
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

      {/* HEADER */}
      <header className="h-[120px] w-full px-10 flex items-center justify-between relative z-10 bg-gradient-to-b from-[#010409]/90 to-[#010409]/50 backdrop-blur-xl border-b border-cyan-400/20 shadow-[0_5px_40px_rgba(6,182,212,0.1)]">
        <div className="flex items-center gap-5 w-[420px]">
          <div className="w-[72px] h-[72px] rounded-2xl flex items-center justify-center border-[2px] border-cyan-400/50 text-cyan-300 bg-cyan-900/20 shadow-[inset_0_0_20px_rgba(6,182,212,0.2)]">
            <Shield size={40} strokeWidth={2.5} className="drop-shadow-[0_0_8px_rgba(6,182,212,0.8)]" />
          </div>
          <div className="flex flex-col">
            <span className="text-[32px] font-black tracking-tight text-white leading-none text-glow-cyan text-shadow-md">{streamTitle || "SSC LIVE QUIZ"}</span>
            <span className="font-extrabold tracking-[0.25em] text-cyan-400 text-[13px] uppercase mt-2 drop-shadow-md">{telegramText || "Premium Broadcast"}</span>
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

      {/* MAIN BODY LAYOUT */}
      <main className="flex-1 w-full px-10 pt-8 pb-6 flex gap-10 relative z-10 overflow-hidden">
        
        {/* LEFT PANEL : Question Area */}
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
                    initial={{width: `${(totalQuestions > 0 ? (Number.isFinite(currentIdx) && currentIdx >= 0 ? currentIdx : 0)/totalQuestions : 0)*100}%`}} 
                    animate={{width: `${(totalQuestions > 0 ? ((Number.isFinite(currentIdx) && currentIdx >= 0 ? currentIdx : 0)+1)/totalQuestions : 0)*100}%`}} 
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

        {/* RIGHT PANEL : Timer + Logic */}
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

      {/* BOTTOM INFO BAR */}
      <footer className="h-[76px] w-full px-10 py-0 border-t border-cyan-500/20 bg-gradient-to-r from-[#010409] via-[#050b1a] to-[#010409] flex items-center justify-between text-slate-400 relative z-10 shadow-[0_-15px_30px_rgba(0,0,0,0.8)] backdrop-blur-md">
         <div className="flex items-center h-full">
             <div className="flex items-center gap-4 h-full border-r border-slate-800/80 pr-10 hover:bg-white/5 transition-colors cursor-default">
                <span className="font-bold text-[12px] tracking-[0.15em] uppercase text-slate-500">Live Subject</span>
                <span className="font-black text-[22px] text-white tracking-wider drop-shadow-sm">{catName || 'Polity / GK'}</span>
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
             <div className="flex items-center gap-4 h-full px-10 hover:bg-white/5 transition-colors cursor-default">
                <span className="font-bold text-[12px] tracking-[0.15em] uppercase text-slate-500">Status</span>
                <span className="font-black text-[22px] text-white tracking-wider">{footerText}</span>
             </div>
         </div>

         <div className="text-right flex items-center gap-6">
            <span className="font-black text-[24px] text-white tracking-widest italic text-glow-cyan drop-shadow-lg">{motivationalText || 'सफलता मेहनत मांगती है!'}</span>
         </div>
      </footer>
    </div>
  );
}
