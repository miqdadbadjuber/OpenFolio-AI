import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router';
import LandingPage from './pages/LandingPage';
import AppPage from './pages/AppPage';
import CanvasPage from './pages/CanvasPage';
import SettingsPage from './pages/SettingsPage';
import NotFoundPage from './pages/NotFoundPage';
import PublicPortfolioPage from './pages/PublicPortfolioPage';
import SessionManager from './components/SessionManager';

export default function App() {
  return (
    <BrowserRouter>
      <SessionManager>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/app" element={<AppPage />} />
          <Route path="/app/new-chat" element={<CanvasPage />} />
          <Route path="/app/:id" element={<CanvasPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/p/:id" element={<PublicPortfolioPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </SessionManager>
    </BrowserRouter>
  );
}

