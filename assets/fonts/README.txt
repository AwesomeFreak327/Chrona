Chrona v1.0 — Local Fonts Directory
=====================================

This folder is reserved for local font files (.woff2) for true offline use.

Currently, Chrona loads all fonts from Google Fonts on first use and relies
on the browser's HTTP cache for subsequent offline loads. Once a font has been
loaded online, it will work offline until the browser cache is cleared.

For a fully self-contained offline deployment (e.g. institutions with no
internet access at all), download the required .woff2 files and place them
here. Then update the font URL entries in assets/js/config.js to point to
local paths instead of Google Fonts URLs.

Example (in config.js FONTS registry):
  'Crimson Text': {
    url:   'assets/fonts/CrimsonText-Regular.woff2',
    stack: "'Crimson Text', Georgia, serif",
    note:  'Traditional formal serif',
  },

Recommended fonts to download for full offline support:
  - Crimson Text (Regular, Italic, SemiBold)
  - Work Sans (Light, Regular, Medium)
  - EB Garamond (Regular, Italic)
  - Inter (ExtraLight, Light, Regular)
  - Bodoni Moda (Regular, Italic)
  - Lora (Regular, Italic)

Source: fonts.google.com — download the variable or individual weight files
and convert to .woff2 format if needed.

This is listed as an upcoming improvement in CHANGELOG.txt (v0.07+).
