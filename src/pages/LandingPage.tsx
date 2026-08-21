import { ArrowRight, Github, Check, X } from "lucide-react";
import { Link } from "react-router";
import Logo from "../components/Logo";

const GITHUB_URL = "https://github.com/MiqdadBadjuber/OpenFolio-AI";

const WORKFLOW = [
  {
    num: "1",
    title: "Isi Profil & Riwayat",
    desc: "Masukkan informasi diri, tautan proyek, keahlian teknis, dan pengalaman kerja melalui form builder terstruktur."
  },
  {
    num: "2",
    title: "AI Merancang Layout",
    desc: "Sistem menyusun hierarki visual, ritme spasi, dan palet warna yang proporsional secara otomatis."
  },
  {
    num: "3",
    title: "Pratinjau & Chat Revisi",
    desc: "Lihat hasil instan di kanvas interaktif dan minta perubahan gaya atau teks melalui obrolan langsung."
  },
  {
    num: "4",
    title: "Unduh atau Publikasikan",
    desc: "Ekspor menjadi satu file HTML mandiri tanpa dependensi, atau dapatkan tautan publik instan."
  }
];

const FEATURES = [
  {
    title: "Layout Adaptif Berbasis Data",
    desc: "Bukan template statis yang kaku. Struktur tata letak dan ritme visual disesuaikan dinamis mengikuti kepadatan konten dan peran profesional Anda."
  },
  {
    title: "Workspace Studio Realtime",
    desc: "Kanvas pratinjau terisolasi yang langsung memperbarui tampilan saat Anda mengisi data atau meminta revisi, lengkap dengan mode desktop dan mobile."
  },
  {
    title: "Revisi Obrolan Interaktif",
    desc: "Minta perubahan spesifik seperti penyesuaian warna aksen, penulisan ulang deskripsi proyek, atau reposisi bagian portofolio dengan bahasa santai."
  },
  {
    title: "Kode HTML Mandiri Siap Host",
    desc: "Hasil akhir adalah file HTML dan Tailwind CSS murni. Anda memegang kendali penuh atas kode Anda tanpa ketergantungan platform."
  }
];

const COMPARISON: Array<[string, string, string]> = [
  ["Waktu Pengerjaan", "Hitungan menit", "Berhari-hari hingga berminggu-minggu"],
  ["Sistem Akun", "Langsung pakai tanpa registrasi", "Wajib login dan verifikasi email"],
  ["Arsitektur Desain", "Tata letak adaptif otomatis", "Pilihan template kaku yang pasaran"],
  ["Kepemilikan Kode", "File HTML mandiri milik Anda", "Terkunci di dalam platform pembuat"],
  ["Proses Revisi", "Perubahan instan via chat AI", "Edit manual satu per satu secara rumit"],
  ["Biaya", "Gratis dan open-source (MIT)", "Biaya langganan bulanan mahal"],
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#0A0A0B] text-[#F5F5F7] font-sans selection:bg-white selection:text-black">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#0A0A0B]/85 backdrop-blur-md border-b border-white/[0.06]">
        <div className="max-w-[1120px] mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <Logo size={22} variant="white" />
            <span className="font-semibold text-sm tracking-tight text-white">OpenFolio</span>
          </Link>

          <nav className="hidden md:flex items-center gap-7 text-xs font-medium text-zinc-400">
            <a href="#cara-kerja" className="hover:text-white transition-colors">Cara Kerja</a>
            <a href="#fitur" className="hover:text-white transition-colors">Fitur</a>
            <a href="#perbandingan" className="hover:text-white transition-colors">Perbandingan</a>
            <a href={GITHUB_URL} target="_blank" rel="noreferrer" className="hover:text-white transition-colors flex items-center gap-1.5">
              <Github className="w-3.5 h-3.5" />
              GitHub
            </a>
          </nav>

          <div className="flex items-center gap-3">
            <a 
              href={GITHUB_URL} 
              target="_blank" 
              rel="noreferrer" 
              className="p-2 text-zinc-400 hover:text-white transition-colors md:hidden"
              aria-label="GitHub Repository"
            >
              <Github className="w-4 h-4" />
            </a>
            <Link 
              to="/app" 
              className="bg-white text-black px-4 py-2 rounded-lg text-xs font-medium hover:bg-zinc-200 transition-colors"
            >
              Buka Studio
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-[1120px] mx-auto px-6 pt-16 md:pt-24 pb-24">
        {/* Hero Section */}
        <section className="mb-28">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Headline */}
            <div className="lg:col-span-7 space-y-6">
              <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-white leading-[1.08]">
                Portofolio profesional Anda, dikodekan cerdas oleh AI.
              </h1>

              <p className="text-base sm:text-lg text-zinc-400 font-normal leading-relaxed max-w-xl">
                Ubah riwayat karier, karya proyek, dan keahlian Anda menjadi website portofolio yang bersih, responsif, dan siap dipublikasikan tanpa perlu membuat website dari nol.
              </p>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <Link 
                  to="/app" 
                  className="inline-flex items-center gap-2 bg-white text-black px-6 py-3 rounded-lg text-sm font-semibold hover:bg-zinc-200 transition-colors"
                >
                  Mulai Buat Portofolio
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <a 
                  href={GITHUB_URL} 
                  target="_blank" 
                  rel="noreferrer" 
                  className="inline-flex items-center gap-2 bg-zinc-900 border border-white/10 text-zinc-200 px-5 py-3 rounded-lg text-sm font-medium hover:bg-zinc-800 transition-colors"
                >
                  <Github className="w-4 h-4 text-zinc-400" />
                  Lihat di GitHub
                </a>
              </div>

              <div className="flex flex-wrap items-center gap-6 pt-4 text-xs text-zinc-500 font-medium">
                <span>Tanpa registrasi akun</span>
                <span>·</span>
                <span>Download file HTML</span>
                <span>·</span>
                <span>Open source (MIT)</span>
              </div>
            </div>

            {/* Realistic Portfolio Mockup */}
            <div className="lg:col-span-5">
              <div className="bg-[#121215] border border-white/[0.08] rounded-2xl p-6 space-y-5">
                {/* Browser bar */}
                <div className="flex items-center justify-between pb-4 border-b border-white/[0.06]">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-zinc-700" />
                    <span className="w-2.5 h-2.5 rounded-full bg-zinc-700" />
                    <span className="w-2.5 h-2.5 rounded-full bg-zinc-700" />
                  </div>
                  <span className="text-xs font-mono text-zinc-400 bg-zinc-900/80 px-3 py-1 rounded-md border border-white/[0.06]">
                    openfolio.app/p/alex-pratama
                  </span>
                </div>

                {/* Profile snippet */}
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-full bg-zinc-800 border border-white/10 flex items-center justify-center text-xs font-bold text-white">
                      AP
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-white">Alex Pratama</div>
                      <div className="text-xs text-zinc-400">Software Architect & Frontend Engineer</div>
                    </div>
                  </div>

                  <p className="text-xs text-zinc-300 leading-relaxed bg-zinc-900/50 p-3.5 rounded-xl border border-white/[0.04]">
                    Membangun sistem web berskala besar, performa tinggi, dan pengalaman antarmuka yang presisi.
                  </p>
                </div>

                {/* Skills tags */}
                <div className="space-y-2">
                  <div className="text-[11px] font-medium text-zinc-500">Tech Stack & Keahlian</div>
                  <div className="flex flex-wrap gap-1.5">
                    {["TypeScript", "React 19", "Next.js", "Tailwind CSS", "Node.js"].map(tag => (
                      <span key={tag} className="text-[11px] px-2.5 py-1 rounded-md bg-zinc-900 border border-white/[0.06] text-zinc-300">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Project card preview */}
                <div className="border border-white/[0.06] rounded-xl p-4 bg-zinc-900/30 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-white">CloudMetrics Studio</span>
                    <span className="text-[11px] text-zinc-400 font-mono">Live Demo</span>
                  </div>
                  <p className="text-xs text-zinc-400 leading-normal">
                    Dasbor analitik terdistribusi dengan visualisasi metrik latensi dan throughput secara realtime.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Workflow Section */}
        <section id="cara-kerja" className="mb-28 scroll-mt-24">
          <div className="space-y-3 mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              Cara Kerja
            </h2>
            <p className="text-sm text-zinc-400 max-w-lg">
              Alur terstruktur dari pengisian data riwayat hingga website portofolio siap digunakan.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {WORKFLOW.map(item => (
              <div 
                key={item.num} 
                className="bg-[#121215] border border-white/[0.08] rounded-xl p-6 flex flex-col justify-between space-y-4"
              >
                <div className="text-2xl font-bold font-mono text-zinc-600">
                  {item.num}
                </div>
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-white">{item.title}</h3>
                  <p className="text-xs text-zinc-400 leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Features Section */}
        <section id="fitur" className="mb-28 scroll-mt-24">
          <div className="space-y-3 mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              Fitur Utama
            </h2>
            <p className="text-sm text-zinc-400 max-w-lg">
              Semua yang Anda butuhkan untuk membangun dan memodifikasi portofolio secara fleksibel.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {FEATURES.map(feat => (
              <div 
                key={feat.title} 
                className="bg-[#121215] border border-white/[0.08] rounded-xl p-6 space-y-2.5"
              >
                <h3 className="text-base font-semibold text-white">
                  {feat.title}
                </h3>
                <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed font-normal">
                  {feat.desc}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Comparison Section */}
        <section id="perbandingan" className="mb-28 scroll-mt-24">
          <div className="space-y-3 mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              Kenapa OpenFolio?
            </h2>
            <p className="text-sm text-zinc-400 max-w-lg">
              Perbandingan pendekatan OpenFolio dengan metode pembuatan website konvensional.
            </p>
          </div>

          <div className="bg-[#121215] border border-white/[0.08] rounded-xl overflow-hidden">
            <div className="grid grid-cols-3 bg-zinc-900/70 border-b border-white/[0.08] p-4 text-xs font-semibold text-white">
              <div>Aspek</div>
              <div className="text-white">OpenFolio</div>
              <div className="text-zinc-500">Metode Konvensional</div>
            </div>

            <div className="divide-y divide-white/[0.06]">
              {COMPARISON.map(([param, us, them]) => (
                <div key={param} className="grid grid-cols-3 p-4 text-xs items-center">
                  <div className="font-medium text-zinc-300">{param}</div>
                  <div className="flex items-center gap-2 text-white font-medium">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    {us}
                  </div>
                  <div className="flex items-center gap-2 text-zinc-500">
                    <X className="w-4 h-4 text-zinc-600 shrink-0" />
                    {them}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Bottom CTA Box */}
        <section className="bg-[#121215] border border-white/[0.08] rounded-2xl p-8 md:p-14 text-center space-y-6">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-white max-w-xl mx-auto">
            Mulai rancang portofolio Anda sekarang.
          </h2>
          <p className="text-sm text-zinc-400 max-w-md mx-auto leading-relaxed">
            Tanpa registrasi dan tanpa biaya. Buka studio, isi data, dan hasilkan website portofolio Anda dalam hitungan detik.
          </p>
          <div className="pt-2 flex flex-wrap justify-center gap-3">
            <Link 
              to="/app" 
              className="inline-flex items-center gap-2 bg-white text-black px-6 py-3 rounded-lg text-sm font-semibold hover:bg-zinc-200 transition-colors"
            >
              Buka Studio
              <ArrowRight className="w-4 h-4" />
            </Link>
            <a 
              href={GITHUB_URL} 
              target="_blank" 
              rel="noreferrer" 
              className="inline-flex items-center gap-2 bg-zinc-900 border border-white/10 text-zinc-300 px-5 py-3 rounded-lg text-sm font-medium hover:bg-zinc-800 transition-colors"
            >
              <Github className="w-4 h-4" />
              Bintang di GitHub
            </a>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/[0.06] py-8 bg-[#0A0A0B]">
        <div className="max-w-[1120px] mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-zinc-500">
          <div className="flex items-center gap-2">
            <Logo size={16} variant="white" />
            <span>OpenFolio © {new Date().getFullYear()} · Lisensi Open Source (MIT)</span>
          </div>
          <div className="flex items-center gap-6">
            <a href={GITHUB_URL} target="_blank" rel="noreferrer" className="hover:text-zinc-300 transition-colors">
              GitHub
            </a>
            <Link to="/app" className="hover:text-zinc-300 transition-colors">
              Buka Studio
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
