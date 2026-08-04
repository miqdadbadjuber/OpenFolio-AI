import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Mail, Lock } from 'lucide-react';
import { auth, googleProvider } from '../lib/firebase';
import { signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import Logo from '../components/Logo';

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegister, setIsRegister] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('register') === 'true') {
      setIsRegister(true);
    }
  }, [location]);

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      if (isRegister) {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
      navigate('/app');
    } catch (err: any) {
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password') {
        setError('Email atau password salah. Silakan coba kembali.');
      } else if (err.code === 'auth/user-not-found') {
        setError('Akun tidak ditemukan.');
      } else if (err.code === 'auth/network-request-failed') {
        setError('Tidak dapat terhubung ke server.');
      } else if (err.code === 'auth/too-many-requests') {
        setError('Terlalu banyak percobaan login.');
      } else {
        setError(err.message || 'Terjadi kesalahan saat login.');
      }
    }
  };

  const handleGoogleAuth = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
      navigate('/app');
    } catch (err: any) {
      if (err.code === 'auth/network-request-failed') {
        setError('Tidak dapat terhubung ke server.');
      } else if (err.code === 'auth/popup-closed-by-user') {
        setError('Login dibatalkan.');
      } else {
        setError(err.message || 'Terjadi kesalahan saat login.');
      }
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg-base)] text-[var(--text-primary)] flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-[var(--radius-lg)] p-8 shadow-[0_24px_50px_rgba(0,0,0,0.5)] relative overflow-hidden">
        {/* Subtle decorative quiet background smoke */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[300px] h-[300px] rounded-full bg-zinc-800/3 blur-[90px] pointer-events-none"></div>

        <div className="flex flex-col items-center gap-3.5 mb-8 justify-center select-none">
          <Logo size={42} variant="gradient" animated={true} />
          <span className="text-sm font-semibold uppercase tracking-widest text-zinc-500 font-mono">Platform Ideasi AI</span>
        </div>

        <h2 className="text-xl font-medium mb-6 text-center text-white tracking-tight">
          {isRegister ? 'Buat Akun Baru' : 'Masuk ke Akun Anda'}
        </h2>

        {error && <div className="p-3 mb-4 text-xs text-[var(--error)] bg-red-500/5 border border-red-500/20 rounded-[var(--radius-sm)] leading-relaxed">{error}</div>}

        <form onSubmit={handleEmailAuth} className="flex flex-col gap-4 mb-6">
          <div className="relative">
            <Mail className="w-4 h-4 absolute left-3 top-3 text-[var(--text-secondary)]" />
            <input 
              type="email" 
              placeholder="Email" 
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-[var(--radius-md)] pl-10 pr-3 py-2.5 text-xs outline-none focus:border-zinc-700 placeholder-zinc-600 text-zinc-100 transition-colors"
              required
            />
          </div>
          <div className="relative">
            <Lock className="w-4 h-4 absolute left-3 top-3 text-[var(--text-secondary)]" />
            <input 
              type="password" 
              placeholder="Password" 
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-[var(--radius-md)] pl-10 pr-3 py-2.5 text-xs outline-none focus:border-zinc-700 placeholder-zinc-600 text-zinc-100 transition-colors"
              required
            />
          </div>
          <button type="submit" className="btn-primary w-full cursor-pointer hover:shadow-lg hover:brightness-110 active:scale-[0.99] transition-all text-xs" style={{ background: 'var(--accent)', color: '#fff', padding: '11px 0', borderRadius: 'var(--radius-md)', fontWeight: 500 }}>
            {isRegister ? 'Daftar' : 'Masuk'}
          </button>
        </form>

        <div className="flex items-center gap-4 mb-6 text-xs text-[var(--text-muted)]">
          <div className="flex-1 border-b border-[var(--border-subtle)]"></div>
          <span className="font-mono text-[9px] tracking-widest text-zinc-600 select-none">ATAU</span>
          <div className="flex-1 border-b border-[var(--border-subtle)]"></div>
        </div>

        <button 
          onClick={handleGoogleAuth}
          className="w-full flex items-center justify-center gap-2.5 py-2.5 bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-[var(--radius-md)] hover:bg-[var(--bg-hover)] hover:border-zinc-700 active:scale-[0.99] transition-all mb-4 cursor-pointer"
        >
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-4 h-4 brightness-95" />
          <span className="text-xs font-medium text-zinc-300">Hubungkan dengan Google</span>
        </button>

        <div className="text-center text-xs text-zinc-500 mt-2">
          {isRegister ? 'Sudah punya akun? ' : 'Belum punya akun? '}
          <button type="button" onClick={() => setIsRegister(!isRegister)} className="text-zinc-300 hover:text-white underline font-medium">
            {isRegister ? 'Masuk di sini' : 'Daftar di sini'}
          </button>
        </div>
      </div>
    </div>
  );
}
