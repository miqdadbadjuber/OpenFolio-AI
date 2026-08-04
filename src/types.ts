export interface PortfolioStat {
  value: string;
  label: string;
}

export interface PortfolioSkill {
  title: string;
  items: string[];
  category?: string;
  visual_weight?: number; // 1-10
}

export interface PortfolioProject {
  id?: string;
  title: string;
  description: string;
  image_url: string;
  link: string;
  tags: string[];
  type?: string;
  role?: string;
  visual_priority?: 'high' | 'medium' | 'low';
}

export interface PortfolioCareer {
  period: string;
  role: string;
  company: string;
  description: string;
}

export interface PortfolioSocials {
  linkedin?: string | null;
  github?: string | null;
  instagram?: string | null;
  dribbble?: string | null;
  website?: string | null;
  whatsapp?: string | null;
}

export interface PortfolioData {
  name: string;
  role: string;
  hero_description: string;
  hero_image_url: string | null;
  
  // Identity Behavior & Rendering Intent
  visual_behavior: {
    identity_tone: 'stoic' | 'vibrant' | 'technical' | 'editorial' | 'brutalist';
    layout_density: 'airy' | 'compact' | 'balanced';
    asymmetry_level: number; // 0 to 1
    typography_scale: 'balanced' | 'compact' | 'editorial';
    motion_intensity: 'subtle' | 'dynamic' | 'none';
    content_pacing: 'rapid' | 'deliberate' | 'staggered';
  };
  
  layout_config: {
    section_ordering: string[];
    show_navbar: boolean;
  };
  
  socials?: PortfolioSocials;
  about_paragraph_1: string;
  about_paragraph_2: string | null;
  contact_email: string | null;
  contact_location: string | null;
  stats: PortfolioStat[];
  skills: PortfolioSkill[];
  projects: PortfolioProject[];
  career: PortfolioCareer[];
  color_accent: string;
  color_accent_hover: string;
  footer_year: string;
  templateName: string;
  safe_mode?: boolean;
}

