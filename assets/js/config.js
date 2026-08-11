/* ─────────────────────────────────────────────────────────────
   Chrona v1.0 · config.js
   Shared configuration, font registry, history, persistence.
   Loaded by both display.html and index.html.
───────────────────────────────────────────────────────────── */

const CHRONA_VERSION = '1.0';

/* ── STORAGE KEYS ─────────────────────────────────────────── */
const KEYS = {
  config:    'chrona_config',
  history:   'chrona_history',
  presets:   'chrona_ann_presets',
  configW:   'chrona_config_w',
  cities:    'chrona_saved_cities',
};

/* ── ANIMATION TIMING TOKENS ─────────────────────────────── */
/* Single source of truth for all durations.
   CSS reads these via :root custom properties (injected below).
   JS uses the DURATION object directly.                       */
const DURATION = {
  instant:  0,
  fast:     180,   // button press, chip hover
  normal:   280,   // panel transitions, toggle
  slow:     500,   // size changes, font swap fade
  theme:   1300,   // background + colour cross-fade
  font:     220,   // font-fading opacity out (swap happens after)
  overlay:  900,   // announcement slide in/out
};

/* Inject timing tokens as CSS custom properties on :root */
function injectTimingTokens() {
  const style = document.createElement('style');
  style.textContent = `:root {
    --dur-instant:  ${DURATION.instant}ms;
    --dur-fast:     ${DURATION.fast}ms;
    --dur-normal:   ${DURATION.normal}ms;
    --dur-slow:     ${DURATION.slow}ms;
    --dur-theme:    ${DURATION.theme}ms;
    --dur-font:     ${DURATION.font}ms;
    --dur-overlay:  ${DURATION.overlay}ms;
  }`;
  document.head.appendChild(style);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', injectTimingTokens);
} else {
  injectTimingTokens();
}

/* ── DEFAULTS ─────────────────────────────────────────────── */
const DEFAULTS = {
  // identity
  theme:            'eclipse',
  orgName:          '',
  logoData:         '',
  showLogo:         true,
  showOrgName:      true,
  // clock
  showSeconds:      true,
  showAmPm:         false,
  timezone:         'auto',
  // weather
  showWeather:      false,
  weatherCity:      '',
  weatherLat:       null,
  weatherLon:       null,
  // feed
  showQuotes:       false,
  quotes:           [],        // empty — user fills their own
  quoteInterval:    30,
  quotePaused:      false,
  quoteAlign:       'center',  // 'center' | 'left' | 'right'
  quoteOpacity:     1.0,
  quoteSrcOpacity:  0.68,
  // watermark
  wmText:           'CHRONA',
  wmOpacity:        4,
  wmSpacing:        5,
  wmSpeed:          4,
  // sizing
  scaleLogo:        1,
  scaleClock:       1,
  scaleMeta:        1,
  scaleQuote:       1,
  scaleWmFont:      1,
  // fonts — 5 independent slots
  fontClock:        'Cormorant Garamond',
  fontMeta:         'Inter',
  fontQuote:        'Lora',
  fontQuoteSrc:     'Inter',
  fontWm:           'Inter',
  // system
  burnIn:           true,
  autoFullscreen:   true,
  smoothAnimations: true,
  liveMode:         true,
  // overlay
  overlayText:      '',
  overlayDuration:  8,
  annScheduleEnabled: false,
  annScheduleTime:    '',
  annScheduleText:    '',
  // countdown timer
  timerEnabled:     false,
  timerDuration:    120,   // in minutes
  timerStartTime:   '',    // 'HH:MM' 24h format — empty means manual start
  timerAutoStart:   false, // auto-start when clock reaches timerStartTime
  scaleTimer:       1,     // sizing multiplier
};

/* ── FONT REGISTRY ────────────────────────────────────────── */
const FONTS = {
  // Slot: clock — large display numerals on projector
  clock: {
    'Cormorant Garamond': {
      url:   'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;1,300&display=swap',
      stack: "'Cormorant Garamond', Georgia, serif",
      note:  'Ultra-elegant — very high contrast strokes',
    },
    'Playfair Display': {
      url:   'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&display=swap',
      stack: "'Playfair Display', Georgia, serif",
      note:  'Strong editorial — bold on projectors',
    },
    'DM Serif Display': {
      url:   'https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&display=swap',
      stack: "'DM Serif Display', Georgia, serif",
      note:  'Warm and authoritative — modern serif',
    },
    'Libre Baskerville': {
      url:   'https://fonts.googleapis.com/css2?family=Libre+Baskerville:ital@0;1&display=swap',
      stack: "'Libre Baskerville', Georgia, serif",
      note:  'Solid and sturdy — excellent projection',
    },
    'Lora': {
      url:   'https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,700;1,400&display=swap',
      stack: "'Lora', Georgia, serif",
      note:  'Balanced — warm and readable at distance',
    },
    'EB Garamond': {
      url:   'https://fonts.googleapis.com/css2?family=EB+Garamond:ital,wght@0,400;1,400&display=swap',
      stack: "'EB Garamond', Georgia, serif",
      note:  'Classical — refined old-style numerals',
    },
  },

  // Slot: meta — date, weather, org name
  meta: {
    'Inter': {
      url:   'https://fonts.googleapis.com/css2?family=Inter:wght@200;300;400&display=swap',
      stack: "'Inter', system-ui, sans-serif",
      note:  'Neutral and highly legible — safe choice',
    },
    'DM Sans': {
      url:   'https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,300;9..40,400&display=swap',
      stack: "'DM Sans', system-ui, sans-serif",
      note:  'Geometric — pairs well with serif clocks',
    },
    'Outfit': {
      url:   'https://fonts.googleapis.com/css2?family=Outfit:wght@200;300;400&display=swap',
      stack: "'Outfit', system-ui, sans-serif",
      note:  'Friendly — rounded and modern',
    },
    'IBM Plex Sans': {
      url:   'https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@200;300;400&display=swap',
      stack: "'IBM Plex Sans', system-ui, sans-serif",
      note:  'Technical — precise and institutional',
    },
    'Josefin Sans': {
      url:   'https://fonts.googleapis.com/css2?family=Josefin+Sans:wght@200;300;400&display=swap',
      stack: "'Josefin Sans', system-ui, sans-serif",
      note:  'Elegant thin caps — distinctive look',
    },
  },

  // Slot: quote — verse / message body text
  quote: {
    'Lora': {
      url:   'https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;1,400&display=swap',
      stack: "'Lora', Georgia, serif",
      note:  'Warm — best for inspirational text',
    },
    'Merriweather': {
      url:   'https://fonts.googleapis.com/css2?family=Merriweather:ital,wght@0,300;1,300&display=swap',
      stack: "'Merriweather', Georgia, serif",
      note:  'High readability — designed for screens',
    },
    'Cormorant Garamond': {
      url:   'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;1,300&display=swap',
      stack: "'Cormorant Garamond', Georgia, serif",
      note:  'Literary — refined italic character',
    },
    'EB Garamond': {
      url:   'https://fonts.googleapis.com/css2?family=EB+Garamond:ital,wght@0,400;1,400&display=swap',
      stack: "'EB Garamond', Georgia, serif",
      note:  'Scholarly — elegant long-form reading',
    },
    'DM Serif Display': {
      url:   'https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&display=swap',
      stack: "'DM Serif Display', Georgia, serif",
      note:  'Expressive — strong italic presence',
    },
  },

  // Slot: quoteSrc — attribution / reference line
  quoteSrc: {
    'Inter': {
      url:   'https://fonts.googleapis.com/css2?family=Inter:wght@200;300&display=swap',
      stack: "'Inter', system-ui, sans-serif",
      note:  'Clean — neutral reference line',
    },
    'DM Sans': {
      url:   'https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,200;9..40,300&display=swap',
      stack: "'DM Sans', system-ui, sans-serif",
      note:  'Light geometric — subtle attribution',
    },
    'Josefin Sans': {
      url:   'https://fonts.googleapis.com/css2?family=Josefin+Sans:wght@200;300&display=swap',
      stack: "'Josefin Sans', system-ui, sans-serif",
      note:  'Spaced caps — elegant small attribution',
    },
    'IBM Plex Sans': {
      url:   'https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@200;300&display=swap',
      stack: "'IBM Plex Sans', system-ui, sans-serif",
      note:  'Precise — technical references',
    },
    'Outfit': {
      url:   'https://fonts.googleapis.com/css2?family=Outfit:wght@200;300&display=swap',
      stack: "'Outfit', system-ui, sans-serif",
      note:  'Friendly — warm attribution style',
    },
  },

  // Slot: watermark — background repeating text
  wm: {
    'Inter': {
      url:   'https://fonts.googleapis.com/css2?family=Inter:wght@200;300&display=swap',
      stack: "'Inter', system-ui, sans-serif",
      note:  'Minimal — disappears into background',
    },
    'IBM Plex Sans': {
      url:   'https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@200;300&display=swap',
      stack: "'IBM Plex Sans', system-ui, sans-serif",
      note:  'Even stroke — tiles cleanly',
    },
    'Josefin Sans': {
      url:   'https://fonts.googleapis.com/css2?family=Josefin+Sans:wght@200;300&display=swap',
      stack: "'Josefin Sans', system-ui, sans-serif",
      note:  'Spaced — creates a premium texture',
    },
    'Outfit': {
      url:   'https://fonts.googleapis.com/css2?family=Outfit:wght@200;300&display=swap',
      stack: "'Outfit', system-ui, sans-serif",
      note:  'Geometric — consistent tile pattern',
    },
    'DM Sans': {
      url:   'https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,200;9..40,300&display=swap',
      stack: "'DM Sans', system-ui, sans-serif",
      note:  'Light — subtle atmospheric texture',
    },
  },
};

/* ── TIMEZONES ────────────────────────────────────────────── */
const TIMEZONES = [
  { label: 'Auto — use system time',     value: 'auto' },
  { label: '── Americas',                value: '', disabled: true },
  { label: 'New York (EST / EDT)',        value: 'America/New_York' },
  { label: 'Chicago (CST / CDT)',         value: 'America/Chicago' },
  { label: 'Denver (MST / MDT)',          value: 'America/Denver' },
  { label: 'Los Angeles (PST / PDT)',     value: 'America/Los_Angeles' },
  { label: 'Toronto',                     value: 'America/Toronto' },
  { label: 'São Paulo (BRT)',             value: 'America/Sao_Paulo' },
  { label: '── Europe',                  value: '', disabled: true },
  { label: 'London (GMT / BST)',          value: 'Europe/London' },
  { label: 'Paris / Berlin (CET)',        value: 'Europe/Paris' },
  { label: 'Istanbul (TRT)',              value: 'Europe/Istanbul' },
  { label: 'Moscow (MSK)',                value: 'Europe/Moscow' },
  { label: '── Middle East / Africa',    value: '', disabled: true },
  { label: 'Dubai (GST)',                 value: 'Asia/Dubai' },
  { label: 'Cairo (EET)',                 value: 'Africa/Cairo' },
  { label: 'Lagos (WAT)',                 value: 'Africa/Lagos' },
  { label: 'Nairobi (EAT)',              value: 'Africa/Nairobi' },
  { label: '── South Asia',              value: '', disabled: true },
  { label: 'Karachi (PKT)',               value: 'Asia/Karachi' },
  { label: 'Kolkata / Chennai (IST)',     value: 'Asia/Kolkata' },
  { label: 'Colombo (SLST)',             value: 'Asia/Colombo' },
  { label: 'Dhaka (BST)',                value: 'Asia/Dhaka' },
  { label: '── South-East Asia',        value: '', disabled: true },
  { label: 'Bangkok (ICT)',              value: 'Asia/Bangkok' },
  { label: 'Singapore / KL (SGT)',       value: 'Asia/Singapore' },
  { label: 'Jakarta (WIB)',              value: 'Asia/Jakarta' },
  { label: '── East Asia',              value: '', disabled: true },
  { label: 'Hong Kong (HKT)',            value: 'Asia/Hong_Kong' },
  { label: 'Shanghai (CST)',             value: 'Asia/Shanghai' },
  { label: 'Tokyo (JST)',                value: 'Asia/Tokyo' },
  { label: 'Seoul (KST)',                value: 'Asia/Seoul' },
  { label: '── Pacific / Oceania',      value: '', disabled: true },
  { label: 'Sydney (AEST / AEDT)',       value: 'Australia/Sydney' },
  { label: 'Auckland (NZST / NZDT)',     value: 'Pacific/Auckland' },
];

/* ── THEME DEFINITIONS ────────────────────────────────────── */
const THEMES = {
  eclipse:  { label:'Eclipse',  bg:'#060409', clock:'#e2d0ff', wm:'160,80,255',  halo:'rgba(6,4,9,.72)',       accent:'#a78bfa' },
  minimal:  { label:'Minimal',  bg:'#f4f1ec', clock:'#181510', wm:'24,21,16',    halo:'rgba(244,241,236,.80)', accent:'#94a3b8' },
  ambient:  { label:'Ambient',  bg:'#070c14', clock:'#d8eaff', wm:'100,160,255', halo:'rgba(7,12,20,.75)',     accent:'#60a5fa' },
  glass:    { label:'Glass',    bg:'#0b1422', clock:'#dff0ff', wm:'150,210,255', halo:'rgba(11,20,34,.75)',    accent:'#7dd3fc' },
  horizon:  { label:'Horizon',  bg:'#0c0805', clock:'#ffddb8', wm:'255,160,60',  halo:'rgba(12,8,5,.75)',      accent:'#fb923c' },
  monolith: { label:'Monolith', bg:'#000000', clock:'#ffffff', wm:'255,255,255', halo:'rgba(0,0,0,.78)',       accent:'#cbd5e1' },
  ash:      { label:'Ash',      bg:'#111110', clock:'#e8e4de', wm:'200,196,188', halo:'rgba(17,17,16,.75)',    accent:'#c8c0b0' },
  dusk:     { label:'Dusk',     bg:'#0d0710', clock:'#f0c8e8', wm:'200,80,180',  halo:'rgba(13,7,16,.75)',     accent:'#e090d0' },
  nordic:   { label:'Nordic',   bg:'#f0f4f8', clock:'#1a2332', wm:'26,35,50',    halo:'rgba(240,244,248,.82)', accent:'#4a7ab5' },
  ember:    { label:'Ember',    bg:'#0a0604', clock:'#ffcca0', wm:'220,80,20',   halo:'rgba(10,6,4,.78)',      accent:'#e06020' },
  forest:   { label:'Forest',   bg:'#050e08', clock:'#b8e8c0', wm:'40,160,80',   halo:'rgba(5,14,8,.78)',      accent:'#40a850' },
  slate:    { label:'Slate',    bg:'#0c0f14', clock:'#c8d4e0', wm:'100,130,160', halo:'rgba(12,15,20,.78)',    accent:'#7090b0' },
  ivory:    { label:'Ivory',    bg:'#faf8f4', clock:'#2c2820', wm:'44,40,32',    halo:'rgba(250,248,244,.84)', accent:'#8a7a60' },
  void:     { label:'Void',     bg:'#020408', clock:'#c8d8f0', wm:'60,100,180',  halo:'rgba(2,4,8,.82)',       accent:'#5060b0' },
};

/* ── CONFIG ───────────────────────────────────────────────── */
const Config = {
  _state: { ...DEFAULTS },

  get() { return { ...this._state }; },

  set(partial, opts = {}) {
    this._state = { ...this._state, ...partial };
    this._save();
    if (!opts.silent) this._scheduleHistory(partial, opts.label);
    return this._state;
  },

  reset() {
    this._state = { ...DEFAULTS };
    this._save();
    History.clear();
  },

  load() {
    try {
      const raw = localStorage.getItem(KEYS.config);
      if (raw) this._state = { ...DEFAULTS, ...JSON.parse(raw) };
    } catch(e) { /* corrupt storage — fall back to defaults silently */ }
    return this._state;
  },

  _save() {
    try { localStorage.setItem(KEYS.config, JSON.stringify(this._state)); } catch(e) {}
  },

  // Debounced — sliders fire many times per second, one history entry per gesture
  _histTimer: null,
  _scheduleHistory(partial, label) {
    clearTimeout(this._histTimer);
    this._histTimer = setTimeout(() => {
      History.push(this._state, label || this._describeChange(partial));
    }, 800);
  },

  _describeChange(partial) {
    const key = Object.keys(partial)[0];
    const MAP = {
      theme:          'Theme changed',
      fontClock:      'Clock font changed',
      fontMeta:       'Meta font changed',
      fontQuote:      'Quote font changed',
      fontQuoteSrc:   'Source font changed',
      fontWm:         'Watermark font changed',
      scaleClock:     'Clock size adjusted',
      scaleLogo:      'Logo size adjusted',
      scaleMeta:      'Meta size adjusted',
      scaleQuote:     'Quote size adjusted',
      scaleWmFont:    'Watermark size adjusted',
      wmOpacity:      'Watermark opacity adjusted',
      wmSpeed:        'Watermark speed adjusted',
      wmText:         'Watermark text changed',
      orgName:        'Organisation name changed',
      showSeconds:    'Seconds toggled',
      showAmPm:       'AM/PM toggled',
      showQuotes:     'Feed toggled',
      showWeather:    'Weather toggled',
      quoteAlign:     'Feed alignment changed',
      quoteInterval:  'Feed interval changed',
      quoteOpacity:   'Quote opacity adjusted',
      quoteSrcOpacity:'Source opacity adjusted',
      burnIn:         'Burn-in prevention toggled',
      smoothAnimations:'Smooth animations toggled',
      timezone:       'Timezone changed',
    };
    return MAP[key] || 'Settings changed';
  },
};

/* ── HISTORY ─────────────────────────────────────────────── */
const MAX_HISTORY = 40;

const History = {
  _entries: [],

  load() {
    try {
      const raw = localStorage.getItem(KEYS.history);
      if (raw) this._entries = JSON.parse(raw);
    } catch(e) {}
    return this._entries;
  },

  push(state, label) {
    // Deep clone but OMIT logoData — it's large (base64) and already
    // saved in config. Including it would bloat history by ~100KB+ per entry.
    const snapshot = JSON.parse(JSON.stringify({ ...state, logoData: '[[stored]]' }));
    const entry = {
      id:    Date.now(),
      ts:    new Date().toISOString(),
      label: label || 'Changed',
      state: snapshot,
    };
    this._entries.unshift(entry);
    if (this._entries.length > MAX_HISTORY) this._entries.pop();
    this._save();
    return entry;
  },

  restore(id) {
    const entry = this._entries.find(e => e.id === id);
    if (!entry) return null;
    // Re-inject the current logoData since it was omitted from snapshot
    const restored = { ...entry.state, logoData: Config.get().logoData };
    Config.set(restored, { silent: true });
    return restored;
  },

  remove(id) {
    this._entries = this._entries.filter(e => e.id !== id);
    this._save();
  },

  clear() {
    this._entries = [];
    this._save();
  },

  getAll() { return [...this._entries]; },

  _save() {
    try { localStorage.setItem(KEYS.history, JSON.stringify(this._entries)); } catch(e) {}
  },
};

/* ── ANNOUNCEMENTS (upgraded from plain Presets) ─────────── */
/* Each item: { id, text, label, favourite, usedAt }          */
const Announcements = {
  _items: [],

  load() {
    try {
      const raw = localStorage.getItem(KEYS.presets);
      if (raw) {
        const parsed = JSON.parse(raw);
        // Migrate from old plain-string format if needed
        this._items = parsed.map(item =>
          typeof item === 'string'
            ? { id: Date.now() + Math.random(), text: item, label: item, favourite: false, usedAt: null }
            : item
        );
      }
    } catch(e) {}
    return this._items;
  },

  add(text, label) {
    const trimmed = (text || '').trim();
    if (!trimmed) return null;
    // prevent exact duplicates
    if (this._items.find(i => i.text === trimmed)) return null;
    const item = {
      id:        Date.now(),
      text:      trimmed,
      label:     (label || trimmed).trim(),
      favourite: false,
      usedAt:    null,
    };
    this._items.unshift(item);
    this._save();
    return item;
  },

  rename(id, newLabel) {
    const item = this._items.find(i => i.id === id);
    if (item) { item.label = (newLabel || '').trim() || item.text; this._save(); }
  },

  toggleFavourite(id) {
    const item = this._items.find(i => i.id === id);
    if (item) { item.favourite = !item.favourite; this._save(); }
  },

  markUsed(id) {
    const item = this._items.find(i => i.id === id);
    if (item) { item.usedAt = new Date().toISOString(); this._save(); }
  },

  remove(id) {
    this._items = this._items.filter(i => i.id !== id);
    this._save();
  },

  // Returns sorted: favourites first, then by most recently used
  getAll() {
    return [...this._items].sort((a, b) => {
      if (a.favourite !== b.favourite) return a.favourite ? -1 : 1;
      if (a.usedAt && b.usedAt) return new Date(b.usedAt) - new Date(a.usedAt);
      if (a.usedAt) return -1;
      if (b.usedAt) return 1;
      return 0;
    });
  },

  _save() {
    try { localStorage.setItem(KEYS.presets, JSON.stringify(this._items)); } catch(e) {}
  },
};

/* ── SAVED CITIES ────────────────────────────────────────── */
const Cities = {
  _items: [],

  load() {
    try {
      const raw = localStorage.getItem(KEYS.cities);
      if (raw) this._items = JSON.parse(raw);
    } catch(e) {}
    return this._items;
  },

  add(city) {
    const name = (city || '').trim();
    if (!name || this._items.find(c => c.name === name)) return;
    this._items.push({ name });
    this._save();
  },

  remove(index) {
    this._items.splice(index, 1);
    this._save();
  },

  getAll() { return [...this._items]; },

  _save() {
    try { localStorage.setItem(KEYS.cities, JSON.stringify(this._items)); } catch(e) {}
  },
};

/* ── QUOTE PARSER ────────────────────────────────────────── */
function parseQuote(raw) {
  if (typeof raw === 'object' && raw !== null) {
    return { text: raw.text || '', source: raw.source || '' };
  }
  const str = String(raw).trim();
  // Safe separator split: —  --  –  or spaced hyphen " - "
  // Avoids lookbehind for broader browser support
  const parts = str.split(/\s*(?:—|--|–)\s*|\s+-\s+/);
  return {
    text:   parts[0].trim(),
    source: parts[1] ? parts[1].trim() : '',
  };
}

function renderQuoteText(text) {
  // Don't double-wrap if text already has outer quotation marks
  const hasOuter = /^["'"'«»]/.test(text) && /["'"'»]$/.test(text);
  return hasOuter ? text : `\u201c${text}\u201d`; // proper curly quotes
}

/* ── FONT LOADER ─────────────────────────────────────────── */
const _loadedFonts = new Set();

function loadFont(url) {
  if (!url || _loadedFonts.has(url)) return;
  _loadedFonts.add(url);
  const link = Object.assign(document.createElement('link'), {
    rel:  'stylesheet',
    href: url,
  });
  document.head.appendChild(link);
}

function loadAllFontsForSlot(slot) {
  const reg = FONTS[slot];
  if (!reg) return;
  Object.values(reg).forEach(f => loadFont(f.url));
}

/* ── BROADCAST CHANNEL ───────────────────────────────────── */
const BC = new BroadcastChannel('chrona_v1');
