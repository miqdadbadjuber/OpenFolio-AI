import React from 'react';
import AppLayout from '../components/AppLayout';
import { MessageSquarePlus, FileText, Link as LinkIcon, Blocks, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router';
import { motion } from 'motion/react';
import Logo from '../components/Logo';

export default function AppPage() {
  const navigate = useNavigate();

  const options = [
    {
      title: 'Mulai Ekstraksi Identitas',
      description: 'Lakukan sesi creative direction interview bersama AI untuk merangkai visi karir, identitas, dan aset portofoliomu menjadi sistem operasi digital yang premium.',
      action: () => navigate('/app/new-chat', { state: { freshSession: true } }),
      icon: Blocks,
      tag: 'Otomatis',
      style: 'border-zinc-800/40 text-zinc-400 bg-zinc-950/40 hover:bg-zinc-900/40 group-hover:border-zinc-700/60'
    }
  ];

  return (
    <AppLayout>
      <div className="flex-1 flex flex-col items-center justify-center p-6 md:p-12 relative overflow-hidden bg-[var(--bg-base)]">
        {/* Cinematic Backdrop Glow */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-indigo-500/5 blur-[120px] pointer-events-none"></div>
        <div className="absolute top-1/3 left-1/3 w-[300px] h-[300px] rounded-full bg-violet-500/5 blur-[100px] pointer-events-none"></div>

        <div className="max-w-3xl w-full text-center space-y-12 relative z-10 my-auto pb-10">
          {/* Animated App Icon Header */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col items-center gap-6"
          >
            <div className="w-16 h-16 rounded-3xl bg-[#0d0d10] border border-zinc-800/80 flex items-center justify-center shadow-2xl relative group overflow-hidden select-none">
              <div className="absolute inset-0 bg-indigo-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
              <Logo size={40} variant="gradient" animated={false} />
            </div>
            
            <div className="space-y-3 mt-4">
              <h1 className="text-3xl md:text-5xl font-medium tracking-tight text-white leading-tight">
                Mulai Sinkronisasi Identitas.
              </h1>
              <p className="text-zinc-500 text-sm md:text-base leading-relaxed max-w-lg mx-auto">
                OpenFolio AI akan memproses informasi Anda untuk merancang struktur arsitektur portofolio profesional secara presisi.
              </p>
            </div>
          </motion.div>
 
          {/* Cards Stack */}
          <div className="w-full max-w-2xl mx-auto">
            {options.map((opt, idx) => {
              const IconComponent = opt.icon;
              return (
                <motion.button
                  key={idx}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: idx * 0.1, ease: [0.16, 1, 0.3, 1] }}
                  whileHover={{ y: -5, scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={opt.action}
                  className="group glass-card relative flex flex-col items-start p-10 rounded-[2.5rem] premium-border-glow text-left transition-all duration-700 overflow-hidden cursor-pointer shadow-2xl hover:shadow-indigo-500/10"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
                  
                  <div className="relative z-10 w-16 h-16 rounded-2xl bg-zinc-900/50 border border-white/[0.03] flex items-center justify-center text-zinc-500 mb-8 group-hover:text-indigo-400 group-hover:bg-indigo-500/10 group-hover:scale-110 transition-all duration-700">
                    <IconComponent className="w-7 h-7" />
                  </div>
                  
                  <div className="flex-1 w-full space-y-3">
                    <div className="flex items-center gap-3">
                      <h3 className="text-xl font-medium text-white transition-colors leading-none tracking-tight">{opt.title}</h3>
                    </div>
                    <p className="text-zinc-500 text-sm leading-relaxed">{opt.description}</p>
                  </div>
 
                  <div className="mt-8 flex items-center gap-2 text-xs font-semibold tracking-wide text-zinc-500 group-hover:text-indigo-400 transition-all duration-700 -translate-x-2 group-hover:translate-x-0 opacity-80 group-hover:opacity-100">
                    Mulai <ArrowRight className="w-3.5 h-3.5" />
                  </div>
                </motion.button>
              );
            })}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
