import express from "express";
import path from "path";
import cors from "cors";
import dotenv from "dotenv";
import multer from "multer";
import { fileTypeFromBuffer } from "file-type";
import { v2 as cloudinary } from "cloudinary";
import { GoogleGenAI, Type } from "@google/genai";
import fs from "fs";
import os from "os";
import { PDFParse } from "pdf-parse";
import rateLimit from "express-rate-limit";
import { escapeHTML, safeParseJSON, sanitizePortfolioData, buildPortfolioHTMLString } from "./portfolio-render";
import { initAdmin, requireAuth } from "./auth";
import { canSpend, markSpent, type QuotaType } from "./quota";
import { chatSchema, generateSchema, editSchema, injectSchema, validate } from "./validation";

dotenv.config();
initAdmin();

const UPLOAD_DIR = path.join(os.tmpdir(), "openfolio_uploads");
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Standardize API Key usage
const API_KEY = process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY_NEW;
if (!API_KEY) {
  console.warn("GEMINI_API_KEY tidak ditemukan — fitur AI nonaktif sampai diisi.");
}

const ai = API_KEY ? new GoogleGenAI({
  apiKey: API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
}) : null;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const FILE_LIMIT = 2 * 1024 * 1024; // 2MB

const multerDisk = (dest: string) =>
  multer({ dest, limits: { fileSize: FILE_LIMIT } });

const uploadImage = multerDisk(UPLOAD_DIR).single("file");
const uploadPdf = multerDisk(UPLOAD_DIR).single("file");

const ALLOWED_IMAGE_MAGIC = new Set(["jpg", "png", "webp"]);
async function assertMagicBytes(filePath: string, allowed: Set<string>): Promise<boolean> {
  const buf = await fs.promises.readFile(filePath);
  const type = await fileTypeFromBuffer(buf);
  return !!type && allowed.has(type.ext);
}

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT || 3001);

  const corsOrigins = (process.env.CORS_ORIGIN || "http://localhost:3001").split(",").map(s => s.trim());
  app.use(cors({ origin: corsOrigins }));
  app.use(express.json({ limit: "5mb" }));
  app.use(express.urlencoded({ limit: "5mb", extended: true }));

  const aiRateLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 15,
    message: { error: "Terlalu banyak permintaan. Silakan coba lagi nanti." },
    standardHeaders: true,
    legacyHeaders: false,
  });
  app.use("/api/gemini", aiRateLimiter);

  const fileLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 10,
    message: { error: "Terlalu banyak permintaan. Coba lagi nanti." },
    standardHeaders: true,
    legacyHeaders: false,
  });
  app.use("/api/upload", fileLimiter);
  app.use("/api/pdf/parse", fileLimiter);

  async function guardQuota(uid: string, type: QuotaType, res: any): Promise<boolean> {
    const ok = await canSpend(uid, type);
    if (!ok) {
      res.status(429).json({ error: `Kamu sudah mencapai limit harian (${type}). Coba lagi besok.` });
      return false;
    }
    return true;
  }

  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  app.post("/api/pdf/parse", requireAuth, uploadPdf, async (req, res) => {
    if (!req.file) return res.status(400).json({ error: "File tidak ada." });
    try {
      const buf = await fs.promises.readFile(req.file.path);
      const type = await fileTypeFromBuffer(buf);
      if (!type || type.ext !== "pdf") {
        await fs.promises.unlink(req.file.path).catch(() => {});
        return res.status(400).json({ error: "Hanya file PDF yang didukung." });
      }
      const parser = new PDFParse({ data: buf });
      const data = await parser.getText();
      res.json({ text: data.text });
    } catch (e) {
      console.error("[PDF Parse]", e);
      res.status(500).json({ error: "Gagal memproses file." });
    } finally {
      if (req.file?.path) await fs.promises.unlink(req.file.path).catch(() => {});
    }
  });

  app.post("/api/upload", requireAuth, uploadImage, async (req, res) => {
    if (!req.file) return res.status(400).json({ error: "File tidak ada." });
    try {
      const ok = await assertMagicBytes(req.file.path, ALLOWED_IMAGE_MAGIC);
      if (!ok) {
        await fs.promises.unlink(req.file.path).catch(() => {});
        return res.status(400).json({ error: "Tipe file tidak didukung. Hanya JPG, PNG, atau WebP." });
      }
      if (!process.env.CLOUDINARY_API_KEY) {
        await fs.promises.unlink(req.file.path).catch(() => {});
        return res.status(503).json({ error: "Upload belum dikonfigurasi." });
      }
      const tempPath = req.file.path + (path.extname(req.file.originalname) || ".jpg");
      await fs.promises.rename(req.file.path, tempPath);
      const result = await cloudinary.uploader.upload(tempPath, { folder: "openfolio", timeout: 50000 });
      await fs.promises.unlink(tempPath).catch(() => {});
      res.json({ url: result.secure_url });
    } catch (e: any) {
      console.error("[Upload]", e);
      if (req.file?.path) await fs.promises.unlink(req.file.path).catch(() => {});
      res.status(500).json({ error: "Gagal mengunggah file." });
    }
  });

  // Gemini Chat Route
  app.post("/api/gemini/chat", requireAuth, validate(chatSchema), async (req, res) => {
    if (!ai) {
      return res.status(503).json({ error: "AI belum dikonfigurasi" });
    }
    if (!(await guardQuota(req.user!.uid, "chat", res))) return;
    try {
      const { messages } = req.body;
      const history = messages.map((m) => ({
        role: m.role === 'assistant' ? 'model' : (m.role === 'model' ? 'model' : 'user'),
        parts: [{ text: m.content || " " }]
      }));
      
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Transfer-Encoding', 'chunked');
      
      const responseStream = await ai.models.generateContentStream({
        model: "gemini-2.5-flash",
        contents: history,
        config: {
          systemInstruction: "Kamu adalah OpenFolio Identity Engine. Tugasmu adalah mengumpulkan data identitas profesional user untuk membangun portfolio premium. Tanya pertanyaan SATU PER SATU dalam urutan: 1. Nama lengkap? 2. Peran profesional & spesialisasi? 3. Headline/manifesto singkat tentang karyamu? 4. Area skill utama? 5. Riwayat karier? 6. Proyek unggulan? 7. Kontak & Lokasi? Mood bicaramu harus tenang, elegan, dan profesional. Hindari gaya bicara robotik atau cinematic berlebihan. Jika semua data terkumpul atau user minta revisi, katakan: 'Sebentar ya, aku sedang menyusun narasi identitasmu... ✨'",
        }
      });

      for await (const chunk of responseStream) {
        if (chunk.text) {
          res.write(chunk.text);
        }
      }
      res.end();
      try {
        await markSpent(req.user!.uid, "chat");
      } catch (e: any) {
        console.error("Gagal mencatat pemakaian kuota chat:", e);
      }
    } catch (e: any) {
      const errorStr = e.toString() + (e.message || "");
      const isQuotaExhausted = errorStr.includes("429") || errorStr.toLowerCase().includes("quota") || errorStr.toLowerCase().includes("exhausted");
      
      if (isQuotaExhausted) {
         console.warn("Gemini Chat Quota Exhausted.");
      } else {
         console.error("Gemini Chat Error:", e.message);
      }
      
      let userMessage = isQuotaExhausted ? "AI Edit sementara tidak tersedia karena batas penggunaan Gemini telah tercapai." : "Maaf, terjadi gangguan pada sistem AI.";
      let statusCode = isQuotaExhausted ? 429 : 500;
      
      if (!res.headersSent) {
        res.status(statusCode).json({ error: userMessage });
      } else {
        res.end(`\n\nError: ${userMessage}`);
      }
    }
  });  // Helper to construct robust local fallback in case LLM is busy or fails
  const buildLocalFallbackData = (structured: any, template: string) => {
    const templateName = template || "obsidian";
    const name = structured?.fullName || "";
    const role = structured?.role || "";
    const bio = structured?.bio || "";
    const skillsList = Array.isArray(structured?.skills) 
      ? structured.skills 
      : (typeof structured?.skills === 'string' ? structured.skills.split(',').map((s: string) => s.trim()) : []);
    
    let projectsArray: any[] = [];
    if (Array.isArray(structured?.projects)) {
      projectsArray = structured.projects.map((p: any) => ({
        title: p.title || p.name || "Proyek",
        description: p.description || p.desc || "Detail proyek tersedia.",
        image_url: p.image_url || p.image || null,
        link: p.link || p.url || "#",
        tags: Array.isArray(p.tags) ? p.tags : (p.tags ? [p.tags] : ["Personal"])
      }));
    } else if (typeof structured?.projects === 'string' && structured.projects.length > 0) {
      projectsArray = structured.projects.split(';').map((pStr: string, idx: number) => {
        const parts = pStr.split(':');
        return {
          title: parts[0]?.trim() || `Proyek ${idx + 1}`,
          description: parts[1]?.trim() || `Detail proyek tersedia berdasarkan request.`,
          image_url: null,
          link: "#",
          tags: ["Personal"]
        };
      });
    }

    if (projectsArray.length === 0) {
      projectsArray = [];
    }

    // Determine colors
    let color_accent = "#C9A84C";
    let color_accent_hover = "#B8973E";
    if (templateName === 'kinetic') {
      color_accent = "#00E676";
      color_accent_hover = "#00C853";
    } else if (templateName === 'aurora') {
      color_accent = "#7F00FF";
      color_accent_hover = "#6600CC";
    } else if (templateName === 'folio') {
      color_accent = "#1b4332";
      color_accent_hover = "#143225";
    } else if (templateName === 'studio') {
      color_accent = "#4F46E5";
      color_accent_hover = "#4338CA";
    } else if (templateName === 'nexus') {
      color_accent = "#3B82F6";
      color_accent_hover = "#2563EB";
    } else if (templateName === 'pulse') {
      color_accent = "#EF4444";
      color_accent_hover = "#DC2626";
    } else if (templateName === 'manuscript') {
      color_accent = "#334155";
      color_accent_hover = "#1E293B";
    }

    return {
      name,
      role,
      hero_description: bio,
      hero_image_url: structured?.profilePhoto || null,
      visual_behavior: {
        identity_tone: 'stoic',
        layout_density: 'balanced',
        asymmetry_level: 0.02,
        typography_scale: 'balanced',
        motion_intensity: 'subtle',
        content_pacing: 'deliberate'
      },
      layout_config: {
        section_ordering: ["hero", "about", "career", "projects", "skills", "contact"],
        show_navbar: true
      },
      socials: structured?.contacts || {},
      about_paragraph_1: bio,
      about_paragraph_2: null,
      contact_email: (structured?.contacts?.email && structured?.contacts?.email !== "hello@example.com") ? structured.contacts.email : "",
      contact_location: structured?.contacts?.location || "",
      stats: [],
      skills: skillsList.length > 0 ? [
        {
          "title": "Skill Utama",
          "items": skillsList,
          "visual_weight": 8
        }
      ] : [],
      projects: projectsArray,
      career: Array.isArray(structured?.career) ? structured.career.map((c: any) => ({
        period: (c.yearStart || c.yearEnd) ? `${c.yearStart || ""} - ${c.yearEnd || "Sekarang"}` : "",
        role: c.position || "",
        company: c.company || "",
        description: c.description || ""
      })) : [],
      color_accent,
      color_accent_hover,
      footer_year: "2026",
      templateName
    };
  };  // JSON Generation route
  app.post("/api/gemini/generate", requireAuth, validate(generateSchema), async (req, res) => {
    if (!ai) {
      return res.status(503).json({ error: "AI belum dikonfigurasi" });
    }
    if (!(await guardQuota(req.user!.uid, "generate", res))) return;
    try {
      const { messages, selectedTemplate, structuredData } = req.body;
      const conversationText = (messages || []).map((m) => m.role + ": " + m.content).join("\n");
      
      // Prevent uploading massive Base64 strings to Gemini context
      const cleanStructuredData = JSON.parse(JSON.stringify(structuredData || {}));
      if (cleanStructuredData.profilePhoto && cleanStructuredData.profilePhoto.startsWith("data:")) {
          cleanStructuredData.profilePhoto = "<IMAGE_URL_REMOVED_TO_SAVE_TOKENS_BUT_WILL_BE_INJECTED_LATER>";
      }
      if (Array.isArray(cleanStructuredData.projects)) {
          cleanStructuredData.projects.forEach((p: any) => {
             if (p.image_url && p.image_url.startsWith("data:")) {
                 p.image_url = "<IMAGE_URL_REMOVED_TO_SAVE_TOKENS_BUT_WILL_BE_INJECTED_LATER>";
             }
          });
      }

      const prompt = `Kamu adalah **OpenFolio Identity Rendering Engine**, sebuah sistem formatter yang BERTUGAS SANGAT KETAT untuk mempertahankan kebenaran data (STRICT USER-TRUTH RENDER ENGINE).
KODE ETIK UTAMA (ZERO FICTION POLICY):
1. DILARANG KERAS mengarang fakta, biografi, geografi, atau pengalaman yang tidak diinput user.
2. DILARANG KERAS menaikkan skala proyek (misal: jangan mengubah "aplikasi saham biasa" menjadi "platform finansial nasional dengan infrastruktur real-time").
3. DILARANG KERAS membuat nama perusahaan palsu, email palsu, atau link palsu. Jika kosong, biarkan kosong ("").
4. JIKA DATA KOSONG, render array kosong [] atau string kosong "". JANGAN berikan teks dummy/fallback.
5. BERSIKAP SEBAGAI EDITOR: rapikan grammar dan keterbacaan, TAPI PERTAHANKAN MAKNA ASLI.
6. JANGAN bertindak sebagai storyteller atau copywriter marketing. Gunakan gaya bahasa kasual, lugas, dan jujur sesuai data asli.

⚠️ ATURAN COPYWRITING (ANTI-AI SLOP):
- TIDAK BOLEH menggunakan buzzword AI seperti: "presisi", "harmoni", "immersive", "seamless", "kombinasi epik", "skala nasional", "arsitektur mutakhir".
- Gunakan bahasa yang grounded, concise, dan jujur (truth-preserving).

⚠️ STRUKTUR DATA PORTOFOLIO ASLI (WAJIB DIPERTAHANKAN MAKNANYA, JANGAN DITAMBAH FIKSI):
${JSON.stringify(cleanStructuredData, null, 2)}

STRUKTUR JSON YANG WAJIB DIHASILKAN:
{
  "name": "string (sama persis dengan input, tanpa tambahan)",
  "role": "string (sama persis dengan input, rapikan sedikit)",
  "hero_description": "string (deskripsi padat dari "about", maks 2 kalimat, jangan mengada-ada)",
  "hero_image_url": "string | null",
  "visual_behavior": {
    "identity_tone": "string (pilih: stoic, vibrant, technical)",
    "layout_density": "string (pilih: airy, compact, balanced)",
    "asymmetry_level": number (0.0 - 0.1),
    "typography_scale": "string (pilih: balanced, compact)",
    "motion_intensity": "string (pilih: subtle)",
    "content_pacing": "string (pilih: rapid, deliberate)"
  },
  "layout_config": {
    "section_ordering": ["hero", "about", "career", "projects", "skills", "contact"],
    "show_navbar": boolean
  },
  "socials": {
    "linkedin": "string | null",
    "github": "string | null",
    "website": "string | null",
    "twitter": "string | null",
    "instagram": "string | null"
  },
  "about_paragraph_1": "string (narasi grounded)",
  "about_paragraph_2": "string | null",
  "contact_email": "string",
  "contact_location": "string",
  "stats": [
    {"value": "string", "label": "string"}
  ],
  "skills": [
    {
       "title": "string (Nama kategori kreatif)",
       "items": ["string"],
       "category": "string",
       "visual_weight": number (1-10)
    }
  ],
  "projects": [
    {
       "title": "string",
       "description": "string",
       "image_url": "string | null",
       "link": "string | null",
       "tags": ["string"],
       "visual_priority": "high | medium | low"
    }
  ],
  "career": [
    {
       "period": "string",
       "role": "string",
       "company": "string",
       "description": "string"
    }
  ],
  "color_accent": "string (Hex)",
  "color_accent_hover": "string (Hex)",
  "footer_year": "2026",
  "templateName": "obsidian | kinetic | aurora | folio | studio | nexus | pulse | manuscript"
}

PENTING: Portofolio ini adalah representasi harga diri karya pengguna. Jadikan karya ini profesional, berkualitas tinggi, berkarakter kuat, dan dapat diandalkan!

Percakapan Onboarding:
${conversationText}`;

      let dataJson: any = {};
      try {
        let response;
        let attempt = 0;
        const maxAttempts = 5;
        
        while (attempt < maxAttempts) {
          try {
            response = await ai.models.generateContent({
              model: "gemini-2.5-flash",
              contents: prompt,
              config: {
                responseMimeType: "application/json",
                responseSchema: {
                  type: Type.OBJECT,
                  properties: {
                name: { type: Type.STRING },
                role: { type: Type.STRING },
                hero_description: { type: Type.STRING },
                hero_image_url: { type: Type.STRING, nullable: true },
                visual_behavior: {
                  type: Type.OBJECT,
                  properties: {
                    identity_tone: { type: Type.STRING },
                    layout_density: { type: Type.STRING },
                    asymmetry_level: { type: Type.NUMBER },
                    typography_scale: { type: Type.STRING },
                    motion_intensity: { type: Type.STRING },
                    content_pacing: { type: Type.STRING }
                  },
                  required: ["identity_tone", "layout_density", "asymmetry_level", "typography_scale", "motion_intensity", "content_pacing"]
                },
                layout_config: {
                  type: Type.OBJECT,
                  properties: {
                    section_ordering: { type: Type.ARRAY, items: { type: Type.STRING } },
                    show_navbar: { type: Type.BOOLEAN }
                  },
                  required: ["section_ordering", "show_navbar"]
                },
                socials: {
                  type: Type.OBJECT,
                  properties: {
                    linkedin: { type: Type.STRING, nullable: true },
                    github: { type: Type.STRING, nullable: true },
                    website: { type: Type.STRING, nullable: true },
                    twitter: { type: Type.STRING, nullable: true },
                    instagram: { type: Type.STRING, nullable: true },
                    x: { type: Type.STRING, nullable: true },
                    dribbble: { type: Type.STRING, nullable: true },
                    whatsapp: { type: Type.STRING, nullable: true }
                  }
                },
                about_paragraph_1: { type: Type.STRING },
                about_paragraph_2: { type: Type.STRING, nullable: true },
                contact_email: { type: Type.STRING },
                contact_location: { type: Type.STRING },
                stats: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      value: { type: Type.STRING },
                      label: { type: Type.STRING }
                    },
                    required: ["value", "label"]
                  }
                },
                skills: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      title: { type: Type.STRING },
                      items: { type: Type.ARRAY, items: { type: Type.STRING } },
                      visual_weight: { type: Type.NUMBER }
                    },
                    required: ["title", "items", "visual_weight"]
                  }
                },
                projects: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      title: { type: Type.STRING },
                      description: { type: Type.STRING },
                      image_url: { type: Type.STRING, nullable: true },
                      link: { type: Type.STRING, nullable: true },
                      tags: { type: Type.ARRAY, items: { type: Type.STRING } },
                      visual_priority: { type: Type.STRING }
                    },
                    required: ["title", "description", "tags", "visual_priority"]
                  }
                },
                career: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      period: { type: Type.STRING },
                      role: { type: Type.STRING },
                      company: { type: Type.STRING },
                      description: { type: Type.STRING }
                    },
                    required: ["period", "role", "company", "description"]
                  }
                },
                color_accent: { type: Type.STRING },
                color_accent_hover: { type: Type.STRING, nullable: true },
                footer_year: { type: Type.STRING },
                templateName: { type: Type.STRING }
              },
              required: ["name", "role", "hero_description", "visual_behavior", "layout_config", "socials", "about_paragraph_1", "contact_email", "contact_location", "skills", "projects", "career", "color_accent", "footer_year", "templateName"]
            }
          }
        });
        break;
      } catch (err: any) {
         attempt++;
         const errMessage = String(err.message || '').toLowerCase();
         const isQuotaExhausted = err.status === 429 || errMessage.includes('quota') || errMessage.includes('resource_exhausted') || errMessage.includes('429');
         const isRetryable = (err.status === 503 || errMessage.includes('503') || errMessage.includes('unavailable')) && !isQuotaExhausted;
         
         if (isQuotaExhausted) {
             console.warn(`[GENERATE PIPELINE] Attempt ${attempt} failed: QUOTA_EXHAUSTED`);
             throw new Error("QUOTA_EXHAUSTED");
         }
         
         console.warn(`[GENERATE PIPELINE] Attempt ${attempt} failed:`, err.message);
         if (attempt >= maxAttempts || !isRetryable) {
           throw err;
         }
         let delay = 1000 * attempt;
         const match = String(err.message || '').match(/retry in (\d+(?:\.\d+)?)s/i);
         if (match) {
           delay = Math.ceil(parseFloat(match[1])) * 1000 + 1500;
         }
         console.log(`[GENERATE PIPELINE] Memulai backoff selama ${delay}ms sebelum attempt ${attempt + 1}...`);
         await new Promise(r => setTimeout(r, delay));
      }
    }
    
    if (!response) {
      throw new Error("Gagal mendapatkan respon AI setelah beberapa percobaan.");
    }
        
    const rawJson = safeParseJSON(response.text);
        dataJson = rawJson.name ? rawJson : (rawJson.data || rawJson.portfolio || rawJson);
        
        // Preserve injected image URLs from structured data (LLM sometimes drops/hallucinates them)
        if (structuredData?.profilePhoto && (!dataJson.hero_image_url || dataJson.hero_image_url === "")) {
            dataJson.hero_image_url = structuredData.profilePhoto;
        }
        if (structuredData?.projects && Array.isArray(structuredData.projects) && Array.isArray(dataJson.projects)) {
            dataJson.projects.forEach((proj: any, idx: number) => {
               if (proj && (!proj.image_url || proj.image_url === "")) {
                   const srcProj = structuredData.projects.find((p:any) => p.title && p.title.toLowerCase() === (proj.title || "").toLowerCase());
                   if (srcProj && srcProj.image_url) {
                       proj.image_url = srcProj.image_url;
                   } else if (structuredData.projects[idx] && structuredData.projects[idx].image_url) {
                       proj.image_url = structuredData.projects[idx].image_url;
                   }
               }
            });
        }
        
        if (!dataJson.name && structuredData?.fullName) {
            dataJson.name = structuredData.fullName;
        }
        if (!dataJson.role && structuredData?.role) {
            dataJson.role = structuredData.role;
        }
        
        // If it's still missing vital parts after parsing, verify it has name
        if (!dataJson || (!dataJson.name && !dataJson.role)) {
             throw new Error("Parsed JSON missing identity data.");
        }
      } catch (geminiErr: any) {
        console.log("[OpenFolio] Gemini execution encountered an issue, using fallback:", geminiErr.message);
        dataJson = buildLocalFallbackData(structuredData, selectedTemplate || "folio");
      }

      await markSpent(req.user!.uid, "generate");
      res.status(200).json(dataJson);
    } catch (e: any) {
      if (e.message === "QUOTA_EXHAUSTED") {
         console.warn("Gemini Generate Quota Exhausted.");
         return res.status(429).json({ error: "Build portofolio sementara tidak tersedia karena batas penggunaan Gemini telah tercapai." });
      }
      console.error("Gemini Generate Error:", e.message);
      const errMessage = String(e.message || '').toLowerCase();
      const isOverloaded = e.status === 503 || errMessage.includes("503") || errMessage.includes("unavailable");
      res.status(isOverloaded ? 503 : 500).json({ error: isOverloaded ? "Model sedang sibuk. Silakan coba klik tombol Build lagi dalam beberapa detik." : (e.message || "Gagal merancang identitas digital.") });
    }
  });

  // JSON Revision Editor route
  app.post("/api/gemini/edit", requireAuth, validate(editSchema), async (req, res) => {
    if (!ai) {
      return res.status(503).json({ error: "AI belum dikonfigurasi" });
    }
    if (!(await guardQuota(req.user!.uid, "edit", res))) return;
    console.log("[EDIT PIPELINE] Request received");
    try {
      const { currentData, userMessage, history } = req.body;
      const conversationText = (history || []).map((m) => m.role + ": " + m.content).join("\n");
      
      const cleanCurrentData = JSON.parse(JSON.stringify(currentData || {}));
      if (cleanCurrentData.hero_image_url && cleanCurrentData.hero_image_url.startsWith("data:")) {
          cleanCurrentData.hero_image_url = "<IMAGE_URL_REMOVED_TO_SAVE_TOKENS_BUT_WILL_BE_INJECTED_LATER>";
      }
      if (Array.isArray(cleanCurrentData.projects)) {
          cleanCurrentData.projects.forEach((p: any) => {
             if (p.image_url && p.image_url.startsWith("data:")) {
                 p.image_url = "<IMAGE_URL_REMOVED_TO_SAVE_TOKENS_BUT_WILL_BE_INJECTED_LATER>";
             }
          });
      }

      const prompt = `Kamu adalah OpenFolio Identity Editor.
Tugasmu adalah memodifikasi data portofolio JSON agar sesuai dengan instruksi revisi user tanpa merusak Schema Identity Behavior.

⚠️ ZERO FICTION POLICY & ATURAN REVISI:
1. DILARANG MERUSAK SCHEMA: Simpan struktur bersarang (nested structure) persis sama.
2. DILARANG BERHALUSINASI: Jangan tambahkan data fiksi. Pelihara kebenaran data (TRUTH-PRESERVING).
3. PENGHAPUSAN: Jika user meminta penghapusan, kosongkan data dengan null, "", atau [].
4. BAHASA: Gunakan bahasa kasual profesional di 'explanation'.
5. WAJIB FULL JSON: Kembalikan KESELURUHAN (FULL) struktur JSON portofolio. Jangan hanya mengembalikan bagian yang berubah. Sertakan kembali data yang tidak berubah agar tidak hilang!

⚠️ OBJECT JSON PORTOFOLIO SAAT INI:
${JSON.stringify(cleanCurrentData, null, 2)}

INSTRUKSI REVISI USER:
"${userMessage}"

Format JSON:
{
  "explanation": "string",
  "data": { ... seluruh object portofolio secara lengkap (FULL KESELURUHAN) termasuk yang dimodifikasi ... }
}`;
      console.log("[EDIT PIPELINE] Prompt generated");

      let response;
      let attempt = 0;
      const maxAttempts = 5;
      
      while (attempt < maxAttempts) {
        try {
          response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
              responseMimeType: "application/json"
            }
          });
          break; // success
        } catch (err: any) {
          attempt++;
          const errMessage = String(err.message || '').toLowerCase();
          const isQuotaExhausted = err.status === 429 || errMessage.includes('quota') || errMessage.includes('resource_exhausted') || errMessage.includes('429');
          
          if (isQuotaExhausted) {
             console.warn(`[EDIT PIPELINE] Attempt ${attempt} failed: QUOTA_EXHAUSTED`);
             throw new Error("QUOTA_EXHAUSTED");
          }
          
          console.warn(`[EDIT PIPELINE] Attempt ${attempt} failed:`, err.message);
          const isRetryable = (err.status === 503 || errMessage.includes('503') || errMessage.includes('unavailable')) && !isQuotaExhausted;
          if (attempt >= maxAttempts || !isRetryable) {
            throw err;
          }
          let delay = 1000 * attempt;
          const match = String(err.message || '').match(/retry in (\d+(?:\.\d+)?)s/i);
          if (match) {
            delay = Math.ceil(parseFloat(match[1])) * 1000 + 1500;
          }
          console.log(`[EDIT PIPELINE] Memulai backoff selama ${delay}ms sebelum attempt ${attempt + 1}...`);
          await new Promise(r => setTimeout(r, delay));
        }
      }
      
      if (!response) {
         throw new Error("Gagal mendapatkan respon dari AI.");
      }
      console.log("[EDIT PIPELINE] Gemini response", response.text.substring(0, 500) + "...");

      const parsed = safeParseJSON(response.text);
      if (!parsed || !parsed.data) {
         throw new Error("Respon AI tidak valid atau tidak memiliki object 'data'.");
      }
      
      let finalData = { ...currentData };
      const isObject = (item: any) => (item && typeof item === 'object' && !Array.isArray(item));
      for (const key in parsed.data) {
          if (key === 'career' || key === 'projects') continue; // Handled below
          if (isObject(parsed.data[key]) && isObject(finalData[key])) {
              finalData[key] = { ...finalData[key], ...parsed.data[key] };
          } else {
              finalData[key] = parsed.data[key];
          }
      }

      // --- PROJECT SMART MERGE FIX ---
      if (parsed.data.projects !== undefined) {
          if (!Array.isArray(parsed.data.projects) && isObject(parsed.data.projects)) {
              // Jika Gemini mengembalikan object tunggal (kesalahan umum delta), ubah menjadi array lalu merge
              let inc = parsed.data.projects;
              let mergedProjects = Array.isArray(currentData.projects) ? [...currentData.projects] : [];
              const titleMatch = inc?.title || inc?.name;
              if (titleMatch) {
                  const exists = mergedProjects.find((p:any) => 
                      (p.title && p.title.toLowerCase() === titleMatch.toLowerCase()) ||
                      (p.name && p.name.toLowerCase() === titleMatch.toLowerCase())
                  );
                  if (exists) {
                      Object.assign(exists, inc);
                  } else {
                      mergedProjects.push({ ...inc, title: titleMatch });
                  }
              }
              finalData.projects = mergedProjects;
          } else if (Array.isArray(parsed.data.projects)) {
              // Percaya pada Array penuh dari Gemini agar operasi Delete / Rename bisa berjalan
              finalData.projects = parsed.data.projects;
          }
      }

      // --- CAREER ADDITION MERGE FIX ---
      if (parsed.data.career !== undefined) {
          let incomingCareer = parsed.data.career;
          if (isObject(incomingCareer)) incomingCareer = [incomingCareer];
          
          if (Array.isArray(incomingCareer)) {
              let mergedCareer = Array.isArray(currentData.career) ? [...currentData.career] : [];
              for (const inc of incomingCareer) {
                  if (!inc || (!inc.role && !inc.company)) continue;
                  
                  const exists = mergedCareer.find((c:any) => 
                      (c.role && c.role === inc.role) || 
                      (c.company && c.company === inc.company)
                  );
                  
                  if (!exists) {
                      mergedCareer.push(inc);
                  } else {
                      Object.assign(exists, inc);
                  }
              }
              finalData.career = mergedCareer;
          }
      }

      // Preserve image URLs
      if (currentData.hero_image_url && (!finalData.hero_image_url || finalData.hero_image_url === "")) {
          finalData.hero_image_url = currentData.hero_image_url;
      }
      if (Array.isArray(currentData.projects) && Array.isArray(finalData.projects)) {
          finalData.projects.forEach((proj: any, idx: number) => {
              if (proj && (!proj.image_url || proj.image_url === "")) {
                  const srcProj = currentData.projects.find((p:any) => p.title && p.title.toLowerCase() === (proj.title || "").toLowerCase());
                  if (srcProj && srcProj.image_url) {
                      proj.image_url = srcProj.image_url;
                  } else if (currentData.projects[idx] && currentData.projects[idx].image_url) {
                      proj.image_url = currentData.projects[idx].image_url;
                  }
              }
          });
      }

      parsed.data = finalData;
      
      if (!parsed.data.name) {
         console.log(parsed);
         throw new Error("Respon AI tidak lengkap atau terpotong. Harap ulangi instruksi revisi.");
      }
      
      console.log("[EDIT PIPELINE] Parsed successfully");
      await markSpent(req.user!.uid, "edit");
      res.json(parsed);
    } catch (e: any) {
      if (e.message === "QUOTA_EXHAUSTED") {
         console.warn("Gemini Edit Quota Exhausted.");
         return res.status(429).json({ error: "AI Edit sementara tidak tersedia karena batas penggunaan Gemini telah tercapai." });
      }
      console.error("Gemini Edit Error:", e.message);
      const errMessage = String(e.message || '').toLowerCase();
      const isOverloaded = e.status === 503 || errMessage.includes("503") || errMessage.includes("unavailable");
      res.status(isOverloaded ? 503 : 500).json({ error: isOverloaded ? "Model sedang sibuk. Silakan coba klik tombol kirim lagi dalam beberapa detik." : "Gagal memproses revisi identitas." });
    }
  });

  // Inject route
  app.post("/api/portfolio/inject", requireAuth, validate(injectSchema), (req, res) => {
    try {
      const { data } = req.body;
      const renderedHtml = buildPortfolioHTMLString(data);
      res.send(renderedHtml);
    } catch (e: any) {
      console.error(e);
      res.status(500).json({ error: e.message });
    }
  });

  const requestId = () => (Math.random().toString(36).slice(2, 10));
  app.use((err: any, req: any, res: any, next: any) => {
    const id = requestId();
    console.error(`[${id}]`, err);
    const isMulter = err instanceof multer.MulterError;
    const isValidation = err && err.type === "entity.parse.failed";
    const status = isMulter ? 400 : (isValidation ? 400 : 500);
    const message = status === 400 ? "Request tidak valid." : "Terjadi kesalahan internal. Coba lagi.";
    if (!res.headersSent) res.status(status).json({ error: message, requestId: id });
  });

  return app;
}

export const app = await startServer();
export default app;
