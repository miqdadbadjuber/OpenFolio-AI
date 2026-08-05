import React, { useState, useEffect } from 'react';
import { Menu, Plus, Search, Settings, X, ChevronUp, LogOut, Key, Pin, MoreHorizontal, Edit, Trash2, Copy, FolderPlus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { onAuthStateChanged, User, signOut } from 'firebase/auth';
import { auth, db } from '../lib/firebase';
import { collection, query, where, onSnapshot, updateDoc, deleteDoc, doc, orderBy, getDoc, addDoc } from 'firebase/firestore';
import { useLanguage } from '../lib/LanguageContext';
import { motion, AnimatePresence } from 'motion/react';
import Logo from './Logo';
import ToastHost from './ToastHost';

interface HistoryItem {
  id: string;
  name: string;
  pinned?: boolean;
}

export default function AppLayout({ 
  children, 
  defaultClosed = false,
  onboardingName,
  onboardingProfession,
  guidedStage
}: { 
  children: React.ReactNode, 
  defaultClosed?: boolean,
  onboardingName?: string,
  onboardingProfession?: string,
  guidedStage?: string
}) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(!defaultClosed);
  const [user, setUser] = useState<User | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [activeItem, setActiveItem] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const navigate = useNavigate();
  const { t, lang } = useLanguage();

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (u) => {
      setUser(u);
    });
    return unsubAuth;
  }, []);

  useEffect(() => {
    const loadGuestHistory = () => {
      try {
        const stored = localStorage.getItem('openfolio_guest_history');
        if (stored) {
          const parsed = JSON.parse(stored);
          parsed.sort((a: any, b: any) => (b.updatedAt || 0) - (a.updatedAt || 0));
          setHistory(parsed);
        } else {
          setHistory([]);
        }
      } catch (e) {
        setHistory([]);
      }
    };

    if (user) {
      // Logic from Firestore for logged in users
      const q = query(
        collection(db, "portfolios"),
        where("userId", "==", user.uid)
      );
      
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const h: any[] = [];
        snapshot.forEach((docSnap) => {
          h.push({ 
            id: docSnap.id, 
            name: docSnap.data().name || 'Tanpa Judul', 
            pinned: docSnap.data().pinned,
            updatedAt: docSnap.data().updatedAt || 0
          });
        });
        h.sort((a, b) => b.updatedAt - a.updatedAt);
        setHistory(h as HistoryItem[]);
      }, (error: any) => {
        if (error.code !== 'permission-denied' && !error.message.includes("permission")) {
          console.error("Firestore onSnapshot error:", error);
        }
      });
      return unsubscribe;
    } else {
      loadGuestHistory();
      
      window.addEventListener('openfolio_history_change', loadGuestHistory);
      window.addEventListener('storage', loadGuestHistory);
      return () => {
        window.removeEventListener('openfolio_history_change', loadGuestHistory);
        window.removeEventListener('storage', loadGuestHistory);
      };
    }
  }, [user]);

  const handleLogout = async () => {
    localStorage.removeItem('openfolio_last_route');
    await signOut(auth);
    setShowDropdown(false);
    navigate('/');
  };

  const startEditing = (e: React.MouseEvent, item: HistoryItem) => {
    e.stopPropagation();
    setEditingId(item.id);
    setRenameValue(item.name);
    setActiveItem(null);
  };

  const handleRenameSave = async (id: string) => {
    const trimmed = renameValue.trim();
    setEditingId(null);
    if (!trimmed) return;

    if (user) {
      try {
        await updateDoc(doc(db, "portfolios", id), { name: trimmed });
      } catch (err: any) {
        if (err.code !== 'permission-denied' && !err.message.includes('permission')) {
          console.error("Gagal rename", err);
        }
      }
    } else {
      const newHistory = history.map(h => h.id === id ? { ...h, name: trimmed } : h);
      setHistory(newHistory);
      localStorage.setItem('openfolio_guest_history', JSON.stringify(newHistory));
      window.dispatchEvent(new Event('openfolio_history_change'));
    }
  };

  const handleTogglePin = async (e: React.MouseEvent, item: HistoryItem) => {
    e.stopPropagation();
    setActiveItem(null);
    const newPinnedStatus = !item.pinned;

    if (newPinnedStatus) {
      const currentPinnedCount = history.filter(h => h.pinned).length;
      if (currentPinnedCount >= 3) {
        alert(lang === 'id' ? 'Maksimal 3 project yang dapat dipin.' : 'Maximum 3 projects can be pinned.');
        return;
      }
    }

    if (user) {
      try {
        await updateDoc(doc(db, "portfolios", item.id), { pinned: newPinnedStatus });
      } catch (err: any) {
        if (err.code !== 'permission-denied' && !err.message.includes('permission')) {
          console.error("Gagal pin", err);
        }
      }
    } else {
      const newHistory = history.map(h => h.id === item.id ? { ...h, pinned: newPinnedStatus } : h);
      setHistory(newHistory);
      localStorage.setItem('openfolio_guest_history', JSON.stringify(newHistory));
      window.dispatchEvent(new Event('openfolio_history_change'));
    }
  };

  const handleDuplicate = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setActiveItem(null);
    const origItem = history.find(h => h.id === id);
    if (!origItem) return;

    const newName = `${origItem.name} (Salinan)`;

    if (user) {
      try {
        const docRef = doc(db, "portfolios", id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const originalData = docSnap.data();
          const duplicatedData = {
            ...originalData,
            name: newName,
            pinned: false,
            updatedAt: Date.now()
          };
          const newDocRef = await addDoc(collection(db, "portfolios"), duplicatedData);
          navigate(`/app/${newDocRef.id}`);
        }
      } catch (err) {
        console.error("Gagal menduplikasi", err);
      }
    } else {
      const guestHistory = localStorage.getItem('openfolio_guest_history');
      if (guestHistory) {
        let list = JSON.parse(guestHistory);
        const orig = list.find((p: any) => p.id === id);
        if (orig) {
          const newId = `guest_${Date.now()}`;
          const duplicated = {
            ...orig,
            id: newId,
            name: newName,
            pinned: false,
            updatedAt: Date.now()
          };
          list.push(duplicated);
          localStorage.setItem('openfolio_guest_history', JSON.stringify(list));
          setHistory(list);
          window.dispatchEvent(new Event('openfolio_history_change'));
          navigate(`/app/${newId}`);
        }
      }
    }
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    const id = deleteId;
    setDeleteId(null);

    if (user) {
      try {
        await deleteDoc(doc(db, "portfolios", id));
      } catch (err: any) {
        if (err.code !== 'permission-denied' && !err.message.includes('permission')) {
          console.error("Gagal hapus", err);
        }
      }
    } else {
      const newHistory = history.filter(h => h.id !== id);
      setHistory(newHistory);
      localStorage.setItem('openfolio_guest_history', JSON.stringify(newHistory));
      window.dispatchEvent(new Event('openfolio_history_change'));
    }

    if (window.location.pathname.includes(id)) {
      navigate('/app');
    }
  };

  return (
    <div className="flex h-screen bg-[#0A0A0B] text-zinc-100 overflow-hidden relative">
      <AnimatePresence>
        {deleteId && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-md p-4"
          >
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="bg-zinc-950/90 border border-zinc-850 rounded-2xl w-full max-w-sm p-6 shadow-2xl relative overflow-hidden text-center backdrop-blur-xl"
            >
              {/* Background gradient subtle glow */}
              <div className="absolute top-0 inset-x-0 h-24 bg-gradient-to-b from-red-500/10 to-transparent pointer-events-none"></div>
              
              <div className="mx-auto w-12 h-12 bg-red-500/10 border border-red-500/20 rounded-full flex items-center justify-center mb-4 text-red-400">
                <Trash2 className="w-5 h-5 animate-pulse" />
              </div>

              <h3 className="text-lg font-semibold text-white mb-2">Hapus Portofolio?</h3>
              <p className="text-zinc-400 text-sm mb-6 leading-relaxed">
                Tindakan ini tidak bisa dibatalkan. Semua chat history dan dokumen portofolio Anda yang tersimpan akan dihapus selamanya.
              </p>

              <div className="flex gap-3">
                <button 
                  onClick={() => setDeleteId(null)}
                  className="flex-1 py-2.5 px-4 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-white rounded-xl text-sm font-medium transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button 
                  onClick={confirmDelete}
                  className="flex-1 py-2.5 px-4 bg-red-600 hover:bg-red-500 text-white rounded-xl text-sm font-medium transition-all shadow-[0_0_15px_rgba(239,68,68,0.2)] cursor-pointer"
                >
                  Hapus Permanen
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.div 
        initial={{ width: isSidebarOpen ? 260 : 72 }}
        animate={{ width: isSidebarOpen ? 260 : 72 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        onClick={() => {
           if (!isSidebarOpen) setIsSidebarOpen(true);
        }}
        className={`flex flex-col bg-[#050506]/90 backdrop-blur-3xl border-r border-white-[0.02] border-r-white/[0.02] h-full overflow-hidden shrink-0 select-none will-change-transform z-[150] ${
            false 
            ? `absolute left-0 top-0 bottom-0 ${isSidebarOpen ? 'shadow-[20px_0_50px_rgba(0,0,0,0.85)]' : ''}` 
            : 'relative transition-shadow duration-300'
        } ${!isSidebarOpen ? 'cursor-pointer hover:bg-[#080809]' : ''}`}
      >
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(30,58,138,0.03),transparent_70%)] pointer-events-none" />
        <div className={`pt-5 pb-4 h-full flex flex-col relative z-10 select-none transition-all duration-300 ${isSidebarOpen ? 'w-[260px] px-4' : 'w-[72px] px-0 items-center'}`}>
          <div className={`flex items-center mb-5 ${isSidebarOpen ? 'justify-between px-1' : 'justify-center w-full'}`}>
            <div 
              className={`flex items-center gap-2 ${isSidebarOpen ? 'cursor-pointer group' : ''}`} 
              onClick={(e) => {
                if (isSidebarOpen) {
                  e.stopPropagation();
                  localStorage.removeItem('openfolio_last_route');
                  navigate('/');
                }
              }}
            >
              <Logo size={isSidebarOpen ? 22 : 26} variant="gradient" className={isSidebarOpen ? "group-hover:scale-105 transition-transform duration-300" : ""} />
              {isSidebarOpen && <span className="font-semibold text-sm tracking-tight text-white group-hover:text-zinc-300 transition-colors">{t('openfolio_ai')}</span>}
            </div>
            {isSidebarOpen && (
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setIsSidebarOpen(false);
                }} 
                className="text-zinc-500 hover:text-white p-1 hover:bg-zinc-900 rounded-md transition-colors"
              >
                <Menu className="w-4 h-4" />
              </button>
            )}
          </div>

          <button 
            onClick={(e) => {
              e.stopPropagation();
              if (!isSidebarOpen) { setIsSidebarOpen(true); } else { navigate('/app'); }
            }}
            className={`flex items-center justify-center gap-2 bg-white/[0.02] backdrop-blur-md border border-white/[0.05] hover:border-white/10 hover:bg-white/[0.03] text-zinc-300 hover:text-white mb-4 transition-all shadow-xl shadow-black/10 cursor-pointer group flex-shrink-0 ${isSidebarOpen ? 'w-full p-3 rounded-2xl' : 'w-10 h-10 rounded-xl p-0'}`}
          >
            <Plus className={`${isSidebarOpen ? 'w-3.5 h-3.5' : 'w-5 h-5'} text-zinc-400 group-hover:text-white transition-colors`} />
            {isSidebarOpen && <span className="font-semibold text-xs whitespace-nowrap">{t('new_project')}</span>}
          </button>
          
          {isSidebarOpen && (
            <div className="relative mb-5 w-full">
              <Search className="w-3.5 h-3.5 absolute left-3.5 top-3 text-zinc-500" />
              <input 
                type="text" 
                placeholder={lang === 'id' ? "Cari workspace..." : "Search workspaces..."}
                className="w-full bg-white/[0.015] border border-white/[0.04] rounded-2xl pl-10 pr-4 py-2.5 text-xs text-white outline-none focus:border-white/10 focus:bg-white/[0.03] transition-all placeholder-zinc-600 shadow-inner shadow-black/20"
              />
            </div>
          )}

          <div className={`flex-1 overflow-y-auto w-full pb-4 space-y-4 no-scrollbar ${isSidebarOpen ? 'pr-1' : 'hidden'}`}>
            <div className="w-full h-[1px] bg-white/[0.03] mb-2"></div>
            
            {guidedStage && guidedStage !== 'done' && (
              <div className="mb-6 p-4 rounded-2xl bg-white/[0.02] border border-white/[0.05] relative overflow-hidden backdrop-blur-md">
                <div className="absolute top-0 right-0 w-12 h-12 bg-indigo-500/5 blur-xl rounded-full" />
                <div className="flex items-center gap-2 mb-3 text-[10px] font-bold tracking-[0.2em] uppercase text-indigo-400">
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse shadow-[0_0_8px_rgba(99,102,241,0.5)]" />
                  <span>Arsitektur Aktif</span>
                </div>
                
                <div className="space-y-3 mt-2">
                  <div>
                    <div className="text-[9px] text-zinc-500 uppercase tracking-widest">Identitas / Nama</div>
                    <div className="text-xs font-semibold text-white/90 truncate transition-all duration-300">
                      {onboardingName || 'Menunggu Nama...'}
                    </div>
                  </div>

                  <div>
                    <div className="text-[9px] text-zinc-500 uppercase tracking-widest">Bidang Profesi</div>
                    <div className="text-xs font-semibold text-zinc-400 truncate transition-all duration-300">
                      {onboardingProfession || 'Menunggu Profesi...'}
                    </div>
                  </div>

                  <div>
                    <div className="text-[9px] text-zinc-500 uppercase tracking-widest">Progres Workspace</div>
                    <div className="text-xs font-mono font-bold text-zinc-300 mt-1 uppercase tracking-wider text-[10px]">
                      {guidedStage === 'identity_name' && 'Phase 1: Inisialisasi Nama'}
                      {guidedStage === 'identity_profession' && 'Phase 2: Analisis Bidang'}
                      {guidedStage === 'greeting' && 'Phase 2: Sambutan Pembuka'}
                      {guidedStage === 'templates' && 'Phase 3: Penyelarasan Template'}
                      {guidedStage === 'interview' && 'Phase 4: Sesi Wawancara'}
                      {guidedStage === 'enhancements_photo' && 'Phase 5: Portret Estetika'}
                      {guidedStage === 'enhancements_links' && 'Phase 6: Jaringan Digital'}
                      {guidedStage === 'summary' && 'Penyusunan Blueprint'}
                      {guidedStage === 'generating' && 'Penyelarasan Kode...'}
                    </div>
                    
                    {/* Progress step bar */}
                    <div className="w-full h-1 bg-zinc-900 rounded-full overflow-hidden mt-2">
                      <div 
                        className="h-full bg-indigo-500 transition-all duration-500 shadow-[0_0_8px_rgba(99,102,241,0.5)]" 
                        style={{ 
                          width: 
                            guidedStage === 'identity_name' ? '15%' :
                            guidedStage === 'identity_profession' ? '30%' :
                            guidedStage === 'greeting' ? '40%' :
                            guidedStage === 'templates' ? '55%' :
                            guidedStage === 'interview' ? '70%' :
                            guidedStage === 'enhancements_photo' ? '85%' :
                            guidedStage === 'enhancements_links' ? '95%' : '100%'
                        }} 
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {history.filter(h => h.pinned).length > 0 && (
              <div>
                <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2 px-2.5 flex justify-between items-center">
                  <span>Pinned</span>
                  <span className="text-zinc-500 bg-zinc-900/80 px-1.5 py-0.5 rounded text-[8px] border border-zinc-800">{history.filter(h => h.pinned).length}</span>
                </div>
                <div className="space-y-1">
                  {history.filter(h => h.pinned).map((item) => {
                    const isActive = window.location.pathname.endsWith(item.id);
                    return (
                      <div 
                        key={item.id} 
                        className={`group relative flex items-center justify-between gap-2 p-2 px-2.5 rounded-xl cursor-pointer transition-all duration-300 ${isActive ? 'bg-white/[0.03] border border-white/[0.05] text-white font-medium shadow-sm' : 'text-zinc-400 hover:text-white hover:bg-white/[0.01] hover:backdrop-blur-sm'}`}
                        onMouseLeave={() => setActiveItem(null)}
                      >
                        {editingId === item.id ? (
                          <input
                            type="text"
                            autoFocus
                            value={renameValue}
                            onChange={(e) => setRenameValue(e.target.value)}
                            onBlur={() => handleRenameSave(item.id)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleRenameSave(item.id);
                              if (e.key === 'Escape') setEditingId(null);
                            }}
                            className="flex-1 bg-zinc-950 border border-[var(--accent)] text-white text-xs px-2 py-1 rounded-lg outline-none focus:ring-1 focus:ring-[var(--accent)] transition-all"
                          />
                        ) : (
                          <div 
                            className="flex items-center gap-2 overflow-hidden flex-1" 
                            onClick={() => navigate(`/app/${item.id}`)}
                            onDoubleClick={(e) => startEditing(e, item)}
                          >
                            <Pin className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                            <span className="text-xs truncate flex-1 leading-relaxed">{item.name === 'Tanpa Judul' ? 'Ideasi Brand ✨' : item.name}</span>
                          </div>
                        )}
                        
                        {/* Options Button */}
                        {!editingId && (
                          <button 
                            onClick={(e) => { e.stopPropagation(); setActiveItem(activeItem === item.id ? null : item.id); }}
                            className="opacity-0 group-hover:opacity-100 p-1 hover:bg-zinc-800 rounded-lg transition-all"
                          >
                            <MoreHorizontal className="w-3.5 h-3.5 text-zinc-500 hover:text-white" />
                          </button>
                        )}

                        {/* Dropdown Menu */}
                        {activeItem === item.id && (
                          <div className="absolute right-2 top-9 w-36 bg-[#0A0A0B] backdrop-blur-3xl border border-white/[0.08] shadow-2xl shadow-black/50 rounded-lg p-1 z-30 animate-in fade-in zoom-in-95 duration-100">
                            <button onClick={(e) => startEditing(e, item)} className="w-full text-left px-2 py-2 text-xs hover:bg-white/[0.04] rounded-lg flex items-center gap-2 text-zinc-300 hover:text-white transition-all cursor-pointer">
                               <Edit className="w-3.5 h-3.5 text-zinc-400"/> {lang === 'id' ? 'Ubah Nama' : 'Rename'}
                            </button>
                            <button onClick={(e) => handleTogglePin(e, item)} className="w-full text-left px-2 py-2 text-xs hover:bg-white/[0.04] rounded-lg flex items-center gap-2 text-zinc-300 hover:text-white transition-all cursor-pointer">
                               <Pin className="w-3.5 h-3.5 text-amber-500"/> {lang === 'id' ? 'Lepas Pin' : 'Unpin'}
                            </button>
                            <button onClick={(e) => handleDuplicate(e, item.id)} className="w-full text-left px-2 py-2 text-xs hover:bg-white/[0.04] rounded-lg flex items-center gap-2 text-zinc-300 hover:text-white transition-all cursor-pointer">
                               <Copy className="w-3.5 h-3.5 text-blue-400"/> {lang === 'id' ? 'Duplikat' : 'Duplicate'}
                            </button>
                            <div className="h-[1px] bg-white/[0.04] my-1"></div>
                            <button onClick={(e) => { e.stopPropagation(); setActiveItem(null); setDeleteId(item.id); }} className="w-full text-left px-2 py-2 text-xs hover:bg-red-500/10 hover:text-red-300 text-red-500 rounded-lg flex items-center gap-2 transition-all cursor-pointer">
                               <Trash2 className="w-3.5 h-3.5 opacity-80"/> {t('delete')}
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div>
              <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2 px-2.5 flex justify-between items-center">
                <span>Proyek</span>
                <span className="text-zinc-500 bg-zinc-900/80 px-1.5 py-0.5 rounded text-[8px] border border-zinc-800">{history.filter(h => !h.pinned).length}</span>
              </div>
              <div className="space-y-1">
                {history.filter(h => !h.pinned).length > 0 ? history.filter(h => !h.pinned).map((item) => {
                  const isActive = window.location.pathname.endsWith(item.id);
                  return (
                    <div 
                      key={item.id} 
                      className={`group relative flex items-center justify-between gap-2 p-2 px-2.5 rounded-xl cursor-pointer transition-all duration-300 ${isActive ? 'bg-white/[0.03] border border-white/[0.05] text-white font-medium shadow-sm' : 'text-zinc-400 hover:text-white hover:bg-white/[0.01] hover:backdrop-blur-sm'}`}
                      onMouseLeave={() => setActiveItem(null)}
                    >
                      {editingId === item.id ? (
                        <input
                          type="text"
                          autoFocus
                          value={renameValue}
                          onChange={(e) => setRenameValue(e.target.value)}
                          onBlur={() => handleRenameSave(item.id)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleRenameSave(item.id);
                            if (e.key === 'Escape') setEditingId(null);
                          }}
                          className="flex-1 bg-zinc-950 border border-[var(--accent)] text-white text-xs px-2 py-1 rounded-lg outline-none focus:ring-1 focus:ring-[var(--accent)] transition-all"
                        />
                      ) : (
                        <div 
                          className="flex items-center gap-2 overflow-hidden flex-1" 
                          onClick={() => navigate(`/app/${item.id}`)}
                          onDoubleClick={(e) => startEditing(e, item)}
                        >
                          <span className="text-xs truncate flex-1 leading-relaxed">{item.name === 'Tanpa Judul' ? 'Ideasi Brand ✨' : item.name}</span>
                        </div>
                      )}
                      
                      {/* Options Button */}
                      {!editingId && (
                        <button 
                          onClick={(e) => { e.stopPropagation(); setActiveItem(activeItem === item.id ? null : item.id); }}
                          className="opacity-0 group-hover:opacity-100 p-1 hover:bg-zinc-850 rounded-lg transition-all"
                        >
                          <MoreHorizontal className="w-3.5 h-3.5 text-zinc-500 hover:text-white" />
                        </button>
                      )}

                      {/* Dropdown Menu */}
                      {activeItem === item.id && (
                        <div className="absolute right-2 top-9 w-36 bg-[#0A0A0B] backdrop-blur-3xl border border-white/[0.08] shadow-2xl shadow-black/50 rounded-lg p-1 z-30 animate-in fade-in zoom-in-95 duration-100">
                          <button onClick={(e) => startEditing(e, item)} className="w-full text-left px-2 py-2 text-xs hover:bg-white/[0.04] rounded-lg flex items-center gap-2 text-zinc-300 hover:text-white transition-all cursor-pointer">
                             <Edit className="w-3.5 h-3.5 text-zinc-400"/> {lang === 'id' ? 'Ubah Nama' : 'Rename'}
                          </button>
                          <button onClick={(e) => handleTogglePin(e, item)} className="w-full text-left px-2 py-2 text-xs hover:bg-white/[0.04] rounded-lg flex items-center gap-2 text-zinc-300 hover:text-white transition-all cursor-pointer">
                             <Pin className="w-3.5 h-3.5 text-amber-500"/> {lang === 'id' ? 'Pin Project' : 'Pin'}
                          </button>
                          <button onClick={(e) => handleDuplicate(e, item.id)} className="w-full text-left px-2 py-2 text-xs hover:bg-white/[0.04] rounded-lg flex items-center gap-2 text-zinc-300 hover:text-white transition-all cursor-pointer">
                             <Copy className="w-3.5 h-3.5 text-blue-400"/> {lang === 'id' ? 'Duplikat' : 'Duplicate'}
                          </button>
                          <div className="h-[1px] bg-white/[0.04] my-1"></div>
                          <button onClick={(e) => { e.stopPropagation(); setActiveItem(null); setDeleteId(item.id); }} className="w-full text-left px-2 py-2 text-xs hover:bg-red-500/10 hover:text-red-300 text-red-500 rounded-lg flex items-center gap-2 transition-all cursor-pointer">
                             <Trash2 className="w-3.5 h-3.5 opacity-80"/> {t('delete')}
                          </button>
                        </div>
                      )}
                    </div>
                  );
                }) : (
                  !history.some(h => h.pinned) && (
                    <div className="flex flex-col items-center justify-center p-6 text-center bg-white/[0.015] rounded-xl border border-white/[0.03] my-4 select-none relative overflow-hidden group">
                      <div className="absolute inset-0 bg-gradient-to-b from-white/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                      <div className="w-10 h-10 rounded-full bg-white/[0.03] flex items-center justify-center text-zinc-500 mb-3 border border-white/[0.05] shadow-sm">
                        <FolderPlus className="w-4 h-4 text-zinc-400 group-hover:scale-110 transition-transform duration-300" />
                      </div>
                      <p className="text-xs text-zinc-300 font-medium leading-normal tracking-wide relative z-10">{t('history_empty')}</p>
                      <p className="text-[10px] text-zinc-500 mt-1.5 font-light tracking-wide relative z-10">Mulai ideasi pertama Anda</p>
                    </div>
                  )
                )}
              </div>
            </div>
            <div className="w-full h-[1px] bg-white/[0.03] mt-2"></div>
          </div>

          <div className={`mt-auto pt-4 border-t border-white/[0.03] relative ${!isSidebarOpen ? 'flex justify-center w-full' : 'w-full'}`}>
            {showDropdown && isSidebarOpen && (
              <div className="absolute bottom-full mb-2 left-0 w-full bg-[#0A0A0B] backdrop-blur-3xl border border-white/[0.08] rounded-lg p-1 shadow-2xl shadow-black/50 z-50 animate-in fade-in slide-in-from-bottom-2 duration-200">
                {user ? (
                  <>
                    <button onClick={() => { setShowDropdown(false); navigate('/settings'); }} className="flex items-center gap-2.5 w-full p-2.5 text-xs text-zinc-400 hover:text-white hover:bg-white/[0.04] rounded-lg text-left transition-all cursor-pointer">
                      <Settings className="w-4 h-4 text-zinc-500" /> {t('settings')}
                    </button>
                    <button onClick={handleLogout} className="flex items-center gap-2.5 w-full p-2.5 text-xs text-red-500 hover:bg-red-500/10 hover:text-red-400 rounded-lg text-left transition-all cursor-pointer">
                      <LogOut className="w-4 h-4 opacity-70" /> {t('logout')}
                    </button>
                  </>
                ) : (
                  <>
                    <button onClick={() => navigate('/login')} className="flex items-center gap-2.5 w-full p-2.5 text-xs text-zinc-400 hover:text-white hover:bg-white/[0.04] rounded-lg text-left transition-all cursor-pointer">
                      <Key className="w-4 h-4 text-zinc-500" /> Login / Daftar
                    </button>
                    <button onClick={() => { setShowDropdown(false); navigate('/settings'); }} className="flex items-center gap-2.5 w-full p-2.5 text-xs text-zinc-400 hover:text-white hover:bg-white/[0.04] rounded-lg text-left transition-all cursor-pointer">
                      <Settings className="w-4 h-4 text-zinc-500" /> {t('settings')}
                    </button>
                  </>
                )}
              </div>
            )}
            
            <div 
              onClick={(e) => {
                e.stopPropagation();
                if (!isSidebarOpen) setIsSidebarOpen(true);
                else setShowDropdown(!showDropdown);
              }}
              className={`flex items-center group cursor-pointer hover:bg-white/[0.02] p-2 transition-all ${isSidebarOpen ? 'justify-between rounded-lg w-full' : 'justify-center rounded-xl w-10 h-10 p-0 flex-shrink-0'}`}
            >
              {user ? (
                isSidebarOpen ? (
                  <div className="flex items-center gap-2.5 overflow-hidden">
                    <div className="w-8 h-8 rounded-full bg-zinc-900 text-zinc-300 border border-zinc-800 flex flex-shrink-0 items-center justify-center font-semibold text-sm select-none">
                      {user.email?.charAt(0).toUpperCase() || 'U'}
                    </div>
                    <div className="flex text-left flex-col max-w-[150px]">
                      <span className="text-xs font-medium truncate text-white">{user.displayName || 'Pengguna'}</span>
                      <span className="text-[11px] text-zinc-500 truncate">{user.email}</span>
                    </div>
                  </div>
                ) : (
                  <div className="w-8 h-8 rounded-full bg-zinc-900 text-zinc-300 border border-zinc-800 flex flex-shrink-0 items-center justify-center font-semibold text-sm select-none">
                    {user.email?.charAt(0).toUpperCase() || 'U'}
                  </div>
                )
              ) : (
                isSidebarOpen ? (
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-zinc-900 text-zinc-400 border border-zinc-800 flex items-center justify-center">
                      <span className="font-bold text-[10px] uppercase">G</span>
                    </div>
                    <span className="text-xs font-medium text-zinc-300">Mode Tamu</span>
                  </div>
                ) : (
                  <div className="w-8 h-8 rounded-full bg-zinc-900 text-zinc-400 border border-zinc-800 flex items-center justify-center flex-shrink-0">
                    <span className="font-bold text-[10px] uppercase">G</span>
                  </div>
                )
              )}
              {isSidebarOpen && <ChevronUp className="w-4 h-4 text-zinc-500 group-hover:text-zinc-300 transition-colors flex-shrink-0" />}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 h-full relative group/layout" data-sidebar={isSidebarOpen ? 'open' : 'closed'}>
        {children}
      </div>

      <ToastHost />
    </div>
  );
}
