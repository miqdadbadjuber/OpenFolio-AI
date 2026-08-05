import React from 'react';
import { Link } from 'react-router';
import { Terminal, Layout, Globe } from 'lucide-react';
import Logo from '../components/Logo';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#000000] text-zinc-300 font-sans selection:bg-white selection:text-black overflow-x-hidden flex flex-col">
      <header className="fixed top-0 inset-x-0 z-50 bg-[#000000]/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <Logo size={24} className="text-white" />
            <span className="font-semibold text-white tracking-wide uppercase text-sm">OpenFolio</span>
          </Link>
          <div className="flex items-center gap-6">
            <Link to="/app" className="bg-white text-black px-6 py-2.5 rounded-none font-bold text-xs uppercase tracking-widest hover:bg-zinc-200 transition-colors">
              Deploy
            </Link>
          </div>
        </div>
      </header>
      <main className="relative z-10 pt-32 md:pt-40 flex-1">
        <section className="px-6 max-w-7xl mx-auto flex flex-col items-start min-h-[70vh] justify-center pb-20 border-b border-zinc-900">
          <h1 className="text-6xl md:text-8xl lg:text-[9rem] font-medium tracking-tighter text-white leading-[0.9] mb-8 uppercase">
            Portfolio,<br />Dikodekan.
          </h1>
          <div className="flex flex-col md:flex-row md:items-end gap-8 w-full">
            <p className="text-lg md:text-2xl text-zinc-400 max-w-2xl font-light leading-relaxed">
              Compile your resume into a highly-performant, semantic web architecture. Zero manual templating. Built for engineering excellence.
            </p>
            <Link to="/app" className="inline-flex items-center justify-center bg-white text-black px-8 py-4 font-bold text-sm uppercase tracking-widest hover:bg-zinc-200 transition-colors gap-3 shrink-0">
              Generate Portfolio
              <span className="text-xl leading-none">&rarr;</span>
            </Link>
          </div>
        </section>

        <section className="py-32 px-6">
          <div className="max-w-7xl mx-auto">
            <h2 className="text-4xl md:text-6xl font-medium tracking-tighter text-white mb-20">
              Semantic Architecture.
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-12 gap-16 md:gap-8">
              {/* Feature 1 */}
              <div className="md:col-span-8 flex flex-col justify-center">
                <Terminal className="w-10 h-10 text-white mb-8" strokeWidth={1.5} />
                <h3 className="text-3xl md:text-5xl font-medium text-white tracking-tight mb-6">Modular Engine</h3>
                <p className="text-xl text-zinc-500 font-light leading-relaxed max-w-xl">
                  The engine analyzes your experience and constructs an optimal layout. We map your competencies into a strictly typed JSON schema before rendering a single pixel.
                </p>
              </div>
              
              {/* Empty space for editorial asymmetry */}
              <div className="hidden md:block md:col-span-4" />

              {/* Feature 2 */}
              <div className="hidden md:block md:col-span-4" />
              <div className="md:col-span-8 flex flex-col justify-center mt-16 md:mt-32">
                <Layout className="w-10 h-10 text-white mb-8" strokeWidth={1.5} />
                <h3 className="text-3xl md:text-5xl font-medium text-white tracking-tight mb-6">Iterative Compiler</h3>
                <p className="text-xl text-zinc-500 font-light leading-relaxed max-w-xl">
                  Adjust your portfolio via our command interface. Restructure content blocks without touching CSS. Everything is compiled instantly.
                </p>
              </div>

              {/* Feature 3 */}
              <div className="md:col-span-12 flex flex-col md:flex-row items-start md:items-center justify-between gap-10 mt-16 md:mt-32 border-t border-zinc-900 pt-16">
                <div className="max-w-2xl">
                  <Globe className="w-10 h-10 text-white mb-8" strokeWidth={1.5} />
                  <h3 className="text-3xl md:text-5xl font-medium text-white tracking-tight mb-6">Global Namespace</h3>
                  <p className="text-xl text-zinc-500 font-light leading-relaxed">
                    Pure, unminified HTML/Tailwind export. Deploy directly to the edge or take your code anywhere. No lock-in, just beautiful syntax.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-zinc-900 bg-[#000000] mt-auto">
        <div className="max-w-7xl mx-auto px-6 py-12 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-3">
            <span className="text-xs text-zinc-600 font-mono uppercase tracking-widest">OpenFolio &copy; {new Date().getFullYear()}</span>
          </div>
          <div className="flex gap-8 text-xs font-mono uppercase tracking-widest text-zinc-600">
            <Link to="/app" className="hover:text-white transition-colors">App</Link>
            <a href="https://github.com/MiqdadBadjuber/OpenFolio-AI" target="_blank" rel="noreferrer" className="hover:text-white transition-colors">GitHub</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
