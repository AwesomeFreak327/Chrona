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
function _uid() {
  return Date.now() * 1000 + Math.floor(Math.random() * 1000);
}

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
  wmOpacity:        10,
  wmSpacing:        5,
  wmSpeed:          4,
  // sizing
  scaleLogo:        1,
  scaleClock:       1,
  scaleMeta:        1,
  scaleQuote:       1,
  scaleWmFont:      1,
  // fonts — 5 independent slots
  fontClock:        'Playfair Display',
  fontMeta:         'Inter',
  fontQuote:        'Lora',
  fontQuoteSrc:     'Inter',
  fontWm:           'Inter',
  customFonts:      {},
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
  timerDuration:    120,
  timerStartTime:   '',
  timerAutoStart:   false, 
  scaleTimer:       1,
  presenterScale:   1,
  presenterInvert:  false,
  presenterLinked:  true,
};

/* ── FONT REGISTRY ────────────────────────────────────────── */
const FONTS = {
  // Slot: clock — large display numerals on projector
  clock: {
    'Playfair Display': {
      url:   'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600&display=swap',
      stack: "'Playfair Display', Georgia, serif",
      note:  'Elegant editorial — strong lining numerals',
    },
    'DM Serif Display': {
      url:   'https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&display=swap',
      stack: "'DM Serif Display', Georgia, serif",
      note:  'Modern classic — warm and authoritative',
    },
    'Montserrat': {
      url:   'https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;500;600;700&display=swap',
      stack: "'Montserrat', system-ui, sans-serif",
      note:  'Geometric clean — all lining numerals',
    },
    'Oswald': {
      url:   'https://fonts.googleapis.com/css2?family=Oswald:wght@300;400;500&display=swap',
      stack: "'Oswald', system-ui, sans-serif",
      note:  'Condensed strong — excellent on projectors',
    },
    'Orbitron': {
      url:   'https://fonts.googleapis.com/css2?family=Orbitron:wght@400;500;700;900&display=swap',
      stack: "'Orbitron', system-ui, sans-serif",
      note:  'Technical precision — distinct and bold',
    },
    'Cormorant SC': {
      url:   'https://fonts.googleapis.com/css2?family=Cormorant+SC:wght@300;400;500&display=swap',
      stack: "'Cormorant SC', Georgia, serif",
      note:  'Small caps variant — lining numerals only',
    },
  },

  // Slot: meta — date, weather, org name
  meta: {
    'Inter': {
      url:   'https://fonts.googleapis.com/css2?family=Inter:wght@200;300;400;500&display=swap',
      stack: "'Inter', system-ui, sans-serif",
      note:  'Neutral and highly legible — safe default',
    },
    'Work Sans': {
      url:   'https://fonts.googleapis.com/css2?family=Work+Sans:wght@300;400;500&display=swap',
      stack: "'Work Sans', system-ui, sans-serif",
      note:  'Professional and warm — pairs with serifs',
    },
    'Plus Jakarta Sans': {
      url:   'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500&display=swap',
      stack: "'Plus Jakarta Sans', system-ui, sans-serif",
      note:  'Clean geometric — modern institutional',
    },
    'Sora': {
      url:   'https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500&display=swap',
      stack: "'Sora', system-ui, sans-serif",
      note:  'Modern geometric — subtle and distinct',
    },
    'Nunito': {
      url:   'https://fonts.googleapis.com/css2?family=Nunito:wght@300;400;500;600&display=swap',
      stack: "'Nunito', system-ui, sans-serif",
      note:  'Friendly rounded — approachable feel',
    },
  },

  // Slot: quote — verse / message body text
  quote: {
    'Lora': {
      url:   'https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,500;1,400;1,500&display=swap',
      stack: "'Lora', Georgia, serif",
      note:  'Warm and readable — best italic for quotes',
    },
    'Crimson Pro': {
      url:   'https://fonts.googleapis.com/css2?family=Crimson+Pro:ital,wght@0,400;0,600;1,400;1,600&display=swap',
      stack: "'Crimson Pro', Georgia, serif",
      note:  'Refined italic — lining numerals, elegant',
    },
    'Fraunces': {
      url:   'https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300;1,9..144,300&display=swap',
      stack: "'Fraunces', Georgia, serif",
      note:  'Expressive light italic — distinctive voice',
    },
    'Playfair Display': {
      url:   'https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;1,400&display=swap',
      stack: "'Playfair Display', Georgia, serif",
      note:  'Editorial italic — strong visual weight',
    },
    'Montserrat': {
      url:   'https://fonts.googleapis.com/css2?family=Montserrat:ital,wght@0,300;1,300&display=swap',
      stack: "'Montserrat', system-ui, sans-serif",
      note:  'Clean light italic — modern and minimal',
    },
  },

  // Slot: quoteSrc — attribution / reference line
  quoteSrc: {
    'Inter': {
      url:   'https://fonts.googleapis.com/css2?family=Inter:wght@200;300&display=swap',
      stack: "'Inter', system-ui, sans-serif",
      note:  'Clean at small sizes — neutral attribution',
    },
    'Work Sans': {
      url:   'https://fonts.googleapis.com/css2?family=Work+Sans:wght@200;300&display=swap',
      stack: "'Work Sans', system-ui, sans-serif",
      note:  'Professional — light source line',
    },
    'Sora': {
      url:   'https://fonts.googleapis.com/css2?family=Sora:wght@200;300&display=swap',
      stack: "'Sora', system-ui, sans-serif",
      note:  'Modern minimal — subtle attribution',
    },
    'Plus Jakarta Sans': {
      url:   'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@200;300&display=swap',
      stack: "'Plus Jakarta Sans', system-ui, sans-serif",
      note:  'Geometric clean — precise reference line',
    },
    'Nunito': {
      url:   'https://fonts.googleapis.com/css2?family=Nunito:wght@300;400&display=swap',
      stack: "'Nunito', system-ui, sans-serif",
      note:  'Friendly — warm attribution style',
    },
  },

  // Slot: watermark — background repeating text
  wm: {
    'Inter': {
      url:   'https://fonts.googleapis.com/css2?family=Inter:wght@200;300&display=swap',
      stack: "'Inter', system-ui, sans-serif",
      note:  'Even stroke weight — tiles most cleanly',
    },
    'Work Sans': {
      url:   'https://fonts.googleapis.com/css2?family=Work+Sans:wght@200;300&display=swap',
      stack: "'Work Sans', system-ui, sans-serif",
      note:  'Slightly more character — subtle texture',
    },
    'Plus Jakarta Sans': {
      url:   'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@200;300&display=swap',
      stack: "'Plus Jakarta Sans', system-ui, sans-serif",
      note:  'Geometric repeat — premium pattern feel',
    },
    'Sora': {
      url:   'https://fonts.googleapis.com/css2?family=Sora:wght@200;300&display=swap',
      stack: "'Sora', system-ui, sans-serif",
      note:  'Modern subtle — disappears into background',
    },
    'Nunito': {
      url:   'https://fonts.googleapis.com/css2?family=Nunito:wght@300;400&display=swap',
      stack: "'Nunito', system-ui, sans-serif",
      note:  'Rounded tile — softer watermark texture',
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
  // ── VIOLET ──────────────────────────────────────────────
  eclipse: {
    label:'Eclipse', family:'violet', mode:'dark', pair:'lavender',
    bg:'#060409', clock:'#e2d0ff', wm:'160,80,255',
    halo:'rgba(6,4,9,.82)', accent:'#a78bfa'
  },
  lavender: {
    label:'Lavender', family:'violet', mode:'light', pair:'eclipse',
    bg:'#f5f3ff', clock:'#5b21b6', wm:'109,40,217',
    halo:'rgba(245,243,255,.90)', accent:'#7c3aed'
  },

  // ── BLUE ────────────────────────────────────────────────
  midnight: {
    label:'Midnight', family:'blue', mode:'dark', pair:'skyline',
    bg:'#070c14', clock:'#d8eaff', wm:'100,160,255',
    halo:'rgba(7,12,20,.84)', accent:'#60a5fa'
  },
  skyline: {
    label:'Skyline', family:'blue', mode:'light', pair:'midnight',
    bg:'#f0f6ff', clock:'#1d4ed8', wm:'29,78,216',
    halo:'rgba(240,246,255,.90)', accent:'#3b82f6'
  },

  // ── TEAL ────────────────────────────────────────────────
  abyss: {
    label:'Abyss', family:'teal', mode:'dark', pair:'seafoam',
    bg:'#040e0e', clock:'#99f6e4', wm:'20,184,166',
    halo:'rgba(4,14,14,.84)', accent:'#14b8a6'
  },
  seafoam: {
    label:'Seafoam', family:'teal', mode:'light', pair:'abyss',
    bg:'#f0fdfb', clock:'#0f766e', wm:'15,118,110',
    halo:'rgba(240,253,251,.90)', accent:'#0d9488'
  },

  // ── GREEN ────────────────────────────────────────────────
  forest: {
    label:'Forest', family:'green', mode:'dark', pair:'sage',
    bg:'#050e08', clock:'#b8e8c0', wm:'40,160,80',
    halo:'rgba(5,14,8,.86)', accent:'#40a850'
  },
  sage: {
    label:'Sage', family:'green', mode:'light', pair:'forest',
    bg:'#f1fdf3', clock:'#166534', wm:'22,101,52',
    halo:'rgba(241,253,243,.90)', accent:'#16a34a'
  },

  // ── AMBER ────────────────────────────────────────────────
  horizon: {
    label:'Horizon', family:'amber', mode:'dark', pair:'gilded',
    bg:'#0c0805', clock:'#ffddb8', wm:'255,160,60',
    halo:'rgba(12,8,5,.84)', accent:'#fb923c'
  },
  gilded: {
    label:'Gilded', family:'amber', mode:'light', pair:'horizon',
    bg:'#fffbeb', clock:'#b45309', wm:'180,83,9',
    halo:'rgba(255,251,235,.90)', accent:'#d97706'
  },

  // ── RED ──────────────────────────────────────────────────
  ember: {
    label:'Ember', family:'red', mode:'dark', pair:'scarlet',
    bg:'#0a0604', clock:'#ffcca0', wm:'220,80,20',
    halo:'rgba(10,6,4,.86)', accent:'#e06020'
  },
  scarlet: {
    label:'Scarlet', family:'red', mode:'light', pair:'ember',
    bg:'#fff5f5', clock:'#b91c1c', wm:'185,28,28',
    halo:'rgba(255,245,245,.90)', accent:'#dc2626'
  },

  // ── PINK ─────────────────────────────────────────────────
  dusk: {
    label:'Dusk', family:'pink', mode:'dark', pair:'blossom',
    bg:'#0d0710', clock:'#f0c8e8', wm:'200,80,180',
    halo:'rgba(13,7,16,.84)', accent:'#e090d0'
  },
  blossom: {
    label:'Blossom', family:'pink', mode:'light', pair:'dusk',
    bg:'#fff0f6', clock:'#9d174d', wm:'157,23,77',
    halo:'rgba(255,240,246,.90)', accent:'#db2777'
  },

  // ── SLATE ────────────────────────────────────────────────
  void: {
    label:'Void', family:'slate', mode:'dark', pair:'paper',
    bg:'#020408', clock:'#c8d8f0', wm:'60,100,180',
    halo:'rgba(2,4,8,.88)', accent:'#5060b0'
  },
  paper: {
    label:'Paper', family:'slate', mode:'light', pair:'void',
    bg:'#f8fafc', clock:'#1e293b', wm:'30,41,59',
    halo:'rgba(248,250,252,.90)', accent:'#475569'
  },
};

/* ─────────────────────────────────────────────────── */
function _normalizeConfig(raw) {
  const out = {};
  const bools = ['showLogo','showOrgName','showSeconds','showAmPm',
    'showWeather','showQuotes','burnIn','autoFullscreen','smoothAnimations',
    'liveMode','timerEnabled','timerAutoStart','annScheduleEnabled',
    'presenterInvert','presenterLinked','quotePaused'];
  const nums = ['quoteInterval','quoteOpacity','quoteSrcOpacity',
    'wmOpacity','wmSpacing','wmSpeed',
    'scaleLogo','scaleClock','scaleMeta','scaleQuote','scaleWmFont',
    'scaleTimer','presenterScale','overlayDuration','timerDuration'];
  // Bounds taken directly from the sliders/inputs in index.html
  const RANGES = {
    quoteInterval:   [10, 120],
    quoteOpacity:    [0.1, 1],
    quoteSrcOpacity: [0.05, 1],
    wmOpacity:       [1, 10],
    wmSpacing:       [1, 10],
    wmSpeed:         [1, 10],
    scaleLogo:       [0.4, 2.5],
    scaleClock:      [0.5, 2.0],
    scaleMeta:       [0.5, 2.0],
    scaleQuote:      [0.5, 2.0],
    scaleWmFont:     [0.4, 4.0],
    scaleTimer:      [0.4, 2.0],
    presenterScale:  [0.5, 2.0],
    overlayDuration: [3, 30],
    timerDuration:   [1, 599],
  };
  const validThemes = Object.keys(THEMES);
  const validTimezones = TIMEZONES.filter(tz => !tz.disabled).map(tz => tz.value);

  for (const key of Object.keys(DEFAULTS)) {
    const val = raw[key];
    if (val === undefined) continue;

    if (bools.includes(key)) {
      out[key] = val === 'false' ? false : !!val;
    } else if (nums.includes(key)) {
      const n = Number(val);
      const clean = isNaN(n) ? DEFAULTS[key] : n;
      const range = RANGES[key];
      out[key] = range ? Math.min(range[1], Math.max(range[0], clean)) : clean;
    } else if (key === 'theme') {
      out[key] = validThemes.includes(val) ? val : DEFAULTS.theme;
    } else if (key === 'timezone') {
      out[key] = validTimezones.includes(val) ? val : DEFAULTS.timezone;
    } else if (key === 'quotes') {
      out[key] = Array.isArray(val) ? val : DEFAULTS.quotes;
    } else if (key === 'customFonts') {
      const obj = (val && typeof val === 'object' && !Array.isArray(val)) ? val : {};
      const cleaned = {};
      for (const slot of Object.keys(obj)) {
        const f = obj[slot];
        if (f && typeof f.url === 'string' && typeof f.name === 'string' &&
            /^https:\/\/fonts\.googleapis\.com\//.test(f.url)) {
          cleaned[slot] = { name: f.name, url: f.url, stack: typeof f.stack === 'string' ? f.stack : `'${f.name}', system-ui, sans-serif` };
        }
      }
      out[key] = cleaned;
    } else if (key === 'logoData') {
      out[key] = typeof val === 'string' ? val : '';
    } else if (key === 'weatherLat' || key === 'weatherLon') {
      if (val === null) {
        out[key] = null;
      } else {
        const n = Number(val);
        const max = key === 'weatherLat' ? 90 : 180;
        out[key] = (Number.isFinite(n) && n >= -max && n <= max) ? n : null;
      }
    } else {
      out[key] = val;
    }
  }
  return out;
}

/* ── CONFIG ───────────────────────────────────────────────── */
const Config = {
  _state: { ...DEFAULTS },

  get() {
    return JSON.parse(JSON.stringify(this._state));
  },

  set(partial, opts = {}) {
    this._state = _normalizeConfig({ ...this._state, ...partial });
    this._save();
    if (!opts.silent) this._scheduleHistory(partial, opts.label);
    return this._state;
  },

  reset() {
    clearTimeout(this._histTimer);
    this._histTimer = null;
    this._state = { ...DEFAULTS };
    this._save();
    History.clear();
  },

  load() {
    try {
      const raw = localStorage.getItem(KEYS.config);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          this._state = { ...DEFAULTS, ..._normalizeConfig(parsed) };
        }
      }
    } catch(e) {}
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
    const keys = Object.keys(partial);
    if (keys.length > 1) return 'Multiple settings changed';
    const key = keys[0];
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
      scaleTimer:     'Timer size adjusted',
      presenterScale: 'Stage monitor size adjusted',
      wmOpacity:      'Watermark opacity adjusted',
      wmSpeed:        'Watermark speed adjusted',
      wmSpacing:      'Watermark spacing adjusted',
      wmText:         'Watermark text changed',
      orgName:        'Organisation name changed',
      showLogo:       'Logo toggled',
      showOrgName:    'Org name toggled',
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
      autoFullscreen: 'Auto fullscreen toggled',
      timezone:       'Timezone changed',
      weatherCity:    'Weather city changed',
      timerEnabled:   'Timer toggled',
      timerDuration:  'Timer duration changed',
      timerStartTime: 'Timer schedule changed',
      timerAutoStart: 'Timer auto-start toggled',
      overlayDuration:'Announcement duration changed',
      annScheduleEnabled:'Scheduled announcement toggled',
      annScheduleTime:'Announcement schedule changed',
      annScheduleText:'Announcement message changed',
      presenterInvert:'Stage monitor theme changed',
      presenterLinked:'Stage monitor link toggled',
      customFonts:    'Custom font updated',
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
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          this._entries = parsed.filter(e =>
            e && typeof e.id !== 'undefined' && typeof e.ts === 'string' && e.state && typeof e.state === 'object'
          ).slice(0, MAX_HISTORY);
        }
      }
    } catch(e) {}
    return this._entries;
  },

  push(state, label) {
    // Deep clone but OMIT logoData — it's large (base64) and already
    // saved in config. Including it would bloat history by ~100KB+ per entry.
    const snapshot = JSON.parse(JSON.stringify({ ...state, logoData: '[[stored]]' }));
    const entry = {
      id:    _uid(),
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
        if (Array.isArray(parsed)) {
          this._items = parsed
            .map(item => typeof item === 'string'
              ? { id: _uid(), text: item.trim(), label: item.trim(), favourite: false, usedAt: null }
              : {
                  id:        typeof item.id === 'number' ? item.id : _uid(),
                  text:      typeof item.text === 'string' ? item.text.trim() : '',
                  label:     typeof item.label === 'string' ? item.label.trim() : (item.text || '').trim(),
                  favourite: !!item.favourite,
                  usedAt:    (typeof item.usedAt === 'string' && !isNaN(Date.parse(item.usedAt))) ? item.usedAt : null,
                }
            )
            .filter(item => item.text.length > 0);
        }
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
      id:        _uid(),
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
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          this._items = parsed
            .filter(c => c && typeof c.name === 'string' && c.name.trim())
            .map(c => ({ name: c.name.trim() }));
        }
      }
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
  link.onerror = () => { _loadedFonts.delete(url); };
  document.head.appendChild(link);
}

function loadAllFontsForSlot(slot) {
  const reg = FONTS[slot];
  if (!reg) return;
  Object.values(reg).forEach(f => loadFont(f.url));
}

/* ── BROADCAST CHANNEL ───────────────────────────────────── */
const BC = new BroadcastChannel('chrona_v1');
