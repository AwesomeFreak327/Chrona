# Chrona v1.0 — Developer Context Document
**For AI assistant handoff. Last updated: August 2026.**

---

## What Chrona Is

Chrona is a browser-based ambient institutional display platform.
It runs on a projector or large screen during examinations, assemblies,
and institutional events. It shows a large clock, branding, weather,
a quote/message feed, and a countdown timer.

Built entirely in vanilla HTML, CSS, and JavaScript.
No framework, no backend, no build tools.
Hosted on GitHub Pages. Works offline after first load.

Live URL: https://AwesomeFreak327.github.io/Chrona/

---

## Design Philosophy

- Calm, cinematic, ambient — not flashy or busy
- Think airport premium displays, Apple event screens
- Every animation decision is restrained by intention
- Quality and consistency matter more than speed of delivery
- Solve real institutional problems simply

---

## File Structure
```bash
Chrona/
├── index.html Settings and control panel (admin screen)
├── display.html Presentation output screen (projector)
├── presenter.html Stage monitor (speaker-facing screen)
├── favicon.svg SVG favicon
├── assets/
│ ├── css/
│ │ ├── settings.css
│ │ └── display.css
│ ├── js/
│ │ ├── config.js Shared state, THEMES, FONTS, DEFAULTS,
│ │ │ Config, History, Announcements, Cities,
│ │ │ BC (BroadcastChannel), helpers
│ │ ├── watermark.js Isolated canvas animation module
│ │ ├── display.js Display screen runtime logic
│ │ └── settings.js Settings page logic
│ └── fonts/ Reserved for local woff2 (offline use)
├── README.md
└── CHANGELOG.txt
```

---

## Architecture

**Communication:**
- BroadcastChannel API ('chrona_v1') — between index.html and display.html
- postMessage — between index.html and the preview iframe
- Both channels used in parallel: BC for real display window,
  postMessage for preview iframe inside settings page

**Persistence:**
- localStorage for all config, history, presets, cities, custom fonts
- No server, no accounts, no cloud sync

**Three pages:**
1. index.html — settings panel + live preview iframe of display.html
2. display.html — the actual projector output, opened via window.open()
3. presenter.html — stage monitor, opened separately, syncs via BC

---

## Key Systems

### Config (config.js)
- `Config.get/set/load/reset` — single source of truth
- `DEFAULTS` — every config key with its default value
- `History` — 40-entry ring buffer, omits logoData from snapshots
- `Announcements` — CRUD with favourite, rename, usedAt
- `Cities` — saved weather cities
- `DURATION` — animation timing tokens, injected as CSS custom props
- `THEMES` — 16 themes (8 colour families × dark/light)
- `FONTS` — 5 font slots (clock, meta, quote, quoteSrc, wm)
- `BC` — shared BroadcastChannel instance

### Theme System
8 colour families, each with a dark and light variant = 16 themes total.
Each theme has: label, family, mode ('dark'/'light'), pair (the other mode's key),
bg, clock, wm (RGB string), halo (rgba string), accent.

Families: violet, blue, teal, green, amber, red, pink, slate

Dark themes: eclipse, midnight, abyss, forest, horizon, ember, dusk, void
Light themes: lavender, skyline, seafoam, sage, gilded, scarlet, blossom, paper

Settings page has a Dark/Light toggle that switches the entire theme grid
and auto-pairs — if Eclipse (violet dark) is active and user switches to
Light, it automatically applies Lavender (violet light).

Settings page itself has its own separate dark/light/auto theme
(stored in localStorage as 'chrona_settings_theme').

### Font System
5 independent font slots. Each has a curated list in FONTS registry.
Font URLs are Google Fonts CDN links loaded on demand via loadFont().
Custom fonts supported: user pastes a Google Fonts embed URL,
name is extracted from URL, font is loaded and added to registry.
Custom fonts saved in config.customFonts per slot.

Clock slot requires lining numerals — avoid old-style numeral fonts
(Cormorant Garamond, EB Garamond, Lora at large sizes).

### Watermark (watermark.js)
Canvas-based diagonal animation. Public API: start(), update(), pause(), resume().
Offset accumulates as a continuous float — never resets.
Pause freezes the canvas frame. Resume restarts from same offset.
Font, colour, speed, opacity all update without restarting the loop.

### Timer
Wall-clock math — NOT a countdown variable.
Stores startTimestamp + durationMs. Each tick: remaining = durationMs - (Date.now() - startTimestamp - pausedMs).
Zero drift. Self-corrects after tab blur or device sleep.
Auto-start: checked every second in _tick() against timerStartTime (HH:MM 24h).
Timer state re-broadcast to display window when Present is clicked.

### Clock
Self-correcting scheduler — NOT setInterval.
Uses setTimeout(delay) where delay = 1000 - (Date.now() % 1000).
Fires at exact millisecond each second turns over. Zero cumulative drift.

### Announcement Overlay
When sent: clock compresses upward (scale 0.32, translateY -22vh),
logo area compresses upward, meta row and quote fade.
Overlay text appears centered in the cleared space.
Font follows --font-meta. Fully animated with spring easing.
After duration: everything returns to original positions.

### Present Window
Opens via window.open() as a popup.
Shows a "Click anywhere to begin" prompt on first open.
User click triggers requestFullscreen() — true fullscreen, URL bar hidden.
ESC or X button exits fullscreen, window.close() is called via fullscreenchange listener.
window.open uses popup=yes flag to suppress browser chrome.

### Stage Monitor (presenter.html)
Third page on same BroadcastChannel.
Shows: large countdown timer, current time, date, announcements.
Clock becomes dominant (large) when timer is not running.
Timer becomes dominant when running.
Invert toggle (light/dark) controlled from Stage Monitor settings panel.
Scale slider in Stage Monitor panel controls font sizes.
presenterLinked config key — when true, requires display to be active.
When false, runs standalone.

---

## DEFAULTS (key values)
```bash
theme: 'eclipse'
fontClock: 'Playfair Display'
fontMeta: 'Inter'
fontQuote: 'Lora'
fontQuoteSrc: 'Inter'
fontWm: 'Inter'
wmOpacity: 10 (full opacity by default)
wmSpeed: 4
wmSpacing: 5
showQuotes: false
showWeather: false
timerEnabled: false
timerDuration: 120 (minutes)
presenterLinked: true
presenterScale: 1
smoothAnimations:true
burnIn: true
```

---

## CSS Token System

Animation durations from config.js DURATION object,
injected as CSS custom properties on :root at runtime:
--dur-instant, --dur-fast, --dur-normal, --dur-slow,
--dur-theme, --dur-font, --dur-overlay

Easing curves defined in display.css:
--ease-out, --ease-spring, --ease-in-out

Scale multipliers as CSS custom properties:
--s-logo, --s-clock, --s-meta, --s-quote, --s-wm, --s-timer, --p-scale (presenter)

---

## Settings Panel Layout

[Sidebar 216px] [Config panel — resizable] [Resizer 5px] [Preview — flex:1]

Sidebar has nav items with Alt+1..0 keyboard shortcuts,
plus Alt+H (History), Alt+S (Stage Monitor), Alt+A (About).

Config panel sections: Branding, Clock, Appearance, Fonts, Background,
Sizing, Feed, Weather, Announcements, Timer, Advanced, History,
Stage Monitor, About.

Feature toggles grey out and disable their child sections when OFF
via .disabled-section CSS class + _initDisabledSections() JS.

---

## Weather

Uses Open-Meteo API (free, no key).
Geocoding via Open-Meteo geocoding API for city names.
Reverse geocoding via BigDataCloud API (free, no key) for geolocation.
Geolocation requires HTTPS — works on GitHub Pages, not on localhost HTTP.

---

## Decisions Made — Not Changing

- No React, no Node, no build tools — stays vanilla
- No server — localStorage only, each user has independent state
- GitHub Pages for hosting — HTTPS, free, shareable via link
- Electron discussed as future option but not current priority
- Halo crossfade on theme change: accepted browser limitation,
  radial-gradient with CSS variables cannot be transitioned
- Chrome autocomplete dropdown: cannot be themed, accepted
- window.open() popup shows URL bar for ~3 seconds: browser security,
  cannot be removed without custom domain or Electron

---

## Known Open Items (as of August 2026)

- Font system: old-style numeral fonts still in quote slot
  (Lora, Fraunces) — acceptable for quote text, not for clock
- Timer preset chips: planned but not yet implemented
- Timer wheel-style input: planned, currently hours/minutes number inputs
- Paired light/dark themes could be expanded with more per family
- Favicon: functional but could be more distinctive
- Presenter.html timing: minor visual glitch at fast tick intervals,
  wall-clock math self-corrects but not yet fully smooth
- Halo animation snap on theme change: accepted, not fixable in CSS

---

## Deployment

GitHub Pages from main branch root.
All JS, CSS, HTML at same path level — BroadcastChannel requires same origin.
Each visitor has completely independent localStorage state.
After pushing changes, bump ?v=1.xx on script tags in HTML files
to bust browser cache for existing users.

---

## Developer Notes for AI Assistants

- Always give code snippets, never full file rewrites
- One fix at a time unless fixes are in the same 3-line area
- No over-engineering — simplest solution that works cleanly
- Check uploaded files before assuming current state
- config.js is loaded by ALL THREE pages — changes affect everything
- watermark.js is isolated — never touches display.js state
- _tick() in display.js runs every second — keep it lightweight
- _populateUI() in settings.js must stay in sync with DEFAULTS
- THEMES and FONTS objects are the single source of truth for visual options
- BroadcastChannel does NOT work across iframes — use postMessage for preview
- Timer state must be re-broadcast when Present window opens
- Stage monitor must check _presenterWin.closed before window.open to avoid reload