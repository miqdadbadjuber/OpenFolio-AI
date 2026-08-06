import { useEffect, useState } from "react";
import { ArrowRight, Github, Check, X, Eye, Lock, FileText, Cpu, type LucideIcon } from "lucide-react";
import { motion } from "motion/react";
import { Link } from "react-router";
import Logo from "../components/Logo";

const GITHUB_URL = "https://github.com/MiqdadBadjuber/OpenFolio-AI";

const WORKFLOW: Array<{ title: string; desc: string; icon: LucideIcon }> = [
  { title: "Tempel data", desc: "resume / jawab singkat", icon: FileText },
  { title: "AI menyusun", desc: "identitas + konten", icon: Cpu },
  { title: "Review hasil", desc: "di halaman baru", icon: Eye },
  { title: "Simpan & bagikan", desc: "tautan portofolio", icon: Check },
];

const COMPARISON: Array<[string, string, string]> = [
  ["Kecepatan", "Detik", "Jam"],
  ["Login", "Tanpa login", "Wajib akun"],
  ["Template", "Otomatis", "Mulai dari nol"],
  ["Hasil", "HTML/Tailwind bersih", "Bergantung jasa"],
  ["Revisi", "Chat AI", "Manual"],
  ["Biaya", "Gratis", "Mahal"],
];

const TERMINAL_LINES = [
  "openfolio build --profile engineer",
  "konten disusun oleh AI",
  "layout dirapikan otomatis",
  "portofolio siap — buka di halaman baru",
];

function TerminalCard() {
  const [visible, setVisible] = useState(1);
  useEffect(() => {
    const t = setInterval(() => {
      setVisible((v) => (v >= TERMINAL_LINES.length ? 1 : v + 1));
    }, 1000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="bg-[#0c0c11] border border-white/5 rounded-xl overflow-hidden font-mono text-[11px] md:text-[13px]">
      <div className="flex items-center gap-1.5 px-3 py-2.5 border-b border-white/5">
        <span className="w-2.5 h-2.5 rounded-full bg-red-500/25 border border-red-500/50" />
        <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/25 border border-yellow-500/50" />
        <span className="w-2.5 h-2.5 rounded-full bg-green-500/25 border border-green-500/50" />
        <span className="ml-2 text-[10px] tracking-wider text-zinc-600 uppercase">openfolio-cli</span>
      </div>
      <div className="p-4 min-h-[150px] md:min-h-[180px] space-y-2 text-zinc-400">
        <div>
          <span className="text-green-500">$ </span>
          <span className="text-zinc-200">{TERMINAL_LINES[0]}</span>
        </div>
        {TERMINAL_LINES.slice(1, visible).map((line) => (
          <div key={line} className="flex items-center gap-2">
            <Check className="w-3 h-3 text-green-500 shrink-0" />
            <span>{line}</span>
          </div>
        ))}
        <span className="inline-block w-2 h-4 bg-zinc-500/70 animate-pulse align-middle" />
      </div>
    </div>
  );
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0f] text-zinc-300 font-sans overflow-x-hidden relative selection:bg-zinc-800 selection:text-white">
      <div className="absolute top-0 inset-x-0 h-[560px] bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,0.07),transparent)] pointer-events-none" />

      <header className="fixed top-0 inset-x-0 z-50 bg-[#0a0a0f]/80 backdrop-blur-md border-b border-white/5">
        <nav className="max-w-[1200px] mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Logo size={26} variant="white" />
            <span className="font-semibold text-white tracking-tight">OpenFolio</span>
          </div>
          <div className="flex items-center gap-5">
            <a href={GITHUB_URL} target="_blank" rel="noreferrer" aria-label="GitHub" className="text-zinc-400 hover:text-white transition-colors">
              <Github className="w-5 h-5" />
            </a>
            <Link to="/app" className="bg-white text-black px-5 py-2 rounded-lg font-semibold text-sm hover:bg-zinc-200 transition-colors">
              Deploy
            </Link>
          </div>
        </nav>
      </header>

      <main className="relative z-10 pt-28 md:pt-36 max-w-[1200px] mx-auto px-6">
        {/* HERO — bento */}
        <section className="grid grid-cols-1 md:grid-cols-12 gap-4 mb-20">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="md:col-span-7 bg-[#131318] border border-white/5 rounded-2xl p-8 md:p-10 flex flex-col justify-center min-h-[280px] md:min-h-[360px] relative overflow-hidden"
          >
            <div className="absolute -top-10 -right-10 w-64 h-64 bg-white/[0.03] rounded-full blur-3xl pointer-events-none" />
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/10 bg-white/[0.03] text-[11px] text-zinc-400 font-medium mb-5">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              Gratis · Tanpa login · Open source
            </div>
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-white leading-[1.05] mb-6">
              Portofolio-mu,{" "}
              <span className="bg-gradient-to-r from-indigo-300 via-violet-300 to-fuchsia-300 bg-clip-text text-transparent">
                dikodekan AI.
              </span>
            </h1>
            <p className="text-lg text-zinc-400 max-w-md font-light leading-relaxed mb-8">
              Tempel data → AI susun → review di halaman baru. Tanpa login.
            </p>
            <div className="flex flex-wrap items-center gap-4">
              <Link to="/app" className="inline-flex items-center gap-2 bg-white text-black px-7 py-3.5 rounded-xl font-semibold hover:bg-zinc-200 transition-all group">
                Mulai Membuat Gratis
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="md:col-span-5 bg-[#14141b] border border-white/5 rounded-2xl p-5 md:p-6 flex flex-col justify-center min-h-[280px] md:min-h-[360px]"
          >
            <div className="text-xs uppercase tracking-wider text-zinc-600 mb-4">Terminal — build portofolio</div>
            <TerminalCard />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="md:col-span-6 bg-[#131318] border border-white/5 rounded-2xl p-6 flex items-center gap-4"
          >
            <div className="w-10 h-10 rounded-lg bg-zinc-900 border border-white/10 flex items-center justify-center shrink-0">
              <Eye className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="text-white font-semibold">Review di halaman baru</div>
              <div className="text-sm text-zinc-500">Lihat hasil portofolio langsung</div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="md:col-span-6 bg-[#131318] border border-white/5 rounded-2xl p-6 flex items-center gap-4"
          >
            <div className="w-10 h-10 rounded-lg bg-zinc-900 border border-white/10 flex items-center justify-center shrink-0">
              <Lock className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="text-white font-semibold">Tanpa login</div>
              <div className="text-sm text-zinc-500">Langsung pakai · Gratis · Quota harian</div>
            </div>
          </motion.div>
        </section>

        {/* CARA KERJA */}
        <motion.section
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5 }}
          className="mb-24"
        >
          <div className="flex items-center gap-3 mb-12">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-white">Cara Kerja</h2>
            <span className="text-xs px-2.5 py-1 rounded-full border border-indigo-400/20 bg-indigo-400/10 text-indigo-300 font-medium">Semua otomatis</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {WORKFLOW.map((step, i) => {
              const Icon = step.icon;
              return (
                <div key={step.title} className="bg-[#131318] border border-white/5 rounded-2xl p-6 relative overflow-hidden group hover:border-zinc-700 transition-colors">
                  <div className="absolute top-4 right-5 text-5xl font-bold text-white/5 font-mono select-none">{i + 1}</div>
                  <div className="w-10 h-10 rounded-lg bg-zinc-900 border border-white/10 flex items-center justify-center mb-5">
                    <Icon className="w-4 h-4 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-1.5">{step.title}</h3>
                  <p className="text-sm text-zinc-500 font-light">{step.desc}</p>
                </div>
              );
            })}
          </div>
        </motion.section>

        {/* KENAPA OPENFOLIO */}
        <motion.section
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5 }}
          className="mb-24"
        >
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-white mb-12">Kenapa <span className="bg-gradient-to-r from-indigo-300 via-violet-300 to-fuchsia-300 bg-clip-text text-transparent">OpenFolio</span>?</h2>
          <div className="rounded-2xl border border-white/5 bg-[#0c0c11] overflow-hidden">
            <div className="grid grid-cols-3 border-b border-white/5 bg-[#0a0a0f]">
              <div className="p-3 md:p-6 text-xs md:text-sm text-zinc-400 font-medium">Aspek</div>
              <div className="p-3 md:p-6 border-l border-white/5 text-xs md:text-sm text-white font-semibold">OpenFolio</div>
              <div className="p-3 md:p-6 border-l border-white/5 text-xs md:text-sm text-zinc-500">Manual / jasa</div>
            </div>
            {COMPARISON.map(([label, us, them]) => (
              <div key={label} className="grid grid-cols-3 border-b border-white/5 last:border-0 hover:bg-white/[0.02] transition-colors">
                <div className="p-3 md:p-6 text-[11px] md:text-sm text-zinc-500 uppercase tracking-wider flex items-center">{label}</div>
                <div className="p-3 md:p-6 border-l border-white/5 text-xs md:text-sm text-white flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-green-500/10 flex items-center justify-center shrink-0"><Check className="w-3 h-3 text-green-500" /></span>
                  {us}
                </div>
                <div className="p-3 md:p-6 border-l border-white/5 text-xs md:text-sm text-zinc-500 flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-zinc-800/50 flex items-center justify-center shrink-0"><X className="w-3 h-3 text-zinc-600" /></span>
                  {them}
                </div>
              </div>
            ))}
          </div>
        </motion.section>

        {/* CTA OPEN SOURCE */}
        <motion.section
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5 }}
          className="mb-16 relative overflow-hidden rounded-3xl border border-white/5 bg-[#0c0c11]"
        >
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,rgba(255,255,255,0.06),transparent)] pointer-events-none" />
          <div className="relative z-10 px-6 md:px-8 py-16 md:py-24 flex flex-col items-center text-center">
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-white mb-5">Gratis. Open source. Tanpa login.</h2>
            <p className="text-lg text-zinc-400 font-light max-w-xl leading-relaxed mb-10">
              MIT License · Host sendiri · Kontribusi terbuka
            </p>
            <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
              <Link to="/app" className="bg-white text-black px-8 py-4 rounded-xl font-semibold hover:bg-zinc-200 transition-all flex items-center justify-center gap-2">
                Mulai Membuat <ArrowRight className="w-4 h-4" />
              </Link>
              <a href={GITHUB_URL} target="_blank" rel="noreferrer" className="px-8 py-4 rounded-xl font-semibold border border-zinc-700 bg-[#0f0f14] text-white hover:bg-zinc-800 transition-all flex items-center justify-center gap-2">
                <Github className="w-4 h-4" /> Lihat di GitHub
              </a>
            </div>
          </div>
        </motion.section>
      </main>

      <footer className="border-t border-white/5 py-8 flex flex-col md:flex-row items-center justify-between gap-4">
        <span className="text-xs text-zinc-600 font-medium tracking-wide uppercase">OpenFolio © {new Date().getFullYear()}</span>
        <div className="flex gap-6 text-xs text-zinc-500 uppercase tracking-wide">
          <a href={GITHUB_URL} target="_blank" rel="noreferrer" className="hover:text-white transition-colors">GitHub</a>
          <Link to="/app" className="hover:text-white transition-colors">Aplikasi</Link>
        </div>
      </footer>
    </div>
  );
}
