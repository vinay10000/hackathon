# HabitAI Landing Page

A standalone, fast, and accessible landing page for **HabitAI** — the habit
tracker mobile app. Lives in its own folder so it never touches the Expo /
React Native app source.

## Stack
- Plain **HTML5** + **CSS3** + **vanilla JavaScript**
- Google Fonts: Inter (UI) + Instrument Serif (display italics)
- No build step, no framework, no runtime dependencies
- Single inline SVG for the brand mark, no external icon font

## Run it
Just open the file:

```bash
# macOS
open landing-page/index.html

# Windows
start landing-page/index.html
```

Or, for a nicer preview (proper routing, no `file://` quirks):

```bash
# from the repo root
cd landing-page
python -m http.server 5173
# then visit http://localhost:5173
```

## Files
```
landing-page/
├── index.html      # markup
├── styles.css      # design tokens + components
├── script.js       # theme toggle, mobile menu, reveal animations
└── assets/
    └── favicon.svg
```

## Features
- **Dark / light theme** with a single toggle (persists in `localStorage`)
- **AMOLED-friendly** dark theme using true near-black
- **Fully responsive** — mobile, tablet, desktop
- **Accessible** — skip link, focus rings, ARIA labels, reduced-motion support
- **Phone mockup** with a simulated Today screen
- **Voice AI showcase** with a simulated assistant screen
- **Scroll-reveal** animations using `IntersectionObserver`
- **Bento grid** features, 3-step "how it works", testimonials, FAQ
