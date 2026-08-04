import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { db } from '../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { Grid3x3, ArrowLeft } from 'lucide-react';

export default function PublicPortfolioPage() {
  const { id } = useParams();
  const [htmlContent, setHtmlContent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPortfolio = async () => {
      if (!id) return;
      try {
        const docRef = doc(db, 'portfolios', id);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.isPublished && data.htmlContent) {
            setHtmlContent(data.htmlContent);
          } else {
            setError('Portfolio ini belum dipublikasikan atau data tidak ditemukan.');
          }
        } else {
          setError('Portfolio tidak ditemukan.');
        }
      } catch (e: any) {
        console.error(e);
        setError('Terjadi kesalahan saat memuat portfolio.');
      } finally {
        setLoading(false);
      }
    };
    fetchPortfolio();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--bg-base)] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-4 border-[var(--accent)] border-t-transparent rounded-full animate-spin"></div>
          <p className="text-[var(--text-secondary)] font-medium">Memuat Portfolio...</p>
        </div>
      </div>
    );
  }

  if (error || !htmlContent) {
    return (
      <div className="min-h-screen bg-[var(--bg-base)] flex flex-col items-center justify-center p-4 text-center">
        <div className="max-w-md space-y-6">
           <div className="mx-auto w-16 h-16 bg-[var(--bg-elevated)] rounded-2xl flex items-center justify-center mb-4">
             <Grid3x3 className="w-8 h-8 text-zinc-600" />
           </div>
           <h1 className="text-2xl font-medium text-[var(--text-primary)]">Oops!</h1>
           <p className="text-[var(--text-secondary)]">{error || 'Halaman tidak dapat ditampilkan.'}</p>
           <Link to="/" className="inline-flex items-center gap-2 text-[var(--accent)] hover:underline">
             <ArrowLeft className="w-4 h-4" /> Kembali ke Beranda
           </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-full bg-white overflow-hidden">
      <iframe 
        srcDoc={htmlContent} 
        className="w-full h-full border-none"
        title="Public Portfolio"
      />
      
      {/* Subtle floating branding */}
      <div className="fixed bottom-4 right-4 z-50">
        <a 
          href="/" 
          target="_blank" 
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-3 py-1.5 bg-white/10 backdrop-blur-md border border-white/20 rounded-full text-[10px] font-medium text-white/60 hover:text-white hover:bg-white/20 transition-all shadow-lg"
        >
          <span>Powered by</span>
          <span className="font-bold tracking-tight text-white/90">OpenFolio AI</span>
        </a>
      </div>
    </div>
  );
}
