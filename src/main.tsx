import { StrictMode, type CSSProperties } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { LanguageProvider } from './lib/LanguageContext';
import { ThemeProvider } from './lib/ThemeContext';
import { ensureAnonSession, hasFirebaseConfig } from './lib/firebase';

ensureAnonSession();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <LanguageProvider>
        {hasFirebaseConfig ? <App /> : <FirebaseNotConfiguredNotice />}
      </LanguageProvider>
    </ThemeProvider>
  </StrictMode>,
);

// Rendered when no Firebase config (projectId) is present. Without auth + Firestore the
// app cannot function, so we show a clear notice instead of mounting an app that would
// silently fail. See README -> Firebase setup.
function FirebaseNotConfiguredNotice() {
  return (
    <div style={noticeStyle}>
      <h1 style={{ margin: '0 0 12px', fontSize: 22 }}>Firebase belum dikonfigurasi</h1>
      <p style={{ margin: 0, lineHeight: 1.6 }}>
        Salin <code>.env.example</code> menjadi <code>.env</code> dan isi variabel{' '}
        <code>VITE_FIREBASE_*</code>, lalu muat ulang halaman. Panduan lengkap: buka bagian{' '}
        <em>Firebase setup</em> di README.
      </p>
    </div>
  );
}

const noticeStyle: CSSProperties = {
  minHeight: '100vh',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 24,
  textAlign: 'center',
  background: '#fafafa',
  color: '#111',
  fontFamily: 'system-ui, sans-serif',
};
