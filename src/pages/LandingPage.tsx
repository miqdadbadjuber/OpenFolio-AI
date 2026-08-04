import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, useScroll, useTransform, AnimatePresence } from 'motion/react';
import { 
  ArrowRight, 
  Command, 
  Code, 
  Cpu,
  Layers,
  Globe,
  Terminal,
  Blocks,
  FileJson
} from 'lucide-react';
import Logo from '../components/Logo';

const FeatureCard = ({ icon: Icon, title, description, delay = 0 }: { icon: any, title: string, description: string, delay?: number }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.8, delay, ease: [0.16, 1, 0.3, 1] }}
      className="group relative p-8 md:p-10 rounded-[2.5rem] bg-gradient-to-b from-white/[0.04] to-transparent border border-white/[0.05] hover:border-white/[0.1] transition-colors overflow-hidden"
    >
      <div className="absolute inset-0 bg-gradient-to-b from-white/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      <div className="relative z-10">
        <div className="w-14 h-14 rounded-2xl bg-white/[0.03] border border-white/[0.05] flex items-center justify-center mb-8 group-hover:scale-110 group-hover:bg-white/[0.08] transition-all duration-500">
          <Icon className="w-6 h-6 text-zinc-300 group-hover:text-white transition-colors" />
        </div>
        <h3 className="text-2xl font-medium text-white tracking-tight mb-4">{title}</h3>
        <p className="text-zinc-500 leading-relaxed font-light">{description}</p>
      </div>
    </motion.div>
  );
};

export default function LandingPage() {
  const { scrollYProgress } = useScroll();
  const y = useTransform(scrollYProgress, [0, 1], [0, 400]);
  const opacity = useTransform(scrollYProgress, [0, 0.3], [1, 0]);

  const words = ["Developers", "Designers", "Creators", "Engineers"];
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % words.length);
    }, 2500);
    return () => clearInterval(timer);
  }, [words.length]);

  return (
    <div className="min-h-screen bg-[#020202] text-zinc-300 font-sans selection:bg-white/20 overflow-x-hidden flex flex-col">
      
      {/* Background Ambient Layers */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden flex justify-center items-center z-0">
        <motion.div 
          animate={{ rotate: 360 }} 
          transition={{ duration: 150, repeat: Infinity, ease: "linear" }}
          className="absolute w-[800px] h-[800px] bg-zinc-500/5 rounded-full blur-[120px] mix-blend-screen opacity-50"
        />
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      </div>

      {/* HEADER */}
      <header className="fixed top-0 inset-x-0 z-50 backdrop-blur-2xl bg-[#020202]/50 border-b border-white/[0.03]">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <Logo size={26} className="text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]" />
            <span className="font-medium text-white tracking-wide">OpenFolio</span>
          </Link>
          <div className="flex items-center gap-8">
            <Link to="/login" className="text-sm text-zinc-400 hover:text-white transition-colors hidden md:block">Sign In</Link>
            <Link to="/login?register=true" className="relative group overflow-hidden rounded-full p-[1px]">
              <span className="absolute inset-0 bg-gradient-to-r from-zinc-500 via-white to-zinc-500 opacity-50 group-hover:opacity-100 transition-opacity animate-[spin_3s_linear_infinite]" />
              <div className="relative bg-[#050505] px-6 py-2.5 rounded-full flex items-center gap-2 transition-all group-hover:bg-[#111] group-active:scale-95">
                <span className="text-sm font-medium text-white">Start Building</span>
                <Command className="w-3.5 h-3.5 text-zinc-400" />
              </div>
            </Link>
          </div>
        </div>
      </header>

      <main className="relative z-10 pt-32 md:pt-40 flex-1">
        
        {/* HERO SECTION */}
        <section className="relative px-6 max-w-7xl mx-auto flex flex-col items-center text-center min-h-[80vh] justify-center pb-20">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
            className="inline-flex items-center gap-3 px-4 py-2 rounded-full border border-white/5 bg-white/[0.02] backdrop-blur-md mb-10"
          >
            <div className="w-1.5 h-1.5 rounded-full bg-zinc-400" />
            <span className="text-xs font-medium text-zinc-300 tracking-wide uppercase">OpenFolio Engine 2.0</span>
          </motion.div>
          
          <motion.h1 
            style={{ y, opacity }}
            className="text-5xl md:text-7xl lg:text-[7.5rem] font-medium tracking-tight text-transparent bg-clip-text bg-gradient-to-b from-white via-zinc-300 to-zinc-600 leading-[1.05] mb-8 flex flex-col items-center w-full"
          >
            <span>Your identity for</span>
            {/* Safe container for absolute dynamic text to prevent overlaps */}
            <div className="h-[1.2em] relative flex justify-center items-center w-full mt-2">
              <AnimatePresence mode="wait">
                <motion.span
                  key={words[index]}
                  initial={{ opacity: 0, y: 30, filter: "blur(4px)" }}
                  animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                  exit={{ opacity: 0, y: -30, filter: "blur(4px)" }}
                  transition={{ duration: 0.4, ease: "easeOut" }}
                  className="absolute text-transparent bg-clip-text bg-gradient-to-r from-zinc-200 to-zinc-500 font-serif italic pr-4"
                >
                  {words[index]}.
                </motion.span>
              </AnimatePresence>
            </div>
          </motion.h1>

          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 1 }}
            className="text-lg md:text-2xl text-zinc-500 max-w-3xl font-light leading-relaxed mb-14 px-4"
          >
            Compile your resume into a highly-performant, semantic web architecture. Zero manual templating.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 1 }}
          >
             <Link to="/app" className="group relative inline-flex items-center justify-center overflow-hidden rounded-full p-[1px] shadow-[0_0_40px_rgba(255,255,255,0.05)] hover:shadow-[0_0_80px_rgba(255,255,255,0.1)] transition-shadow duration-500">
               <div className="absolute inset-0 bg-gradient-to-r from-zinc-400 to-white opacity-50 group-hover:opacity-100 transition-opacity duration-500" />
               <div className="relative px-10 py-5 bg-white text-black rounded-full flex items-center gap-3 transition-transform duration-300 group-hover:scale-[0.98]">
                 <span className="font-semibold text-lg tracking-tight">Deploy Portfolio</span>
                 <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
               </div>
             </Link>
          </motion.div>
        </section>

        {/* FLOATING MOCKUP SHOWCASE */}
        <section className="px-6 pb-32 md:pb-40">
          <motion.div 
            initial={{ opacity: 0, y: 100 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
            className="max-w-5xl mx-auto relative rounded-[2.5rem] border border-white/[0.05] bg-[#0A0A0B] p-2 md:p-4 shadow-[0_0_100px_rgba(255,255,255,0.02)] overflow-hidden"
          >
            <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
            <div className="rounded-[2rem] overflow-hidden bg-black border border-white/5 relative aspect-square sm:aspect-video flex items-center justify-center group">
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(255,255,255,0.03)_0%,_transparent_70%)]" />
              
              {/* Fake Interactive UI for aesthetic */}
              <div className="relative z-10 w-4/5 h-4/5 border border-white/[0.05] rounded-2xl bg-white/[0.02] backdrop-blur-md flex flex-col overflow-hidden shadow-2xl transition-transform duration-1000 md:group-hover:scale-105 md:group-hover:-translate-y-4 md:group-hover:rotate-[0.5deg]">
                {/* Window header */}
                <div className="h-12 border-b border-white/[0.05] bg-white/[0.02] flex items-center px-6 gap-2.5 shrink-0">
                  <div className="w-3 h-3 rounded-full bg-zinc-800" />
                  <div className="w-3 h-3 rounded-full bg-zinc-800" />
                  <div className="w-3 h-3 rounded-full bg-zinc-800" />
                </div>
                {/* Window body */}
                <div className="flex-1 p-8 md:p-12 flex flex-col gap-6 md:gap-8 items-center justify-center relative overflow-hidden">
                   {/* Decorative code lines */}
                   <div className="absolute top-8 left-8 flex flex-col gap-3 opacity-20">
                     <div className="w-24 md:w-32 h-2 bg-zinc-500 rounded-full" />
                     <div className="w-16 md:w-24 h-2 bg-zinc-500 rounded-full" />
                     <div className="w-32 md:w-40 h-2 bg-zinc-500 rounded-full" />
                   </div>
                   <div className="w-24 h-24 md:w-40 md:h-40 rounded-full bg-gradient-to-b from-zinc-800 to-zinc-950 border border-white/5 shadow-2xl relative shrink-0">
                     <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,_rgba(255,255,255,0.1),_transparent)] rounded-full" />
                   </div>
                   <div className="w-1/2 h-4 md:h-6 bg-zinc-900 rounded-lg" />
                   <div className="w-3/4 h-3 md:h-4 bg-zinc-900 rounded-lg" />
                   <div className="w-2/3 h-3 md:h-4 bg-zinc-900 rounded-lg" />
                </div>
              </div>

              {/* Floating elements attached to UI (Hidden on mobile to prevent clipping) */}
              <div className="hidden md:flex absolute top-[20%] left-[-2%] lg:left-[5%] bg-white/[0.02] border border-white/10 rounded-full backdrop-blur-xl items-center px-4 py-3 gap-3 transition-transform duration-1000 -translate-x-8 group-hover:translate-x-0 shadow-xl z-20">
                <Terminal className="w-4 h-4 text-zinc-300" />
                <div className="w-16 h-1.5 bg-zinc-700 rounded-full" />
              </div>
              <div className="hidden md:flex absolute bottom-[25%] right-[-2%] lg:right-[5%] bg-white/[0.02] border border-white/10 rounded-full backdrop-blur-xl items-center px-4 py-3 gap-3 transition-transform duration-1000 translate-x-8 group-hover:translate-x-0 shadow-xl z-20">
                <FileJson className="w-4 h-4 text-zinc-300" />
                <div className="w-20 h-1.5 bg-zinc-700 rounded-full" />
              </div>
            </div>
          </motion.div>
        </section>

        {/* ELEGANT FEATURES GRID */}
        <section className="py-32 px-6 border-t border-white/[0.02] bg-[#050505]">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-24">
              <motion.h2 
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="text-4xl md:text-6xl font-medium tracking-tight text-white mb-6"
              >
                Designed for Excellence
              </motion.h2>
              <motion.p 
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.1 }}
                className="text-xl md:text-2xl text-zinc-500 font-light"
              >
                Precision engineering meets semantic data architecture.
              </motion.p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <FeatureCard 
                icon={Blocks} 
                title="Modular Layouts" 
                description="The engine analyzes your experience and constructs an optimal architectural layout to highlight core strengths." 
                delay={0.1}
              />
              <FeatureCard 
                icon={Globe} 
                title="Global Namespace" 
                description="Instantly claim your domain namespace. Deploy directly to the edge without configuring a single server." 
                delay={0.2}
              />
              <FeatureCard 
                icon={Code} 
                title="Exportable Code" 
                description="Pure, unminified HTML/Tailwind export. Take your code anywhere. No lock-in, just beautiful syntax." 
                delay={0.3}
              />
              <FeatureCard 
                icon={Cpu} 
                title="Iterative Compiler" 
                description="Adjust your portfolio via our conversational interface. Restructure content blocks without touching CSS." 
                delay={0.4}
              />
              <FeatureCard 
                icon={Layers} 
                title="Responsive DNA" 
                description="Every compiled element is mathematically calculated to respond perfectly across any viewport size." 
                delay={0.5}
              />
              <FeatureCard 
                icon={Command} 
                title="Keyboard Native" 
                description="Navigate, edit, and deploy entirely through a unified command palette built for power users." 
                delay={0.6}
              />
            </div>
          </div>
        </section>

      </main>

      {/* FOOTER */}
      <footer className="border-t border-white/[0.05] bg-black mt-auto">
        <div className="max-w-7xl mx-auto px-6 py-12 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-3">
            <Logo size={20} className="text-white opacity-50" />
            <span className="text-sm text-zinc-600 font-medium tracking-tight">OpenFolio &copy; {new Date().getFullYear()}</span>
          </div>
          <div className="flex gap-8 text-sm font-medium text-zinc-500">
            <Link to="/app" className="hover:text-white transition-colors">App</Link>
            <Link to="/login" className="hover:text-white transition-colors">Login</Link>
            <a href="https://github.com/MiqdadBadjuber/OpenFolio-AI" target="_blank" rel="noreferrer" className="hover:text-white transition-colors">GitHub</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
