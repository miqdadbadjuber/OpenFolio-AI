import React from 'react';
import { Link } from 'react-router-dom';
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
            <Link to="/login" className="text-xs font-semibold uppercase tracking-widest text-zinc-500 hover:text-white transition-colors hidden md:block">
              Sign In
            </Link>
            <Link to="/login?register=true" className="bg-white text-black px-6 py-2.5 rounded-none font-bold text-xs uppercase tracking-widest hover:bg-zinc-200 transition-colors">
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
      </main>
    </div>
  );
}
