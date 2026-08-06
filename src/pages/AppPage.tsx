import React from 'react';
import AppLayout from '../components/AppLayout';
import { ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router';
import { motion } from 'motion/react';
import Logo from '../components/Logo';

export default function AppPage() {
  const navigate = useNavigate();

  const options = [
    {
      title: 'Buat Portofolio Baru',
      description: 'Jawab beberapa pertanyaan singkat tentang dirimu. AI akan menyusun portofolio profesional untukmu.',
      action: () => navigate('/app/new-chat', { state: { freshSession: true } }),
      icon: Logo,
    }
  ];

  return (
    <AppLayout>
      <div className="h-full overflow-y-auto p-6 md:p-12 relative bg-[var(--bg-base)]">
        <div className="max-w-2xl w-full mx-auto flex flex-col items-center text-center my-auto pb-10 relative z-10">
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col items-center gap-6"
          >
            <div className="w-16 h-16 rounded-3xl bg-[#0d0d10] border border-zinc-800/80 flex items-center justify-center shadow-2xl relative select-none">
              <Logo size={40} variant="gradient" animated={false} />
            </div>

            <div className="space-y-3">
              <h1 className="text-3xl md:text-4xl font-medium tracking-tight text-white leading-tight">
                Buat Portofoliomu
              </h1>
              <p className="text-zinc-500 text-sm md:text-base leading-relaxed max-w-lg mx-auto">
                Ceritakan dirimu lewat chat, dan OpenFolio AI akan menyusun portofolio yang rapi untukmu.
              </p>
            </div>
          </motion.div>

          <div className="w-full mt-10">
            {options.map((opt, idx) => {
              const IconComponent = opt.icon;
              return (
                <motion.button
                  key={idx}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
                  whileHover={{ y: -4 }}
                  whileTap={{ scale: 0.99 }}
                  onClick={opt.action}
                  className="group glass-card relative flex flex-col items-start p-8 rounded-3xl premium-border-glow text-left transition-all duration-300 overflow-hidden cursor-pointer shadow-2xl hover:shadow-indigo-500/10 w-full"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />

                  <div className="relative z-10 w-14 h-14 rounded-2xl bg-zinc-900/50 border border-white/[0.03] flex items-center justify-center mb-6 group-hover:bg-indigo-500/10 transition-all duration-300">
                    <IconComponent size={32} variant="gradient" animated={false} />
                  </div>

                  <div className="flex-1 w-full space-y-2">
                    <h3 className="text-xl font-medium text-white tracking-tight">{opt.title}</h3>
                    <p className="text-zinc-500 text-sm leading-relaxed">{opt.description}</p>
                  </div>

                  <div className="mt-6 flex items-center gap-2 text-xs font-semibold tracking-wide text-zinc-500 group-hover:text-indigo-400 transition-all duration-300">
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
