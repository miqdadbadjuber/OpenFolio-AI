import React from 'react';
import { Link } from 'react-router-dom';
import { Layers, Home } from 'lucide-react';
import { useLanguage } from '../lib/LanguageContext';

export default function NotFoundPage() {
  const { t, lang } = useLanguage();
  return (
    <div className="min-h-screen bg-[var(--bg-base)] flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="mx-auto w-24 h-24 bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-full flex items-center justify-center shadow-lg relative">
          <Layers className="w-10 h-10 text-zinc-600 absolute -top-2 -right-2" />
          <span className="text-4xl font-mono text-[var(--text-primary)] font-bold">404</span>
        </div>
        
        <div className="space-y-4">
          <h1 className="text-3xl font-medium tracking-tight text-[var(--text-primary)]">
            {lang === 'id' ? 'Halaman tidak ditemukan' : 'Page not found'}
          </h1>
          <p className="text-[var(--text-secondary)]">
            {lang === 'id' 
              ? 'Tampak seperti portofolio atau halaman yang Anda cari tidak ada atau telah dihapus.' 
              : 'It seems the portfolio or page you are looking for does not exist or has been removed.'}
          </p>
        </div>

        <Link 
          to="/app" 
          className="inline-flex items-center gap-2 px-6 py-3 bg-[var(--text-primary)] text-[var(--bg-base)] rounded-full font-medium hover:-translate-y-0.5 transition-all mx-auto"
        >
          <Home className="w-5 h-5" />
          {lang === 'id' ? 'Kembali ke Dashboard' : 'Back to Dashboard'}
        </Link>
      </div>
    </div>
  );
}
