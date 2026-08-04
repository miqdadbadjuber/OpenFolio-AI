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
        {/* Placeholder for Hero */}
      </main>
    </div>
  );
}
