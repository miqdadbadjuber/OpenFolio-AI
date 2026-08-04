# Landing Page Redesign Spec: Editorial / Minimalist Dark Mode

## Context & Motivation
The previous designs for the OpenFolio-AI landing page were either too basic, excessively animated (causing rendering lag), or overly reliant on "AI slop" clichés (like magic wands, sparkles, and overused bento box containers). The user requested an "UI/UX Promax" redesign that looks professional, highly aesthetic, and runs smoothly without stuttering animations.

## Aesthetic Direction
**The Magazine Layout (Dark Mode)**
- **Background**: Pure solid black (`#000000`). No colored gradients or blurs.
- **Typography**: `font-sans` with extremely tight tracking for large display headers (`tracking-tighter`). Clean contrast between solid white (`#FFFFFF`) and dark gray (`zinc-400` / `zinc-500`).
- **Motion Strategy**: Strictly static text content for reliability. Animations are limited strictly to subtle hover states on interactive elements and basic fade-ins. No spinning elements, no layout-shifting dynamic text strings, and no heavy physics loops.

## Layout & Components

### 1. Navigation
- Minimalist text-only header.
- Left: Logo + "OpenFolio" logotype.
- Right: "Sign In" text link and a solid un-animated "Deploy" CTA.

### 2. Hero Section
- **Alignment**: Hard left alignment, spanning about 70% of the maximum width to leave intentional negative space on the right.
- **Headline**: Massive typography, static (e.g., "PORTFOLIO, DIKODEKAN.").
- **Subtext**: Concise, engineering-focused copy describing the semantic compilation process.
- **CTA**: Single, highly legible button (white background, black text) with a simple geometric right arrow. No AI sparkles, no spinning borders, no command key icons.

### 3. Feature Showcase (Asymmetric Editorial Layout)
- **Container Structure**: No more `border` definitions for feature boxes. Features are visually separated purely by ample whitespace and strict typographical hierarchy, similar to a high-end print magazine.
- **Content Rhythm**: Alternating proportions (e.g., a massive headline for one feature, followed by a tight 2-column text block for the next).
- **Icons**: If icons are used, they will be strictly technical and geometric (e.g., `Terminal`, `FileJson`, `Layout`, `Globe`). 

## Anti-Slop Enforcement
- No `Sparkles`, `Wand2`, or `Bot` icons.
- No "AI Generation Engine" buzzwords; instead, use concrete engineering terms (e.g., "Semantic Architecture", "Compiler").
- No generic center-aligned blocks with three lines of text and a gradient button.
- All CTA text must fit on a single line and be highly legible against its background.

## Technical Implementation
- **Dependencies**: Tailwind CSS (built-in), `lucide-react` (for technical icons), `motion/react` (strictly for simple `opacity` / `y` fade-in).
- **File**: Re-writing `src/pages/LandingPage.tsx`.

## Error Handling & Fallbacks
- Ensures that small viewports (mobile) gracefully stack the text without causing overflow or hidden clipped sections.

