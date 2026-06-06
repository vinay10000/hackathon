---
name: HabitAI
description: The calmest habit tracker — voice-first, local-first, zero noise
colors:
  primary: "#a78bfa"
  primary-deep: "#7c3aed"
  secondary: "#5eead4"
  secondary-deep: "#0d9488"
  accent: "#fb923c"
  danger: "#fb7185"
  success: "#86efac"
  warning: "#fbbf24"
  bg-dark: "#0a0a0b"
  bg-dark-2: "#0f0f12"
  surface-dark: "#15151a"
  surface-dark-2: "#1c1c22"
  surface-dark-3: "#232329"
  bg-light: "#fbfafd"
  bg-light-2: "#f3f1f8"
  surface-light: "#ffffff"
  surface-light-2: "#f6f4fb"
  surface-light-3: "#ece9f4"
  text-dark: "#f5f5f7"
  text-dark-2: "#b4b4be"
  text-dark-3: "#80808a"
  text-light: "#0a0a0b"
  text-light-2: "#4b4b53"
  text-light-3: "#8a8a92"
  btn-solid-bg-dark: "#f5f5f7"
  btn-solid-fg-dark: "#0a0a0b"
  btn-solid-bg-light: "#0a0a0b"
  btn-solid-fg-light: "#fafafa"
typography:
  display:
    fontFamily: "Instrument Serif, Iowan Old Style, Georgia, serif"
    fontSize: "clamp(2.4rem, 6.5vw + 0.5rem, 4.4rem)"
    fontWeight: 400
    lineHeight: 1
    letterSpacing: "-0.01em"
  body:
    fontFamily: "Inter, system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.55
    letterSpacing: "normal"
    fontFeature: "ss01, cv11"
  headline:
    fontFamily: "Inter, system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
    fontSize: "clamp(1.85rem, 3vw + 0.8rem, 2.6rem)"
    fontWeight: 700
    lineHeight: 1.08
    letterSpacing: "-0.025em"
  label:
    fontFamily: "Inter, system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 600
    lineHeight: 1
    letterSpacing: "-0.005em"
rounded:
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "20px"
  "2xl": "24px"
  full: "999px"
spacing:
  1: "0.25rem"
  2: "0.5rem"
  3: "0.75rem"
  4: "1rem"
  5: "1.25rem"
  6: "1.5rem"
  8: "2rem"
  10: "2.5rem"
  12: "3rem"
  16: "4rem"
  20: "5rem"
  24: "6rem"
components:
  button-primary:
    backgroundColor: "{colors.btn-solid-bg-dark}"
    textColor: "{colors.btn-solid-fg-dark}"
    rounded: "{rounded.full}"
    padding: "12px 20px"
  button-primary-hover:
    backgroundColor: "{colors.surface-dark-3}"
    textColor: "{colors.text-dark}"
    rounded: "{rounded.full}"
    padding: "12px 20px"
  button-ghost:
    backgroundColor: "{colors.surface-dark-2}"
    textColor: "{colors.text-dark}"
    rounded: "{rounded.full}"
    padding: "12px 20px"
  card:
    backgroundColor: "{colors.surface-dark}"
    textColor: "{colors.text-dark}"
    rounded: "{rounded.xl}"
    padding: "20px"
  nav-link:
    backgroundColor: "transparent"
    textColor: "{colors.text-dark-2}"
    rounded: "{rounded.full}"
    padding: "8px 12px"
---

# Design System: HabitAI

## 1. Overview

**Creative North Star: "The Quiet Studio"**

HabitAI's design system embodies a workspace where attention is the rarest resource. Every element earns its place through restraint: surfaces recede, typography communicates hierarchy through weight and scale rather than decoration, and color appears only where it must guide the eye. The system rejects the loud, gamified aesthetic of typical fitness apps and the generic cream-and-blobs language of AI SaaS landing pages. Instead, it draws from the calm precision of well-organized physical spaces: a clean desk, a single focused light, the satisfaction of a task checked off.

The palette is deliberately limited. Violet carries identity; teal signals completion and progress; warm accents appear sparingly for emphasis. Dark mode is the primary surface, treated as a genuine AMOLED-friendly void rather than a trendy skin. Light mode exists for daylight contexts, not as a "safe default." Typography pairs a geometric sans (Inter) for body with a humanist serif (Instrument Serif) for display moments, creating contrast without visual noise.

**Key Characteristics:**
- Restrained color: two accent hues, one dominant surface treatment
- Dark-first: AMOLED-friendly blacks as the primary canvas
- Content-forward: UI chrome disappears; habits and progress are the visual focus
- Voice-led interaction: the design supports conversation, not navigation
- Trust through transparency: local-first, no-tracking, zero-upsell messaging woven into the visual language

## 2. Colors

The palette is built around two accent hues on a neutral dark/light canvas. Violet carries brand identity and interactive affordances; teal signals completion, progress, and positive states.

### Primary

- **Soft Violet** (#a78bfa): The brand anchor. Used for primary interactive elements, links, focus rings, kicker text, and accent borders in dark mode. Appears on approximately 8-12% of any given screen.
- **Deep Violet** (#7c3aed): The light-mode primary. Same role as Soft Violet but with sufficient contrast against light backgrounds.

### Secondary

- **Bright Teal** (#5eead4): Progress and completion. Used for check marks, progress rings, streak indicators, confirmation states, and the voice assistant pulse. The "habit done" color.
- **Deep Teal** (#0d9488): Light-mode secondary. Carries the same completion semantics on light surfaces.

### Tertiary

- **Warm Amber** (#fb923c): Attention and emphasis. Used sparingly for streak flames, warning states, and occasional accent needs. Not a brand color; a functional tool.

### Neutral

- **Void Black** (#0a0a0b): Dark-mode body background. True near-black for AMOLED efficiency.
- **Surface Dark** (#15151a): Card and container backgrounds in dark mode.
- **Surface Dark 2** (#1c1c22): Elevated surfaces, hover states, secondary containers.
- **Surface Dark 3** (#232329): Tertiary surfaces, input backgrounds, active states.
- **Cloud White** (#fbfafd): Light-mode body background. Near-white with minimal warmth.
- **Surface Light** (#ffffff): Card backgrounds in light mode.
- **Surface Light 2** (#f6f4fb): Secondary containers, hover states in light mode.
- **Text Primary** (#f5f5f7 / #0a0a0b): Headings and body text. Maximum contrast against its background.
- **Text Secondary** (#b4b4be / #4b4b53): Supporting text, descriptions, timestamps.
- **Text Tertiary** (#80808a / #8a8a92): Placeholders, disabled states, metadata.

### Named Rules

**The 10% Violet Rule.** The primary violet accent appears on no more than 10% of any given screen surface. Its rarity is what makes it meaningful. When in doubt, remove violet and let the content carry the weight.

**The Teal Means Done Rule.** Teal is reserved exclusively for completion, progress, and confirmation states. Never use teal for decorative purposes, links, or general emphasis. If teal appears, the user should feel a small reward.

## 3. Typography

**Display Font:** Instrument Serif (with Iowan Old Style, Georgia, serif fallback)
**Body Font:** Inter (with system-ui, -apple-system, Segoe UI, Roboto, sans-serif fallback)

**Character:** The pairing creates a deliberate tension: Inter's geometric precision carries information density, while Instrument Serif's humanist curves add warmth and personality at key moments. The serif appears only in the hero display heading and decorative accents, never in body copy or UI labels.

### Hierarchy

- **Display** (400 weight, clamp(2.4rem, 6.5vw + 0.5rem, 4.4rem), line-height 1): Hero headlines only. The serif italic creates the brand's signature voice moment. Maximum 2 lines.
- **Headline** (700 weight, clamp(1.85rem, 3vw + 0.8rem, 2.6rem), line-height 1.08): Section titles. Sans-serif, tight tracking, bold weight creates clear hierarchy without competing with the display.
- **Title** (700 weight, 1.1875rem, line-height 1.2): Card headings, step numbers, feature names.
- **Body** (400 weight, 1rem, line-height 1.55): Paragraphs, descriptions, list items. Maximum 65-75ch line length.
- **Label** (600 weight, 0.875rem, letter-spacing -0.005em): Buttons, navigation, badges, CTAs.

### Named Rules

**The One Serif Rule.** Instrument Serif appears only in the hero display heading and the decorative italic accent within it. Never use serif for body copy, section headings, buttons, or labels. The serif is the brand's voice;滥用 it dilutes the voice.

**The Balance Rule.** All h1-h3 headings use `text-wrap: balance` for even line lengths. Long prose uses `text-wrap: pretty` to reduce orphans. This is non-negotiable for polished typography.

## 4. Elevation

The system uses tonal layering rather than shadows for depth in dark mode. Surfaces differentiate through subtle brightness shifts (surface → surface-2 → surface-3) rather than drop shadows, which would muddy the AMOLED-black canvas. Shadows appear only in two contexts: the phone mockup (structural, to create device separation) and hover states on interactive elements (behavioral, to confirm interactivity).

Light mode uses minimal shadows: a single `shadow-sm` (0 1px 2px rgba(0,0,0,0.05)) for cards and a `shadow-md` (0 6px 20px -8px rgba(0,0,0,0.12)) for elevated elements like the nav and modals.

### Shadow Vocabulary

- **Ambient Glow** (`box-shadow: 0 0 60px -16px rgba(167,139,250,0.35)`): Hero section ambient violet glow. Decorative, structural.
- **Phone Shadow** (`box-shadow: 0 30px 60px -20px rgba(0,0,0,0.6), 0 0 50px -10px rgba(94,234,212,0.2)`): Device mockup separation. Structural only.
- **Surface Shadow** (`box-shadow: 0 6px 20px -8px rgba(0,0,0,0.5)` dark / `0 6px 20px -8px rgba(10,10,11,0.12)` light): Elevated containers, nav, modals.

### Named Rules

**The Flat-By-Default Rule.** Surfaces are flat at rest. Shadows appear only as a response to state (hover, elevation) or structural need (device mockup, ambient glow). No decorative shadows on cards or buttons.

## 5. Components

### Buttons

- **Shape:** Full-pill radius (999px). No sharp corners on any button.
- **Primary:** Solid fill (text color on dark, dark on light), 44px minimum height, 600 weight, 0.875rem size. Transitions: transform 150ms, background-color 220ms.
- **Hover:** Subtle lift (translateY(-1px)) on primary. Background shift to surface-3 on ghost buttons.
- **Ghost:** Surface-2 background, 1px solid border (var(--border-2)), no shadow. Used for secondary CTAs and the iOS "coming soon" state.
- **Icon Button:** 44px circle, surface-2 background, 1px border. Used for theme toggle, burger menu.

### Cards

- **Corner Style:** 20px radius (rounded-xl). Never exceeding 24px.
- **Background:** Surface color (dark: #15151a, light: #ffffff).
- **Border:** 1px solid var(--border) — rgba(255,255,255,0.09) dark, rgba(10,10,11,0.08) light.
- **Internal Padding:** 20px (spacing-5). Bento cells use 20px, step cards use 24px.
- **Shadow Strategy:** Flat by default. Hover adds translateY(-2px) and border-color shift, no shadow.
- **Accent Glow:** Bento cells have a radial gradient pseudo-element at top-right using their --accent color at 28% opacity, fading to transparent. This is the card's only decorative element.

### Navigation

- **Style:** Sticky, backdrop-filter blur (18px), transparent background that gains a border-bottom on scroll (via .is-scrolled class).
- **Typography:** 0.875rem, 500 weight, text-secondary color, full-pill hover background.
- **Mobile:** Hamburger icon with CSS-only animation (three lines → X). Full-width mobile menu with 48px tap targets.
- **Active State:** No persistent active indicator on desktop nav links. The mobile menu uses background highlight on tap.

### Inputs / Fields

- **Style:** Surface-2 background, 1px border, 12px radius. The confirmation card in the phone mockup shows this pattern.
- **Focus:** No dedicated input component in the landing page; focus states are handled via :focus-visible with 2px primary outline, 3px offset.

### Phone Mockup (Signature Component)

- **Shape:** 40px radius outer frame, 30px radius screen, 90x24px notch.
- **Background:** Gradient from #1a1a1f to #0a0a0b.
- **Shadow:** Combined structural shadow (30px blur) + teal ambient glow (50px blur).
- **Screen:** Pure black (#000) with 52px top padding for notch clearance.

### Bento Grid

- **Layout:** 6-column grid on desktop (720px+), single column on mobile.
- **Cell Spacing:** 16px gap (spacing-4).
- **Cell Min-Height:** 180px mobile, 200px desktop.
- **Span Rules:** --big spans 4 columns + 2 rows. --wide spans 3 columns. Default spans 2 columns.

## 6. Do's and Don'ts

### Do:

- **Do** use the violet accent sparingly — it should appear on ≤10% of any screen surface.
- **Do** reserve teal exclusively for completion, progress, and confirmation states.
- **Do** use tonal layering (surface → surface-2 → surface-3) for depth in dark mode instead of shadows.
- **Do** maintain 44px minimum tap targets on all interactive elements.
- **Do** use `text-wrap: balance` on all h1-h3 headings.
- **Do** respect `prefers-reduced-motion` — all animations must have a reduced-motion alternative.
- **Do** treat the dark mode as the primary surface, not an afterthought.
- **Do** keep the serif (Instrument Serif) to the hero display heading only.

### Don't:

- **Don't** use bright gradients, poppy CTAs, or "hustle culture" energy — this is not a typical fitness app.
- **Don't** use SaaS cream backgrounds, floating blobs, or generic "AI-powered" buzzwords — this is not a generic AI/SaaS landing page.
- **Don't** pair border: 1px solid with box-shadow ≥16px on the same element (the ghost-card pattern).
- **Don't** use border-radius ≥24px on cards or containers. Cards top out at 20px.
- **Don't** use gradient text (background-clip: text with gradient). Use a single solid color.
- **Don't** put an eyebrow kicker above every section. One deliberate kicker per page is voice; kickers everywhere is AI grammar.
- **Don't** use em dashes. Use commas, colons, semicolons, or periods.
- **Don't** animate CSS layout properties unless truly necessary.
- **Don't** gate content visibility on class-triggered transitions — content must be visible by default.
