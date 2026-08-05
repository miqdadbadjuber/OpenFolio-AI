import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import cors from "cors";
import dotenv from "dotenv";
import multer from "multer";
import { v2 as cloudinary } from "cloudinary";
import { GoogleGenAI, Type } from "@google/genai";
import mustache from "mustache";
import fs from "fs";
import os from "os";
import { PDFParse } from "pdf-parse";
import rateLimit from "express-rate-limit";
import { safeParseJSON, sanitizePortfolioData, sanitizeEmailUrl } from "./server/portfolio-render";

dotenv.config();

const UPLOAD_DIR = path.join(os.tmpdir(), "openfolio_uploads");
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Standardize API Key usage
const API_KEY = process.env.GEMINI_API_KEY_NEW;

const ai = new GoogleGenAI({ 
  apiKey: API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const upload = multer({ 
  dest: UPLOAD_DIR, 
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedMimeTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'];
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type. Only PDF and images are allowed."));
    }
  }
});

async function startServer() {
  const app = express();
  const PORT = 3001;

  app.use(cors());
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

  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // PDF Parser Route
  app.post("/api/pdf/parse", upload.single("file"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file provided" });
      }
      const dataBuffer = fs.readFileSync(req.file.path);
      const parser = new PDFParse({ data: dataBuffer });
      const data = await parser.getText();
      res.json({ text: data.text });
    } catch (e: any) {
      console.error(e);
      res.status(500).json({ error: e.message });
    } finally {
      if (req.file?.path) {
        try { fs.unlinkSync(req.file.path); } catch(err){}
      }
    }
  });

      // Image Upload Route
  app.post("/api/upload", upload.single("file"), async (req, res, next) => {
    let tempPath = "";
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file provided" });
      }
      
      let finalUrl = "";

      if (!process.env.CLOUDINARY_API_KEY) {
         console.log(`[Upload API] Falling back to Data URI for ${req.file.originalname}`);
         const fileBuffer = fs.readFileSync(req.file.path);
         const b64 = fileBuffer.toString("base64");
         finalUrl = "data:" + req.file.mimetype + ";base64," + b64;
         console.log(`[Upload API] Generated Base64 URI of length ${finalUrl.length}`);
      } else {
         console.log(`[Upload API] Uploading to Cloudinary for ${req.file.originalname}...`);
         tempPath = req.file.path + (path.extname(req.file.originalname) || ".jpg");
         fs.renameSync(req.file.path, tempPath);
         const result = await cloudinary.uploader.upload(tempPath, {
           folder: "openfolio",
           timeout: 50000
         });
         finalUrl = result.secure_url;
         console.log(`[Upload API] Cloudinary upload finished. URL length: ${finalUrl.length}`);
      }
      
      res.json({ url: finalUrl });
    } catch (e: any) {
      console.log(`[Upload API] Upload rejected:`, e.message);
      const errorMsg = e.message || "Gagal mengunggah file";
      const status = e.http_code || (errorMsg.toLowerCase().includes("invalid") ? 400 : 500);
      res.status(status).json({ error: errorMsg });
    } finally {
      if (req.file?.path) {
         try { fs.unlinkSync(req.file.path); } catch (err) {}
      }
      if (tempPath !== "") {
         try { fs.unlinkSync(tempPath); } catch(err) {}
      }
    }
  });

  // Gemini Chat Route
  app.post("/api/gemini/chat", async (req, res) => {
    try {
      const { messages } = req.body;
      const history = messages.map((m: any) => ({
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
  app.post("/api/gemini/generate", async (req, res) => {
    try {
      const { messages, selectedTemplate, structuredData } = req.body;
      const conversationText = (messages || []).map((m:any) => m.role + ": " + m.content).join("\n");
      
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
  app.post("/api/gemini/edit", async (req, res) => {
    console.log("[EDIT PIPELINE] Request received");
    try {
      const { currentData, userMessage, history } = req.body;
      const conversationText = (history || []).map((m:any) => m.role + ": " + m.content).join("\n");
      
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

  // String builder to replace the template engine with Layout Intelligence & Visual Rhythm
  const buildPortfolioHTMLString = (rawContent: any) => {
    console.log("[OpenFolio] Initializing Render Pipeline...");
    const data = sanitizePortfolioData(rawContent);
    
    const { name, role, hero_description, color_accent, socials, behavior, layout } = {
      name: data.name,
      role: data.role,
      hero_description: data.hero_description,
      color_accent: data.color_accent,
      socials: data.socials,
      behavior: data.visual_behavior,
      layout: data.layout_config
    };
    
    // Identity-Driven Spacing System (Content-Aware Density)
    const hasSparseContent = (!data.projects || data.projects.length <= 1) && (!data.career || data.career.length === 0);
    const spacing: any = {
      airy: { py: hasSparseContent ? 'py-16' : 'py-20 md:py-28', gap: 'gap-10 md:gap-14', mb: 'mb-10 lg:mb-14' },
      balanced: { py: hasSparseContent ? 'py-12' : 'py-16 md:py-20', gap: 'gap-8 md:gap-10', mb: 'mb-8 lg:mb-10' },
      compact: { py: 'py-10 md:py-14', gap: 'gap-6 md:gap-8', mb: 'mb-6 md:mb-8' }
    };
    const s = spacing[behavior.layout_density] || spacing.balanced;

    // Typography Scale Intelligence (Readable, Human-Friendly)
    const typoScale: any = {
      balanced: { 
        h1: 'text-4xl md:text-5xl lg:text-[52px] tracking-tight font-bold leading-tight', 
        h2: 'text-2xl md:text-3xl tracking-tight font-bold', 
        p: 'text-base md:text-lg leading-relaxed max-w-2xl' 
      },
      compact: { 
        h1: 'text-3xl md:text-4xl lg:text-[44px] tracking-tight font-semibold leading-tight', 
        h2: 'text-xl md:text-2xl tracking-tight font-semibold', 
        p: 'text-sm md:text-base leading-relaxed max-w-2xl' 
      },
      editorial: { 
        h1: 'text-4xl md:text-5xl lg:text-[56px] font-serif tracking-tight font-medium leading-[1.1]', 
        h2: 'text-2xl md:text-3xl font-serif tracking-tight font-medium leading-[1.1]', 
        p: 'text-base md:text-lg font-serif leading-relaxed font-normal max-w-2xl' 
      }
    };
    const t = typoScale[behavior.typography_scale] || typoScale.balanced;

    const templateStyles: any = {
      clean: {
        bg: 'bg-white dark:bg-zinc-950',
        bodyBgStyle: '',
        text: 'text-zinc-600 dark:text-zinc-400',
        heading: 'text-zinc-900 dark:text-zinc-100',
        accentText: 'text-zinc-900 dark:text-zinc-100',
        border: 'border-zinc-200/60 dark:border-zinc-800/60',
        card: 'bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-100 dark:border-zinc-800/80 rounded-2xl p-6 md:p-8',
        pill: 'text-zinc-600 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 py-1.5 px-4 text-xs font-medium rounded-full',
        muted: 'text-zinc-400 dark:text-zinc-500',
        font: 'font-sans',
        navBg: 'bg-white/80 dark:bg-zinc-950/80',
        navText: 'text-zinc-800 dark:text-zinc-200'
      },
      minimalist: {
        bg: 'bg-zinc-50 dark:bg-zinc-900',
        bodyBgStyle: '',
        text: 'text-zinc-500 dark:text-zinc-400',
        heading: 'text-zinc-800 dark:text-zinc-100',
        accentText: 'text-zinc-800 dark:text-zinc-100',
        border: 'border-zinc-100 dark:border-zinc-800',
        card: 'bg-white dark:bg-zinc-950 shadow-sm border border-zinc-100/50 dark:border-zinc-800/50 rounded-xl p-6 md:p-8',
        pill: 'text-zinc-500 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700 py-1 px-3 text-xs rounded-full',
        muted: 'text-zinc-400 dark:text-zinc-600',
        font: 'font-sans',
        navBg: 'bg-white/80 dark:bg-zinc-900/80',
        navText: 'text-zinc-700 dark:text-zinc-300'
      },
      technical: {
        bg: 'bg-[#0a0a0a]',
        bodyBgStyle: 'background-image: radial-gradient(circle at 100% 100%, rgba(255,255,255,0.02) 0, transparent 50%);',
        text: 'text-zinc-400',
        heading: 'text-zinc-100',
        accentText: 'text-zinc-200',
        border: 'border-zinc-800',
        card: 'bg-zinc-900/30 border border-zinc-800/50 rounded-xl p-6 md:p-8',
        pill: 'text-zinc-300 bg-zinc-900 border border-zinc-800 py-1 px-3 text-xs font-mono rounded-md',
        muted: 'text-zinc-600',
        font: 'font-sans',
        navBg: 'bg-zinc-950/90 border-b border-zinc-900',
        navText: 'text-zinc-300'
      },
      editorial: {
        bg: 'bg-[#fdfcf8] dark:bg-stone-950',
        bodyBgStyle: '',
        text: 'text-stone-600 dark:text-stone-400',
        heading: 'text-stone-900 dark:text-stone-100 font-serif',
        accentText: 'text-stone-900 dark:text-stone-100',
        border: 'border-stone-200 dark:border-stone-800',
        card: 'bg-white dark:bg-stone-900 border border-stone-100 dark:border-stone-800 shadow-sm rounded-xl p-6 md:p-8',
        pill: 'text-stone-700 dark:text-stone-300 bg-stone-100 dark:bg-stone-800 py-1.5 px-4 text-xs font-serif rounded-full',
        muted: 'text-stone-400 dark:text-stone-600',
        font: 'font-serif',
        navBg: 'bg-[#fdfcf8]/90 dark:bg-stone-950/90',
        navText: 'text-stone-900 dark:text-stone-100'
      }
    };
    
    const toneMap: any = {
      stoic: 'clean',
      vibrant: 'minimalist',
      technical: 'technical',
      editorial: 'editorial',
      brutalist: 'clean'
    };
    
    const resolvedTone = toneMap[behavior.identity_tone] || 'clean';
    const style = templateStyles[resolvedTone] || templateStyles.clean;
    
    // Dynamic Accent Management
    const accentColor = behavior.identity_tone === 'brutalist' ? '#000' : color_accent;

    // Social Formatting
    const socialIcons: any = {
      github: `<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>`,
      linkedin: `<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg>`
    };

    const socialsHtml = Object.entries(socials)
      .filter(([key, value]) => value && typeof value === 'string' && value.length > 5)
      .map(([key, value]) => `
        <a href="${value}" target="_blank" rel="noopener noreferrer" class="p-3 md:p-4 rounded-full border ${style.border} hover:bg-black/5 dark:hover:bg-white/5 transition-all duration-300 group">
            ${socialIcons[key] || `<span class="text-[10px] uppercase tracking-widest font-bold">${key}</span>`}
        </a>
      `).join('');

    // --- Component Generators ---

    const renderNavbar = () => {
      const isNavbarEnabled = data.navbar && typeof data.navbar.enabled === 'boolean' ? data.navbar.enabled : layout.show_navbar;
      if (!isNavbarEnabled) return '';
      
      let navItems = [];
      if (data.about_paragraph_1) navItems.push({ label: 'Tentang', id: 'tentang' });
      if (data.career && data.career.length > 0) navItems.push({ label: 'Karier', id: 'karier' });
      if (data.projects && data.projects.length > 0) navItems.push({ label: 'Proyek', id: 'proyek' });
      if (data.skills && data.skills.length > 0) navItems.push({ label: 'Skill', id: 'skill' });
      if (data.contact_email || data.contact_location || Object.keys(socials).length > 0) navItems.push({ label: 'Kontak', id: 'kontak' });
      
      if (data.navbar && Array.isArray(data.navbar.items)) {
          navItems = navItems.filter(item => data.navbar.items.includes(item.label));
      }
      
      const showName = data.navbar && Array.isArray(data.navbar.items) ? data.navbar.items.includes('Nama') : true;
      const displayLogo = data.navbar && data.navbar.name_text ? data.navbar.name_text : name;
      
      const logoHtml = showName ? `<div class="font-medium tracking-tight text-sm ${style.navText}"><a href="#hero" class="hover:opacity-70 transition-opacity">${displayLogo}</a></div>` : '<div></div>';
      
      return `
        <nav class="fixed top-0 left-0 right-0 z-[100] px-4 py-4 md:px-12 pointer-events-none">
          <div class="max-w-[1200px] mx-auto flex flex-col md:flex-row justify-between items-start md:items-center ${style.navBg} backdrop-blur-xl border ${style.border} rounded-[20px] md:rounded-full px-6 md:px-8 py-3.5 md:py-3.5 pointer-events-auto shadow-sm gap-3 md:gap-0">
            <div class="w-full md:w-auto flex justify-between items-center">
              <div class="font-medium tracking-tight text-sm ${style.navText}">
                 <a href="#hero" class="hover:opacity-70 transition-opacity">${name}</a>
              </div>
              <div class="md:hidden flex items-center gap-4">
                <div class="w-2 h-2 rounded-full bg-emerald-500 shadow-sm animate-pulse"></div>
              </div>
            </div>
            <div class="flex overflow-x-auto w-full md:w-auto gap-5 md:gap-8 hide-scrollbar pb-1 md:pb-0 items-center">
               ${navItems.map((it) => `<a href="#${it.id}" class="text-xs font-medium opacity-60 hover:opacity-100 transition-opacity whitespace-nowrap ${style.navText}">${it.label}</a>`).join('')}
            </div>
            <div class="hidden md:flex items-center gap-4">
              ${data.contact_email ? `<a href="${sanitizeEmailUrl(data.contact_email)}" class="hidden md:block text-xs font-medium opacity-80 hover:opacity-100 transition-opacity whitespace-nowrap ${style.navText}">Connect</a>` : ''}
              <div class="w-2 h-2 rounded-full bg-emerald-500 shadow-sm animate-pulse"></div>
            </div>
          </div>
        </nav>
      `;
    };

    const renderHero = () => {
      console.log("[OpenFolio] Rendering Hero Section...");
      const heroImage = data.hero_image_url || data.profilePhoto;
      
      return `
        <header id="hero" class="relative flex flex-col-reverse md:flex-row items-center md:items-center justify-between px-6 md:px-16 lg:px-24 py-12 md:py-20 gap-10 md:gap-16 max-w-[1240px] mx-auto mt-20 md:mt-24 pb-8 md:pb-16 relative overflow-hidden">
          <div class="w-full md:w-3/5 space-y-6 relative z-10 text-left">
            ${name ? `<h1 class="${t.h1} ${style.heading} animate-reveal break-words">${name}</h1>` : ''}
            ${role ? `<p class="text-xl md:text-2xl font-medium ${style.text} opacity-80 animate-reveal stagger-1 break-words">${role}</p>` : ''}
            ${hero_description ? `<p class="${t.p} ${style.text} opacity-90 animate-reveal stagger-2 max-w-2xl break-words">${hero_description}</p>` : ''}
            <div class="inline-flex flex-wrap items-center gap-3 animate-reveal stagger-3 pt-4">
               ${socialsHtml}
            </div>
          </div>
          <div class="w-full md:w-2/5 flex justify-center md:justify-end animate-reveal stagger-2">
            ${heroImage ? 
              `<div class="relative group p-1.5 bg-black/5 dark:bg-white/5 border ${style.border} rounded-2xl md:rounded-3xl shadow-sm overflow-hidden w-full max-w-[280px] md:max-w-[320px] aspect-[4/5] object-cover shrink-0">
                 <div class="w-full h-full rounded-[14px] md:rounded-[22px] overflow-hidden bg-white dark:bg-zinc-950">
                   <img src="${heroImage}" alt="${name || 'Profile'}" class="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.02]">
                 </div>
               </div>` : 
               ''
            }
          </div>
        </header>
      `;
    };

    const renderProjects = () => {
      console.log("[OpenFolio] Rendering Projects Section...");
      const projects = data.projects || [];
      if (projects.length === 0) {
        console.warn("[OpenFolio] Projects content empty. Skipping section.");
        return '';
      }
      
      const isSingleProject = projects.length === 1;

      return `
        <section id="proyek" class="${s.py} px-6 md:px-16 lg:px-24 max-w-[1240px] mx-auto border-t ${style.border}">
          <div class="${s.mb} border-b ${style.border} pb-6">
             <h2 class="${t.h2} ${style.heading}">Proyek.</h2>
          </div>
          <div class="${isSingleProject ? 'max-w-4xl mx-auto' : 'grid grid-cols-1 md:grid-cols-2 lg:gap-10 gap-8'} pt-8">
             ${projects.map((p: any, idx: number) => {
               const cropClass = p.crop_strategy === 'contain' ? 'object-contain' : 'object-cover';
               const imageSrc = p.image_url ? p.image_url : "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='600' height='380' fill='%23e4e4e7'/></svg>";
               
               if (isSingleProject) {
                   return `
                     <div class="group ${style.card} hover:shadow-md transition-all duration-500 animate-reveal flex flex-col md:flex-row p-0 overflow-hidden">
                        <div class="w-full md:w-1/2 relative aspect-[16/10] md:aspect-auto overflow-hidden bg-black/5 dark:bg-white/5 border-b md:border-b-0 md:border-r ${style.border}">
                           <img src="${imageSrc}" alt="${p.title}" class="w-full h-full ${cropClass} group-hover:scale-105 transition-transform duration-700 ease-out absolute inset-0 object-cover">
                           <div class="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[2px]">
                              ${p.link && p.link !== "#" ? `<a href="${p.link}" target="_blank" class="text-white text-sm font-medium border border-white/20 hover:border-white px-6 py-2.5 rounded-full bg-black/60 transition-all shadow-lg backdrop-blur-sm">View Project</a>` : ''}
                           </div>
                        </div>
                        <div class="w-full md:w-1/2 p-8 md:p-10 flex flex-col justify-center space-y-6">
                           <div class="space-y-4">
                              <h3 class="text-2xl font-bold ${style.heading} tracking-tight">${p.title}</h3>
                              <p class="text-base ${style.text} opacity-80 leading-relaxed">${p.description}</p>
                           </div>
                           <div class="flex flex-wrap gap-2 pt-2">
                              ${(p.tags || []).map((t: string) => `<span class="${style.pill}">${t}</span>`).join('')}
                           </div>
                        </div>
                     </div>
                   `;
               }

               return `
                 <div class="group ${style.card} hover:shadow-md transition-all duration-500 animate-reveal flex flex-col p-0 overflow-hidden">
                    <div class="relative aspect-[16/10] overflow-hidden bg-black/5 dark:bg-white/5 border-b ${style.border}">
                       <img src="${imageSrc}" alt="${p.title}" class="w-full h-full ${cropClass} group-hover:scale-105 transition-transform duration-700 ease-out">
                       <div class="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[2px]">
                          ${p.link && p.link !== "#" ? `<a href="${p.link}" target="_blank" class="text-white text-xs font-medium border border-white/30 hover:border-white px-5 py-2 rounded-full bg-black/60 transition-all">View Project</a>` : ''}
                       </div>
                    </div>
                    <div class="p-6 md:p-8 flex-grow flex flex-col justify-between space-y-5">
                       <div class="space-y-3">
                          <h3 class="text-xl font-bold ${style.heading} tracking-tight">${p.title}</h3>
                          <p class="text-sm md:text-base ${style.text} opacity-80 leading-relaxed">${p.description}</p>
                       </div>
                       <div class="flex flex-wrap gap-2 pt-2">
                          ${(p.tags || []).map((t: string) => `<span class="${style.pill}">${t}</span>`).join('')}
                       </div>
                    </div>
                 </div>
               `;
             }).join('')}
          </div>
        </section>
      `;
    };

    const renderSkills = () => {
      console.log("[OpenFolio] Rendering Skills Section...");
      const skills = data.skills || [];
      if (skills.length === 0) {
        console.warn("[OpenFolio] Skills content empty. Skipping section.");
        return '';
      }
      return `
        <section id="skill" class="${s.py} px-6 md:px-16 lg:px-24 mx-auto max-w-[1240px] border-t ${style.border}">
           <div class="${s.mb} border-b ${style.border} pb-6">
              <h2 class="${t.h2} ${style.heading}">Skill.</h2>
           </div>
           <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 md:gap-12 pt-6">
              ${skills.map((sk: any, idx: number) => `
                <div class="space-y-5 animate-reveal">
                   <h3 class="text-lg md:text-xl font-bold tracking-tight ${style.heading}">${sk.title}</h3>
                   <ul class="space-y-3 pt-2">
                      ${(sk.items || []).map((item: string) => `
                        <li class="flex items-start gap-4">
                           <span class="text-base ${style.text} opacity-90 leading-relaxed">${item}</span>
                        </li>
                      `).join('')}
                   </ul>
                </div>
              `).join('')}
           </div>
        </section>
      `;
    };

    const renderAbout = () => {
      console.log("[OpenFolio] Rendering About Section...");
      if (!data.about_paragraph_1) {
        console.warn("[OpenFolio] About content empty. Skipping section.");
        return '';
      }
      return `
        <section id="tentang" class="${s.py} px-6 md:px-16 lg:px-24 mx-auto max-w-[1240px] overflow-hidden border-t ${style.border}">
           <div class="grid grid-cols-1 lg:grid-cols-12 gap-12 md:gap-16">
              <div class="lg:col-span-8 space-y-8 md:space-y-10">
                 <h2 class="${t.h2} ${style.heading} flex items-center gap-4 animate-reveal">
                    Tentang.
                 </h2>
                 <p class="text-lg md:text-2xl font-normal ${style.heading} leading-relaxed animate-reveal stagger-1 text-balance">
                    ${data.about_paragraph_1}
                 </p>
                 ${data.about_paragraph_2 ? `
                 <p class="text-base md:text-lg ${style.text} opacity-90 leading-relaxed text-balance animate-reveal stagger-2 max-w-2xl">
                    ${data.about_paragraph_2}
                 </p>
                 ` : ''}
              </div>
              <div class="lg:col-span-4 pt-4 lg:pt-0 lg:border-l ${style.border} lg:pl-16 flex flex-col gap-8 animate-reveal stagger-3 lg:justify-center">
                 ${data.contact_location ? `
                 <div class="space-y-1">
                   <span class="block text-xs font-semibold uppercase tracking-widest ${style.text} opacity-50">Lokasi / Basis</span>
                   <span class="block text-base font-semibold ${style.heading}">${data.contact_location}</span>
                 </div>` : ''}
                 ${role ? `
                 <div class="space-y-1">
                   <span class="block text-xs font-semibold uppercase tracking-widest ${style.text} opacity-50">Fokus Utama</span>
                   <span class="block text-base font-semibold ${style.heading}">${role}</span>
                 </div>` : ''}
              </div>
           </div>
        </section>
      `;
    };

    const renderContact = () => {
      console.log("[OpenFolio] Rendering Contact Section...");
      
      const contactItems: any[] = [];
      if (data.contact_email) {
          contactItems.push({ label: 'Email', value: data.contact_email, href: sanitizeEmailUrl(data.contact_email) });
      }
      
      const knownSocials: Record<string, string> = {
          linkedin: 'LinkedIn',
          github: 'GitHub',
          twitter: 'Twitter',
          x: 'X',
          instagram: 'Instagram',
          website: 'Website'
      };
      
      Object.entries(socials).forEach(([key, value]) => {
          if (value && typeof value === 'string' && value.length > 5) {
              const label = knownSocials[key.toLowerCase()] || key.charAt(0).toUpperCase() + key.slice(1);
              let displayValue = value;
              try {
                  const url = new URL(value);
                  displayValue = url.hostname + url.pathname;
                  if (displayValue.startsWith('www.')) displayValue = displayValue.substring(4);
                  if (displayValue.endsWith('/')) displayValue = displayValue.substring(0, displayValue.length - 1);
              } catch (e) {}
              contactItems.push({ label, value: displayValue, href: value });
          }
      });

      const hasContactData = contactItems.length > 0;
      
      return `
        ${hasContactData ? `
        <section id="kontak" class="${s.py} px-6 md:px-16 lg:px-24 mx-auto max-w-[1240px] border-t ${style.border}">
           <div class="grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-24 items-start mx-auto animate-reveal">
               <div class="flex flex-col space-y-6 md:sticky md:top-32">
                   <h2 class="${t.h1} ${style.heading}">Mari Terhubung.</h2>
                   <p class="text-base md:text-lg ${style.text} opacity-70 leading-relaxed max-w-md">
                      Terbuka untuk diskusi seputar portofolio, pengembangan produk digital, web development, dan kolaborasi teknologi.
                   </p>
               </div>
               <div class="flex flex-col space-y-10 md:pt-2 animate-reveal stagger-1">
                  ${contactItems.map((item) => {
                     const innerContent = `
                        <span class="block text-[10px] md:text-xs font-bold uppercase tracking-[0.15em] ${style.text} opacity-40 mb-2">${item.label}</span>
                        <span class="block text-xl md:text-2xl font-light tracking-tight break-all sm:break-normal ${style.heading} opacity-90 group-hover:opacity-100 transition-opacity">
                           ${item.value}
                        </span>
                     `;
                     if (item.href) {
                         return `
                           <a href="${item.href}" target="${item.href.startsWith('mailto:') ? '_self' : '_blank'}" rel="noopener noreferrer" class="group flex flex-col text-left transition-all duration-300">
                              ${innerContent}
                           </a>
                         `;
                     }
                     return `
                        <div class="flex flex-col text-left">
                           ${innerContent}
                        </div>
                     `;
                  }).join('')}
               </div>
           </div>
        </section>
        ` : ''}
           <footer class="px-6 md:px-16 lg:px-24 pb-12 w-full">
             <div class="max-w-[1240px] mx-auto flex flex-col sm:flex-row items-center justify-between border-t ${style.border} pt-8 text-xs font-medium ${style.text} justify-center sm:justify-between opacity-60">
               <span>&copy; ${data.footer_year ?? new Date().getFullYear()} ${name}</span>
               <div class="mt-4 sm:mt-0 uppercase tracking-widest text-[10px]">
                  Built with OpenFolio
               </div>
             </div>
           </footer>
      `;
    };

    const renderCareer = () => {
      console.log("[OpenFolio] Rendering Career Section...");
      const career = data.career || [];
      if (!Array.isArray(career) || career.length === 0) return '';
      return `
        <section id="karier" class="${s.py} px-6 md:px-16 lg:px-24 mx-auto max-w-[1240px] border-t ${style.border}">
           <div class="${s.mb} border-b ${style.border} pb-6">
              <h2 class="${t.h2} ${style.heading}">Karier.</h2>
           </div>
           <div class="space-y-4 pt-6">
              ${career.map((c: any) => `
                <div class="group py-8 lg:py-10 border-b ${style.border} last:border-0 flex flex-col lg:flex-row gap-4 lg:gap-16 animate-reveal">
                   <div class="w-full lg:w-1/4 flex-shrink-0 pt-1">
                      <span class="text-sm font-medium ${style.text} opacity-60 block">${c?.period || ""}</span>
                   </div>
                   <div class="flex-1 space-y-4">
                      <div>
                         <h3 class="text-xl md:text-2xl font-bold tracking-tight ${style.heading}">${c?.role || "Professional"}</h3>
                         <p class="text-base font-semibold ${style.text} opacity-90 mt-1">${c?.company || "Independent"}</p>
                      </div>
                      ${c?.description ? `<p class="text-base ${style.text} opacity-80 leading-relaxed max-w-2xl text-balance">${c.description}</p>` : ''}
                   </div>
                </div>
              `).join('')}
           </div>
        </section>
      `;
    };

    const sections: any = {
      hero: renderHero,
      projects: renderProjects,
      skills: renderSkills,
      career: renderCareer,
      about: renderAbout,
      contact: renderContact
    };

    const renderContentBlocks = () => {
       const ordering = (layout.section_ordering || ['hero', 'about', 'career', 'projects', 'skills', 'contact']);
       return ordering.map((sid: string) => {
         if (sections[sid]) {
           try {
             return sections[sid]();
           } catch (secErr) {
             return '';
           }
         }
         return '';
       }).join('');
    };

    const finalHtmlBlocks = `
      ${renderNavbar()}
      <main class="relative z-10">
        ${renderContentBlocks()}
      </main>
    `;

    console.log("[OpenFolio] Finalizing Hydration...");

    return `
      <!DOCTYPE html>
      <html lang="id" class="scroll-smooth">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${name} | Professional Identity</title>
          <script src="https://cdn.tailwindcss.com"></script>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&family=Playfair+Display:ital,wght@0,400;0,700;1,400&family=Space+Grotesk:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;600&display=swap');
            
            :root {
              --accent: ${accentColor};
            }
            
            body { 
              ${style.bodyBgStyle || ''}
              -webkit-font-smoothing: antialiased; 
            }

            @keyframes fadeUp {
              from { opacity: 0; transform: translateY(40px); }
              to { opacity: 1; transform: translateY(0); }
            }

            .hide-scrollbar::-webkit-scrollbar { display: none; }
            .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }

            .animate-reveal { 
              animation: fadeUp 1.2s cubic-bezier(0.16, 1, 0.3, 1) forwards; 
              opacity: 0;
            }

            .stagger-1 { animation-delay: 0.1s; }
            .stagger-2 { animation-delay: 0.2s; }
            .stagger-3 { animation-delay: 0.4s; }
            
            .text-balance { text-wrap: balance; }
            
            ::selection { background: var(--accent); color: white; }
            
            ::-webkit-scrollbar { width: 5px; }
            ::-webkit-scrollbar-track { background: transparent; }
            ::-webkit-scrollbar-thumb { background: rgba(128,128,128,0.2); border-radius: 10px; }

          </style>
        </head>
        <body class="${style.font} antialiased ${style.text} ${style.bg}">
          ${finalHtmlBlocks}

          <script>
            // Improved image loading state with better fallback handling
            document.querySelectorAll('img').forEach(img => {
                img.style.opacity = '0';
                img.style.transition = 'opacity 1s ease-in-out';
                const showImg = () => { img.style.opacity = '1'; };
                if (img.complete) {
                  showImg();
                } else {
                  img.addEventListener('load', showImg);
                  img.addEventListener('error', () => {
                    img.parentElement.innerHTML = '<div class="w-full h-full flex items-center justify-center bg-zinc-900 text-[10px] uppercase tracking-widest opacity-20">Image Load Error</div>';
                  });
                }
            });

            const observer = new IntersectionObserver((entries) => {
              entries.forEach(entry => {
                if (entry.isIntersecting) {
                  entry.target.classList.add('animate-reveal');
                }
              });
            }, { threshold: 0.05 });

            document.querySelectorAll('.animate-reveal, section, .group, h1, h2, p, .shadow-3xl').forEach(el => {
              observer.observe(el);
            });

            // Smooth scrolling for anchor links
            document.querySelectorAll('a[href^="#"]').forEach(anchor => {
                anchor.addEventListener('click', function (e) {
                    e.preventDefault();
                    document.querySelector(this.getAttribute('href')).scrollIntoView({
                        behavior: 'smooth'
                    });
                });
            });
          </script>
        </body>
      </html>
    `;
  };

  // Inject route
  app.post("/api/portfolio/inject", (req, res) => {
    try {
      const { data } = req.body;
      const renderedHtml = buildPortfolioHTMLString(data);
      res.send(renderedHtml);
    } catch (e: any) {
      console.error(e);
      res.status(500).json({ error: e.message });
    }
  });

  app.use((err: any, req: any, res: any, next: any) => {
    console.error("Global Error Handler", err);
    res.status(500).json({ error: err.message || "Internal Server Error" });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
