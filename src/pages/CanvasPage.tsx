import { motion, AnimatePresence } from 'motion/react';
import React, { useState, useEffect, useRef } from 'react';
import AppLayout from '../components/AppLayout';
import { Send, Upload, UploadCloud, ArrowRight, User as UserIcon, RotateCcw, Paintbrush, Edit3, Download, Share2, Plus, Mic, LayoutPanelLeft, Code, Eye, Copy, X, Workflow, Blocks, Zap, ChevronDown, Lock, AlertTriangle, FileText, Globe, Github, Mail, Linkedin, Loader2, Briefcase } from 'lucide-react';
import { useParams, useNavigate, useLocation } from 'react-router';
import Markdown from 'react-markdown';
import { TypingText } from '../components/TypingText';
import { auth, db } from '../lib/firebase';
import Logo from '../components/Logo';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { onAuthStateChanged, User } from 'firebase/auth';
import { getQuota, remaining, QuotaSnapshot } from '../lib/UsageService';
import { showToast } from '../lib/notify';
import { apiFetch } from '../lib/api';
import { useLanguage } from '../lib/LanguageContext';

import { PortfolioData } from '../types';

const CHUNKS = [
  "ANALYZING_CORE_IDENTITY",
  "HYDRATING_VISUAL_FRAMEWORK",
  "SYNTHESIZING_PROFESSIONAL_COPY",
  "ARCHITECTING_GRID_SYSTEMS",
  "OPTIMIZING_MOBILE_VIEWPORT",
  "FINALIZING_DIGITAL_CANVAS"
];

const getProgressiveDataForPct = (structuredData: any, pct: number) => {
    const name = structuredData.fullName || "";
    const role = structuredData.role || "";
    const about = structuredData.about || "";
    
    let color_accent = "#1b4332";
    let color_accent_hover = "#143225";

    const baseSource: any = {
      name,
      role,
      hero_description: about || "",
      hero_image_url: structuredData.profilePhoto || null,
      navbar: structuredData.navbar,
      socials: structuredData.contacts || {},
      about_paragraph_1: about,
      about_paragraph_2: "",
      contact_email: structuredData.contacts?.email || "",
      contact_location: structuredData.contacts?.location || "Indonesia",
      skills: (structuredData.skills || []).map((s: any) => ({
        title: s.name,
        items: [s.description]
      })),
      projects: Array.isArray(structuredData.projects) ? structuredData.projects : [],
      career: (structuredData.career || []).map((c: any) => ({
        period: `${c.yearStart} - ${c.yearEnd}`,
        role: c.position,
        company: c.company,
        description: c.description
      })),
      color_accent,
      color_accent_hover,
      footer_year: "2026",
      visual_behavior: {
         identity_tone: 'stoic',
         layout_density: 'balanced',
         asymmetry_level: 0.1,
         typography_scale: 'balanced',
         motion_intensity: 'subtle',
         content_pacing: 'deliberate'
      },
      layout_config: {
         section_ordering: ['hero', 'projects', 'skills', 'career', 'about', 'contact'],
         show_navbar: structuredData.navbar?.enabled ?? true
      }
    };

    const data = { ...baseSource };
    
    if (pct < 30) {
        return {
            ...data,
            hero_description: "Mengumpulkan data identitas...",
            about_paragraph_1: "",
            skills: [],
            projects: [],
            career: []
        };
    }
    if (pct < 60) {
        return {
            ...data,
            about_paragraph_1: "",
            projects: [],
            career: []
        };
    }
    return data;
};

// Helper function to auto-retry on 200 HTML responses (loading screen) when the AI studio server restarts.
const fetchDenganRetry = async (url: string, options: RequestInit, retries = 3): Promise<Response> => {
    const res = await fetch(url, options);
    const contentType = res.headers.get("content-type");
    if (res.status === 502 || res.status === 503 || res.status === 504 || (res.status === 200 && contentType && contentType.includes("text/html"))) {
        if (retries > 0) {
            console.log(`Server response indicates temporary routing state (${res.status}). Retrying... (${retries} left)`);
            await new Promise(r => setTimeout(r, 3000));
            return fetchDenganRetry(url, options, retries - 1);
        }
    }
    return res;
};

const months = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
const years = Array.from({length: 27}, (_, i) => (2026 - i).toString());

const CustomDropdown = ({ value, options, onChange, placeholder }: { value: string, options: (string | {label: string, value: string})[], onChange: (v: string) => void, placeholder: string }) => {
    const [isOpen, setIsOpen] = React.useState(false);
    const dropdownRef = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setIsOpen(false);
        };
        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            document.addEventListener('keydown', handleEscape);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleEscape);
        };
    }, [isOpen]);

    const displayValue = options.find(o => typeof o === 'object' && (o as any).value === value) ? (options.find(o => typeof o === 'object' && (o as any).value === value) as any).label : value;

    return (
        <div className={`relative w-full ${isOpen ? 'z-50' : 'z-10'}`} ref={dropdownRef}>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="w-full bg-white/[0.03] hover:bg-white/[0.05] border border-white/5 hover:border-white/10 rounded-lg px-4 py-2 text-white outline-none flex justify-between items-center transition-all text-sm h-10"
            >
                <span className={displayValue ? "text-white" : "text-zinc-500"}>{displayValue || placeholder}</span>
                <ChevronDown className={`w-4 h-4 text-zinc-400 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} transition={{ duration: 0.15 }}
                        className="absolute top-full left-0 right-0 mt-2 bg-[#121214] border border-white/10 rounded-lg z-[60] shadow-2xl max-h-60 overflow-y-auto no-scrollbar"
                    >
                        {options.map(opt => {
                            const optValue = typeof opt === 'string' ? opt : opt.value;
                            const optLabel = typeof opt === 'string' ? opt : opt.label;
                            return (
                                <button
                                    key={optValue}
                                    type="button"
                                    onClick={() => { onChange(optValue); setIsOpen(false); }}
                                    className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${value === optValue ? 'bg-indigo-500/10 text-indigo-400' : 'text-zinc-300 hover:text-white hover:bg-white/5'}`}
                                >
                                    {optLabel}
                                </button>
                            );
                        })}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

const CareerPeriodInput = ({ 
    type,
    value, 
    onChange 
}: { 
    type: 'mulai' | 'selesai',
    value: string, 
    onChange: (val: string) => void 
}) => {
    const parts = (value || "").trim().split(" ");
    let month = "";
    let year = value;
    
    if (parts.length >= 2 && months.includes(parts[0]!)) {
        month = parts[0]!;
        year = parts[1]!;
    } else if (value === "Sekarang") {
        year = "Sekarang";
        month = "";
    } else if (months.includes(value)) {
        month = value;
        year = "";
    }

    const isCurrent = type === "selesai" && value === "Sekarang";

    return (
        <div className="space-y-3">
            {type === "selesai" && (
                <div className="flex items-center gap-2 mb-2">
                    <button 
                        type="button"
                        onClick={(e) => { e.preventDefault(); onChange(isCurrent ? "" : "Sekarang"); }}
                        className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${isCurrent ? 'bg-indigo-500 border-indigo-500' : 'border-white/20 hover:border-white/40 bg-zinc-900/50'}`}
                    >
                        {isCurrent && <div className="w-2.5 h-2.5 bg-white rounded-sm" />}
                    </button>
                    <span className="text-xs text-zinc-300 select-none cursor-pointer" onClick={() => onChange(isCurrent ? "" : "Sekarang")}>Sedang Berjalan</span>
                </div>
            )}
            
            {!(type === "selesai" && isCurrent) && (
                <div className="flex gap-2">
                    <div className="flex-1">
                        <CustomDropdown 
                            value={month} 
                            options={months} 
                            onChange={(m) => onChange(`${m} ${year === 'Sekarang' ? '' : year}`.trim())} 
                            placeholder="Bulan" 
                        />
                    </div>
                    <div className="flex-1">
                        <CustomDropdown 
                            value={year === "Sekarang" ? "" : year} 
                            options={years} 
                            onChange={(y) => onChange(`${month ? month + ' ' : ''}${y}`.trim())} 
                            placeholder="Tahun" 
                        />
                    </div>
                </div>
            )}
        </div>
    );
};

export default function CanvasPage() {

    const { id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const { t, lang } = useLanguage();
    const [isLoading, setIsLoading] = useState(false);
    const [loadingPct, setLoadingPct] = useState(0);
    const [currentGenerationId, setCurrentGenerationId] = useState<string | null>(null);
    const [showCanvas, setShowCanvas] = useState(false);

    // -- AUTH & SESSION --
    // Firebase
    const [user, setUser] = useState<User | null>(null);
    const [authResolved, setAuthResolved] = useState(false);
    const [projectId, setProjectId] = useState<string | null>(id || null);

    // -- PERSISTENCE --
    const getScopedKey = (key: string) => {
        return user ? `user_${user.uid}_${key}` : `guest_${key}`;
    };

    // -- APP CORE STATES --
    const [guidedStage, setGuidedStage] = useState<'navbar' | 'hero' | 'about' | 'skills' | 'projects' | 'career' | 'contact' | 'review' | 'generating' | 'done'>('navbar');
    const [portfolioData, setPortfolioData] = useState<PortfolioData | null>(null);
    const [htmlContent, setHtmlContent] = useState<string>('');
    const [workspaceMessages, setWorkspaceMessages] = useState<Array<{ role: string; content: string }>>([]);
    const [isGenerating, setIsGenerating] = useState(false);
    const [quota, setQuota] = useState<QuotaSnapshot>({ generates: 0, edits: 0, chats: 0, lastResetDate: '' });

    // -- NEW MODULAR STATES --
    interface SkillItem {
        id: string;
        name: string;
        description: string;
    }
    
    interface CareerItem {
        id: string;
        yearStart: string;
        yearEnd: string;
        company: string;
        position: string;
        type: string;
        description: string;
    }

    interface ContactData {
        email: string;
        whatsapp: string;
        linkedin: string;
        github: string;
        website: string;
        location: string;
    }

    interface ProjectInput {
        id: string;
        title: string;
        description: string;
        type: string;
        role: string;
        technologies: string;
        link: string;
        image_url: string;
        crop_strategy?: 'cover' | 'contain';
    }

    interface FormDraft {
        name: string;
        profession: string;
        navbar: { enabled: boolean; items: string[]; name_text?: string };
        hero: { name: string; role: string; photo: string };
        about: string;
        skills: SkillItem[];
        career: CareerItem[];
        contact: ContactData;
        projects: ProjectInput[];
    }

    const defaultDraft: FormDraft = {
        name: '',
        profession: '',
        navbar: { enabled: true, items: ['Nama', 'Tentang', 'Karier', 'Proyek', 'Skill', 'Kontak'], name_text: '' },
        hero: { name: '', role: '', photo: '' },
        about: '',
        skills: [],
        career: [],
        contact: { email: '', whatsapp: '', linkedin: '', github: '', website: '', location: '' },
        projects: [{ id: '1', title: '', description: '', type: '', role: '', technologies: '', link: '', image_url: '', crop_strategy: 'cover' }]
    };

    const [draftPortfolio, setDraftPortfolio] = useState<FormDraft>(defaultDraft);
    const [isHydrating, setIsHydrating] = useState(true);
    const skipHydration = useRef(location.state?.freshSession === true);

    const { name: onboardingName, profession: onboardingProfession, navbar: navbarConfig, hero: heroData, about: aboutText, skills: skillsList, career: careerTimeline, contact: contactInfo, projects: structuredProjects } = draftPortfolio;

    // Mutators backward compatibility
    const setOnboardingName = (v: string | ((prev: string) => string)) => setDraftPortfolio(prev => ({ ...prev, name: typeof v === 'function' ? v(prev.name) : v as string }));
    const setOnboardingProfession = (v: string | ((prev: string) => string)) => setDraftPortfolio(prev => ({ ...prev, profession: typeof v === 'function' ? v(prev.profession) : v as string }));
    const setNavbarConfig = (v: FormDraft['navbar'] | ((prev: FormDraft['navbar']) => FormDraft['navbar'])) => setDraftPortfolio(prev => ({ ...prev, navbar: typeof v === 'function' ? v(prev.navbar) : v }));
    const setHeroData = (v: FormDraft['hero'] | ((prev: FormDraft['hero']) => FormDraft['hero'])) => setDraftPortfolio(prev => ({ ...prev, hero: typeof v === 'function' ? v(prev.hero) : v }));
    const setAboutText = (v: string | ((prev: string) => string)) => setDraftPortfolio(prev => ({ ...prev, about: typeof v === 'function' ? v(prev.about) : v as string }));
    const setSkillsList = (v: SkillItem[] | ((prev: SkillItem[]) => SkillItem[])) => setDraftPortfolio(prev => ({ ...prev, skills: typeof v === 'function' ? v(prev.skills) : v }));
    const setCareerTimeline = (v: CareerItem[] | ((prev: CareerItem[]) => CareerItem[])) => setDraftPortfolio(prev => ({ ...prev, career: typeof v === 'function' ? v(prev.career) : v }));
    const setContactInfo = (v: ContactData | ((prev: ContactData) => ContactData)) => setDraftPortfolio(prev => ({ ...prev, contact: typeof v === 'function' ? v(prev.contact) : v }));
    const setStructuredProjects = (v: ProjectInput[] | ((prev: ProjectInput[]) => ProjectInput[])) => setDraftPortfolio(prev => ({ ...prev, projects: typeof v === 'function' ? v(prev.projects) : v }));

    // Add setMessages alias for workspaceMessages to satisfy existing code
    const setMessages = setWorkspaceMessages;
    
    // -- EDITOR / INTERVIEW STATES --
    const [input, setInput] = useState('');

    const [uploadingImageCount, setUploadingImageCount] = useState(0);

    const uploadFile = async (file: File): Promise<string> => {
        setUploadingImageCount(prev => prev + 1);
        console.log(`[Frontend Upload] Initiating upload for ${file.name} (${file.size} bytes)`);
        const startTime = Date.now();
        const controller = new AbortController();
        const timeoutId = setTimeout(() => {
            console.warn(`[Frontend Upload] Upload timed out after 60 seconds`);
            controller.abort();
        }, 60000); // 60 second timeout

        try {
            // Bypass Compress Image Client-Side for testing
            const compressStart = Date.now();
            console.log(`[Frontend Upload] Bypassing image compression...`);
            
            const compressedFile = file;
            
            console.log(`[Frontend Upload] Image bypass in ${Date.now() - compressStart}ms: ${compressedFile.size} bytes`);
            
            const formData = new FormData();
            formData.append('file', compressedFile);
            console.log(`[Frontend Upload] Sending request to /api/upload...`);
            const res = await fetch('/api/upload', {
                method: 'POST',
                body: formData,
                signal: controller.signal
            });
            clearTimeout(timeoutId);
            console.log(`[Frontend Upload] Received response with status ${res.status} in ${Date.now() - startTime}ms`);
            const contentType = res.headers.get("content-type");
            if (res.status === 413) {
                 throw new Error("File terlalu besar (batas ukuran wajar diperlukan).");
            }
            if (res.status === 502 || res.status === 503 || res.status === 504 || (res.status === 200 && contentType && contentType.includes("text/html"))) {
                 throw new Error("Koneksi ke server terputus atau server sedang restart. Silakan muat ulang halaman.");
            }
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.error || "Gagal mengunggah gambar");
            }
            const data = await res.json();
            console.log(`[Frontend Upload] Upload completed successfully in ${Date.now() - startTime}ms. URL: ${data.url}`);
            return data.url;
        } catch (err: any) {
             clearTimeout(timeoutId);
             console.warn(`[Frontend Upload] Caught error in ${Date.now() - startTime}ms:`, err);
             if (err.name === 'AbortError' || err.message === 'Failed to fetch' || err.message.includes('fetch')) {
                 throw new Error("Koneksi bermasalah atau upload gambar terlalu lama (timeout limit 60s). Periksa koneksi internet atau gunakan gambar dengan ukuran lebih kecil (<2MB).");
             }
             throw err;
        } finally {
            console.log(`[Frontend Upload] Decrementing uploadingImageCount state`);
            setUploadingImageCount(prev => Math.max(0, prev - 1));
        }
    };

    
    // -- RESTORED STATES --
    const [lastSessionRestored, setLastSessionRestored] = useState(false);
    const [showRestoreToast, setShowRestoreToast] = useState(false);
    useEffect(() => {
        if (showRestoreToast) {
            const timer = setTimeout(() => setShowRestoreToast(false), 3000);
            return () => clearTimeout(timer);
        }
    }, [showRestoreToast]);
    const [isEditingPortfolio, setIsEditingPortfolio] = useState(false);
    const [revisionInstruction, setRevisionInstruction] = useState('');
    const [skippedPhoto, setSkippedPhoto] = useState(false);
    const [activeView, setActiveView] = useState<'preview' | 'code'>('preview');

    // -- EDITOR STATES --
    const [editorName, setEditorName] = useState('');
    const [editorRole, setEditorRole] = useState('');
    const [editorBio, setEditorBio] = useState('');
    const [editorEmail, setEditorEmail] = useState('');
    const [editorAccent, setEditorAccent] = useState('#C9A84C');
    const [safeMode, setSafeMode] = useState(false);
    const [isPublishing, setIsPublishing] = useState(false);

    const handleDevBypass = async () => {
        console.log("[DEV MODE] Bypassing onboarding with premium editorial identity preset...");
        const mockData: PortfolioData = {
            name: "Aria Sudirman",
            role: "Lead Software Architect & Designer",
            hero_description: "Menggabungkan ketelitian rekayasa sistem modern dengan keselarasan desain editorial interaktif untuk melahirkan produk digital berkelas tinggi.",
            hero_image_url: null,
            color_accent: "#6366F1",
            color_accent_hover: "#4F46E5",
            footer_year: "2026",
            templateName: "obsidian",
            safe_mode: false,
            visual_behavior: {
                identity_tone: "stoic",
                layout_density: "balanced",
                asymmetry_level: 0.05,
                typography_scale: "balanced",
                motion_intensity: "subtle",
                content_pacing: "deliberate"
            },
            layout_config: {
                section_ordering: ["hero", "projects", "skills", "career", "about", "contact"],
                show_navbar: true
            },
            socials: {
                github: "https://github.com/mizume",
                linkedin: "https://linkedin.com/in/ariasudirman"
            },
            about_paragraph_1: "Saya berdedikasi membangun fondasi digital rentang tinggi yang memiliki performa mutakhir tanpa menaruh kompromi di sisi visual. Bekerja dekat dengan tim lintas fungsi untuk melahirkan visi modern.",
            about_paragraph_2: "Tinggal di Jakarta, mengasuh beberapa sistem terbuka, dan terus mengeksplorasi batas interaktivitas peramban web modern.",
            contact_email: "aria@sudirman.dev",
            contact_location: "Jakarta, Indonesia",
            stats: [],
            skills: [
                {
                    title: "Engineering",
                    items: ["React & Next.js", "TypeScript", "Node.js (Express)", "Tailwind CSS", "Kubernetes & Cloud Run"],
                    visual_weight: 8
                },
                {
                    title: "Creative Integrity",
                    items: ["User Interface System", "Typography Layout", "Figma Design Token", "Motion Design", "Visual Rhythm"],
                    visual_weight: 7
                }
            ],
            projects: [
                {
                    title: "Linear Integration Portal",
                    description: "Mendesain dasbor real-time performa tinggi yang terintegrasi penuh dengan api Linear guna pelacakan proyek terpadu bagi internal developer.",
                    image_url: "",
                    link: "https://linear.app",
                    tags: ["System Integration", "React", "NodeJS"]
                },
                {
                    title: "Aetherial Canvas Engine",
                    description: "Pustaka rendering webgl modular berbasis tipe data terstruktur untuk menyajikan transisi antarmuka tiga dimensi yang mulus.",
                    image_url: "",
                    link: "#",
                    tags: ["WebGL", "TypeScript", "Creative Code"]
                }
            ],
            career: [
                {
                    period: "2024 - Sekarang",
                    role: "Principal Engineer",
                    company: "Glow Tech Industries",
                    description: "Memimpin tim rekayasa platform untuk memodernisasi seluruh tumpukan teknologi frontend menuju arsitektur monorepo terpadu."
                },
                {
                    period: "2021 - 2024",
                    role: "Senior UI Engineer",
                    company: "Creative Artifacts Studio",
                    description: "Mengembangkan kerangka kerja komponen internal yang digunakan oleh lebih dari dua ratus desainer dan insinyur di seluruh cabang perusahaan."
                }
            ]
        };

        setIsGenerating(true);
        setLoadingPct(30);
        try {
            const html = await callInjectAPI(mockData);
            setLoadingPct(100);
            setPortfolioData(mockData);
            setHtmlContent(html);
            
            const activeId = `guest_dev_${Date.now()}`;
            setProjectId(activeId);
            setGuidedStage('done');
            setShowCanvas(true);
            setWorkspaceMessages([
                {
                    role: "assistant",
                    content: "⚡️ **DEV MODE ACTIVE**: Onboarding dilompati dengan data estetik profesional. Anda dapat melakukan uji kelayakan tipografi, spasi, responsivitas, dan layout secara langsung!"
                }
            ]);
            navigate(`/app/${activeId}`, { replace: true });
        } catch (e: any) {
            console.error("Bypass failed:", e);
        } finally {
            setIsGenerating(false);
        }
    };

    useEffect(() => {
        const loadPortfolio = async (u: User | null) => {
            if (!id) return;
            
            if (u && db && !id.startsWith('guest_')) {
                try {
                    const docRef = doc(db, 'portfolios', id);
                    const docSnap = await getDoc(docRef);
                    if (docSnap.exists()) {
                        const data = docSnap.data();
                        const pContent = data.content;
                        setPortfolioData(pContent);
                        
                        let html = data.htmlContent || data.html || '';
                        if (!html && pContent) {
                            try {
                                html = await callInjectAPI(pContent);
                            } catch (e) {
                                console.error("[OpenFolio] Gagal merender ulang portfolio:", e);
                                html = '';
                            }
                        }
                        setHtmlContent(html);
                        setGuidedStage('done');
                        
                        let msgs = data.messages;
                        if (!msgs || msgs.length === 0) {
                            msgs = [{
                                role: 'assistant',
                                content: `Selamat datang kembali, **${pContent?.name || 'Kreatif'}**! ✨ Silakan ajukan perubahan visual, teks, atau detail portofolio apa saja menggunakan kolom obrolan di bawah ini.`
                            }];
                        }
                        setWorkspaceMessages(msgs);
                    }
                } catch (e) {
                    console.error("Kesalahan memuat portofolio:", e);
                }
            } else {
                const stored = localStorage.getItem('openfolio_guest_history');
                if (stored) {
                    const list = JSON.parse(stored);
                    const orig = list.find((item: any) => item.id === id);
                    if (orig) {
                        setPortfolioData(orig.content);
                        
                        let html = orig.htmlContent || orig.html || '';
                        if (!html && orig.content) {
                            try {
                                html = await callInjectAPI(orig.content);
                            } catch (e) {
                                console.error("[OpenFolio] Gagal merender ulang portfolio:", e);
                                html = '';
                            }
                        }
                        setHtmlContent(html);
                        setGuidedStage('done');
                        
                        let msgs = orig.messages;
                        if (!msgs || msgs.length === 0) {
                            msgs = [{
                                role: 'assistant',
                                content: `Selamat datang kembali di workspace tamu, **${orig.content?.name || 'Kreatif'}**! ✨ Silakan minta perubahan desain portofolio Anda di sini.`
                            }];
                        }
                        setWorkspaceMessages(msgs);
                    }
                }
            }
        };

        if (!auth) {
            setAuthResolved(true);
            return;
        }
        const unsub = onAuthStateChanged(auth, (u) => {
            setUser(u);
            setAuthResolved(true);
            loadPortfolio(u);
            getQuota().then(setQuota);
        });
        return unsub;
    }, [id]);

    // Unified persistent draft storage auto-saver
    useEffect(() => {
        if (!isHydrating && guidedStage !== 'done') {
            try {
                // Do not persist photo URLs if they are huge base64 blocks
                const draftToPersist = { ...draftPortfolio };
                if (draftToPersist.hero?.photo && draftToPersist.hero.photo.startsWith('data:image')) {
                    draftToPersist.hero = { ...draftToPersist.hero, photo: '' }; 
                }
                draftToPersist.projects = draftToPersist.projects.map(p => {
                    if (p.image_url && p.image_url.startsWith('data:image')) return { ...p, image_url: '' };
                    return p;
                });

                localStorage.setItem(getScopedKey('openfolio_draft'), JSON.stringify(draftToPersist));
                localStorage.setItem(getScopedKey('openfolio_draft_stage'), guidedStage);
                localStorage.setItem(getScopedKey('openfolio_draft_history'), JSON.stringify(workspaceMessages));
                console.log("[OpenFolio] Autosave active: synced unified draft.");
            } catch (err: any) {
                if (err.name === 'QuotaExceededError' || err.message?.includes('quota')) {
                    console.error("[OpenFolio] Storage quota exceeded. Clearing older history or drafts.");
                    try {
                        localStorage.removeItem('openfolio_guest_history'); // clear history as fallback
                        localStorage.setItem(getScopedKey('openfolio_draft'), JSON.stringify({ ...draftPortfolio, projects: [], hero: { ...draftPortfolio.hero, photo: '' } }));
                        localStorage.setItem(getScopedKey('openfolio_draft_history'), JSON.stringify([]));
                    } catch (e) {
                         console.error("[OpenFolio] Critical storage failure", e);
                    }
                }
            }
        }
    }, [draftPortfolio, guidedStage, isHydrating, user, workspaceMessages]);

    // On URL/id change, either reset parameters for a new project or restore draft
    useEffect(() => {
        if (!authResolved) return; // Wait until we know the correct user identity
        
        if (!id) {
            if (skipHydration.current) {
                console.log("[OpenFolio] Fresh session requested: clearing local draft...");
                localStorage.removeItem(getScopedKey('openfolio_draft_stage'));
                localStorage.removeItem(getScopedKey('openfolio_draft'));
                localStorage.removeItem(getScopedKey('openfolio_draft_history'));
                setGuidedStage('navbar');
                setDraftPortfolio(defaultDraft);
                setLastSessionRestored(false);
                setPortfolioData(null);
                setHtmlContent('');
                setWorkspaceMessages([]);
                setIsHydrating(false);
                
                // If user is resolved or we know we are guest, we can turn off skipHydration
                // so that a subsequent login doesn't wipe the new progress.
                // But since onAuthStateChanged takes a moment, we wait for user to not be undefined
                // Actually user is null initially. We can just turn it off and let them keep typing.
                // Wait, if they login later, we don't want to wipe. 
                // Let's just turn it off so it only wipes the initial load.
                skipHydration.current = false;
                
                // Clear state so a refresh doesn't wipe out the new draft
                navigate(location.pathname, { replace: true, state: {} });
                return;
            }

            console.log("[OpenFolio] Hydration started: reading local draft...");
            const cachedStage = localStorage.getItem(getScopedKey('openfolio_draft_stage'));
            const cachedDraftRaw = localStorage.getItem(getScopedKey('openfolio_draft'));
            const cachedHistoryRaw = localStorage.getItem(getScopedKey('openfolio_draft_history'));
            
            if (cachedStage && cachedStage !== 'done' && cachedDraftRaw) {
                try {
                    const parsedDraft = JSON.parse(cachedDraftRaw);
                    const hydratedDraft = { ...defaultDraft, ...parsedDraft };
                    setDraftPortfolio(hydratedDraft);
                    setGuidedStage(cachedStage as any);
                    if (cachedHistoryRaw) setWorkspaceMessages(JSON.parse(cachedHistoryRaw));
                    setLastSessionRestored(true); setShowRestoreToast(true);
                    console.log("[OpenFolio] Hydration completed: draft restored seamlessly.");
                } catch (err) {
                    console.warn("[OpenFolio] Draft corrupted, recovering with default state.", err);
                    setGuidedStage('navbar');
                    setDraftPortfolio(defaultDraft);
                    setLastSessionRestored(false);
                }
            } else {
                setGuidedStage('navbar');
                setDraftPortfolio(defaultDraft);
                setLastSessionRestored(false);
                setPortfolioData(null);
                setHtmlContent('');
                setWorkspaceMessages([]);
            }
        } else {
            setGuidedStage('done');
            setLastSessionRestored(false);
        }
        setIsHydrating(false);
    }, [id, user, authResolved, navigate, location.pathname]);

    // Map portfolio data properties to local input states upon change
    useEffect(() => {
        if (portfolioData) {
            setEditorName(portfolioData.name || '');
            setEditorRole(portfolioData.role || '');
            setEditorBio(portfolioData.hero_description || portfolioData.about_paragraph_1 || '');
            setEditorEmail(portfolioData.contact_email || '');
            setEditorAccent(portfolioData.color_accent || '#C9A84C');
        }
    }, [portfolioData]);

    const handleDirectUpdate = async (updatedFields: Partial<PortfolioData>) => {
        if (!portfolioData) return;
        const nextData = { ...portfolioData, ...updatedFields };
        setPortfolioData(nextData);

        try {
            const responseInject = await fetchDenganRetry('/api/portfolio/inject', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    data: nextData
                })
            });
            if (responseInject.ok) {
                const updatedHtml = await responseInject.text();
                setHtmlContent(updatedHtml);
                
                // Persist updated
                const activeId = id || projectId || `guest_${Date.now()}`;
                const portfolioName = nextData.name ? `${nextData.name} Portfolio` : 'Workspace Kreatif ✨';
                if (user && db) {
                    const docRef = doc(db, 'portfolios', activeId);
                    await setDoc(docRef, {
                        userId: user.uid,
                        name: portfolioName,
                        htmlContent: updatedHtml,
                        content: nextData,
                        updatedAt: Date.now()
                    }, { merge: true });
                } else {
                    const stored = localStorage.getItem('openfolio_guest_history');
                    let list = [];
                    if (stored) list = JSON.parse(stored);
                    list = list.filter((item: any) => item.id !== activeId);
                    list.unshift({
                        id: activeId,
                        name: portfolioName,
                        htmlContent: updatedHtml,
                        content: nextData,
                        updatedAt: Date.now()
                    });
                    try {
                        localStorage.setItem('openfolio_guest_history', JSON.stringify(list));
                    } catch (e: any) {
                        console.warn("[OpenFolio] History capacity reached, trimming older items...", e);
                        if (list.length > 1) {
                             list = list.slice(0, 1);
                             try { localStorage.setItem('openfolio_guest_history', JSON.stringify(list)); } catch(ee) {}
                        }
                    }
                    window.dispatchEvent(new Event('openfolio_history_change'));
                }
            }
        } catch (e) {
            console.error("Direct update sync failed:", e);
        }
    };


    // Simplified UI transition logic
    const premiumTransition = {
        duration: 0.9,
        ease: [0.16, 1, 0.3, 1] as any
    };

    const containerVariants = {
        hidden: { opacity: 0, y: 15 },
        visible: { 
            opacity: 1, 
            y: 0,
            transition: { ...premiumTransition, staggerChildren: 0.12 }
        },
        exit: { 
            opacity: 0, 
            y: -15, 
            transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] as any } 
        }
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 10 },
        visible: { opacity: 1, y: 0, transition: premiumTransition }
    };

    const getLocalFallback = (structuredData: any) => {
        const name = structuredData.fullName || "";
        const role = structuredData.role || "";
        const bio = structuredData.bio || "";
        
        return {
            name,
            role,
            hero_greeting: "Halo, Saya",
            hero_badge_text: "Tersedia untuk Kolaborasi",
            hero_description: bio,
            hero_image_url: structuredData.profilePhoto || null,
            logo_first: name.split(' ')[0] || "Port",
            logo_last: name.split(' ').slice(1).join(' ') || "Folio",
            social_instagram_url: (structuredData.socials?.instagram && structuredData.socials?.instagram !== "#") ? structuredData.socials.instagram : "",
            social_linkedin_url: (structuredData.socials?.linkedin && structuredData.socials?.linkedin !== "#") ? structuredData.socials.linkedin : "",
            about_subtitle: "Filosofi Kreatif & Karir",
            about_paragraph_1: bio,
            about_paragraph_2: "",
            contact_email: structuredData.contacts?.email || "",
            stats: [],
            skills: [
                {
                    "title": "Skill Spesifik",
                    "items": structuredData.skills ? (Array.isArray(structuredData.skills) ? structuredData.skills : (typeof structuredData.skills === 'string' ? structuredData.skills.split(',') : ["Desain Interaksi", "Sistem Web Modern"])) : ["Desain Interaksi", "Sistem Web Modern"]
                }
            ],
            projects: Array.isArray(structuredData.projects) ? structuredData.projects : [],
            career: Array.isArray(structuredData.career) ? structuredData.career.map((c: any) => ({
                period: `${c.yearStart || ""} - ${c.yearEnd || "Sekarang"}`,
                role: c.position || "",
                company: c.company || "",
                description: c.description || ""
            })) : [],
            color_accent: "#C9A84C",
            color_accent_hover: "#B8973E",
            footer_tagline: "Bergerak melampaui batas.",
            footer_year: "2026"
        };
    };

    const callInjectAPI = async (data: any) => {
        try {
            const responseInject = await fetchDenganRetry('/api/portfolio/inject', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ data })
            });
            if (!responseInject.ok) {
                throw new Error(`Inject gagal (${responseInject.status})`);
            }
            const result = await responseInject.text();
            console.log("[OpenFolio] Preview synced via inject API");
            return result;
        } catch (e) {
            console.error(e);
            throw new Error("Gagal render portfolio.");
        }
    };

    const generatePortfolio = async (hist: any[], gid: string | null) => {
        console.log("[OpenFolio] Starting Generation Lifecycle...");
        setGuidedStage('generating');
        setIsGenerating(true);
        setLoadingPct(0);
        
        let generatedData: any = null;
        let injectedHtml = '';

        const sanitizedProjects = structuredProjects.filter(p => 
            p.title.trim() !== '' || 
            p.description.trim() !== '' || 
            p.type.trim() !== '' || 
            p.role.trim() !== '' || 
            p.technologies.trim() !== '' || 
            p.link.trim() !== '' || 
            p.image_url.trim() !== ''
        );

        const sanitizedCareer = careerTimeline.filter(c => 
            c.company.trim() !== '' || 
            c.position.trim() !== '' || 
            c.description.trim() !== '' || 
            c.yearStart.trim() !== '' || 
            c.yearEnd.trim() !== '' ||
            c.type.trim() !== ''
        );

        const sanitizedContacts = Object.fromEntries(
            Object.entries(contactInfo).filter(([_, v]) => v && typeof v === 'string' && v.trim() !== '')
        );

        const structuredData = {
            fullName: heroData.name,
            role: heroData.role,
            profilePhoto: heroData.photo,
            navbar: navbarConfig,
            about: aboutText,
            skills: skillsList.filter(s => s.name?.trim() !== '' || s.description?.trim() !== ''),
            projects: sanitizedProjects,
            career: sanitizedCareer,
            contacts: sanitizedContacts,
            safe_mode: safeMode
        };

        if (remaining(quota, "generate") === 0) {
            showToast("Limit harian tercapai.");
            setIsGenerating(false);
            setGuidedStage('contact');
            return;
        }

        console.log('SANITIZED PAYLOAD', structuredData);

        const updateRealtimePreview = async (currentPct: number, targetData?: any) => {
            const dataSource = targetData || getProgressiveDataForPct(structuredData, currentPct);
            try {
                const html = await callInjectAPI(dataSource);
                setHtmlContent(html);
                console.log(`[OpenFolio] Preview synced at ${currentPct}%`);
            } catch (err) {
                console.warn("[OpenFolio] Progressive render slip:", err);
            }
        };

        // UI Loading Pacer with Instant Fast-Forward capabilities
        let progressInterval: NodeJS.Timeout;
        let fastForwardPacer: () => void = () => {};
        const pacerPromise = new Promise<void>((resolve) => {
            let currentPct = 0;
            progressInterval = setInterval(() => {
                currentPct += 2;
                if (currentPct > 95) {
                    currentPct = 95;
                }
                setLoadingPct(currentPct);
                
                if (currentPct === 24 || currentPct === 50 || currentPct === 76) {
                    updateRealtimePreview(currentPct);
                }
            }, 80);

            fastForwardPacer = () => {
                clearInterval(progressInterval);
                setLoadingPct(100);
                resolve();
            };
        });

        try {
            // Step 1: AI Generation (Heavy Lift)
            console.log("[OpenFolio] Requesting AI Identity Synthesis...");
            const responseGen = await fetchDenganRetry('/api/gemini/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ messages: workspaceMessages, structuredData })
            });

            const contentTypeGen = responseGen.headers.get("content-type");
            if (responseGen.status === 502 || responseGen.status === 503 || responseGen.status === 504) {
                throw new Error("Server sedang melakukan restart atau perbaikan. Mohon tunggu beberapa saat.");
            }
            if (contentTypeGen && contentTypeGen.includes("text/html")) {
                throw new Error(`Server sedang restart (${responseGen.status}). Silakan coba klik tombol Build lagi dalam beberapa detik.`);
            }
            
            if (!responseGen.ok) {
                const errData = await responseGen.json().catch(() => ({}));
                throw new Error(errData.error || "Gagal membangun arsitektur portfolio.");
            }
            
            generatedData = await responseGen.json();
            generatedData.navbar = structuredData.navbar;
            console.log("[OpenFolio] AI Synthesis Complete.");

            // Step 2: Final Injection
            injectedHtml = await callInjectAPI(generatedData);
            console.log("[OpenFolio] Final Code Injection Complete.");

            // Accelerate progress and finish transition
            fastForwardPacer();
            await pacerPromise;

            // Step 3: Finalize Persistence
            // Build finalMessages once and use the same array for persist & state (finding #16).
            const finalMessages = [
                ...workspaceMessages,
                {
                    role: 'assistant',
                    content: `✨ Halo **${generatedData.name || onboardingName}**! Portofolio profesional Anda kini telah aktif.

Berikut penataan khusus yang barusan saya lakukan:
1. **Identitas Berbobot**: Arsitektur identitas telah dipoles mencerminkan keprofesionalan Anda di bidang **${generatedData.role || 'Tenaga Ahli'}**.
2. **Karya & Layanan**: Struktur studi kasus disusun untuk pemahaman instan.
3. **Sentuhan Artistik**: Menggunakan palet aksen premium untuk kesan eksklusif.

Sekarang, asisten AI siap melayani instruksi Anda! Silakan ketik perintah perubahan apa saja.`
                }
            ];

            setPortfolioData(generatedData);
            setHtmlContent(injectedHtml);

            const newId = projectId || `guest_${Date.now()}`;
            const portfolioName = generatedData.name ? `${generatedData.name} Portfolio` : `${onboardingName}`;

            if (user && db) {
                const docRef = doc(db, 'portfolios', newId);
                await setDoc(docRef, {
                    userId: user.uid,
                    name: portfolioName,
                    htmlContent: injectedHtml,
                    content: generatedData,
                    messages: finalMessages,
                    updatedAt: Date.now()
                }, { merge: true });
                setQuota(await getQuota()); // server sudah menghitung; refresh tampilan kuota
            } else {
                const stored = localStorage.getItem('openfolio_guest_history');
                let list = [];
                if (stored) list = JSON.parse(stored);
                list = list.filter((item: any) => item.id !== newId);
                list.unshift({
                    id: newId,
                    name: portfolioName,
                    htmlContent: injectedHtml,
                    content: generatedData,
                    messages: finalMessages,
                    updatedAt: Date.now()
                });
                try {
                    localStorage.setItem('openfolio_guest_history', JSON.stringify(list));
                } catch (e: any) {
                    console.warn("[OpenFolio] History capacity reached in generation.", e);
                    if (list.length > 1) {
                         list = list.slice(0, 1);
                         try { localStorage.setItem('openfolio_guest_history', JSON.stringify(list)); } catch(ee) {}
                    }
                }
                setQuota(await getQuota()); // server sudah menghitung; refresh tampilan kuota
                window.dispatchEvent(new Event('openfolio_history_change'));
            }

            setProjectId(newId);
            setWorkspaceMessages(finalMessages);

            setGuidedStage('done');
            setShowCanvas(true);
            navigate(`/app/${newId}`, { replace: true });
            console.log("[OpenFolio] Generation Lifecycle Finished Successfully.");

        } catch (err: any) {
            console.error("[OpenFolio] CRITICAL GENERATION ERROR:", err);
            alert("Terjadi kesalahan: " + (err.message || "Gagal membangun portfolio."));
            setGuidedStage('contact'); // Fallback to last valid stage
        } finally {
            setIsGenerating(false);
            if (progressInterval!) clearInterval(progressInterval);
        }
    };

    const handleSendRevision = async (text: string) => {
        if (!text.trim() || isEditingPortfolio) return;
        
        const userMsg = { role: 'user', content: text };
        const updatedHistory = [...workspaceMessages, userMsg];
        setWorkspaceMessages(updatedHistory);
        setRevisionInstruction('');
        setIsEditingPortfolio(true);

        try {
            // Step 1: Hit Gemini edit API to update the JSON content
            const res = await fetchDenganRetry('/api/gemini/edit', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    currentData: { ...portfolioData, safe_mode: safeMode },
                    userMessage: text,
                    history: workspaceMessages
                })
            });

            const contentTypeEdit = res.headers.get("content-type");
            if (res.status === 502 || res.status === 503 || res.status === 504) {
                 throw new Error("Server sedang melakukan restart atau perbaikan. Mohon tunggu beberapa saat.");
            }
            if (contentTypeEdit && contentTypeEdit.includes("text/html")) {
                throw new Error(`Server sedang restart (${res.status}). Silakan coba lagi.`);
            }

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.error || "Gagal menerapkan instuksi pada desain.");
            }

            const responseData = await res.json();
            const updatedData = responseData.data;
            if (!updatedData || !updatedData.name) {
                throw new Error("Respon data tidak valid atau terpotong. Perubahan dibatalkan untuk melindungi portofolio Anda.");
            }
            console.log("[EDIT PIPELINE] Parsed successfully on client");
            if ((portfolioData as any)?.navbar) (updatedData as any).navbar = (portfolioData as any).navbar;
            setPortfolioData(updatedData);
            console.log("[EDIT PIPELINE] Portfolio updated");

            // Step 2: Inject modified JSON back into template
            const responseInject = await fetchDenganRetry('/api/portfolio/inject', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    data: updatedData
                })
            });

            if (!responseInject.ok) {
                throw new Error("Gagal menyelaraskan estetika visual kode terbaru.");
            }

            const updatedHtml = await responseInject.text();
            setHtmlContent(updatedHtml);

            // Step 3: Persist modified JSON and HTML
            const activeId = id || projectId || `guest_${Date.now()}`;
            const portfolioName = updatedData.name ? `${updatedData.name} Portfolio` : 'Workspace Kreatif ✨';

            // Append explanation speech from AI assistant
            const finalMessages = [
                ...updatedHistory,
                { role: 'assistant', content: responseData.explanation || "Perubahan visual berhasil diterapkan ke dalam struktur portal." }
            ];
            setWorkspaceMessages(finalMessages);

            if (user && db) {
                const docRef = doc(db, 'portfolios', activeId);
                await setDoc(docRef, {
                    userId: user.uid,
                    name: portfolioName,
                    htmlContent: updatedHtml,
                    content: updatedData,
                    messages: finalMessages,
                    updatedAt: Date.now()
                }, { merge: true });
            } else {
                const stored = localStorage.getItem('openfolio_guest_history');
                let list = [];
                if (stored) list = JSON.parse(stored);
                list = list.filter((item: any) => item.id !== activeId);
                list.unshift({
                    id: activeId,
                    name: portfolioName,
                    htmlContent: updatedHtml,
                    content: updatedData,
                    messages: finalMessages,
                    updatedAt: Date.now()
                });
                try {
                    localStorage.setItem('openfolio_guest_history', JSON.stringify(list));
                } catch (e: any) {
                    console.warn("Storage quota limit reached while saving edit history.", e);
                    if (list.length > 1) {
                        try { localStorage.setItem('openfolio_guest_history', JSON.stringify(list.slice(0, 1))); } catch(e){}
                    }
                }
                window.dispatchEvent(new Event('openfolio_history_change'));
            }

        } catch (e: any) {
            console.error("Revision Error:", e);
            const finalErrMsgs = [
                ...updatedHistory,
                { role: 'assistant', content: e.message === "QUOTA_EXHAUSTED" ? "AI Edit sementara tidak tersedia karena batas penggunaan Gemini telah tercapai." : `⚠️ **Gagal memodifikasi**: ${e.message || 'Kesalahan Server'}.\n\nSilakan coba kalimat instruksi lain secara verbal.` }
            ];
            setWorkspaceMessages(finalErrMsgs);
            
            // Persist error chat history so it survives refresh
            const activeId = id || projectId || `guest_${Date.now()}`;
            try {
                if (user && db) {
                    const docRef = doc(db, 'portfolios', activeId);
                    await updateDoc(docRef, { messages: finalErrMsgs, updatedAt: Date.now() }).catch(() => {});
                } else {
                    const stored = localStorage.getItem('openfolio_guest_history');
                    if (stored) {
                        let list = JSON.parse(stored);
                        list = list.map((item: any) => item.id === activeId ? { ...item, messages: finalErrMsgs, updatedAt: Date.now() } : item);
                        localStorage.setItem('openfolio_guest_history', JSON.stringify(list));
                    }
                }
            } catch (err) {}
        } finally {
            setIsEditingPortfolio(false);
        }
    };

    // Publish flow (Step 5): write the public snapshot via the server endpoint (Task 7).
    // The private draft stays in `portfolios/{docId}` (merge) — only publish goes through the server.
    const handlePublish = async () => {
        if (!portfolioData) {
            showToast("Belum ada data portfolio untuk dipublikasikan.");
            return;
        }
        setIsPublishing(true);
        try {
            const result = await apiFetch<{ url: string }>("/api/portfolio/publish", {
                method: "POST",
                body: JSON.stringify({ data: { ...portfolioData, safe_mode: safeMode }, slug: undefined }),
            });
            showToast("Portfolio berhasil dipublikasikan!");
            navigate(result.url);
        } catch (err: any) {
            console.error("[Publish]", err);
            alert(err.message || "Gagal mempublikasikan portfolio.");
        } finally {
            setIsPublishing(false);
        }
    };

    const photoInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (location.state?.triggerUpload) {
            window.history.replaceState({}, document.title);
        }
    }, [location.state]);

    return (
        <>
            <AppLayout 
            defaultClosed={guidedStage !== 'done'}
            onboardingName={onboardingName}
            onboardingProfession={onboardingProfession}
            guidedStage={guidedStage}
        >
            <div className="flex h-full w-full overflow-hidden flex-col md:flex-row relative">
                <AnimatePresence>
                    {guidedStage !== 'done' && showRestoreToast && (
                        <div className="absolute top-6 left-1/2 -translate-x-1/2 z-[120] pointer-events-none">
                            <motion.div 
                                initial={{ opacity: 0, y: -10 }} 
                                animate={{ opacity: 1, y: 0 }} 
                                exit={{ opacity: 0 }}
                                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[10px] text-emerald-400 font-mono font-medium uppercase tracking-wider backdrop-blur-md shadow-md"
                            >
                                <span>✓</span>
                                <span>Progress berhasil dipulihkan</span>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>
                <input type="file" ref={photoInputRef} className="hidden" accept="image/*" onChange={async (e) => {
                    if (e.target.files?.[0]) {
                        const file = e.target.files[0];
                        if (file.size > 2 * 1024 * 1024) {
                            alert("Ukuran gambar terlalu besar. Maksimal 2 MB.");
                            (e.target as HTMLInputElement).value = '';
                            return;
                        }
                        try {
                                const url = await uploadFile(file);
                                setHeroData(prev => ({ ...prev, photo: url }));
                            setSkippedPhoto(false);
                        } catch (err: any) {
                            console.warn("Error converting profile photo:", err);
                            alert(err.message || "Gagal mengunggah foto. Silakan coba lagi.");
                        }
                    }
                }} />

                <AnimatePresence mode="wait">
                    {uploadingImageCount > 0 && (
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 z-[200] bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center p-8"
                        >
                            <Loader2 className="w-8 h-8 text-white animate-spin mb-4" />
                            <span className="text-white font-mono text-sm tracking-widest uppercase">Mengunggah Gambar...</span>
                        </motion.div>
                    )}
                </AnimatePresence>

                {guidedStage && guidedStage !== 'done' && guidedStage !== 'generating' && (
                    <div className="absolute inset-0 z-40 bg-[#0A0A0B] pointer-events-none">
                        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(67,56,202,0.06),transparent_80%)]" />
                        <div className="noise-overlay" />
                    </div>
                )}

                <AnimatePresence mode="wait">
                    {guidedStage === 'navbar' ? (
                        <motion.div key="navbar" variants={containerVariants} initial="hidden" animate="visible" exit="exit" className="absolute inset-0 z-50 overflow-y-auto no-scrollbar">
                            <div className="min-h-full flex flex-col items-center py-20 px-6 max-sm:px-4">
                                <div className="max-w-xl w-full z-10 flex flex-col items-center text-center space-y-12 m-auto shrink-0">
                                    <motion.div variants={itemVariants} className="space-y-4">
                                    <div className="inline-flex items-center gap-3 px-4 py-1.5 rounded-full bg-white/[0.03] border border-white/[0.08] text-zinc-400 font-medium text-[11px] uppercase tracking-widest backdrop-blur-md shadow-sm">
                                        <LayoutPanelLeft className="w-3 h-3" />
                                        <span>Section 0 — Komposisi Navigasi</span>
                                    </div>
                                    <h2 className="text-4xl md:text-5xl font-medium tracking-tight text-transparent bg-clip-text bg-gradient-to-b from-white to-white/70 leading-tight drop-shadow-sm">Apakah Anda ingin menggunakan navbar pada portfolio?</h2>
                                </motion.div>

                                <motion.div variants={itemVariants} className="flex items-center justify-center p-6 bg-white/[0.02] border border-white/[0.05] rounded-2xl w-full max-w-sm mx-auto">
                                    <div className="flex items-center justify-between w-full">
                                        <span className="text-sm font-medium text-white">Gunakan Navbar?</span>
                                        <button 
                                            onClick={() => setNavbarConfig(prev => ({ ...prev, enabled: !prev.enabled }))}
                                            className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${navbarConfig.enabled ? 'bg-indigo-500' : 'bg-zinc-700'}`}
                                        >
                                            <span className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${navbarConfig.enabled ? 'translate-x-7' : 'translate-x-1'}`} />
                                        </button>
                                    </div>
                                </motion.div>

                                {navbarConfig.enabled && (
                                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="w-full max-w-lg mx-auto space-y-4">
                                        <p className="text-xs text-zinc-500 uppercase tracking-[0.2em] font-bold mb-4">Konfigurasi Item</p>
                                        <div className="flex flex-col space-y-3">
                                            {['Nama', 'Tentang', 'Karier', 'Proyek', 'Skill', 'Kontak'].map((item) => (
                                                <div key={item} className="flex flex-col p-4 bg-white/[0.01] border border-white/[0.05] rounded-xl group hover:border-white/10 transition-all">
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-sm font-medium text-zinc-300 group-hover:text-white transition-colors">{item}</span>
                                                        <button 
                                                            onClick={() => setNavbarConfig(prev => ({
                                                                ...prev,
                                                                items: prev.items.includes(item) ? prev.items.filter(i => i !== item) : [...prev.items, item]
                                                            }))}
                                                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${navbarConfig.items.includes(item) ? 'bg-indigo-500' : 'bg-zinc-700'}`}
                                                        >
                                                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${navbarConfig.items.includes(item) ? 'translate-x-6' : 'translate-x-1'}`} />
                                                        </button>
                                                    </div>
                                                    {item === 'Nama' && navbarConfig.items.includes('Nama') && (
                                                        <div className="mt-4 pt-4 border-t border-white/5 animate-reveal">
                                                            <div className="flex items-center justify-between mb-2">
                                                                <label className="text-[10px] uppercase font-bold tracking-widest text-zinc-500">Nama Navbar</label>
                                                                <span className={`text-[10px] ${(navbarConfig.name_text || '').trim().length > 9 ? 'text-red-400' : 'text-zinc-500'}`}>
                                                                    {(navbarConfig.name_text || '').trim().length}/9
                                                                </span>
                                                            </div>
                                                            <input 
                                                                type="text" 
                                                                value={navbarConfig.name_text || ''}
                                                                onChange={(e) => {
                                                                    const val = e.target.value;
                                                                    if (val.trim().length <= 9 || (val.length < (navbarConfig.name_text || '').length)) {
                                                                        setNavbarConfig(prev => ({ ...prev, name_text: val }));
                                                                    }
                                                                }}
                                                                placeholder="Nama Navbar (max 9 karakter)"
                                                                className="w-full bg-black/20 border border-white/10 rounded-lg py-2 px-3 text-sm text-white outline-none focus:border-indigo-500 transition-colors"
                                                            />
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </motion.div>
                                )}

                                <motion.div variants={itemVariants}>
                                    <button 
                                        onClick={() => setGuidedStage('hero')}
                                        className="w-16 h-16 bg-white text-black rounded-full flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-[0_0_40px_rgba(255,255,255,0.1)]"
                                    >
                                        <ArrowRight className="w-6 h-6" />
                                    </button>
                                </motion.div>
                                </div>
                            </div>
                        </motion.div>
                    ) : guidedStage === 'hero' ? (
                        <motion.div key="hero" variants={containerVariants} initial="hidden" animate="visible" exit="exit" className="absolute inset-0 z-50 flex flex-col items-center justify-center p-8 overflow-y-auto no-scrollbar">
                            <div className="max-w-2xl w-full z-10 space-y-12">
                                <motion.div variants={itemVariants} className="space-y-4 text-center">
                                    <div className="inline-flex items-center gap-3 px-4 py-1.5 rounded-full bg-white/[0.03] border border-white/[0.08] text-zinc-400 font-medium text-[11px] uppercase tracking-widest backdrop-blur-md shadow-sm">
                                        <UserIcon className="w-3 h-3" />
                                        <span>Section 1 — Identitas Utama</span>
                                    </div>
                                    <h2 className="text-4xl md:text-5xl font-medium tracking-tight text-transparent bg-clip-text bg-gradient-to-b from-white to-white/70 leading-tight drop-shadow-sm">Siapa Anda, dan Apa Peran Anda?</h2>
                                </motion.div>

                                <motion.div variants={itemVariants} className="space-y-8">
                                    <div className="flex flex-col md:flex-row items-center gap-8 bg-white/[0.02] backdrop-blur-md border border-white/[0.05] p-8 md:p-10 rounded-2xl overflow-hidden shadow-xl shadow-black/10 relative">
                                        <div className="relative group shrink-0">
                                            <input 
                                                type="file" 
                                                id="hero-photo"
                                                className="hidden" 
                                                accept="image/*" 
                                                onChange={async (e) => {
                                                    const file = e.target.files?.[0];
                                                    if (file) {
                                                        if (file.size > 2 * 1024 * 1024) {
                                                            alert("Ukuran gambar terlalu besar. Maksimal 2 MB.");
                                                            (e.target as HTMLInputElement).value = '';
                                                            return;
                                                        }
                                                        try {
                                                            const url = await uploadFile(file);
                                                            setHeroData(prev => ({ ...prev, photo: url }));
                                                        } catch (error) {
                                                            console.warn("Upload failed", error);
                                                            alert("Gagal mengunggah foto. Silakan coba lagi.");
                                                        }
                                                    }
                                                }}
                                            />
                                            <label htmlFor="hero-photo" className="w-32 h-32 rounded-full border-2 border-dashed border-white/10 flex flex-col items-center justify-center overflow-hidden cursor-pointer hover:border-white/30 transition-all relative group">
                                                {heroData.photo ? (
                                                    <img src={heroData.photo} className="w-full h-full object-cover" alt="Profile Preview" />
                                                ) : (
                                                    <div className="flex flex-col items-center text-zinc-600 group-hover:text-zinc-400">
                                                        <Upload className="w-6 h-6 mb-1" />
                                                        <span className="text-[10px] font-bold uppercase tracking-wider">Foto</span>
                                                    </div>
                                                )}
                                                {heroData.photo && (
                                                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                                        <Edit3 className="w-6 h-6 text-white" />
                                                    </div>
                                                )}
                                            </label>
                                            <div className="absolute -bottom-7 left-1/2 -translate-x-1/2 w-max text-center pointer-events-none">
                                                <span className="text-[10px] text-zinc-500 font-medium tracking-wide">Format JPG, PNG • Maks. 2 MB</span>
                                            </div>
                                            {heroData.photo && (
                                                <button onClick={() => setHeroData(prev => ({ ...prev, photo: '' }))} className="absolute -top-1 -right-1 bg-red-500 text-white p-1 rounded-full hover:bg-red-600 transition-colors">
                                                    <X className="w-3 h-3" />
                                                </button>
                                            )}
                                        </div>
                                        <div className="flex-1 space-y-6 w-full">
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-600">Nama Lengkap</label>
                                                <input 
                                                    type="text" 
                                                    value={heroData.name}
                                                    onChange={e => setHeroData(prev => ({ ...prev, name: e.target.value }))}
                                                    placeholder="Contoh: Wira Mahendra"
                                                    className="w-full bg-transparent border-b border-white/10 py-3 text-2xl text-white outline-none focus:border-white transition-colors"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-600">Pekerjaan / Spesialisasi</label>
                                                <input 
                                                    type="text" 
                                                    value={heroData.role}
                                                    onChange={e => setHeroData(prev => ({ ...prev, role: e.target.value }))}
                                                    placeholder="Contoh: UX Engineer & Frontend Developer"
                                                    className="w-full bg-transparent border-b border-white/10 py-3 text-2xl text-white outline-none focus:border-white transition-colors"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>

                                <motion.div variants={itemVariants} className="flex items-center justify-center gap-8 pt-8">
                                    <button onClick={() => setGuidedStage('navbar')} className="text-zinc-500 hover:text-zinc-300 text-xs font-bold tracking-[0.2em] uppercase transition-colors">{lang === 'id' ? 'Kembali' : 'Back'}</button>
                                    <button 
                                        onClick={() => heroData.name && heroData.role && setGuidedStage('about')}
                                        disabled={!heroData.name || !heroData.role}
                                        className="w-16 h-16 bg-white text-black rounded-full flex items-center justify-center disabled:opacity-20 hover:scale-105 active:scale-95 transition-all"
                                    >
                                        <ArrowRight className="w-6 h-6" />
                                    </button>
                                </motion.div>
                            </div>
                         </motion.div>
                    ) : guidedStage === 'about' ? (
                        <motion.div key="about" variants={containerVariants} initial="hidden" animate="visible" exit="exit" className="absolute inset-0 z-50 flex flex-col items-center justify-center p-8 overflow-y-auto no-scrollbar">
                            <div className="max-w-2xl w-full z-10 space-y-12">
                                <motion.div variants={itemVariants} className="space-y-4 text-center">
                                    <div className="inline-flex items-center gap-3 px-4 py-1.5 rounded-full bg-white/[0.03] border border-white/[0.08] text-zinc-400 font-medium text-[11px] uppercase tracking-widest backdrop-blur-md shadow-sm">
                                        <FileText className="w-3 h-3" />
                                        <span>Section 2 — Tentang</span>
                                    </div>
                                    <h2 className="text-4xl md:text-5xl font-medium tracking-tight text-transparent bg-clip-text bg-gradient-to-b from-white to-white/70 leading-tight drop-shadow-sm">Ceritakan sedikit tentang Anda.</h2>
                                    <p className="text-zinc-500 text-base max-w-lg mx-auto">Tuliskan cara Anda bekerja, filosofi singkat, atau apa yang membuat Anda bersemangat.</p>
                                </motion.div>

                                <motion.div variants={itemVariants} className="relative">
                                    <textarea 
                                        value={aboutText}
                                        onChange={e => setAboutText(e.target.value)}
                                        placeholder="Saya adalah seseorang yang sangat memperhatikan detail visual..."
                                        className="w-full bg-white/[0.02] backdrop-blur-md shadow-xl shadow-black/10 border border-white/[0.05] rounded-2xl p-8 md:p-10 text-xl text-white outline-none focus:border-white/20 focus:bg-white/[0.03] transition-all min-h-[220px] resize-none leading-relaxed placeholder-zinc-700 relative z-10"
                                    />
                                    <div className="mt-4 flex items-center gap-2 text-[10px] uppercase font-bold tracking-widest text-zinc-600">
                                        
                                        <span>AI akan membantu menyempurnakan tulisan Anda nanti.</span>
                                    </div>
                                </motion.div>

                                <motion.div variants={itemVariants} className="flex items-center justify-center gap-8 pt-8">
                                    <button onClick={() => setGuidedStage('hero')} className="text-zinc-500 hover:text-zinc-300 text-xs font-bold tracking-[0.2em] uppercase transition-colors">{lang === 'id' ? 'Kembali' : 'Back'}</button>
                                    <button 
                                        onClick={() => setGuidedStage('skills')}
                                        className="w-16 h-16 bg-white text-black rounded-full flex items-center justify-center hover:scale-105 active:scale-95 transition-all"
                                    >
                                        <ArrowRight className="w-6 h-6" />
                                    </button>
                                </motion.div>
                            </div>
                        </motion.div>
                    ) : guidedStage === 'skills' ? (
                        <motion.div key="skills" variants={containerVariants} initial="hidden" animate="visible" exit="exit" className="absolute inset-0 z-50 flex flex-col items-center justify-start p-8 md:p-20 overflow-y-auto no-scrollbar">
                            <div className="max-w-4xl w-full z-10 space-y-16">
                                <motion.div variants={itemVariants} className="space-y-4 text-center">
                                    <div className="inline-flex items-center gap-3 px-4 py-1.5 rounded-full bg-white/[0.03] border border-white/[0.08] text-zinc-400 font-medium text-[11px] uppercase tracking-widest backdrop-blur-md shadow-sm">
                                        <Code className="w-3 h-3" />
                                        <span>Section 3 — Skill</span>
                                    </div>
                                    <h2 className="text-4xl md:text-5xl font-medium tracking-tight text-transparent bg-clip-text bg-gradient-to-b from-white to-white/70 leading-tight drop-shadow-sm">Apa yang bisa Anda lakukan?</h2>
                                    <p className="text-zinc-500">Tambahkan skill teknis atau kreatif yang ingin Anda tonjolkan.</p>
                                </motion.div>

                                <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {skillsList.map(skill => (
                                        <div key={skill.id} className="bg-white/[0.02] backdrop-blur-md shadow-xl shadow-black/10 border border-white/[0.05] rounded-2xl p-8 group hover:border-white/10 hover:bg-white/[0.03] transition-all relative overflow-hidden">
                                            <button 
                                                onClick={() => setSkillsList(prev => prev.filter(s => s.id !== skill.id))}
                                                className="absolute top-4 right-4 text-zinc-600 hover:text-red-400 p-2 transition-colors z-10"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                            <input 
                                                type="text" 
                                                value={skill.name}
                                                onChange={e => setSkillsList(prev => prev.map(s => s.id === skill.id ? { ...s, name: e.target.value } : s))}
                                                placeholder="Contoh: UI/UX Design"
                                                className="bg-transparent border-none text-xl font-medium text-white p-0 focus:ring-0 w-full mb-2 outline-none placeholder-zinc-700"
                                            />
                                            <textarea 
                                                value={skill.description}
                                                onChange={e => setSkillsList(prev => prev.map(s => s.id === skill.id ? { ...s, description: e.target.value } : s))}
                                                placeholder="Contoh: Mendesain antarmuka modern dengan fokus pengalaman pengguna."
                                                className="bg-transparent border-none text-sm text-zinc-400 p-0 focus:ring-0 w-full resize-none min-h-[60px] outline-none placeholder-zinc-700"
                                            />
                                        </div>
                                    ))}
                                    <button 
                                        onClick={() => setSkillsList(prev => [...prev, { id: Math.random().toString(), name: '', description: '' }])}
                                        className="relative group w-full border border-dashed border-white/20 bg-white/[0.02] hover:bg-white/[0.05] rounded-2xl p-8 flex flex-col items-center justify-center text-zinc-400 hover:text-white hover:border-white/40 transition-all shadow-sm overflow-hidden"
                                    >
                                        <div className="absolute inset-0 bg-gradient-to-b from-white/[0.01] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                        <Plus className="w-8 h-8 mb-4 text-zinc-500 group-hover:text-white transition-colors relative z-10" />
                                        {skillsList.length === 0 ? (
                                            <div className="flex flex-col items-center relative z-10">
                                                <span className="text-sm font-bold uppercase tracking-widest text-zinc-300 mb-4">Tambah Skill Utama</span>
                                                <div className="flex gap-2 flex-wrap justify-center opacity-60">
                                                    <span className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-[10px] uppercase font-bold tracking-wider text-zinc-400">Contoh: UI Design</span>
                                                    <span className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-[10px] uppercase font-bold tracking-wider text-zinc-400">Frontend Dev</span>
                                                    <span className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-[10px] uppercase font-bold tracking-wider text-zinc-400">Content Strategy</span>
                                                </div>
                                            </div>
                                        ) : (
                                            <span className="text-sm font-bold uppercase tracking-widest text-zinc-300 relative z-10">Tambah Skill</span>
                                        )}
                                    </button>
                                </motion.div>

                                <motion.div variants={itemVariants} className="flex items-center justify-center gap-8 py-8">
                                    <button onClick={() => setGuidedStage('about')} className="text-zinc-500 hover:text-zinc-300 text-xs font-bold tracking-[0.2em] uppercase transition-colors">{lang === 'id' ? 'Kembali' : 'Back'}</button>
                                    <button 
                                        onClick={() => setGuidedStage('projects')}
                                        className="w-16 h-16 bg-white text-black rounded-full flex items-center justify-center hover:scale-105 active:scale-95 transition-all"
                                    >
                                        <ArrowRight className="w-6 h-6" />
                                    </button>
                                </motion.div>
                            </div>
                        </motion.div>
                    ) : guidedStage === 'projects' ? (
                        <motion.div key="projects" variants={containerVariants} initial="hidden" animate="visible" exit="exit" className="absolute inset-0 z-50 flex flex-col items-center justify-start p-8 md:p-20 overflow-y-auto no-scrollbar">
                            <div className="max-w-5xl w-full z-10 space-y-16">
                                <motion.div variants={itemVariants} className="space-y-4 text-center">
                                    <div className="inline-flex items-center gap-3 px-4 py-1.5 rounded-full bg-white/[0.03] border border-white/[0.08] text-zinc-400 font-medium text-[11px] uppercase tracking-widest backdrop-blur-md shadow-sm">
                                        <Eye className="w-3 h-3" />
                                        <span>Section 4 — Arsitektur Proyek</span>
                                    </div>
                                    <h2 className="text-4xl md:text-5xl font-medium tracking-tight text-transparent bg-clip-text bg-gradient-to-b from-white to-white/70 leading-tight drop-shadow-sm">Apa saja mahakarya Anda?</h2>
                                    <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 flex gap-4 items-center max-w-2xl mx-auto text-left">
                                        <AlertTriangle className="w-6 h-6 text-amber-500 shrink-0" />
                                        <div>
                                            <p className="text-xs font-bold text-amber-500 uppercase tracking-widest mb-1">Panduan Rasio Gambar</p>
                                            <p className="text-xs text-amber-500/80 leading-relaxed">Rekomendasi rasio: <span className="inline-block bg-amber-500/20 text-amber-500 font-mono px-1.5 py-0.5 mx-0.5 rounded text-[10px] font-bold">16:10</span> agar gambar tidak terpotong. Pastikan elemen penting berada di pusat (safe area) visual.</p>
                                        </div>
                                    </div>
                                </motion.div>

                                <motion.div variants={itemVariants} className="space-y-12">
                                    {structuredProjects.map((proj, index) => (
                                        <div key={proj.id} className="relative group bg-white/[0.02] backdrop-blur-md shadow-xl shadow-black/10 border border-white/[0.05] rounded-2xl p-8 md:p-12 transition-all hover:bg-white/[0.03] hover:border-white/10 overflow-hidden">
                                            <button onClick={() => setStructuredProjects(prev => prev.filter(p => p.id !== proj.id))} className="absolute top-8 right-8 text-zinc-600 hover:text-red-400 p-2 transition-colors z-10 hover:bg-red-500/10 rounded-full"><X className="w-5 h-5" /></button>
                                            <div className="flex flex-col lg:flex-row gap-12 relative z-10">
                                                <div className="w-full lg:w-2/5 space-y-6">
                                                   <div className="relative aspect-[16/10] bg-white/[0.02] rounded-2xl overflow-hidden border border-white/10 group-hover:border-white/20 transition-all flex flex-col items-center justify-center">
                                                        {proj.image_url ? (
                                                            <img src={proj.image_url} alt="Project" className={`w-full h-full ${proj.crop_strategy === 'contain' ? 'object-contain' : 'object-cover'}`} />
                                                        ) : (
                                                            <div className="flex flex-col items-center justify-center p-6 text-center">
                                                                <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mb-4">
                                                                    <UploadCloud className="w-8 h-8 text-zinc-400 group-hover:text-white transition-colors" />
                                                                </div>
                                                                <span className="text-sm font-semibold text-zinc-300 mb-1">Upload Thumbnail Proyek</span>
                                                                <span className="text-xs text-zinc-500">Klik area ini untuk memilih gambar</span>
                                                                <span className="text-[10px] text-zinc-600 mt-3 font-medium tracking-wide">Format JPG, PNG • Maks. 2 MB</span>
                                                            </div>
                                                        )}
                                                        <label className="absolute inset-0 cursor-pointer flex flex-col items-center justify-center opacity-0 hover:opacity-100 bg-black/60 backdrop-blur-sm transition-opacity">
                                                            <input type="file" className="hidden" accept="image/*" onChange={async (e) => {
                                                                const file = e.target.files?.[0];
                                                                if (file) {
                                                                    if (file.size > 2 * 1024 * 1024) {
                                                                        alert("Ukuran gambar terlalu besar. Maksimal 2 MB.");
                                                                        (e.target as HTMLInputElement).value = '';
                                                                        return;
                                                                    }
                                                                    try {
                                                                        const url = await uploadFile(file);
                                                                        setStructuredProjects(prev => prev.map(p => p.id === proj.id ? { ...p, image_url: url } : p));
                                                                    } catch (error) {
                                                                        console.warn("Upload failed", error);
                                                                        alert("Gagal mengunggah foto proyek. Silakan coba lagi.");
                                                                    }
                                                                }
                                                            }} />
                                                            <Upload className="w-6 h-6 text-white mb-2" />
                                                            <span className="text-[10px] font-bold uppercase tracking-widest text-white">Ganti Gambar</span>
                                                        </label>
                                                        {proj.image_url && (
                                                            <div className="absolute bottom-4 left-4 right-4 flex justify-between gap-2">
                                                                <button 
                                                                    onClick={() => setStructuredProjects(prev => prev.map(p => p.id === proj.id ? { ...p, crop_strategy: p.crop_strategy === 'cover' ? 'contain' : 'cover' } : p))}
                                                                    className="bg-black/80 hover:bg-black px-4 py-2 rounded-xl text-white text-[9px] font-bold uppercase tracking-widest border border-white/10 transition-colors"
                                                                >
                                                                    Mode: {proj.crop_strategy === 'cover' ? 'Cinematic' : 'Safe Area'}
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="flex-1 space-y-8">
                                                    <div className="space-y-4">
                                                        <input type="text" value={proj.title} onChange={(e) => setStructuredProjects(prev => prev.map(p => p.id === proj.id ? { ...p, title: e.target.value } : p))} placeholder="Nama Proyek — Misal: Nexa OS" className="w-full bg-transparent border-b border-white/10 py-2 text-3xl font-medium text-white placeholder-zinc-800 outline-none focus:border-white transition-colors" />
                                                        <textarea value={proj.description} onChange={(e) => setStructuredProjects(prev => prev.map(p => p.id === proj.id ? { ...p, description: e.target.value } : p))} placeholder="Ceritakan tentang project ini secara ringkas..." className="w-full bg-transparent border-b border-white/10 py-2 text-base text-zinc-400 placeholder-zinc-800 outline-none resize-none transition-colors min-h-[80px]" />
                                                    </div>
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                        <input type="text" value={proj.technologies} onChange={(e) => setStructuredProjects(prev => prev.map(p => p.id === proj.id ? { ...p, technologies: e.target.value } : p))} placeholder="Stack — Misal: React, Figma, AI" className="w-full bg-white/[0.02] border border-white/[0.05] rounded-xl px-4 py-3 text-sm text-zinc-300 placeholder-zinc-700 outline-none focus:border-white/20 transition-all" />
                                                        <input type="text" value={proj.link} onChange={(e) => setStructuredProjects(prev => prev.map(p => p.id === proj.id ? { ...p, link: e.target.value } : p))} placeholder="Link Live / Case Study" className="w-full bg-white/[0.02] border border-white/[0.05] rounded-xl px-4 py-3 text-sm text-zinc-300 placeholder-zinc-700 outline-none focus:border-white/20 transition-all" />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    <button 
                                        onClick={() => setStructuredProjects(prev => [...prev, { id: Math.random().toString(), title: '', description: '', type: '', role: '', technologies: '', link: '', image_url: '', crop_strategy: 'cover' }])}
                                        className="relative group w-full border border-dashed border-white/20 hover:bg-white/[0.05] bg-white/[0.02] rounded-2xl py-16 flex flex-col items-center justify-center text-zinc-400 hover:text-white transition-all shadow-sm overflow-hidden"
                                    >
                                        <div className="absolute inset-0 bg-gradient-to-b from-white/[0.01] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                        <Plus className="w-10 h-10 mb-4 text-zinc-500 group-hover:text-white transition-colors relative z-10" />
                                        {structuredProjects.length === 0 ? (
                                            <div className="flex flex-col items-center relative z-10 w-full px-8">
                                                <span className="text-sm font-bold uppercase tracking-[0.3em] mb-4 text-zinc-300">Tambah Proyek Pertama</span>
                                                <div className="flex gap-2 flex-wrap justify-center opacity-60">
                                                    <span className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-[10px] uppercase font-bold tracking-wider text-zinc-400">Website E-Commerce</span>
                                                    <span className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-[10px] uppercase font-bold tracking-wider text-zinc-400">Company Profile</span>
                                                    <span className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-[10px] uppercase font-bold tracking-wider text-zinc-400">Mobile App Design</span>
                                                </div>
                                            </div>
                                        ) : (
                                            <span className="text-sm font-bold uppercase tracking-[0.3em] relative z-10 text-zinc-300">Tambah Proyek Baru</span>
                                        )}
                                    </button>
                                </motion.div>

                                <motion.div variants={itemVariants} className="flex items-center justify-center gap-8 py-8">
                                    <button onClick={() => setGuidedStage('skills')} className="text-zinc-500 hover:text-zinc-300 text-xs font-bold tracking-[0.2em] uppercase transition-colors">{lang === 'id' ? 'Kembali' : 'Back'}</button>
                                    <button 
                                        onClick={() => setGuidedStage('career')}
                                        className="w-16 h-16 bg-white text-black rounded-full flex items-center justify-center hover:scale-105 active:scale-95 transition-all"
                                    >
                                        <ArrowRight className="w-6 h-6" />
                                    </button>
                                </motion.div>
                            </div>
                        </motion.div>
                    ) : guidedStage === 'career' ? (
                        <motion.div key="career" variants={containerVariants} initial="hidden" animate="visible" exit="exit" className="absolute inset-0 z-50 flex flex-col items-center justify-start p-8 md:p-20 overflow-y-auto no-scrollbar">
                            <div className="max-w-4xl w-full z-10 space-y-16">
                                <motion.div variants={itemVariants} className="space-y-4 text-center">
                                    <div className="inline-flex items-center gap-3 px-4 py-1.5 rounded-full bg-white/[0.03] border border-white/[0.08] text-zinc-400 font-medium text-[11px] uppercase tracking-widest backdrop-blur-md shadow-sm">
                                        <Briefcase className="w-3 h-3" />
                                        <span>Section 5 — Riwayat Karier</span>
                                    </div>
                                    <h2 className="text-4xl md:text-5xl font-medium tracking-tight text-transparent bg-clip-text bg-gradient-to-b from-white to-white/70 leading-tight drop-shadow-sm">Jalinan perjalanan profesi Anda.</h2>
                                    <p className="text-zinc-500">Bangun timeline pengalaman kerja Anda dengan rapi.</p>
                                </motion.div>

                                <motion.div variants={itemVariants} className="space-y-6 relative z-50">
                                    {careerTimeline.map((item, i) => (
                                        <div key={item.id} style={{ zIndex: 100 - i }} className="relative group bg-white/[0.02] backdrop-blur-md shadow-xl shadow-black/10 border border-white/[0.05] rounded-2xl p-8 md:p-10 transition-all hover:bg-white/[0.03] hover:border-white/10">
                                            <button onClick={() => setCareerTimeline(prev => prev.filter(i => i.id !== item.id))} className="absolute top-8 right-8 text-zinc-600 hover:text-red-400 transition-colors z-10 hover:bg-red-500/10 rounded-full p-1"><X className="w-5 h-5" /></button>
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative z-10">
                                                <div className="space-y-4">
                                                    <div className="flex flex-col gap-4">
                                                        <div className="flex-1">
                                                            <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-600 block mb-2">Mulai</label>
                                                            <CareerPeriodInput type="mulai" value={item.yearStart} onChange={val => setCareerTimeline(prev => prev.map(i => i.id === item.id ? { ...i, yearStart: val } : i))} />
                                                        </div>
                                                        <div className="flex-1">
                                                            <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-600 block mb-2">Selesai</label>
                                                            <CareerPeriodInput type="selesai" value={item.yearEnd} onChange={val => setCareerTimeline(prev => prev.map(i => i.id === item.id ? { ...i, yearEnd: val } : i))} />
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-600 block mb-2">Tipe</label>
                                                        <CustomDropdown value={item.type} onChange={val => setCareerTimeline(prev => prev.map(i => i.id === item.id ? { ...i, type: val } : i))} options={[{label: "Full-time", value: "full-time"}, {label: "Part-time", value: "part-time"}, {label: "Contract", value: "contract"}, {label: "Freelance", value: "freelance"}, {label: "Internship", value: "internship"}, {label: "Remote", value: "remote"}]} placeholder="Pilih Tipe" />
                                                    </div>
                                                </div>
                                                <div className="md:col-span-2 space-y-6">
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                        <div>
                                                            <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-600 block mb-2">Instansi / Perusahaan</label>
                                                            <input type="text" value={item.company} onChange={e => setCareerTimeline(prev => prev.map(i => i.id === item.id ? { ...i, company: e.target.value } : i))} placeholder="Google / Studio Kreatif" className="w-full bg-transparent border-b border-white/10 py-1 text-xl text-white outline-none focus:border-white transition-all" />
                                                        </div>
                                                        <div>
                                                            <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-600 block mb-2">Posisi</label>
                                                            <input type="text" value={item.position} onChange={e => setCareerTimeline(prev => prev.map(i => i.id === item.id ? { ...i, position: e.target.value } : i))} placeholder="Lead Designer" className="w-full bg-transparent border-b border-white/10 py-1 text-xl text-white outline-none focus:border-white transition-all" />
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-600 block mb-2">Keterangan Pekerjaan</label>
                                                        <textarea value={item.description} onChange={e => setCareerTimeline(prev => prev.map(i => i.id === item.id ? { ...i, description: e.target.value } : i))} placeholder="Menjabarkan kontribusi utama Anda..." className="w-full bg-transparent border-b border-white/10 py-1 text-sm text-zinc-400 outline-none resize-none min-h-[60px]" />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    <button 
                                        onClick={() => setCareerTimeline(prev => [...prev, { id: Math.random().toString(), yearStart: '', yearEnd: '', company: '', position: '', type: 'full-time', description: '' }])}
                                        className="relative group w-full border border-dashed border-white/20 bg-white/[0.02] hover:bg-white/[0.05] rounded-2xl py-12 flex flex-col items-center justify-center gap-4 text-zinc-400 hover:text-white hover:border-white/40 transition-all shadow-sm overflow-hidden"
                                    >
                                        <div className="absolute inset-0 bg-gradient-to-b from-white/[0.01] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                        <Plus className="w-8 h-8 text-zinc-500 group-hover:text-white transition-colors relative z-10" />
                                        {careerTimeline.length === 0 ? (
                                            <div className="flex flex-col items-center relative z-10 w-full px-8">
                                                <span className="text-sm font-bold uppercase tracking-[0.2em] mb-4 text-zinc-300">Tambah Riwayat Karier</span>
                                                <div className="flex gap-2 flex-wrap justify-center opacity-60">
                                                    <span className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-[10px] uppercase font-bold tracking-wider text-zinc-400">Contoh: Frontend Developer</span>
                                                    <span className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-[10px] uppercase font-bold tracking-wider text-zinc-400">UI Designer di Agency</span>
                                                    <span className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-[10px] uppercase font-bold tracking-wider text-zinc-400">Product Manager</span>
                                                </div>
                                            </div>
                                        ) : (
                                            <span className="text-xs font-bold uppercase tracking-[0.2em] relative z-10 text-zinc-300">Tambah Baris Karier</span>
                                        )}
                                    </button>
                                </motion.div>

                                <motion.div variants={itemVariants} className="flex items-center justify-center gap-8 py-8">
                                    <button onClick={() => setGuidedStage('projects')} className="text-zinc-500 hover:text-zinc-300 text-xs font-bold tracking-[0.2em] uppercase transition-colors">{lang === 'id' ? 'Kembali' : 'Back'}</button>
                                    <button 
                                        onClick={() => setGuidedStage('contact')}
                                        className="w-16 h-16 bg-white text-black rounded-full flex items-center justify-center hover:scale-105 active:scale-95 transition-all"
                                    >
                                        <ArrowRight className="w-6 h-6" />
                                    </button>
                                </motion.div>
                            </div>
                        </motion.div>
                    ) : guidedStage === 'contact' ? (
                        <motion.div key="contact" variants={containerVariants} initial="hidden" animate="visible" exit="exit" className="absolute inset-0 z-50 flex flex-col items-center justify-center p-6 md:p-12 overflow-y-auto no-scrollbar select-none">
                            <div className="max-w-2xl w-full z-10 flex flex-col items-center text-center space-y-10 my-auto py-10">
                                <motion.div variants={itemVariants} className="space-y-4">
                                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.03] border border-white/[0.08] text-zinc-400 backdrop-blur-md mx-auto shadow-sm">
                                        <div className="w-1 h-1 rounded-full bg-indigo-500 animate-pulse"></div>
                                        <span className="text-[10px] font-bold uppercase tracking-[0.2em]">{lang === 'id' ? 'Sentuhan Akhir' : 'Final Touch'}</span>
                                    </div>
                                    <h1 className="text-3xl md:text-4xl font-medium tracking-tight text-transparent bg-clip-text bg-gradient-to-b from-white to-white/70 leading-tight drop-shadow-sm">{lang === 'id' ? 'Jaringan & Konektivitas.' : 'Network & Connectivity.'}</h1>
                                    <p className="text-zinc-500 text-sm max-w-lg mx-auto font-light leading-relaxed">{lang === 'id' ? 'Hubungkan dunia dengan karya Anda.' : 'Connect the world with your work.'}</p>
                                </motion.div>

                                <motion.div variants={itemVariants} className="w-full max-w-lg space-y-4 bg-white/[0.02] backdrop-blur-md border border-white/[0.05] shadow-xl shadow-black/10 rounded-2xl p-8 relative overflow-hidden">
                                    <div className="space-y-4 relative z-10">
                                        <div className="flex bg-white/[0.02] border border-white/[0.05] rounded-2xl overflow-hidden focus-within:border-indigo-500/50 transition-colors">
                                            <div className="px-5 py-4 border-r border-white/[0.05] bg-white/[0.01] text-zinc-500 flex items-center justify-center"><Mail className="w-4 h-4" /></div>
                                            <input type="email" value={contactInfo.email} onChange={(e) => setContactInfo(prev => ({ ...prev, email: e.target.value }))} placeholder="Email" className="w-full bg-transparent px-5 py-4 text-sm text-white placeholder-zinc-700 outline-none" />
                                        </div>
                                        <div className="flex bg-white/[0.02] border border-white/[0.05] rounded-2xl overflow-hidden focus-within:border-indigo-500/50 transition-colors">
                                            <div className="px-5 py-4 border-r border-white/[0.05] bg-white/[0.01] text-zinc-500 flex items-center justify-center"><Globe className="w-4 h-4" /></div>
                                            <input type="text" value={contactInfo.linkedin} onChange={(e) => setContactInfo(prev => ({ ...prev, linkedin: e.target.value }))} placeholder="LinkedIn URL" className="w-full bg-transparent px-5 py-4 text-sm text-white placeholder-zinc-700 outline-none" />
                                        </div>
                                        <div className="flex bg-white/[0.02] border border-white/[0.05] rounded-2xl overflow-hidden focus-within:border-indigo-500/50 transition-colors">
                                            <div className="px-5 py-4 border-r border-white/[0.05] bg-white/[0.01] text-zinc-500 flex items-center justify-center"><Github className="w-4 h-4" /></div>
                                            <input type="text" value={contactInfo.github} onChange={(e) => setContactInfo(prev => ({ ...prev, github: e.target.value }))} placeholder="GitHub URL" className="w-full bg-transparent px-5 py-4 text-sm text-white placeholder-zinc-700 outline-none" />
                                        </div>
                                    </div>
                                    
                                    <div className="space-y-4 pt-6 border-t border-white/5 relative z-10">
                                        <div className="flex items-center justify-between p-4 rounded-xl bg-indigo-500/5 border border-indigo-500/10 transition-colors">
                                            <div className="flex items-center gap-3">
                                                <div className={`p-2 rounded-lg transition-colors ${safeMode ? 'bg-indigo-500/20' : 'bg-white/5'}`}>
                                                    <Lock className={`w-4 h-4 transition-colors ${safeMode ? 'text-indigo-400' : 'text-zinc-500'}`} />
                                                </div>
                                                <div className="text-left">
                                                    <p className="text-[10px] font-bold text-white uppercase tracking-wider">Safe Render Mode</p>
                                                    <p className="text-[9px] text-zinc-500">Mencegah AI menggunakan layout ekstrem yang tidak stabil.</p>
                                                </div>
                                            </div>
                                            <button 
                                                onClick={() => {
                                                    const nextSafe = !safeMode;
                                                    setSafeMode(nextSafe);
                                                    if (portfolioData) {
                                                        handleDirectUpdate({ safe_mode: nextSafe });
                                                    }
                                                }}
                                                className={`w-12 h-6 rounded-full transition-all relative ${safeMode ? 'bg-indigo-600' : 'bg-zinc-800'}`}
                                            >
                                                <motion.div 
                                                    animate={{ x: safeMode ? 24 : 2 }} 
                                                    className="absolute top-1 left-0 w-4 h-4 bg-white rounded-full shadow-sm"
                                                />
                                            </button>
                                        </div>
                                    </div>
                                    
                                    <div className="grid grid-cols-2 gap-4 w-full pt-8">
                                        <button onClick={() => setGuidedStage('career')} className="py-4 px-6 bg-zinc-950/40 hover:bg-zinc-900 border border-white/[0.02] text-zinc-500 rounded-xl text-xs font-semibold tracking-wide transition-all active:scale-95 cursor-pointer">{lang === 'id' ? 'Kembali' : 'Back'}</button>
                                        <button onClick={() => generatePortfolio(workspaceMessages, currentGenerationId)} className="py-4 px-6 bg-white hover:bg-zinc-100 text-[#0A0A0B] rounded-xl text-xs font-bold tracking-wide transition-all shadow-xl flex items-center justify-center gap-2 active:scale-95 cursor-pointer group"><span>{lang === 'id' ? 'Buat Portofolio' : 'Build Portfolio'}</span> </button>
                                    </div>
                                </motion.div>
                            </div>
                        </motion.div>
                    ) : guidedStage === 'generating' ? (
                        <motion.div key="generating" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-[100] bg-[#080809] flex flex-col md:flex-row overflow-hidden select-none">
                            {/* Left Column: Cinematic Loading Logs */}
                            <div className="w-full md:w-[450px] bg-[#0E0E11] border-r border-zinc-900 flex flex-col justify-center p-8 md:p-12 relative overflow-hidden h-full shrink-0 z-10">
                                <div className="absolute top-0 right-0 p-8 opacity-[0.02] pointer-events-none"><Logo size={140} variant="gradient" /></div>
                                
                                <div className="space-y-1 mb-8 relative z-10">
                                    <h2 className="text-2xl font-light text-white tracking-tight">Merakit Portofolio...</h2>
                                    <p className="text-xs text-zinc-500">Membangun arsitektur, layout, dan modul personal secara realtime.</p>
                                </div>

                                {/* Cinematic Real-time Modular Build Indicators */}
                                <div className="flex flex-col gap-3 font-mono text-xs mb-8 relative z-10">
                                    {[
                                        { label: "Identity Analysis", threshold: 20 },
                                        { label: "Portfolio Architecture", threshold: 45 },
                                        { label: "Visual Composition", threshold: 70 },
                                        { label: "Content Assembly", threshold: 90 },
                                        { label: "Final Rendering", threshold: 100 }
                                    ].map((step, idx, arr) => {
                                        const prevThreshold = idx === 0 ? 0 : arr[idx-1]!.threshold;
                                        const isActive = loadingPct >= prevThreshold && loadingPct < step.threshold;
                                        const isCompleted = loadingPct >= step.threshold;
                                        
                                        return (
                                            <div key={idx} className={`flex items-center justify-between p-3.5 rounded-xl border transition-all duration-500 ${
                                                isActive ? 'border-blue-500/50 bg-blue-500/10 shadow-[0_0_15px_rgba(59,130,246,0.15)] scale-[1.02]' : 
                                                isCompleted ? 'border-zinc-800/50 bg-zinc-900/30' : 
                                                'border-transparent bg-transparent opacity-30'
                                            }`}>
                                                 <span className={`${isActive ? 'text-blue-400 font-bold' : isCompleted ? 'text-zinc-400' : 'text-zinc-600'}`}>
                                                     {step.label}
                                                 </span>
                                                 <span>
                                                     {isCompleted ? (
                                                         <span className="text-emerald-500 font-bold flex items-center gap-2">
                                                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Done
                                                         </span>
                                                     ) : isActive ? (
                                                         <span className="text-blue-400 font-bold flex items-center gap-2 animate-pulse">
                                                            <Loader2 className="w-3.5 h-3.5 animate-spin" /> Active
                                                         </span>
                                                     ) : (
                                                         <span className="text-zinc-600 flex items-center gap-2">
                                                            <div className="w-1 h-1 rounded-full bg-zinc-600" /> Pending
                                                         </span>
                                                     )}
                                                 </span>
                                            </div>
                                        );
                                    })}
                                </div>

                                <div className="space-y-3">
                                    <div className="flex justify-between items-center text-xs">
                                        <span className="text-zinc-500">Penyelarasan Sistem</span>
                                        <span className="text-white font-bold">{loadingPct}%</span>
                                    </div>
                                    <div className="h-1 w-full bg-zinc-900 overflow-hidden rounded-full relative">
                                        <motion.div className="h-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]" initial={{ width: 0 }} animate={{ width: `${loadingPct}%` }} transition={{ ease: "circOut", duration: 0.1 }} />
                                    </div>
                                </div>
                            </div>

                            {/* Right Column: Real-time Live Canvas Rendering (MacBook Mockup) */}
                            <div className="flex-1 bg-gradient-to-br from-[#121214] to-[#0A0A0C] flex flex-col justify-center items-center p-8 relative overflow-hidden h-full">
                                {/* Ambient Background Glow */}
                                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[600px] bg-blue-500/5 blur-[120px] rounded-full pointer-events-none" />

                                {/* MacBook Frame */}
                                <div className="relative w-full max-w-5xl aspect-[16/10] bg-[#09090b] rounded-[1.5rem] md:rounded-[2rem] border-[6px] md:border-[10px] border-[#18181b] shadow-2xl overflow-hidden flex flex-col ring-1 ring-white/10 z-20 transition-all duration-700">
                                    {/* Notch */}
                                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 md:w-32 h-4 md:h-6 bg-[#18181b] rounded-b-lg z-20 flex justify-center items-end pb-1 md:pb-1.5">
                                        <div className="w-1 md:w-1.5 h-1 md:h-1.5 rounded-full bg-black/50 border border-white/5 flex items-center justify-center">
                                            <div className="w-0.5 h-0.5 rounded-full bg-blue-500/40" />
                                        </div>
                                    </div>
                                    
                                    {/* Window Title Bar */}
                                    <div className="h-6 md:h-8 w-full bg-zinc-900/80 backdrop-blur border-b border-white/5 flex items-center px-4 gap-1.5 z-10 shrink-0">
                                        <div className="w-2.5 h-2.5 rounded-full bg-[#FF5F56] border border-[#E0443E]" />
                                        <div className="w-2.5 h-2.5 rounded-full bg-[#FFBD2E] border border-[#DEA123]" />
                                        <div className="w-2.5 h-2.5 rounded-full bg-[#27C93F] border border-[#1AAB29]" />
                                    </div>

                                    {/* Screen Content */}
                                    <div className="relative flex-1 bg-[#09090b] overflow-hidden">
                                        {htmlContent && loadingPct === 100 ? (
                                            <iframe 
                                                key={htmlContent.length}
                                                srcDoc={htmlContent} 
                                                className="w-full h-full border-none bg-transparent focus:outline-none animate-in fade-in duration-700" 
                                                title="Realtime Build Preview"
                                                sandbox="allow-scripts"
                                            />
                                        ) : (
                                            <div className="absolute inset-0 flex flex-col items-center justify-center p-8 bg-zinc-950/80 backdrop-blur-sm z-10 animate-in fade-in duration-500">
                                                {/* Progress Ring */}
                                                <div className="relative flex items-center justify-center mb-10 md:mb-16 scale-90 md:scale-100">
                                                    <svg className="w-24 h-24 transform -rotate-90">
                                                        <circle cx="48" cy="48" r="45" stroke="currentColor" strokeWidth="3" fill="transparent" className="text-zinc-800" />
                                                        <circle cx="48" cy="48" r="45" stroke="currentColor" strokeWidth="3" strokeLinecap="round" fill="transparent" strokeDasharray="283" strokeDashoffset={283 - (283 * Math.max(2, loadingPct)) / 100} className="text-blue-500 transition-all duration-300 ease-out drop-shadow-[0_0_8px_rgba(59,130,246,0.6)]" />
                                                    </svg>
                                                    <div className="absolute flex flex-col items-center justify-center">
                                                        <span className="text-xl md:text-2xl font-bold text-white tracking-tighter">{loadingPct}%</span>
                                                    </div>
                                                </div>

                                                {/* Advanced Skeleton Sections */}
                                                <div className="w-full max-w-2xl space-y-6 md:space-y-10 px-4 md:px-0">
                                                    {/* Navbar Skeleton */}
                                                    <div className="flex justify-between items-center w-full">
                                                        <div className="w-24 md:w-32 h-5 md:h-6 bg-zinc-800 rounded-md relative overflow-hidden">
                                                            <motion.div className="absolute inset-0 w-[200%] bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" animate={{ x: ['-100%', '100%'] }} transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }} />
                                                        </div>
                                                        <div className="hidden md:flex gap-4">
                                                            {[1,2,3,4].map(i => (
                                                                <div key={i} className="w-12 md:w-16 h-3.5 bg-zinc-800/80 rounded-md relative overflow-hidden">
                                                                    <motion.div className="absolute inset-0 w-[200%] bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" animate={{ x: ['-100%', '100%'] }} transition={{ repeat: Infinity, duration: 1.5, ease: "linear", delay: i * 0.1 }} />
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                    
                                                    {/* Hero Skeleton (Pulse + Shimmer) */}
                                                    <div className="flex flex-col md:flex-row items-center gap-6 md:gap-10 pt-4 md:pt-8 w-full">
                                                        <div className="w-24 h-24 md:w-36 md:h-36 rounded-full border-4 border-zinc-800 bg-zinc-800/50 shrink-0 relative overflow-hidden shadow-inner flex items-center justify-center">
                                                            <motion.div className="absolute inset-0 w-[200%] h-full bg-gradient-to-r from-transparent via-blue-500/10 to-transparent" animate={{ x: ['-100%', '100%'] }} transition={{ repeat: Infinity, duration: 2, ease: "linear" }} />
                                                            <UserIcon className="w-8 h-8 md:w-10 md:h-10 text-zinc-700/50" />
                                                        </div>
                                                        <div className="space-y-4 md:space-y-5 w-full flex-1">
                                                            <div className="h-4 md:h-5 w-1/3 bg-zinc-800 rounded-md relative overflow-hidden mx-auto md:mx-0">
                                                                <motion.div className="absolute inset-0 w-[200%] bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" animate={{ x: ['-100%', '100%'] }} transition={{ repeat: Infinity, duration: 1.5, ease: "linear", delay: 0.2 }} />
                                                            </div>
                                                            <div className="h-8 md:h-12 w-3/4 bg-blue-500/10 border border-blue-500/20 rounded-lg relative overflow-hidden mx-auto md:mx-0 shadow-[0_0_20px_rgba(59,130,246,0.05)]">
                                                                <motion.div className="absolute inset-0 w-[200%] bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" animate={{ x: ['-100%', '100%'] }} transition={{ repeat: Infinity, duration: 1.5, ease: "linear", delay: 0.3 }} />
                                                            </div>
                                                            <div className="space-y-2.5 pt-2 w-full max-w-md mx-auto md:mx-0">
                                                                {[100, 85, 60].map((width, i) => (
                                                                    <div key={i} className={`h-2.5 md:h-3 w-[${width}%] max-w-[${width}%] bg-zinc-800/80 rounded-sm relative overflow-hidden`}>
                                                                        <motion.div className="absolute inset-0 w-[200%] bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" animate={{ x: ['-100%', '100%'] }} transition={{ repeat: Infinity, duration: 1.5, ease: "linear", delay: 0.4 + (i * 0.1) }} />
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    
                                    {/* Keyboard deck reflection */}
                                    <div className="h-1 md:h-2 w-full bg-gradient-to-b from-white/5 to-transparent z-30" />
                                </div>
                                {/* MacBook Base */}
                                <div className="w-[110%] max-w-6xl h-2 md:h-3 bg-zinc-800 rounded-b-[2rem] md:rounded-b-[3rem] mt-0.5 flex justify-center shadow-2xl relative z-10 border-t border-white/5">
                                    <div className="w-16 md:w-32 h-full bg-zinc-900 rounded-b-xl shadow-inner border-x border-b border-black/50" />
                                </div>
                            </div>
                        </motion.div>
                    ) : guidedStage === 'done' ? (
                        <motion.div key="done" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex h-full w-full overflow-hidden flex-col bg-[#050506]">
                                                    <div className="h-16 border-b border-zinc-900 bg-[#080809] flex items-center justify-between px-6 shrink-0 z-10 shadow-sm relative select-none">
                                <div 
                                    className="flex gap-4 items-center pl-0 transition-all duration-300 cursor-pointer group"
                                    onClick={() => {
                                        localStorage.removeItem('openfolio_last_route');
                                        navigate('/');
                                    }}
                                >
                                    <div className="hidden sm:block group-hover:opacity-80 transition-opacity">
                                        <h2 className="text-sm font-semibold text-white tracking-wide">Openfolio Chat</h2>
                                    </div>
                                </div>
                                <div className="flex gap-3 items-center">
                                     <button 
                                       onClick={() => {
                                         const blob = new Blob([htmlContent], { type: 'text/html' });
                                         const url = URL.createObjectURL(blob);
                                         window.open(url, '_blank');
                                       }}
                                       className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 border border-indigo-500/10 text-white rounded-xl text-xs font-bold tracking-wide transition-all shadow-md flex items-center gap-2 cursor-pointer active:scale-95"
                                     >
                                        <Eye className="w-3.5 h-3.5" /> {lang === 'id' ? 'Buka Tab Baru' : 'Launch Live'}
                                     </button>
                                 </div>
                              </div>

                              {/* Split Cockpit Canvas Stage: LEFT=Chat, RIGHT=Canvas */}
                              <div className="flex-1 bg-zinc-950 flex flex-col lg:flex-row relative overflow-hidden h-full w-full">
                                 
                                 {/* LEFT COLUMN: Chat OpenFolio AI (Unified Assistant Interface) */}
                                 <div className="w-full lg:w-[420px] border-b lg:border-b-0 lg:border-r border-zinc-900 flex flex-col shrink-0 h-[450px] lg:h-full relative overflow-hidden bg-[#0A0A0C]">
                                     
                                     {/* Timeline message feeds */}          {/* Timeline message feeds */}
                                     <div className="flex-grow overflow-y-auto p-5 scroll-smooth no-scrollbar">
                                         <div className="flex flex-col space-y-6 pb-2">
                                             {workspaceMessages.map((msg, idx) => (
                                                 <div key={idx} className={`flex w-full ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                                     <div className={`flex flex-col gap-1.5 max-w-[85%] ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                                                         <div className="flex items-center gap-2 px-1">
                                                             <span className="text-[10px] font-semibold tracking-wide text-zinc-500 uppercase">
                                                                 {msg.role === 'user' ? 'Anda' : 'OpenFolio'}
                                                             </span>
                                                         </div>
                                                         <div className={`px-4 py-3 text-[13px] leading-relaxed shadow-sm ${
                                                             msg.role === 'user' 
                                                             ? 'text-zinc-100 rounded-2xl rounded-tr-sm border font-medium' 
                                                             : 'bg-zinc-900 border border-zinc-800/60 shadow-sm text-zinc-300 rounded-2xl rounded-tl-sm prose prose-invert prose-p:leading-relaxed prose-pre:bg-zinc-950 prose-pre:border prose-pre:border-zinc-800/80 backdrop-blur-sm'
                                                         }`}
                                                         style={msg.role === 'user' ? { backgroundColor: '#1C1C21', borderColor: 'rgba(255,255,255,0.06)' } : {}}>
                                                             {msg.role === 'user' ? (
                                                                 msg.content
                                                             ) : (
                                                                 <div className="markdown-body text-[13px]">
                                                                     <Markdown>{msg.content}</Markdown>
                                                                 </div>
                                                             )}
                                                         </div>
                                                     </div>
                                                 </div>
                                             ))}

                                             {isEditingPortfolio && (
                                                 <div className="flex w-full justify-start animate-in fade-in duration-300">
                                                     <div className="flex flex-col gap-1.5 max-w-[85%] items-start">
                                                         <div className="flex items-center gap-2 px-1">
                                                             <span className="text-[10px] font-semibold tracking-wide text-zinc-500 uppercase">
                                                                 OpenFolio
                                                             </span>
                                                         </div>
                                                         <div className="px-5 py-4 bg-zinc-900 border border-zinc-800/60 backdrop-blur-sm rounded-2xl rounded-tl-sm shadow-sm flex items-center justify-center min-w-[60px]">
                                                             <div className="flex items-center gap-1.5">
                                                                 <div className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                                                 <div className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                                                 <div className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                                             </div>
                                                         </div>
                                                     </div>
                                                 </div>
                                             )}
                                         </div>
                                     </div>

                                     {/* Bottom Prompt Input form */}
                                     <div className="p-4 border-t border-zinc-900 bg-[#09090b] relative shrink-0">
                                         <div className="relative flex items-center bg-[#121215] border border-zinc-800 focus-within:border-zinc-600 rounded-2xl transition-all shadow-sm">
                                             <input 
                                                 type="text" 
                                                 value={revisionInstruction} 
                                                 onChange={(e) => setRevisionInstruction(e.target.value)} 
                                                 onKeyDown={(e) => e.key === 'Enter' && revisionInstruction.trim() && handleSendRevision(revisionInstruction)}
                                                 disabled={isEditingPortfolio}
                                                 placeholder={isEditingPortfolio ? "Sedang memproses..." : "Ketik instruksi atau perubahan..."} 
                                                 className="w-full bg-transparent pl-4 pr-12 py-3.5 text-[13px] text-zinc-200 outline-none placeholder-zinc-600 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                                             />
                                             <button 
                                                 onClick={() => handleSendRevision(revisionInstruction)} 
                                                 disabled={!revisionInstruction.trim() || isEditingPortfolio}
                                                 className="absolute right-2 p-2 bg-zinc-200 text-black hover:bg-white disabled:bg-zinc-800 disabled:text-zinc-600 rounded-xl transition-all cursor-pointer shadow-sm active:scale-95 flex items-center justify-center"
                                             >
                                                 <Send className="w-3.5 h-3.5" />
                                             </button>
                                         </div>
                                     </div>
                                 </div>

                                 {/* RIGHT COLUMN: Portfolio Preview Canvas with unified Bottom Action Bar */}
                                 <div className="flex-grow flex flex-col h-full bg-zinc-950 relative overflow-hidden">
                                     
                                     {/* Portfolio Stage viewport */}
                                     <div className="flex-grow w-full relative h-full bg-zinc-950 flex flex-col overflow-y-auto no-scrollbar justify-center items-center p-4">
                                         {activeView === 'code' ? (
                                             <div className="absolute inset-0 w-full h-full bg-zinc-950 p-6 flex flex-col font-mono text-zinc-300 text-xs overflow-auto select-text no-scrollbar animate-in fade-in duration-300">
                                                 <div className="flex justify-between items-center pb-4 border-b border-zinc-900 mb-4 shrink-0 select-none">
                                                     <span className="text-zinc-500 text-[10px] tracking-wider uppercase font-sans font-bold">KODE SUMBER OUTPUT PORTOFOLIO (HTML/CSS)</span>
                                                     <button 
                                                         onClick={() => {
                                                             navigator.clipboard.writeText(htmlContent);
                                                             alert(lang === 'id' ? "Kode berhasil disalin ke clipboard!" : "Code copied successfully!");
                                                         }}
                                                         className="px-2.5 py-1 text-[10px] rounded bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white transition-all font-sans font-bold cursor-pointer"
                                                     >
                                                         Salin Kode
                                                     </button>
                                                 </div>
                                                 <pre className="flex-1 w-full overflow-auto select-text font-mono text-zinc-400 bg-black/40 p-4 rounded-xl border border-zinc-900/40 text-left whitespace-pre-wrap leading-relaxed">
                                                     <code>{htmlContent}</code>
                                                 </pre>
                                             </div>
                                         ) : htmlContent ? (
                                              <iframe 
                                                key={htmlContent.length}
                                                srcDoc={htmlContent} 
                                                className="absolute inset-0 w-full h-full border-none bg-white font-mono" 
                                                title="Portfolio Full Preview"
                                                sandbox="allow-scripts"
                                              />
                                         ) : (
                                             <div className="flex flex-col items-center justify-center p-10 opacity-60 m-auto select-none">
                                                 <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mb-6 text-zinc-600">
                                                     <LayoutPanelLeft className="w-8 h-8 animate-pulse" />
                                                 </div>
                                                 <h3 className="text-lg text-white font-medium mb-2">Mengkompilasi Visual...</h3>
                                                 <p className="text-xs text-zinc-500 max-w-sm text-center font-light leading-relaxed">Harap tunggu sejenak sementara kami melakukan sinkronisasi visual.</p>
                                             </div>
                                         )}
                                     </div>

                                     {/* Bottom Control Bar under Right Canvas column */}
                                     <div className="h-16 shrink-0 border-t border-zinc-900 bg-[#080809] flex items-center justify-between px-6 select-none z-10 w-full">
                                          {/* Mode Selectors */}
                                          <div className="flex gap-2 items-center">
                                              <button 
                                                  onClick={() => setActiveView('preview')}
                                                  className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                                                      activeView === 'preview'
                                                      ? 'bg-zinc-900 border-zinc-855 text-white'
                                                      : 'bg-transparent border-transparent text-zinc-500 hover:text-zinc-300'
                                                  }`}
                                              >
                                                  <Eye className="w-3.5 h-3.5" />
                                                  <span>Visual</span>
                                              </button>
                                              <button 
                                                  onClick={() => setActiveView('code')}
                                                  className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                                                      activeView === 'code'
                                                      ? 'bg-zinc-900 border-zinc-855 text-white'
                                                      : 'bg-transparent border-transparent text-zinc-500 hover:text-zinc-300'
                                                  }`}
                                              >
                                                  <Code className="w-3.5 h-3.5" />
                                                  <span>Kode</span>
                                              </button>
                                          </div>

                                          {/* Action Buttons */}
                                          <div className="flex items-center gap-3">
                                              {/* Publish Button — public snapshot via server (Step 5) */}
                                              <button
                                                  onClick={handlePublish}
                                                  disabled={isPublishing || !portfolioData}
                                                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 shadow-md cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                                              >
                                                  {isPublishing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Globe className="w-3.5 h-3.5" />}
                                                  <span>{isPublishing ? (lang === 'id' ? 'Mempublikasikan...' : 'Publishing...') : (lang === 'id' ? 'Publikasikan' : 'Publish')}</span>
                                              </button>

                                              {/* Download HTML Button */}
                                              <button 
                                                  onClick={() => {
                                                      const element = document.createElement("a");
                                                      const file = new Blob([htmlContent], {type: 'text/html'});
                                                      element.href = URL.createObjectURL(file);
                                                      element.download = `openfolio_${onboardingName?.toLowerCase().replace(/\s+/g, '_') || 'portfolio'}.html`;
                                                      document.body.appendChild(element);
                                                      element.click();
                                                      document.body.removeChild(element);
                                                  }}
                                                  className="px-4 py-1.5 bg-zinc-100 hover:bg-white text-zinc-950 font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 shadow-md cursor-pointer"
                                              >
                                                  <Download className="w-3.5 h-3.5" />
                                                  <span>Download HTML</span>
                                              </button>
                                          </div>
                                      </div>

                                 </div>

                              </div>
                          </motion.div>
                    ) : null}
                </AnimatePresence>
            </div>
        </AppLayout>
        </>
    );
}
