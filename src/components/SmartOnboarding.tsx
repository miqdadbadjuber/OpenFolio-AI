import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { db, auth } from '../lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import Logo from './Logo';
import { CheckCircle2, Workflow, Monitor, Download, LayoutGrid, Layers, FileText, MessageSquare } from 'lucide-react';

export default function SmartOnboarding({ onComplete }: { onComplete: () => void }) {
  const [step, setStep] = useState(1);
  const [visible, setVisible] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    let unsubscribe: () => void;

    const checkStatus = async (user: any) => {
      // 0. Define correct local key based on auth status
      const localKey = user ? `openfolio_onboarding_${user.uid}` : 'openfolio_onboarding_guest';

      // 0.1 Migrate old global key if it exists
      const oldGlobalStatus = localStorage.getItem('openfolio_workspaceTutorialCompleted');
      if (oldGlobalStatus === 'true') {
        localStorage.setItem(localKey, 'true');
        localStorage.removeItem('openfolio_workspaceTutorialCompleted');
      }

      // 1. Fast local check first
      const localStatus = localStorage.getItem(localKey);
      if (localStatus === 'true') {
        onComplete();
        setIsChecking(false);
        return;
      }

      // 2. Firebase check if logged in and local check failed
      if (user) {
        try {
          const userRef = doc(db, 'users', user.uid);
          const snap = await getDoc(userRef);
          if (snap.exists() && snap.data().workspaceTutorialCompleted === true) {
             // Save to local storage for future fast checks
             localStorage.setItem(localKey, 'true');
             onComplete();
          } else {
             setVisible(true);
          }
        } catch (e) {
          console.warn("Onboarding check error:", e);
          setVisible(true); 
        }
      } else {
        setVisible(true);
      }
      setIsChecking(false);
    };

    unsubscribe = onAuthStateChanged(auth, checkStatus);

    return () => {
      if (unsubscribe) unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const completeOnboardingData = async () => {
    const u = auth.currentUser;
    // Save to local storage for both guest and authenticated users
    const localKey = u ? `openfolio_onboarding_${u.uid}` : 'openfolio_onboarding_guest';
    localStorage.setItem(localKey, 'true');

    if (u) {
       try {
         const userRef = doc(db, 'users', u.uid);
         await setDoc(userRef, { workspaceTutorialCompleted: true }, { merge: true });
       } catch (e) {
         console.warn("Failed to set onboarding status", e);
       }
    }
  };

  const handleFinish = async () => {
    setVisible(false);
    setTimeout(onComplete, 300); // Wait for exit animation
    await completeOnboardingData();
  };

  const handleSkip = async () => {
    setVisible(false);
    setTimeout(onComplete, 300); // Wait for exit animation
    await completeOnboardingData();
  };

  if (isChecking) return null;

  return (
    <AnimatePresence>
      {visible && (
        <div className="fixed inset-0 z-[9999] pointer-events-auto flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={`absolute inset-0 bg-zinc-950/90 backdrop-blur-md transition-opacity duration-500`}
          />

          {/* Modal Step 1 to 4 */}
          {step <= 4 && (
            <motion.div 
              key={`modal-${step}`}
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative bg-zinc-950 border border-white/10 rounded-2xl p-8 max-w-[500px] w-full shadow-2xl flex flex-col max-h-[90vh] overflow-y-auto no-scrollbar"
            >
              {/* Progress Indicators */}
              <div className="absolute top-8 right-8 flex items-center gap-1.5">
                 {[1, 2, 3, 4].map((i) => (
                   <div key={i} className={`h-1.5 rounded-full transition-all duration-300 ${step === i ? 'w-5 bg-white' : step > i ? 'w-2 bg-white/40' : 'w-2 bg-white/10'}`} />
                 ))}
              </div>

              {step === 1 && (
                <div className="flex flex-col text-left space-y-6 pt-2">
                  <div className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center border border-white/10 mb-2">
                    <Logo size={24} variant="white" />
                  </div>
                  <div className="space-y-3">
                    <h3 className="text-2xl text-white font-semibold tracking-tight">Selamat Datang di OpenFolio</h3>
                    <p className="text-sm text-zinc-400 leading-relaxed">
                      Bangun portfolio profesional tanpa perlu membuat website manual dari nol.
                    </p>
                  </div>
                  <div className="space-y-3 bg-zinc-900/50 border border-white/[0.05] p-5 rounded-2xl">
                    <p className="text-[10px] text-zinc-500 tracking-widest uppercase font-bold mb-4">OpenFolio membantu Anda:</p>
                    {['Menyusun struktur portfolio otomatis', 'Mendesain tampilan dengan cepat', 'Mengedit & merevisi menggunakan AI', 'Melihat preview secara realtime', 'Mengunduh website untuk di-publish'].map(item => (
                      <div key={item} className="flex items-center gap-4 text-sm text-zinc-300">
                        <CheckCircle2 className="w-4 h-4 text-zinc-500 shrink-0" />
                        <span className="font-medium text-zinc-300">{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="flex flex-col text-left space-y-6 pt-2">
                  <div className="space-y-3">
                    <h3 className="text-2xl text-white font-semibold tracking-tight">Bagaimana OpenFolio Bekerja?</h3>
                  </div>
                  <div className="space-y-6 pt-2 pb-4">
                    {[
                      {
                        title: 'Isi Data',
                        desc: 'Masukkan informasi diri, riwayat karir, dan keahlian Anda.',
                        icon: <FileText className="w-5 h-5 text-white" />
                      },
                      {
                        title: 'AI Menyusun Portofolio',
                        desc: 'Sistem otomatis membuat struktur, layout, dan elemen website.',
                        icon: <Workflow className="w-5 h-5 text-indigo-400" />
                      },
                      {
                        title: 'Review Realtime',
                        desc: 'Lihat hasil desain pada canvas yang langsung tersinkronisasi.',
                        icon: <Monitor className="w-5 h-5 text-white" />
                      },
                      {
                        title: 'Revisi dengan AI Chat',
                        desc: 'Minta perubahan warna, tata letak, atau konten dengan obrolan natural.',
                        icon: <MessageSquare className="w-5 h-5 text-white" /> 
                      },
                      {
                        title: 'Download & Publish',
                        desc: 'Unduh kode React-Tailwind yang rapi dan siap dipublikasikan.',
                        icon: <Download className="w-5 h-5 text-white" />
                      }
                    ].map((item, i) => (
                      <div key={item.title} className="flex items-start gap-4">
                         <div className="relative flex flex-col items-center shrink-0 mt-0.5">
                           <div className={`w-10 h-10 rounded-xl border flex items-center justify-center shadow-sm z-10 ${i === 1 ? 'bg-indigo-500/10 border-indigo-500/20' : 'bg-zinc-900 border-white/10'}`}>
                             {item.icon}
                           </div>
                           {i < 4 && <div className="w-px h-8 bg-zinc-800 -mb-2 mt-2" />}
                         </div>
                         <div className="flex flex-col pt-0.5">
                           <span className="text-sm font-semibold text-white tracking-tight">{item.title}</span>
                           <span className="text-sm text-zinc-400 leading-relaxed mt-0.5">{item.desc}</span>
                         </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="flex flex-col text-left space-y-6 pt-2">
                  <div className="space-y-3 pr-10">
                    <h3 className="text-2xl text-white font-semibold tracking-tight">Apa yang Akan Anda Bangun?</h3>
                    <p className="text-sm text-zinc-400 leading-relaxed">
                      Portfolio Anda akan tersusun secara otomatis. Desain dapat disesuaikan kembali nantinya.
                    </p>
                  </div>
                  
                  <div className="bg-[#0c0c0e] border border-white/10 rounded-2xl p-5 overflow-hidden relative flex flex-col gap-3 shadow-inner">
                    <div className="flex items-center gap-2 mb-2">
                       <div className="w-2.5 h-2.5 rounded-full bg-zinc-700" />
                       <div className="w-2.5 h-2.5 rounded-full bg-zinc-700" />
                       <div className="w-2.5 h-2.5 rounded-full bg-zinc-700" />
                    </div>
                    {/* Wireframe Hero */}
                    <div className="w-full h-24 bg-zinc-900/50 rounded-xl border border-white/5 flex flex-col items-center justify-center text-xs font-mono text-zinc-500 gap-3">
                       <div className="w-12 h-12 bg-white/10 rounded-full" />
                       <div className="w-32 h-2 bg-white/10 rounded-full" />
                    </div>
                    {/* Wireframe content */}
                    <div className="flex gap-3">
                       <div className="flex-[1.5] h-24 bg-zinc-900/50 rounded-xl border border-white/5 flex flex-col p-4 gap-3">
                          <div className="w-16 h-2 bg-white/10 rounded-full" />
                          <div className="w-20 h-2 bg-white/5 rounded-full" />
                          <div className="w-12 h-2 bg-white/5 rounded-full" />
                       </div>
                       <div className="flex-[2] h-24 bg-zinc-900/50 rounded-xl border border-white/5 grid grid-cols-2 gap-2 p-3">
                          <div className="bg-white/5 rounded-lg" />
                          <div className="bg-white/5 rounded-lg" />
                       </div>
                    </div>
                    <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[#0c0c0e] to-transparent pointer-events-none" />
                  </div>
                </div>
              )}

              {step === 4 && (
                <div className="flex flex-col text-center space-y-8 py-4">
                  <div className="w-20 h-20 bg-indigo-500/10 rounded-full flex items-center justify-center border border-indigo-500/20 mx-auto shadow-2xl shadow-indigo-500/10">
                     <Layers className="w-10 h-10 text-indigo-400" />
                  </div>
                  <div className="space-y-3">
                    <h3 className="text-2xl text-white font-semibold tracking-tight">Siap Membuat Portfolio Pertama?</h3>
                    <p className="text-sm text-zinc-400 leading-relaxed max-w-sm mx-auto">
                      Semua persiapan teknis selesai. Mulai rancang dan sesuaikan portofolio Anda sekarang.
                    </p>
                  </div>
                  
                  <div className="pt-6 border-t border-white/10 space-y-4">
                     <p className="text-xs text-zinc-500 font-medium">Opsional: Butuh perkenalan area editor?</p>
                     <div className="flex flex-col gap-3">
                        <button onClick={() => setStep(5)} className="w-full py-3.5 px-4 rounded-xl text-sm font-bold text-black bg-white hover:bg-zinc-200 transition-all shadow-lg outline-none">
                          Ya, Kenalkan Area Kerja
                        </button>
                        <button onClick={handleSkip} className="w-full py-3.5 px-4 rounded-xl text-sm font-semibold text-zinc-400 hover:text-white bg-zinc-900 border border-white/5 hover:bg-zinc-800 transition-all outline-none">
                          Lewati & Langsung Mulai
                        </button>
                     </div>
                  </div>
                </div>
              )}

              {/* Navigation Footer for Steps 1-3 */}
              {step < 4 && (
                <div className="w-full flex items-center justify-between pt-6 mt-8 border-t border-white/10">
                  {step === 1 ? (
                    <>
                      <button onClick={handleSkip} className="py-2.5 px-2 text-sm font-medium text-zinc-500 hover:text-white transition-all outline-none">Lewati Tur</button>
                      <button onClick={() => setStep(2)} className="py-2.5 px-8 rounded-xl text-sm font-bold text-black bg-white hover:bg-zinc-200 transition-all shadow-lg outline-none">Lanjut</button>
                    </>
                  ) : (
                    <>
                      <button onClick={() => setStep(step - 1)} className="py-2.5 px-2 text-sm font-medium text-zinc-500 hover:text-white transition-all outline-none">Kembali</button>
                      <button onClick={() => setStep(step + 1)} className="py-2.5 px-8 rounded-xl text-sm font-bold text-black bg-white hover:bg-zinc-200 transition-all shadow-lg outline-none">Lanjut</button>
                    </>
                  )}
                </div>
              )}
            </motion.div>
          )}

          {/* Step 5: Simple Workspace Overview */}
          {step === 5 && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative bg-zinc-950 border border-white/10 rounded-2xl p-8 max-w-[700px] w-full shadow-2xl flex flex-col md:flex-row gap-8 items-center max-h-[90vh] overflow-y-auto no-scrollbar"
            >
              <div className="flex-1 space-y-8">
                 <div>
                    <h3 className="text-2xl text-white font-semibold tracking-tight mb-2">Workspace Overview</h3>
                    <p className="text-sm text-zinc-400 leading-relaxed">Pahami area kerja untuk memaksimalkan fitur OpenFolio.</p>
                 </div>
                 
                 <div className="space-y-6">
                    <div className="flex gap-4 items-start">
                       <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-white/10 flex items-center justify-center shrink-0 mt-0.5 shadow-sm"><LayoutGrid className="w-5 h-5 text-white" /></div>
                       <div><p className="text-sm text-white font-semibold">Sidebar Kiri</p><p className="text-sm text-zinc-400 mt-1 leading-relaxed">Manajemen proyek, navigasi aplikasi, status pengguna, dan tombol publikasi.</p></div>
                    </div>
                    <div className="flex gap-4 items-start">
                       <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center shrink-0 mt-0.5 shadow-sm"><Workflow className="w-5 h-5 text-indigo-400" /></div>
                       <div><p className="text-sm text-white font-semibold">AI Assistant (Tengah)</p><p className="text-sm text-zinc-400 mt-1 leading-relaxed">Ketik instruksi secara natural untuk menambah section, mengubah warna, atau tata letak.</p></div>
                    </div>
                    <div className="flex gap-4 items-start">
                       <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-white/10 flex items-center justify-center shrink-0 mt-0.5 shadow-sm"><Monitor className="w-5 h-5 text-white" /></div>
                       <div><p className="text-sm text-white font-semibold">Canvas Preview (Kanan)</p><p className="text-sm text-zinc-400 mt-1 leading-relaxed">Pratinjau langsung atas hasil akhir website Anda. Tersinkronisasi secara realtime.</p></div>
                    </div>
                 </div>
                 
                 <div className="pt-4">
                    <button onClick={handleFinish} className="w-full py-4 px-4 rounded-xl text-sm font-bold text-black bg-white hover:bg-zinc-200 transition-all shadow-lg outline-none">
                       Mulai Desain Sekarang
                    </button>
                 </div>
              </div>
              
              <div className="hidden md:block flex-[0.8] w-full shrink-0">
                 {/* Mini UI Representation */}
                 <div className="aspect-[3/4] bg-[#0c0c0e] rounded-xl border border-white/10 flex overflow-hidden shadow-2xl">
                    <div className="w-[15%] bg-white/5 border-r border-white/5 flex items-center justify-center">
                       <div className="w-1.5 h-12 bg-white/10 rounded-full" />
                    </div>
                    <div className="w-[30%] bg-indigo-500/5 border-r border-indigo-500/10 flex flex-col p-3">
                       <div className="flex-1 border border-indigo-500/10 bg-indigo-500/5 rounded-lg mb-3" />
                       <div className="h-8 bg-indigo-500/10 rounded-lg flex items-center justify-center"><Workflow className="w-3 h-3 text-indigo-400/50" /></div>
                    </div>
                    <div className="flex-1 bg-[#050505] p-3 flex flex-col gap-3 relative">
                       <div className="w-full h-8 bg-white/5 rounded-lg" />
                       <div className="flex-1 bg-white/5 rounded-lg border border-white/5" />
                    </div>
                 </div>
              </div>
            </motion.div>
          )}

        </div>
      )}
    </AnimatePresence>
  );
}
