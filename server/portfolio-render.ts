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
// Rejects characters that could break out of an HTML attribute (`"`, `'`, `<`, `>`, backtick,
// whitespace) because new URL() percent-encodes them internally but does NOT throw — the raw string
// is what later gets embedded in href=/src= attributes, so a value like
// `https://x/" onmouseover="alert(1)` must be rejected outright, not merely re-serialized.
// Values that pass are also HTML-escaped (defense in depth, e.g. for `&`).
const sanitizeUrl = (url: string) => {
  if (!url || url === "#") return "#";
  const trimmed = url.trim();
  if (/["'<>`\s]/.test(trimmed)) return "#";
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === "https:" || parsed.protocol === "http:") return escapeHTML(trimmed);
  } catch {}
  return "#";
};

// Same allowlist as sanitizeUrl, but returns null (not "#") because it feeds an <img src="">.
const sanitizeImageUrl = (url: any) => {
  if (typeof url !== 'string' || !url) return null;
  const result = sanitizeUrl(url);
  return result === "#" ? null : result;
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
    // Sanitized to http/https only (invalid values -> null) since it feeds an <img src="">.
    hero_image_url: sanitizeImageUrl(d.hero_image_url || d.profilePhoto),
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

  // String builder to replace the template engine with Layout Intelligence & Visual Rhythm
  export const buildPortfolioHTMLString = (rawContent: any) => {
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
