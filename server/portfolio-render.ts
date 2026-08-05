// Pure portfolio rendering helpers, extracted from server.ts for unit testing.

// XSS Escaper Helper
export const escapeHTML = (str: any) => {
  if (typeof str !== 'string') return str;
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
};

// Robust JSON extraction helper
export function safeParseJSON(text: string, fallback: any = {}): any {
  if (!text) return fallback;

  let cleanText = text.trim();

  // Extract JSON block if it's wrapped
  const start = cleanText.indexOf('{');
  const end = cleanText.lastIndexOf('}');
  if (start !== -1 && end !== -1 && end >= start) {
    cleanText = cleanText.substring(start, end + 1);
  }

  // Attempt direct parse of clean block
  try {
    return JSON.parse(cleanText);
  } catch (e) {
    // If it fails, let's fix typical syntax issues surgically:
    try {
      // 1. Remove trailing commas before closing braces/brackets
      let repaired = cleanText.replace(/,\s*([\]}])/g, '$1');

      // 2. Fix literal newlines specifically within quoted strings
      let inString = false;
      let escaped = false;
      let processed = "";
      for (let i = 0; i < repaired.length; i++) {
        const char = repaired[i];
        if (char === '"' && !escaped) {
          inString = !inString;
          processed += char;
        } else if (inString && (char === '\n' || char === '\r')) {
          processed += '\\n';
        } else {
          processed += char;
        }

        if (char === '\\' && !escaped) {
          escaped = true;
        } else {
          escaped = false;
        }
      }

      return JSON.parse(processed);
    } catch (innerE) {
      console.error("[JSON Parser] Healing attempt failed too:", innerE);
      try {
        const bruteClean = cleanText
          .replace(/,\s*([\]}])/g, '$1')
          .replace(/(?:\r\n|\r|\n)/g, ' ');
        return JSON.parse(bruteClean);
      } catch (bruteE) {
        console.error("[JSON Parser] Critical failure on brute parse:", bruteE);
      }
    }
    return fallback;
  }
}

export function slugify(input: string): string {
  const base = (input || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return base || "portfolio";
}

// URL validation: only http/https allowed (blocks data:, javascript:, mailto: directly in hrefs).
// Values are also HTML-escaped (original server.ts behavior) to prevent attribute-injection XSS:
// new URL() percent-encodes internally but does NOT throw on quotes/angle brackets, so returning the
// raw trimmed string would let a value like `https://x/" onmouseover="alert(1)` break out of href="".
const sanitizeUrl = (url: string) => {
  if (!url || url === "#") return "#";
  try {
    const parsed = new URL(url.trim());
    if (parsed.protocol === "https:" || parsed.protocol === "http:") return escapeHTML(url.trim());
  } catch {}
  return "#";
};

// Builds a safe mailto: link from a plain email address.
export const sanitizeEmailUrl = (email: string) => {
  if (!email) return "#";
  const clean = String(email).trim();
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) return "mailto:" + clean;
  return "#";
};

// Data Sanitization & Normalization Layer (The Guardian of Render Integrity)
export const sanitizePortfolioData = (raw: any) => {
  const d = raw || {};

  // Core Identity
  const clean: any = {
    name: escapeHTML((typeof d.name === 'string' && d.name) ? d.name : ""),
    role: escapeHTML((typeof d.role === 'string' && d.role) ? d.role : ""),
    hero_description: escapeHTML((typeof d.hero_description === 'string' && d.hero_description) ? d.hero_description : ""),
    // Fix: Ensure hero_image_url is preserved from profilePhoto if LLM misses it
    hero_image_url: d.hero_image_url || d.profilePhoto || null,
    color_accent: (typeof d.color_accent === 'string' && d.color_accent.startsWith('#')) ? escapeHTML(d.color_accent) : "#6366F1",
    color_accent_hover: (typeof d.color_accent_hover === 'string' && d.color_accent_hover.startsWith('#')) ? escapeHTML(d.color_accent_hover) : null,
    footer_year: escapeHTML(d.footer_year || new Date().getFullYear().toString()),
    templateName: escapeHTML(d.templateName || "obsidian"),
    safe_mode: d.safe_mode === true
  };

  // Visual Behavior Fallbacks
  const b = d.visual_behavior || {};
  const identity_tone = escapeHTML(b.identity_tone || 'stoic');

  clean.visual_behavior = {
    identity_tone,
    layout_density: escapeHTML(b.layout_density || 'balanced'),
    asymmetry_level: typeof b.asymmetry_level === 'number' ? Math.min(Math.max(b.asymmetry_level, 0), 0.1) : 0.1,
    typography_scale: escapeHTML(b.typography_scale || 'balanced'),
    motion_intensity: escapeHTML(b.motion_intensity || 'subtle'),
    content_pacing: escapeHTML(b.content_pacing || 'deliberate')
  };

  // Force strict dampening by default to secure professional balance
  clean.visual_behavior.asymmetry_level = Math.min(clean.visual_behavior.asymmetry_level, 0.08);

  // Strict typography mapping & hard clamp
  let tScale = clean.visual_behavior.typography_scale;
  if (tScale === 'oversized' || tScale === 'standard') {
    clean.visual_behavior.typography_scale = 'balanced';
  } else if (tScale === 'minimal') {
    clean.visual_behavior.typography_scale = 'compact';
  } else if (tScale !== 'balanced' && tScale !== 'compact' && tScale !== 'editorial') {
    clean.visual_behavior.typography_scale = 'balanced';
  }

  // Layout Config
  const l = d.layout_config || {};
  clean.layout_config = {
    section_ordering: Array.isArray(l.section_ordering) ? l.section_ordering.map(escapeHTML) : ['hero', 'about', 'career', 'projects', 'skills', 'contact'],
    show_navbar: typeof l.show_navbar === 'boolean' ? l.show_navbar : true
  };

  clean.navbar = d.navbar || null;

  // Socials
  const s = d.socials || {};
  clean.socials = {};
  const allowedSocials = ['linkedin', 'github', 'website', 'twitter', 'x', 'instagram', 'dribbble', 'whatsapp'];
  allowedSocials.forEach(k => {
    if (s[k] && s[k] !== '#') clean.socials[k] = sanitizeUrl(s[k]);
  });

  // About
  clean.about_paragraph_1 = escapeHTML(d.about_paragraph_1 || clean.hero_description || "");
  clean.about_paragraph_2 = escapeHTML(d.about_paragraph_2 || "");
  clean.contact_email = escapeHTML(d.contact_email || "");
  clean.contact_location = escapeHTML(d.contact_location || "");

  // Collections with Defensive Mapping
  clean.skills = Array.isArray(d.skills) ? d.skills.filter((sk: any) => sk && sk.title).map((sk: any) => ({
    title: escapeHTML(sk.title),
    items: Array.isArray(sk.items) ? sk.items.filter((i: any) => typeof i === 'string' && i.length > 0).map(escapeHTML) : [],
    visual_weight: typeof sk.visual_weight === 'number' ? sk.visual_weight : 5
  })) : [];

  clean.projects = Array.isArray(d.projects) ? d.projects.filter((p: any) => p && (p.title || p.name)).map((p: any) => ({
    title: escapeHTML(p.title || p.name),
    description: escapeHTML(p.description || ""),
    image_url: sanitizeUrl(p.image_url),
    link: sanitizeUrl(p.link),
    tags: Array.isArray(p.tags) ? p.tags.filter((t: any) => typeof t === 'string').map(escapeHTML) : [],
    visual_priority: escapeHTML(p.visual_priority || 'medium'),
    crop_strategy: escapeHTML(p.crop_strategy || 'cover')
  })) : [];

  clean.career = Array.isArray(d.career) ? d.career.map((c: any) => ({
    period: escapeHTML(c?.period || ""),
    role: escapeHTML(c?.role || "Professional"),
    company: escapeHTML(c?.company || "Independent"),
    description: escapeHTML(c?.description || "")
  })) : [];

  return clean;
};
