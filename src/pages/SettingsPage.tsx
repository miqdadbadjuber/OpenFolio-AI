import React, { useState, useEffect } from 'react';
import AppLayout from '../components/AppLayout';
import { Globe, Palette, Database, Info, Gem } from 'lucide-react';
import { useNavigate } from 'react-router';
import { useLanguage } from '../lib/LanguageContext';
import { useTheme } from '../lib/ThemeContext';
import { auth, db } from '../lib/firebase';
import { collection, query, where, getDocs, deleteDoc } from 'firebase/firestore';
import { getQuota, remaining, QuotaLimits, QuotaSnapshot } from '../lib/UsageService';
import Logo from '../components/Logo';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('usage');
  const navigate = useNavigate();
  const { t, lang, setLang } = useLanguage();
  const { theme, setTheme } = useTheme();

  // Data Privacy Confirmation States
  const [deletePortfolioConfirm, setDeletePortfolioConfirm] = useState('');

  // Quota states
  const [quota, setQuota] = useState<QuotaSnapshot>({ generates: 0, edits: 0, lastResetDate: '' });
  
  const [resetTimer, setResetTimer] = useState('');

  useEffect(() => {
    const updateTimer = () => {
      const now = new Date();
      // Server resets quota at 00:00:00 UTC
      const tomorrowUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0));
      const diff = Math.max(0, tomorrowUTC.getTime() - now.getTime());
      const h = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      setResetTimer(`${h} jam ${m} menit`);
    };
    updateTimer();
    const interval = setInterval(updateTimer, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const loadQuota = async () => {
      setQuota(await getQuota());
    };
    loadQuota();
    if (!auth) return;
    const unsub = auth.onAuthStateChanged(loadQuota);
    return unsub;
  }, []);

  const handleDeleteAllPortfolios = async () => {
    if (confirm('Apakah benar kamu ingin menghapus semua portofolio kamu? Tindakan ini tidak dapat dibatalkan.')) {
      try {
        if (auth?.currentUser && db) {
          const q = query(collection(db, 'portfolios'), where('userId', '==', auth.currentUser.uid));
          const snapshot = await getDocs(q);
          const deletePromises = snapshot.docs.map(d => deleteDoc(d.ref));
          await Promise.all(deletePromises);
        }
        // Also clear guest & local draft data from localStorage
        localStorage.removeItem('openfolio_guest_history');
        if (auth?.currentUser) {
          const uid = auth.currentUser.uid;
          localStorage.removeItem(`user_${uid}_openfolio_draft`);
          localStorage.removeItem(`user_${uid}_openfolio_draft_stage`);
          localStorage.removeItem(`user_${uid}_openfolio_draft_history`);
        }
        localStorage.removeItem('guest_openfolio_draft');
        localStorage.removeItem('guest_openfolio_draft_stage');
        localStorage.removeItem('guest_openfolio_draft_history');
        window.dispatchEvent(new Event('openfolio_history_change'));
        
        alert('Semua portofolio berhasil dihapus.');
        setDeletePortfolioConfirm('');
      } catch (err: any) {
        if (err.code !== 'permission-denied' && !err.message?.includes('permission')) {
          console.error(err);
        }
        alert('Gagal menghapus portofolio.');
      }
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'language':
        return (
          <div className="space-y-6">
            <h3 className="text-xl font-medium mb-4">{t('language')} / Language</h3>
            <div className="space-y-4">
              <label className="flex items-center gap-3 p-4 bg-[var(--bg-elevated)] border border-[#8b85a1] rounded-[var(--radius-sm)] cursor-pointer">
                <input 
                  type="radio" 
                  name="lang" 
                  checked={true} 
                  readOnly 
                  className="accent-indigo-400"
                />
                <span className="font-medium text-white">Bahasa Indonesia</span>
              </label>
              <label className="flex items-center gap-3 p-4 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-[var(--radius-sm)] opacity-60 cursor-not-allowed">
                <input 
                  type="radio" 
                  name="lang" 
                  disabled 
                  className="accent-indigo-400"
                />
                <span className="font-medium text-[var(--text-secondary)]">English</span>
                <span className="ml-auto text-[10px] px-2.5 py-1 bg-zinc-900 border border-zinc-800 text-zinc-500 rounded-full font-semibold uppercase tracking-wider">Segera Hadir</span>
              </label>
            </div>
          </div>
        );
      case 'display':
        return (
          <div className="space-y-6">
            <h3 className="text-xl font-medium mb-4">{t('display')}</h3>
            <div className="space-y-4">
              <label className="flex items-center gap-3 p-4 bg-[var(--bg-elevated)] border border-[#8b85a1] rounded-[var(--radius-sm)] cursor-pointer">
                <input 
                  type="radio" 
                  name="theme" 
                  checked={true}
                  readOnly 
                  className="accent-indigo-400"
                />
                <span className="font-medium text-white">Dark Mode</span>
              </label>
              <label className="flex items-center gap-3 p-4 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-[var(--radius-sm)] opacity-60 cursor-not-allowed">
                <input 
                  type="radio" 
                  name="theme" 
                  disabled
                  className="accent-indigo-400"
                />
                <span className="font-medium text-[var(--text-secondary)]">Light Mode</span>
                <span className="ml-auto text-[10px] px-2.5 py-1 bg-zinc-900 border border-zinc-800 text-zinc-500 rounded-full font-semibold uppercase tracking-wider">Segera Hadir</span>
              </label>
            </div>
          </div>
        );
      case 'usage':
        return (
          <div className="space-y-6">
            <div className="space-y-1">
              <h3 className="text-xl font-medium tracking-tight text-white">{lang === 'id' ? 'Penggunaan & Langganan' : 'Usage & Plan'}</h3>
              <p className="text-xs text-[var(--text-secondary)]">{lang === 'id' ? 'Pantau batas kuota harian dan status aktivasi paket studio Anda' : 'Monitor system allocations and subscription tiers'}</p>
            </div>
            
            <div className="bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-lg p-5 space-y-5">
              <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
                <h4 className="font-semibold text-xs text-[var(--text-primary)] uppercase tracking-wider">
                  {lang === 'id' ? 'Statistik Penggunaan Hari Ini' : "Today's Statistics"}
                </h4>
                <div className="flex items-center gap-1.5 bg-zinc-900 border border-zinc-850 px-2.5 py-0.5 rounded-full">
                  <span className="w-1.5 h-1.5 bg-[#8b85a1] rounded-full animate-pulse"></span>
                  <span className="text-[10px] text-[#8b85a1] font-medium font-sans tracking-wide">
                    {lang === 'id' ? `Reset berikutnya dalam: ${resetTimer}` : `Next reset in: ${resetTimer}`}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-lg">
                  <p className="text-[10px] text-[var(--text-secondary)] uppercase font-semibold mb-1 tracking-wider">Generate</p>
                  <p className="text-lg font-bold text-white">{remaining(quota, 'generate')}<span className="text-xs font-normal text-[var(--text-secondary)]">/{QuotaLimits.generate}</span></p>
                </div>
                <div className="p-3 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-lg">
                  <p className="text-[10px] text-[var(--text-secondary)] uppercase font-semibold mb-1 tracking-wider">Edit</p>
                  <p className="text-lg font-bold text-white">{remaining(quota, 'edit')}<span className="text-xs font-normal text-[var(--text-secondary)]">/{QuotaLimits.edit}</span></p>
                </div>
              </div>
            </div>

            {auth?.currentUser && (
              <div className="grid md:grid-cols-2 gap-4">
                <div className="border border-[#8b85a1] bg-[#8b85a11a] rounded-lg p-5 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-[#8b85a1]/5 rounded-full blur-xl pointer-events-none"></div>
                  <div className="absolute top-4 right-4 text-[9px] font-bold bg-[#8b85a1] text-white px-2.5 py-1 rounded-full uppercase tracking-wider">AKTIF</div>
                  <h4 className="font-semibold text-white text-base mb-1">STANDARD</h4>
                  <p className="text-xs text-[var(--text-secondary)] mb-4">Portofolio Profesional Klasik</p>
                  <div className="h-[1px] bg-[#8b85a1]/10 my-3"></div>
                  <ul className="text-xs space-y-2.5 text-[var(--text-secondary)] font-medium">
                    <li className="flex items-start gap-2"><span className="text-[#8b85a1] font-bold">✓</span><span>AI Portofolio Builder</span></li>
                    <li className="flex items-start gap-2"><span className="text-[#8b85a1] font-bold">✓</span><span>Portofolio Profesional Klasik</span></li>
                    <li className="flex items-start gap-2"><span className="text-[#8b85a1] font-bold">✓</span><span>Edit dan Update Tanpa Batas</span></li>
                    <li className="flex items-start gap-2"><span className="text-[#8b85a1] font-bold">✓</span><span>Publish Portofolio Online</span></li>
                    <li className="flex items-start gap-2"><span className="text-[#8b85a1] font-bold">✓</span><span>Sinkronisasi Akun</span></li>
                    <li className="flex items-start gap-2"><span className="text-[#8b85a1] font-bold">✓</span><span>Riwayat Portofolio</span></li>
                  </ul>
                </div>

                <div className="border border-zinc-800 bg-zinc-950/20 rounded-lg p-5 relative overflow-hidden flex flex-col justify-between opacity-90">
                  <div>
                    <div className="absolute top-4 right-4 text-[9px] font-bold text-zinc-500 px-2.5 py-1 border border-zinc-800 bg-zinc-900 rounded-full uppercase tracking-wider">SEGERA HADIR</div>
                    <h4 className="font-semibold text-white text-base mb-1">EXECUTIVE PRO</h4>
                    <p className="text-xs text-[var(--pro-color)] mb-4">Portofolio Premium Generasi Berikutnya</p>
                    <div className="h-[1px] bg-[var(--pro-color)]/20 my-3"></div>
                    <ul className="text-xs space-y-2.5 text-zinc-500 font-medium">
                      <li className="flex items-start gap-2"><span>✓</span><span>Semua fitur Standard</span></li>
                      <li className="flex items-start gap-2"><span>✓</span><span>Portofolio 3D Interaktif</span></li>
                      <li className="flex items-start gap-2"><span>✓</span><span>Motion Premium Sinematik</span></li>
                      <li className="flex items-start gap-2"><span>✓</span><span>Showcase Proyek Imersif</span></li>
                      <li className="flex items-start gap-2"><span>✓</span><span>Visual Efek Eksklusif</span></li>
                      <li className="flex items-start gap-2"><span>✓</span><span>Custom Domain Profesional</span></li>
                      <li className="flex items-start gap-2"><span>✓</span><span>Prioritas Fitur AI Baru</span></li>
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      case 'data':
        return (
          <div className="space-y-6">
            <div className="space-y-1">
              <h3 className="text-xl font-medium tracking-tight text-[var(--error)]">{t('data')} & Privasi</h3>
              <p className="text-xs text-[var(--text-secondary)]">{lang === 'id' ? 'Kelola penyimpanan dokumen, riwayat sirkuit, dan integritas akun Anda' : 'Manage document storage, logs, and account lifecycle'}</p>
            </div>
            
            <div className="space-y-4">
              <div className="p-6 border border-red-500/10 bg-red-500/5 rounded-lg space-y-4">
                <div>
                  <h4 className="font-semibold text-sm text-[var(--text-primary)] mb-1">{lang === 'id' ? 'Hapus Semua Portofolio' : 'Purge All Portfolios'}</h4>
                  <p className="text-xs text-[var(--text-secondary)] leading-relaxed">{lang === 'id' ? 'Tindakan ini menghapus seluruh riwayat percakapan dan dokumen buatan Anda selamanya.' : 'This will purge all historic portfolio templates and messaging cycles from our record.'}</p>
                </div>
                <div className="space-y-3">
                  <p className="text-[11px] text-[var(--text-secondary)]">Ketik <strong className="text-[var(--text-primary)]">HAPUS</strong> untuk mengonfirmasi.</p>
                  <input type="text" className="input text-xs w-full max-w-xs" placeholder="Ketik HAPUS" value={deletePortfolioConfirm} onChange={e => setDeletePortfolioConfirm(e.target.value)} />
                  <button onClick={handleDeleteAllPortfolios} disabled={deletePortfolioConfirm !== 'HAPUS'} className="btn-danger block text-xs px-5 py-2.5 disabled:opacity-50 disabled:cursor-not-allowed">Hapus Semua</button>
                </div>
              </div>
              
            </div>
          </div>
        );
      case 'about':
        return (
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <Logo size={36} variant="gradient" />
              <div>
                <h3 className="text-lg font-semibold tracking-tight text-white">OpenFolio AI</h3>
                <p className="text-xs text-[var(--text-secondary)]">{lang === 'id' ? 'Platform Ideasi Portofolio Berbasis AI Terarah' : 'AI-Directed Creative Portfolio Synthesizer'}</p>
              </div>
            </div>
            
            <div className="border border-[var(--border-subtle)] bg-[var(--bg-elevated)] rounded-lg divide-y divide-[var(--border-subtle)] overflow-hidden">
              <div className="flex justify-between items-center p-4">
                <span className="text-xs font-semibold text-[var(--text-secondary)] tracking-wider uppercase">{lang === 'id' ? 'Nama Sistem' : 'System Name'}</span>
                <span className="text-xs font-semibold text-[var(--text-primary)]">OpenFolio AI</span>
              </div>
              <div className="flex justify-between items-center p-4">
                <span className="text-xs font-semibold text-[var(--text-secondary)] tracking-wider uppercase">{lang === 'id' ? '.env' : 'Build Edition'}</span>
                <span className="text-xs font-semibold text-[var(--text-primary)]">1.0.0</span>
              </div>
              <div className="flex justify-between items-center p-4">
                <span className="text-xs font-semibold text-[var(--text-secondary)] tracking-wider uppercase">Developer</span>
                <span className="text-xs font-semibold text-[var(--text-primary)]">Miqdad Badjuber</span>
              </div>
              <div className="flex justify-between items-center p-4">
                <span className="text-xs font-semibold text-[var(--text-secondary)] tracking-wider uppercase">{lang === 'id' ? 'Pembaruan Terakhir' : 'Released On'}</span>
                <span className="text-xs font-semibold text-[var(--text-primary)]">26 Mei 2026</span>
              </div>
              <div className="p-4 bg-zinc-950/20 text-center text-[10px] text-[var(--text-secondary)]">
                © 2026 Miqdad Badjuber. All rights reserved.
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <AppLayout>
      <div className="flex-1 overflow-y-auto p-4 md:p-8">
        <div className="max-w-4xl mx-auto flex flex-col md:flex-row gap-8 relative">
          
          <button 
            onClick={() => navigate(-1)} 
            className="md:absolute -top-12 left-0 flex items-center gap-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors mb-4 md:mb-0"
          >
            <span className="text-lg leading-none">&larr;</span> {t('back' as any) || (lang === 'id' ? 'Kembali' : 'Back')}
          </button>
          
          <div className="w-full md:w-64 flex-shrink-0 space-y-1 md:mt-0">
            <button onClick={() => setActiveTab('language')} className={`w-full flex items-center gap-3 p-2 rounded-[var(--radius-sm)] text-sm transition-colors ${activeTab === 'language' ? 'bg-[var(--bg-elevated)] text-[var(--text-primary)] font-medium' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'}`}>
              <Globe className="w-4 h-4" /> {t('language')}
            </button>
            <button onClick={() => setActiveTab('display')} className={`w-full flex items-center gap-3 p-2 rounded-[var(--radius-sm)] text-sm transition-colors ${activeTab === 'display' ? 'bg-[var(--bg-elevated)] text-[var(--text-primary)] font-medium' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'}`}>
              <Palette className="w-4 h-4" /> {t('display')}
            </button>
            <button onClick={() => setActiveTab('usage')} className={`w-full flex items-center gap-3 p-2 rounded-[var(--radius-sm)] text-sm transition-colors ${activeTab === 'usage' ? 'bg-[var(--bg-elevated)] text-[var(--text-primary)] font-medium' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'}`}>
              <Gem className="w-4 h-4" /> {t('usage')}
            </button>
            {auth?.currentUser && (
              <button onClick={() => setActiveTab('data')} className={`w-full flex items-center gap-3 p-2 rounded-[var(--radius-sm)] text-sm transition-colors ${activeTab === 'data' ? 'bg-[var(--bg-elevated)] text-[var(--text-primary)] font-medium text-[var(--error)]' : 'text-[var(--error)] hover:bg-red-500/10'}`}>
                <Database className="w-4 h-4" /> {t('data')}
              </button>
            )}
            <button onClick={() => setActiveTab('about')} className={`w-full flex items-center gap-3 p-2 rounded-[var(--radius-sm)] text-sm transition-colors ${activeTab === 'about' ? 'bg-[var(--bg-elevated)] text-[var(--text-primary)] font-medium' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'}`}>
              <Info className="w-4 h-4" /> {t('about')}
            </button>
          </div>
          
          <div className="flex-1 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-2xl p-6 md:p-8">
            {renderContent()}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
