import { ArrowRight, Github, Check, X, Sparkles, Share2, FileText, Code2, Monitor, MessageSquare, Download, Layers, ShieldCheck } from "lucide-react";
import { Link } from "react-router";
import Logo from "../components/Logo";

const GITHUB_URL = "https://github.com/MiqdadBadjuber/OpenFolio-AI";

const WORKFLOW = [
  {
    step: "01",
    title: "Input Data & Riwayat",
    desc: "Isi nama, bio singkat, riwayat karier, keahlian, dan proyek unggulan Anda."
  },
  {
    step: "02",
    title: "AI Layout Intelligence",
    desc: "Sistem merancang struktur hierarki, ritme visual, dan tipografi secara otomatis."
  },
  {
    step: "03",
    title: "Live Studio & Chat Edit",
    desc: "Tinjau pratinjau langsung dan ajukan revisi desain melalui asisten obrolan cerdas."
  },
  {
    step: "04",
    title: "Export & Publikasikan",
    desc: "Unduh file HTML mandiri yang bersih atau dapatkan URL publik instan untuk dibagikan."
  }
];

const FEATURES = [
  {
    category: "ARSITEKTUR DESAIN",
    title: "Adaptive Layout Intelligence",
    desc: "Menghasilkan komposisi desain yang proporsional dan dinamis sesuai profil Anda, tanpa terjebak pada template kaku."
  },
  {
    category: "WORKSPACE STUDIO",
    title: "Realtime Cockpit Canvas",
    desc: "Pratinjau interaktif di dalam iframe terisolasi yang langsung tersinkronisasi setiap kali ada perubahan konten."
  },
  {
    category: "INTERAKSI ALAMI",
    title: "AI Chat Revision Engine",
    desc: "Ubah warna aksen, susun ulang urutan bagian, atau sesuaikan gaya bahasa melalui instruksi obrolan natural."
  },
  {
    category: "PORTABILITAS KODE",
    title: "Clean Standalone HTML",
    desc: "Unduh kode HTML dan Tailwind CSS mandiri tanpa dependensi rumit, siap di-hosting di server mana saja."
  }
];

const COMPARISON: Array<[string, string, string]> = [
  ["Waktu Pembuatan", "Hitungan detik", "Berjam-jam hingga harian"],
  ["Sistem Login", "Tanpa login (Sesi tamu instan)", "Wajib registrasi akun"],
  ["Pendekatan Desain", "Layout adaptif berbasis data", "Template kaku seragam"],
  ["Hasil Kode", "File HTML mandiri & bersih", "Terkunci di platform pembuat"],
  ["Kemudahan Revisi", "Interaktif via obrolan AI", "Edit manual satu per satu"],
  ["Biaya & Lisensi", "100% Gratis & Open Source (MIT)", "Langganan bulanan mahal"],
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#FAF9F6] text-[#18180F] font-sans selection:bg-[#B85C2C] selection:text-white">
      {/* Top Navigation */}
      <header className="sticky top-0 z-50 bg-[#FAF9F6]/90 backdrop-blur-md border-b border-[#E6E3DC]">
        <div className="max-w-[1160px] mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5 group">
            <Logo size={24} variant="currentColor" className="text-[#18180F]" />
            <span className="font-semibold text-base tracking-tight text-[#18180F]">OpenFolio</span>
          </Link>

          <nav className="hidden md:flex items-center gap-8 text-xs font-medium text-[#18180F]/70">
            <a href="#cara-kerja" className="hover:text-[#B85C2C] transition-colors">Cara Kerja</a>
            <a href="#fitur" className="hover:text-[#B85C2C] transition-colors">Fitur Studio</a>
            <a href="#perbandingan" className="hover:text-[#B85C2C] transition-colors">Kenapa OpenFolio</a>
            <a href={GITHUB_URL} target="_blank" rel="noreferrer" className="hover:text-[#B85C2C] transition-colors flex items-center gap-1.5">
              <Github className="w-3.5 h-3.5" />
              GitHub
            </a>
          </nav>

          <div className="flex items-center gap-3">
            <a 
              href={GITHUB_URL} 
              target="_blank" 
              rel="noreferrer" 
              className="p-2 text-[#18180F]/60 hover:text-[#18180F] transition-colors md:hidden"
              aria-label="GitHub Repository"
            >
              <Github className="w-4 h-4" />
            </a>
            <Link 
              to="/app" 
              className="inline-flex items-center gap-1.5 bg-[#18180F] text-[#FAF9F6] px-4 py-2 rounded-lg text-xs font-medium hover:bg-[#18180F]/90 transition-colors"
            >
              Buka Studio
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-[1160px] mx-auto px-6 pt-12 md:pt-16 pb-20">
        {/* Hero Section */}
        <section className="mb-20">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Left: Headline & CTAs */}
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-white border border-[#E6E3DC] rounded-full text-[11px] font-medium text-[#18180F]">
                <span className="w-2 h-2 rounded-full bg-[#B85C2C]" />
                Didukung Google Gemini 2.0 Flash (Tanpa Login)
              </div>

              <h1 className="text-3xl sm:text-4xl md:text-5xl font-semibold tracking-tight text-[#18180F] leading-[1.15]">
                Rancang identitas digital profesional Anda, dikodekan cerdas oleh AI.
              </h1>

              <p className="text-sm md:text-base text-[#18180F]/70 font-normal leading-relaxed max-w-xl">
                OpenFolio mengubah riwayat karier, karya proyek, dan keahlian Anda menjadi website portofolio yang rapi, responsif, dan siap dipublikasikan dalam hitungan detik.
              </p>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <Link 
                  to="/app" 
                  className="inline-flex items-center gap-2 bg-[#18180F] text-[#FAF9F6] px-6 py-3 rounded-lg text-sm font-medium hover:bg-[#18180F]/90 transition-all shadow-none"
                >
                  Mulai Rancang Gratis
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <a 
                  href={GITHUB_URL} 
                  target="_blank" 
                  rel="noreferrer" 
                  className="inline-flex items-center gap-2 bg-white border border-[#E6E3DC] text-[#18180F] px-5 py-3 rounded-lg text-sm font-medium hover:bg-[#FAF9F6] transition-colors"
                >
                  <Github className="w-4 h-4 text-[#18180F]/70" />
                  Bintang di GitHub
                </a>
              </div>

              <div className="flex items-center gap-6 pt-4 text-xs text-[#18180F]/60">
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-[#B85C2C]" /> Tanpa kartu kredit
                </span>
                <span className="flex items-center gap-1.5">
                  <Code2 className="w-4 h-4 text-[#B85C2C]" /> Kode HTML mandiri
                </span>
                <span className="flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-[#B85C2C]" /> Kuota harian gratis
                </span>
              </div>
            </div>

            {/* Right: Editorial Portfolio Mockup */}
            <div className="lg:col-span-5">
              <div className="bg-white border border-[#E6E3DC] rounded-xl p-5 shadow-none space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-[#E6E3DC]">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#E6E3DC]" />
                    <span className="w-2.5 h-2.5 rounded-full bg-[#E6E3DC]" />
                    <span className="w-2.5 h-2.5 rounded-full bg-[#E6E3DC]" />
                  </div>
                  <span className="text-[11px] font-mono text-[#B85C2C] bg-[#FAF9F6] px-2.5 py-0.5 rounded border border-[#E6E3DC]">
                    /p/alex-pratama
                  </span>
                </div>

                {/* Profile Header Preview */}
                <div className="flex items-start gap-3.5 pt-1">
                  <div className="w-12 h-12 rounded-lg bg-[#FAF9F6] border border-[#E6E3DC] flex items-center justify-center text-xs font-semibold text-[#B85C2C]">
                    AP
                  </div>
                  <div className="space-y-1">
                    <div className="text-sm font-semibold text-[#18180F]">Alex Pratama</div>
                    <div className="text-xs text-[#18180F]/60">Software Engineer & UI Specialist</div>
                  </div>
                </div>

                <p className="text-xs text-[#18180F]/70 leading-relaxed bg-[#FAF9F6] p-3 rounded-lg border border-[#E6E3DC]">
                  Fokus pada arsitektur web modern, skalabilitas sistem, dan pengalaman antarmuka pengguna yang terstruktur rapi.
                </p>

                {/* Tech Chips */}
                <div className="space-y-1.5">
                  <div className="text-[10px] font-mono uppercase tracking-wider text-[#18180F]/50">Keahlian Utama</div>
                  <div className="flex flex-wrap gap-1.5">
                    {["TypeScript", "React 19", "Next.js", "Tailwind CSS", "Node.js"].map(tag => (
                      <span key={tag} className="text-[10px] px-2 py-0.5 rounded bg-[#FAF9F6] border border-[#E6E3DC] text-[#18180F]/80">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Project Box Preview */}
                <div className="border border-[#E6E3DC] rounded-lg p-3 bg-white space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-[#18180F]">CloudMetrics Platform</span>
                    <span className="text-[10px] text-[#B85C2C] font-mono">Live Demo</span>
                  </div>
                  <p className="text-[11px] text-[#18180F]/60 leading-normal">
                    Dasbor analitik terdistribusi dengan pemantauan metrik server secara realtime.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Workflow Section */}
        <section id="cara-kerja" className="mb-20 scroll-mt-24">
          <div className="border-t border-[#E6E3DC] pt-12">
            <div className="space-y-2 mb-10">
              <span className="text-[11px] font-mono uppercase tracking-wider text-[#B85C2C]">ALUR KERJA</span>
              <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-[#18180F]">
                Dari data mentah menjadi portofolio siap publish.
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {WORKFLOW.map(item => (
                <div 
                  key={item.step} 
                  className="bg-white border border-[#E6E3DC] rounded-xl p-5 flex flex-col justify-between space-y-4"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-semibold text-[#B85C2C] bg-[#FAF9F6] px-2 py-0.5 rounded border border-[#E6E3DC]">
                      {item.step}
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    <h3 className="text-sm font-semibold text-[#18180F]">{item.title}</h3>
                    <p className="text-xs text-[#18180F]/70 leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Features Catalog Section */}
        <section id="fitur" className="mb-20 scroll-mt-24">
          <div className="border-t border-[#E6E3DC] pt-12">
            <div className="space-y-2 mb-10">
              <span className="text-[11px] font-mono uppercase tracking-wider text-[#B85C2C]">KAPABILITAS STUDIO</span>
              <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-[#18180F]">
                Fitur esensial untuk kemudahan kustomisasi.
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {FEATURES.map(feat => (
                <div 
                  key={feat.title} 
                  className="bg-white border border-[#E6E3DC] rounded-xl p-6 space-y-3"
                >
                  <span className="text-[10px] font-mono uppercase tracking-widest text-[#B85C2C]">
                    {feat.category}
                  </span>
                  <h3 className="text-base font-semibold text-[#18180F]">
                    {feat.title}
                  </h3>
                  <p className="text-xs text-[#18180F]/70 leading-relaxed font-normal">
                    {feat.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Comparison Section */}
        <section id="perbandingan" className="mb-20 scroll-mt-24">
          <div className="border-t border-[#E6E3DC] pt-12">
            <div className="space-y-2 mb-10">
              <span className="text-[11px] font-mono uppercase tracking-wider text-[#B85C2C]">PERBANDINGAN</span>
              <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-[#18180F]">
                Mengapa memilih OpenFolio?
              </h2>
            </div>

            <div className="bg-white border border-[#E6E3DC] rounded-xl overflow-hidden">
              <div className="grid grid-cols-3 bg-[#FAF9F6] border-b border-[#E6E3DC] p-4 text-xs font-semibold text-[#18180F]">
                <div>Parameter</div>
                <div className="text-[#B85C2C]">OpenFolio AI</div>
                <div className="text-[#18180F]/60">Metode Konvensional</div>
              </div>

              <div className="divide-y divide-[#E6E3DC]">
                {COMPARISON.map(([param, us, them]) => (
                  <div key={param} className="grid grid-cols-3 p-4 text-xs items-center">
                    <div className="font-medium text-[#18180F]">{param}</div>
                    <div className="flex items-center gap-1.5 text-[#18180F] font-medium">
                      <Check className="w-3.5 h-3.5 text-[#B85C2C] shrink-0" />
                      {us}
                    </div>
                    <div className="flex items-center gap-1.5 text-[#18180F]/50">
                      <X className="w-3.5 h-3.5 text-[#18180F]/30 shrink-0" />
                      {them}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Bottom CTA Banner */}
        <section className="bg-white border border-[#E6E3DC] rounded-2xl p-8 md:p-12 text-center space-y-5">
          <span className="inline-block text-[11px] font-mono uppercase tracking-wider text-[#B85C2C]">
            MULAI SEKARANG
          </span>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-semibold tracking-tight text-[#18180F] max-w-xl mx-auto">
            Portofolio profesional Anda hanya beberapa langkah lagi.
          </h2>
          <p className="text-xs sm:text-sm text-[#18180F]/70 max-w-md mx-auto leading-relaxed">
            Tanpa pendaftaran, tanpa kartu kredit. Buat, sesuaikan lewat chat, dan unduh website portofolio Anda secara gratis.
          </p>
          <div className="pt-2 flex flex-wrap justify-center gap-3">
            <Link 
              to="/app" 
              className="inline-flex items-center gap-2 bg-[#18180F] text-[#FAF9F6] px-6 py-3 rounded-lg text-xs sm:text-sm font-medium hover:bg-[#18180F]/90 transition-colors"
            >
              Buka Studio OpenFolio
              <ArrowRight className="w-4 h-4" />
            </Link>
            <a 
              href={GITHUB_URL} 
              target="_blank" 
              rel="noreferrer" 
              className="inline-flex items-center gap-2 bg-[#FAF9F6] border border-[#E6E3DC] text-[#18180F] px-5 py-3 rounded-lg text-xs sm:text-sm font-medium hover:bg-white transition-colors"
            >
              <Github className="w-4 h-4" />
              Kode Sumber di GitHub
            </a>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#E6E3DC] py-8 bg-[#FAF9F6]">
        <div className="max-w-[1160px] mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#18180F]/60">
          <div className="flex items-center gap-2">
            <Logo size={18} variant="currentColor" className="text-[#18180F]" />
            <span>OpenFolio © {new Date().getFullYear()} · Lisensi Open Source (MIT)</span>
          </div>
          <div className="flex items-center gap-6">
            <a href={GITHUB_URL} target="_blank" rel="noreferrer" className="hover:text-[#B85C2C] transition-colors">
              GitHub Repository
            </a>
            <Link to="/app" className="hover:text-[#B85C2C] transition-colors">
              Studio Workspace
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
