# Design System: DESIGN.md Catalog

## 1. Visual Theme & Atmosphere

- Overall feeling: Clean, editorial, and utility-forward. The page feels like a curated library for design systems, with a calm light canvas and strong typographic hierarchy.
- Visual density: Medium-to-high in content sections, but controlled with generous white space and compact metadata treatment.
- Brand posture: Practical, modern, and design-professional. It emphasizes browsing, comparison, and fast discovery rather than marketing flourish.
- Signature motifs: Warm cream backgrounds, dark charcoal text, orange-brown brand accents, rounded UI controls, and catalog-style cards with concise descriptions.

### Key Characteristics

- Light, low-contrast background with a warm neutral tone
- Strong single-accent brand color used for links and emphasis
- Geist type family throughout
- Rounded controls and minimal shadows

## 2. Color Palette & Roles

| Role | Semantic Name | Value | Usage |
| --- | --- | --- | --- |
| Primary action | Brand Clay | #B85C2C | Primary links, brand emphasis, and interactive accents |
| Accent | Brand Clay | #B85C2C | Same hue used consistently for accent and link states |
| Surface | Paper Cream | #FAF9F6 | Main page background and input backgrounds |
| Text | Ink Near-Black | #18180F | Primary body text, headings, and button fill |
| Border | Soft Line | #E6E3DC | Input borders and subtle dividers |

### Primary

- Brand Clay (#B85C2C) is the main brand color and also the link color.
- Ink Near-Black (#18180F) is used as the high-contrast action surface for the primary button.

### Interactive

- Links appear in Brand Clay (#B85C2C), matching the accent color exactly.
- Secondary interactive chrome uses neutral borders rather than colored outlines.
- Evidence suggests minimal hover decoration; interaction is likely expressed through color and subtle state changes rather than motion-heavy effects.

### Neutral Scale

- Paper Cream (#FAF9F6) acts as the dominant neutral background.
- White (#FFFFFF) appears in the secondary button surface.
- Soft Line (#E6E3DC) provides subtle separation without strong visual noise.

### Surface & Overlay

- Base surface: Paper Cream (#FAF9F6)
- Elevated surface: White (#FFFFFF)
- Overlay behavior: No strong overlay system was observed in the evidence; depth appears restrained.

### Theme Modes

The product is observed in a light color scheme. No dark mode evidence was provided.

#### Light Mode

- Background: #FAF9F6
- Surface: #FFFFFF and #FAF9F6
- Text: #18180F
- Accent: #B85C2C
- Notes: Warm, editorial, and calm; contrast is achieved through dark text rather than saturated UI chrome.

#### Dark Mode

- Background: Not observed
- Surface: Not observed
- Text: Not observed
- Accent: Not observed
- Notes: No evidence of a dark theme in the provided materials.

### Shadows & Depth

- Border/ring treatment: Borders are preferred over heavy shadows; inputs use #E6E3DC borders.
- Card shadow stack: Buttons and inputs are explicitly shadowless.
- Focus treatment: Not directly observed; likely a subtle ring or border-based state given the minimalist system.

## 3. Typography Rules

### Font Family

- Primary: Geist
- Monospace: Not observed in the provided evidence
- OpenType Features: Not observed; likely standard modern sans-serif behavior with crisp UI rendering

### Hierarchy

| Role | Font | Size | Weight | Line Height | Letter Spacing | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Hero headline | Geist | 36px | Not specified | Not specified | Not specified | Used for page-level headline like “Browse design systems” |
| Section heading | Geist | 12px | Not specified | Not specified | Not specified | Very compact, likely used for section labels such as “Featured” and “Collections” |
| Body | Geist | 11px | Not specified | Not specified | Not specified | Dense catalog descriptions and metadata |
| Label / Eyebrow | Geist | 12px | Not specified | Not specified | Not specified | Category labels and small navigational cues |
| Caption / Meta | Geist | 11px | Not specified | Not specified | Not specified | Short supporting text and card metadata |

### Principles

- Keep typography compact and information-dense without losing clarity.
- Use strong size contrast between hero text and catalog copy.
- Maintain a consistent sans-serif voice across all content rather than mixing styles.

## 4. Component Stylings

### Buttons and Links

- Primary CTA: Solid Ink Near-Black (#18180F) button with Paper Cream text (#FAF9F6), rounded 8px corners, no shadow.
- Secondary CTA: White button with Soft Line border (#E6E3DC), pill-shaped radius, no shadow.
- Text links: Brand Clay (#B85C2C), matching the brand accent.
- Hover and active feel: Not directly observed; likely understated with color or border shifts rather than elevated motion.

### Cards and Containers

- Surface style: Clean, flat, light surfaces with very little ornamentation.
- Radius: 8px on inputs and buttons; broader global radius token is 12px.
- Border: Soft Line (#E6E3DC) for understated separation.
- Shadow or elevation: None on the observed controls; overall depth is minimal.
- Internal spacing: Driven by a 12px base unit, suggesting tight but consistent breathing room.

### Inputs and Interactive Controls

- Input treatment: Cream background, dark text, 1px-style soft border, 8px radius.
- Focus behavior: Not observed; likely border/ring emphasis without shadow.
- Selection states: Secondary controls appear visually pill-like and neutral, suitable for filters.

### Navigation

- Structure: Top utility navigation with brand link back to DesignMD and utility CTAs like Subscribe / MCP / Generate.
- Background treatment: Blends into the light page surface rather than floating in a separate bar.
- Link style: Brand Clay text links with minimal decoration.
- Sticky or scroll behavior: Not observed.

### Image Treatment

- Screenshot treatment: Catalog thumbnails appear as contained previews within cards.
- Photography or illustration style: Observed screenshots are site captures rather than bespoke illustrations.
- Border and radius treatment: Likely consistent with rounded card treatment; exact image radius not explicitly observed.

### Distinctive Components

- Featured design-system cards with category, title, and editorial summary
- Catalog filters/chips for browsing by style, industry, and color mode
- High-density text-first discovery layout with embedded screenshot previews

## 5. Layout Principles

### Spacing System

- Base unit: 12px
- Repeated spacing values: 12px, 24px, 36px are the most likely rhythm from the base unit; exact scale beyond the base unit was not fully observed.

### Grid & Container

- Grid logic: Catalog-style multi-column browsing with stacked sections and card collections.
- Max content width: Not explicitly observed.
- Section spacing: Moderately spacious, with clear separation between featured content and catalog listings.

### Whitespace Philosophy

- Whitespace philosophy: Use enough whitespace to support scanning, but keep the page dense enough to feel like a usable index.
- Alignment tendencies: Left-aligned, editorial, and grid-disciplined.
- Content width behavior: Text blocks stay compact and readable rather than spanning very wide lines.

### Border Radius Scale

- Micro: 8px
- Standard: 12px
- Large: Not clearly observed
- Pill: 33554400px on the secondary button, effectively fully rounded

## 6. Depth & Elevation

| Level | Treatment | Use |
| --- | --- | --- |
| Flat | Background #FAF9F6 with no shadow | Page base and most surfaces |
| Ring | Soft border #E6E3DC | Inputs, neutral controls, subtle boundaries |
| Card | Minimal or flat card treatment, likely border-led | Catalog previews and list items |
| Focus | Not observed; likely ring/border emphasis | Keyboard and active interaction states |

### Depth Principles

- Surface hierarchy: Achieved mostly through contrast, spacing, and borders rather than shadow stacks.
- Shadow language: Essentially absent in the provided evidence.
- Blur, glass, or overlay behavior: Not observed.
- When depth is used versus avoided: Depth is avoided for the core browsing experience; the system favors clarity and calm.

## 7. Do's and Don'ts

### Do

- Use Geist for all UI typography to keep the system consistent
- Favor warm neutrals and one strong brand accent color
- Keep controls rounded, bordered, and shadow-free

### Don't

- Don’t introduce heavy gradients or decorative effects without evidence
- Don’t mix in multiple competing accent colors
- Don’t use large shadows or glassmorphism

## 8. Responsive Behavior

### Breakpoints

| Name | Width | Key Changes |
| --- | --- | --- |
| Mobile | Not observed | Likely single-column catalog stacking and simplified filters |
| Tablet | Not observed | Likely 2-column browsing with condensed metadata |
| Desktop | Not observed | Likely multi-column catalog layout with featured cards and persistent navigation |

### Touch Targets

- Use generous tap areas for filter chips, links, and CTAs despite the compact type scale.
- Preserve 8px+ corner radii and clear border contrast for touch clarity.

### Collapsing Strategy

- Desktop behavior: Browse-first catalog layout with visible featured content and filter navigation.
- Tablet behavior: Likely reduced card columns and tighter section stacking.
- Mobile behavior: Likely single-column cards with shorter metadata and condensed navigation.
- Breakpoint-driven component changes: Filters and catalog tiles should collapse before typography does.
- Touch target and spacing adjustments: Maintain spacing rhythm while enlarging tappable areas to compensate for small text sizes.

## 9. Agent Prompt Guide

### Quick Color Reference

- Primary CTA: #18180F on #FAF9F6 text
- Background: #FAF9F6
- Heading text: #18180F
- Body text: #18180F
- Border or ring: #E6E3DC
- Accent: #B85C2C

### Quick Summary

DESIGN.md Catalog is a light, editorial browsing interface for discovering design systems.  
It uses Geist everywhere, with a compact, information-dense typographic scale.  
The palette is warm and restrained: cream backgrounds, near-black text, and a clay-orange accent.  
Components are flat, rounded, and low-shadow, with borders doing most of the visual work.  
Primary actions are dark filled buttons; secondary actions are white pill controls.  
The overall feel is modern, practical, and built for scanning a large library quickly.

### Example Component Prompts

- Hero: Create a light editorial hero with a 36px Geist headline, compact supporting copy, and a warm cream background.
- Card: Build a flat rounded catalog card with a soft border, screenshot preview, category label, title, and concise description.
- Navigation: Use a minimal top navigation with clay-orange links and no heavy chrome.
- Button or badge: Use a dark filled primary button with cream text, plus a white pill secondary filter button with a soft border.

### Ready-to-Use Prompt

Design a light, catalog-style design system page for DESIGN.md using Geist throughout, a warm cream background (#FAF9F6), near-black text (#18180F), and a clay-orange accent (#B85C2C). Keep the UI flat, rounded, and shadow-free, with subtle borders (#E6E3DC), compact editorial typography, dark primary buttons, and white pill secondary controls.

### Iteration Guide

1. Preserve the warm neutral palette and the single accent color.
2. Keep typography compact, modern, and Geist-based across all surfaces.
3. Prefer borders, spacing, and radius over shadows or decorative effects.

## Optional Appendix: Interaction Patterns

- Scroll behavior: Not directly observed.
- Hover behavior: Likely subtle and restrained.
- Click behavior: Clear via color contrast rather than motion-heavy feedback.
- Animation tone: Minimal, quiet, and utility-oriented.

## Optional Appendix: Content & Messaging Patterns

- Headline pattern: Direct, functional, and descriptive.
- CTA language: Concise and action-oriented, e.g. “Subscribe,” “Get it,” “Connect MCP,” “Generate.”
- Trust signal pattern: Library scale and quantity, such as “1,675+ design systems ready for AI agents.”
- Voice and tone: Modern, professional, and curated.

## Optional Appendix: Observed Pages

- https://designmd.co/catalog: Main catalog page, brand colors, typography, button styles, and browse-first layout
- Featured design-system entries: Provided examples of card structure and editorial summaries
- Collections section: Revealed browsing categories, filter chips, and content density patterns