# Chrona

**Ambient Display Platform for Institutional Spaces**

Chrona is a lightweight, browser-based ambient display designed for auditoriums, examination halls, lobbies, and event spaces. It shows time, date, institutional branding, and contextual messages in a calm, cinematic way — built for projectors, LED walls, and large screens.

---

## Quick Start

1. Download or clone the repository
2. Keep all files in the same folder — do not move them separately
3. Open `index.html` in Google Chrome
4. Configure your display using the settings panel
5. Click **Present** to open the display window
6. Drag the display window to your projector or second screen
7. Press **F** inside the display window to fullscreen it

No server required. No installation. Works offline after first load.

---

## File Structure

```
chrona/
├── index.html              Settings and control panel
├── display.html            Presentation output screen
├── assets/
│   ├── css/
│   │   ├── settings.css    Settings page styles
│   │   └── display.css     Display screen styles + all themes
│   ├── js/
│   │   ├── config.js       Shared state, font registry, history, persistence
│   │   ├── watermark.js    Isolated watermark animation module
│   │   ├── settings.js     Settings page logic
│   │   └── display.js      Display screen logic
│   └── fonts/              Reserved for local font files (future)
├── CHANGELOG.txt           Personal build history (internal)
└── README.md               This file
```

---

## Features

### Display

**Clock**
- Large serif display clock, centered on screen
- 12-hour format with optional seconds display
- Optional AM/PM indicator
- Timezone support — system auto-detect or manual selection from 35 global zones

**Date & Weather**
- Full date in the format: Saturday, May 16, 2026
- Optional weather widget inline with the date row
- Weather via wttr.in — hides gracefully when offline
- No broken layout when any feature is unavailable

**Quote / Message Feed**
- Rotating quotes or institutional messages
- Elegant fade transition between entries (no scrolling ticker)
- Accepts plain text with ` - `, `—`, or `--` as source separators
- Upload `.txt` or `.json` files
- Manual next button and pause/resume from settings
- Independent opacity controls for quote text and source line
- Center or left alignment

**Announcements**
- Slide-in pill overlay at the bottom of the display
- Configurable duration (3–30 seconds)
- Send instantly from settings or from saved presets
- Cancel button to dismiss immediately

**Branding**
- Organisation name in small caps
- Logo upload (any format, original proportions preserved, no cropping)
- Both or either can be shown independently

**Watermark Background**
- Diagonal repeating text in alternating row directions
- Seamless continuous motion — no visible reset at any speed
- Fully theme-aware color
- Configurable: text content, opacity, line spacing, motion speed, text scale

---

### Themes (14)

| Name      | Character                        |
|-----------|----------------------------------|
| Eclipse   | Deep violet — default            |
| Minimal   | Light warm grey                  |
| Ambient   | Deep navy blue                   |
| Glass     | Dark blue-slate                  |
| Horizon   | Warm amber-dark                  |
| Monolith  | Pure black and white             |
| Ash       | Warm charcoal                    |
| Dusk      | Deep rose-violet                 |
| Nordic    | Light cool blue-white            |
| Ember     | Deep red-amber                   |
| Forest    | Dark green                       |
| Slate     | Cool industrial grey             |
| Ivory     | Warm cream-white                 |
| Void      | Deep dark navy                   |

Each theme controls background, clock color, watermark color, glow, and halo fog. The settings panel accent color also adapts to the active theme.

---

### Typography (5 independent font slots)

| Slot         | Purpose                              |
|--------------|--------------------------------------|
| Clock        | Large display numerals               |
| Date/Weather | Supporting information row           |
| Quote Text   | Feed message body                    |
| Quote Source | Attribution / reference line         |
| Watermark    | Background repeating text            |

**Clock fonts** (projection-safe serifs):
Cormorant Garamond, EB Garamond, Bodoni Moda, Playfair Display, Libre Baskerville, Fraunces

**UI / supporting fonts** (projection-safe sans-serifs):
Inter, DM Sans, Source Sans 3, Lato, IBM Plex Sans, Outfit

**Reading fonts** (for quote text):
EB Garamond, Lora, Merriweather, Cormorant Garamond, Inter, DM Sans

All fonts load from Google Fonts with graceful degradation to system fonts when offline.

---

### Sizing

Each display element can be scaled independently:

| Element        | Range     | Presets                      |
|----------------|-----------|------------------------------|
| Logo           | 0.4× – 2.5× | Small, Default, Large, Wide |
| Clock          | 0.5× – 2.0× | Small, Default, Large, Massive |
| Date/Weather   | 0.5× – 2.0× | Small, Default, Large        |
| Quote/Feed     | 0.5× – 2.0× | Small, Default, Large        |
| Watermark text | 0.4× – 4.0× | Fine, Default, Bold, Display |

---

### Settings Panel

**3-column layout:**
- Left sidebar: navigation + present controls
- Center: configuration panel (resizable via drag divider)
- Right: live 16:9 preview (1920×1080 internal, scaled to fit)

**Live / Preview mode:**
- Live mode: every change pushes immediately to the display
- Preview mode: changes only apply when you click "Push to Display" — useful when adjusting settings mid-presentation

**Fullscreen test:**
- "Test Fullscreen" button opens the display in a fullscreen overlay on the admin's screen without affecting the projector output
- Press ESC or click Exit to return to settings

**Keyboard shortcuts** (visible on hover, hidden at rest):

| Key     | Action                     |
|---------|----------------------------|
| Alt+1   | Go to Branding             |
| Alt+2   | Go to Clock                |
| Alt+3   | Go to Appearance           |
| Alt+4   | Go to Fonts                |
| Alt+5   | Go to Background           |
| Alt+6   | Go to Sizing               |
| Alt+7   | Go to Feed                 |
| Alt+8   | Go to Weather              |
| Alt+9   | Go to Announcements        |
| Alt+0   | Go to Advanced             |
| P       | Present                    |
| F       | Fullscreen (display window)|

---

### Present Controls

| Control        | Description                                           |
|----------------|-------------------------------------------------------|
| ▶ Present      | Opens the display window                              |
| ⏸ Pause        | Fades out foreground (clock, text) — watermark runs  |
| ■ Blank        | Completely blanks the display screen                  |
| ● Live toggle  | Switches between live push and manual push mode       |
| Push to Display| Manually pushes current settings (in preview mode)   |

---

### System Features

**History**
- Every config change is logged with a timestamp and label
- Up to 40 entries stored locally
- Click any entry to restore that exact state
- Delete individual entries or clear all
- Works like browser history — non-destructive exploration

**Burn-in prevention**
- Subtly shifts the layout by a few pixels every 4 minutes
- Recommended for LED walls and OLED displays
- Completely invisible to audience

**Smooth animations toggle**
- Enables fluid transitions across theme changes, font swaps, and size adjustments
- Disable on low-spec or older hardware to reduce GPU load

**Export / Import**
- Export full configuration as `.json`
- Import configuration from a saved `.json` file
- Useful for transferring settings between machines

**Reset**
- Two-step confirmation before clearing
- Clears all settings, presets, saved cities, and history

---

### Offline Behavior

Chrona is designed to work gracefully without internet:

| Feature        | Offline behavior                                   |
|----------------|----------------------------------------------------|
| Clock & date   | Always works — system time                        |
| Config & presets | Always works — localStorage                    |
| History        | Always works — localStorage                       |
| Fonts          | Falls back to system serif/sans-serif             |
| Weather        | Hides cleanly — no broken layout                  |
| Watermark      | Always works — canvas animation                   |
| Logo           | Always works — stored as base64 in localStorage   |

---

## Multi-Monitor Workflow

1. Open `index.html` in Chrome on your primary screen
2. Click **Present** — the display window opens
3. Drag the display window to your projector or secondary screen
4. Click inside the display window and press **F** to fullscreen
5. Return to your primary screen — settings panel remains there
6. Make changes in Live mode — they push to the display instantly
7. Use **Pause** or **Blank** when needed without closing the window

---

## Deployment Notes

- Recommended browser: Google Chrome (latest)
- All files must remain in the same folder structure
- For GitHub Pages: push the entire folder, set Pages to serve from root
- The `display.html` and `index.html` must be in the same directory for the Present button to work
- BroadcastChannel API requires both pages to be on the same origin

---

## Design Philosophy

Chrona was designed around one principle: **restraint**.

The clock is large because presence matters. The background moves slowly because stillness without motion becomes hollow. The typography is chosen because craft signals care. The animations are subtle because elegance is not the same as spectacle.

This is not a feature-maximising dashboard. It is an ambient presence — designed to belong to a room, not to demand attention from it.

---

## Credits

Chrona v1.0  
Designed & developed by **AwesomeFreak**  
[github.com/AwesomeFreak](https://github.com/AwesomeFreak)

---

## License

Personal / institutional use. Not for redistribution without permission.
