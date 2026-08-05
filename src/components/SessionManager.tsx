import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../lib/firebase';
import SmartOnboarding from './SmartOnboarding';

export default function SessionManager({ children }: { children: React.ReactNode }) {
  const [authReady, setAuthReady] = useState(false);
  const [routeRestoreReady, setRouteRestoreReady] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Wait for the anonymous session to be available before rendering.
    // This gates the UI until auth.currentUser (the silent anon session) is ready;
    // it does NOT drive any login UI.
    if (!auth) {
      setAuthReady(true);
      return;
    }
    const unsub = onAuthStateChanged(auth, () => {
      setAuthReady(true);
    });
    return unsub;
  }, []);

  // 1. ACTIVE ROUTE PERSISTENCE
  useEffect(() => {
    // We only track the user's explicit position inside the app.
    // If they go to the landing page manually, we do not override their intent.
    if (location.pathname.startsWith('/app') || location.pathname.startsWith('/settings')) {
      localStorage.setItem('openfolio_last_route', location.pathname);
    }
  }, [location.pathname]);

  // 2. SAFE HYDRATION WAIT & 3. LANDING PAGE REDIRECT PROTECTION
  useEffect(() => {
    if (!authReady) return;

    // Only attempt recovery if the app was just loaded at the root.
    const runRecovery = async () => {
      if (location.pathname === '/' || location.pathname === '') {
        const lastRoute = localStorage.getItem('openfolio_last_route');

        // Draft key must match CanvasPage's getScopedKey('openfolio_draft'):
        // the app is guest-only with anonymous auth, so drafts persist under `user_<uid>_openfolio_draft`.
        const uid = auth?.currentUser?.uid;
        const draftExists = uid ? !!localStorage.getItem(`user_${uid}_openfolio_draft`) : false;

        // DRAFT RECOVERY PRIORITY
        if (lastRoute && lastRoute !== '/' && lastRoute !== '') {
           navigate(lastRoute, { replace: true });
        } else if (draftExists) {
           navigate('/app/new-chat', { replace: true });
        }
      }
      setRouteRestoreReady(true);
    };

    if (!routeRestoreReady) {
      runRecovery();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authReady]); // Run once auth is resolved

  // Wait for both auth and route resolution before rendering anything.
  // This prevents the Landing Page from flashing before the redirect takes place.
  if (!authReady || !routeRestoreReady) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#080809]">
        <div className="w-6 h-6 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin"></div>
      </div>
    );
  }

  const showOnboarding = location.pathname.startsWith('/app/new-chat') || location.pathname.match(/^\/app(\/.*)?$/);

  return (
    <>
      {showOnboarding && <SmartOnboarding onComplete={() => {}} />}
      {children}
    </>
  );
}
