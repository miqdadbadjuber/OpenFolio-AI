import { ArrowRight, Github, Check, X, Sparkles, Share2, LayoutGrid, FileText } from "lucide-react";
import { Link } from "react-router";
import Logo from "../components/Logo";

const GITHUB_URL = "https://github.com/MiqdadBadjuber/OpenFolio-AI";

const TEMPLATES = ["obsidian", "kinetic", "aurora", "folio", "studio", "nexus", "pulse", "manuscript"];

const WORKFLOW = [
  { title: "Tempel data", desc: "resume / jawab singkat" },
  { title: "AI menyusun", desc: "identitas + konten" },
  { title: "Pilih template", desc: "8 gaya berbeda" },
  { title: "Publish", desc: "URL publik /p/..." },
];

const COMPARISON: Array<[string, string, string]> = [
  ["Kecepatan", "Detik", "Jam"],
  ["Login", "Tanpa login", "Wajib akun"],
  ["Template", "8 siap pakai", "Mulai dari nol"],
  ["Hasil", "HTML/Tailwind bersih", "Bergantung jasa"],
  ["Revisi", "Chat AI", "Manual"],
  ["Biaya", "Gratis", "Mahal"],
];

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
            <a href={GITHUB_URL} target="_blank" rel="noreferrer" className="text-zinc-400 hover:text-white transition-colors">
              <Github className="w-5 h-5" />
            </a>
            <Link to="/app" className="bg-white text-black px-5 py-2 rounded-lg font-semibold text-sm hover:bg-zinc-200 transition-colors">
              Deploy
            </Link>
          </div>
        </nav>
      </header>

      <main className="relative z-10 pt-28 md:pt-32 max-w-[1200px] mx-auto px-6">
        <section className="grid grid-cols-1 md:grid-cols-12 gap-4 mb-16">
          {/* Card A — headline (span 7) */}
          <div className="md:col-span-7 bg-[#131318] border border-white/5 rounded-2xl p-8 md:p-10 flex flex-col justify-between min-h-[320px] relative overflow-hidden">
            <div className="absolute -top-10 -right-10 w-64 h-64 bg-white/[0.03] rounded-full blur-3xl pointer-events-none" />
            <div className="inline-flex items-center gap-2 self-start px-3 py-1.5 rounded-full border border-white/10 bg-white/5 text-xs font-semibold text-zinc-300 uppercase tracking-wider">
              <span className="h-2 w-2 rounded-full bg-zinc-500 animate-pulse" />
              AI Portfolio Builder · Gratis
            </div>
            <div>
              <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-white leading-[1.05] mb-5">
                Portofolio-mu,{" "}
                <span className="bg-gradient-to-b from-white via-[#D4D4D8] to-[#71717A] bg-clip-text text-transparent">
                  dikodekan AI.
                </span>
              </h1>
              <p className="text-lg text-zinc-400 max-w-md font-light leading-relaxed mb-7">
                Tempel data → AI susun → pilih template → publish URL publik. Tanpa login.
              </p>
              <Link to="/app" className="inline-flex items-center gap-2 bg-white text-black px-7 py-3.5 rounded-xl font-semibold hover:bg-zinc-200 transition-all group">
                Mulai Membuat Gratis
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </div>

          {/* Card B — visual preview (span 5) */}
          <div className="md:col-span-5 bg-[#14141b] border border-white/5 rounded-2xl p-6 flex flex-col justify-center min-h-[320px]">
            <div className="text-xs uppercase tracking-wider text-zinc-600 mb-4">Preview Portfolio</div>
            <div className="bg-[#0c0c11] border border-white/5 rounded-xl p-5">
              <div className="flex items-center gap-4 mb-5">
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-white/20 to-white/5 border border-white/10" />
                <div>
                  <div className="h-3 w-28 bg-zinc-700/60 rounded mb-2" />
                  <div className="h-2.5 w-20 bg-zinc-800 rounded" />
                </div>
              </div>
              <div className="space-y-2">
                <div className="h-2 bg-zinc-800 rounded w-full" />
                <div className="h-2 bg-zinc-800 rounded w-5/6" />
                <div className="h-2 bg-zinc-800 rounded w-4/6" />
              </div>
              <div className="flex gap-2 mt-5">
                {["React", "TS", "AI"].map((t) => (
                  <span key={t} className="text-[10px] px-2 py-1 rounded-full bg-white/5 border border-white/10 text-zinc-400">{t}</span>
                ))}
              </div>
            </div>
          </div>

          {/* Card C — 8 template */}
          <div className="md:col-span-4 bg-[#131318] border border-white/5 rounded-2xl p-6">
            <div className="text-3xl font-bold text-white mb-1 flex items-center gap-2"><LayoutGrid className="w-5 h-5 text-zinc-500" /> 8</div>
            <div className="text-sm text-zinc-500">Template siap pakai</div>
          </div>

          {/* Card D — /p/nama */}
          <div className="md:col-span-4 bg-[#131318] border border-white/5 rounded-2xl p-6">
            <div className="text-xl font-semibold text-white mb-1 font-mono flex items-center gap-2"><Share2 className="w-5 h-5 text-zinc-500" /> /p/nama</div>
            <div className="text-sm text-zinc-500">Publish ke URL publik</div>
          </div>

          {/* Card E — tanpa login */}
          <div className="md:col-span-4 bg-[#131318] border border-white/5 rounded-2xl p-6">
            <div className="text-3xl font-bold text-white mb-1 flex items-center gap-2"><Sparkles className="w-5 h-5 text-zinc-500" /> Tanpa login</div>
            <div className="text-sm text-zinc-500">Guest-only · Quota harian</div>
          </div>
        </section>

        <section className="mb-24">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-white mb-12">Cara Kerja</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {WORKFLOW.map((step, i) => (
              <div key={step.title} className="bg-[#131318] border border-white/5 rounded-2xl p-6 relative overflow-hidden group hover:border-zinc-700 transition-colors">
                <div className="absolute top-4 right-5 text-5xl font-bold text-white/5 font-mono select-none">{i + 1}</div>
                <div className="w-10 h-10 rounded-lg bg-zinc-900 border border-white/10 flex items-center justify-center mb-5">
                  <FileText className="w-4 h-4 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-1.5">{step.title}</h3>
                <p className="text-sm text-zinc-500 font-light">{step.desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mb-24">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-white mb-12">Kenapa OpenFolio?</h2>
          <div className="rounded-2xl border border-white/5 bg-[#0c0c11] overflow-hidden">
            <div className="grid grid-cols-3 border-b border-white/5 bg-[#0a0a0f]">
              <div className="p-4 md:p-6 text-sm text-zinc-400 font-medium">Aspek</div>
              <div className="p-4 md:p-6 border-l border-white/5 text-sm text-white font-semibold">OpenFolio</div>
              <div className="p-4 md:p-6 border-l border-white/5 text-sm text-zinc-500">Manual / jasa</div>
            </div>
            {COMPARISON.map(([label, us, them]) => (
              <div key={label} className="grid grid-cols-3 border-b border-white/5 last:border-0 hover:bg-white/[0.02] transition-colors">
                <div className="p-4 md:p-6 text-xs md:text-sm text-zinc-500 uppercase tracking-wider flex items-center">{label}</div>
                <div className="p-4 md:p-6 border-l border-white/5 text-sm text-white flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-green-500/10 flex items-center justify-center shrink-0"><Check className="w-3 h-3 text-green-500" /></span>
                  {us}
                </div>
                <div className="p-4 md:p-6 border-l border-white/5 text-sm text-zinc-500 flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-zinc-800/50 flex items-center justify-center shrink-0"><X className="w-3 h-3 text-zinc-600" /></span>
                  {them}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="mb-24">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-white mb-12">8 Template</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {TEMPLATES.map((t) => (
              <div key={t} className="bg-[#131318] border border-white/5 rounded-xl p-5 hover:border-zinc-700 transition-colors">
                <div className="h-8 bg-gradient-to-br from-white/10 to-white/[0.02] rounded-lg mb-4 border border-white/5" />
                <div className="text-sm font-medium text-zinc-300 capitalize">{t}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="mb-16 relative overflow-hidden rounded-3xl border border-white/5 bg-[#0c0c11]">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,rgba(255,255,255,0.06),transparent)] pointer-events-none" />
          <div className="relative z-10 px-8 py-20 md:py-24 flex flex-col items-center text-center">
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-white mb-5">Gratis. Open source. Tanpa login.</h2>
            <p className="text-lg text-zinc-400 font-light max-w-xl leading-relaxed mb-10">
              MIT License · Host sendiri · Kontribusi terbuka
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link to="/app" className="bg-white text-black px-8 py-4 rounded-xl font-semibold hover:bg-zinc-200 transition-all flex items-center gap-2">
                Mulai Membuat <ArrowRight className="w-4 h-4" />
              </Link>
              <a href={GITHUB_URL} target="_blank" rel="noreferrer" className="px-8 py-4 rounded-xl font-semibold border border-zinc-700 bg-[#0f0f14] text-white hover:bg-zinc-800 transition-all flex items-center gap-2">
                <Github className="w-4 h-4" /> Lihat di GitHub
              </a>
            </div>
          </div>
        </section>
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
