/* ─────────────────────────────────────────────────────────────
   Chrona v1.0 · settings.js
   Runs only in index.html (settings page).
   Depends on: config.js (Config, History, Announcements,
               Cities, THEMES, FONTS, TIMEZONES, DEFAULTS,
               DURATION, BC, loadFont, loadAllFontsForSlot)
───────────────────────────────────────────────────────────── */

const RENDER_W      = 1920;
const RENDER_H      = 1080;
const CONFIG_W_KEY  = 'chrona_config_w';

/* ── MODULE STATE ─────────────────────────────────────────── */
let displayWin          = null;
let _liveMode           = true;
let _quotePaused        = false;
let _pdTimer            = null;
let _scrollMem          = {};
let _timerState         = null;
let _timerSeconds       = 0;
let _timerRunning       = false;
let _timerPaused        = false;
let _timerSyncInt       = null;
let _timerStartPending  = null;
let _timerDurationMs    = 0;
let _timerStartedAt     = null;
let _timerPausedAt      = null;
let _timerPausedMs      = 0;

/* ── SINGLE INIT ──────────────────────────────────────────── */
window.addEventListener('DOMContentLoaded', () => {
  // Load all persisted data
  Config.load();
  History.load();
  Announcements.load();
  Cities.load();

  // Build dynamic UI sections
  _buildTimezoneSelect();

  const initialMode = THEMES[Config.get().theme]?.mode || 'dark';
  const _themeGrid = document.getElementById('theme-grid');
  if (_themeGrid) _themeGrid.dataset.mode = initialMode;

  _buildThemeGrid();

  document.querySelectorAll('[data-theme-mode]').forEach(b =>
    b.classList.toggle('active', b.dataset.themeMode === initialMode)
  );

  document.querySelectorAll('[data-theme-mode]').forEach(btn => {
    btn.addEventListener('click', () => {
      const mode = btn.dataset.themeMode;
      const grid = document.getElementById('theme-grid');
      if (!grid) return;

      document.querySelectorAll('[data-theme-mode]').forEach(b =>
        b.classList.toggle('active', b.dataset.themeMode === mode)
      );

      grid.dataset.mode = mode;

      const cfg        = Config.get();
      const current    = THEMES[cfg.theme];

      if (current && current.mode !== mode) {
        const paired = current.pair;
        if (paired && THEMES[paired]) {
          _save({ theme: paired }, `Theme → ${THEMES[paired].label}`);
          _applyAccent(paired);
        }
      }

      _buildThemeGrid();
    });
  });

  _buildFontSlots();
  _buildCustomFontInputs();

  // Populate all form controls from config
  _populateUI();

  // Apply theme accent to settings panel
  _applyAccent(Config.get().theme);

  // Render list-based panels
  _renderAnnPresets();
  _renderCities();
  _renderHistory();

  // Layout
  _setConfigW(_savedConfigW());
  _initResizer();
  _initKeyNav();
  _initNavScrollMemory();

  // Preview scaling needs layout to be stable first
  requestAnimationFrame(() => requestAnimationFrame(_initPreviewScaling));

  // Preload all font sheets for font chip previews
  ['clock','meta','quote','quoteSrc','wm'].forEach(loadAllFontsForSlot);

  const customFonts = Config.get().customFonts || {};
  Object.values(customFonts).forEach(f => {
    if (f?.url) loadFont(f.url);
  });

  // Wire up all event listeners
  _initPresentControls();
  _initTimezone();
  _initLogo();
  _initQuotes();
  _initWeather();
  _initOverlay();
  _initTimer();
  _initSizing();
  _initAdvanced();
  _initHistory();
  _initFullscreenTest();
  _wireSimpleBindings();
  _initCredit();
  _initPresenter();
  _initDisabledSections();
  _initSettingsTheme();
});

/* ─────────────────────────────────────────────────────────────
   POPULATE UI
───────────────────────────────────────────────────────────── */
function _populateUI() {
  const cfg = Config.get();

  // Text / checkbox fields
  _sv('orgName',         cfg.orgName);
  _sv('showOrgName',     cfg.showOrgName);
  _sv('showLogo',        cfg.showLogo);
  _sv('showSeconds',     cfg.showSeconds);
  _sv('showAmPm',        cfg.showAmPm);
  _sv('tzSelect',        cfg.timezone || 'auto');
  _sv('showWeather',     cfg.showWeather);
  _sv('weatherCity',     cfg.weatherCity || '');
  _sv('showQuotes',      cfg.showQuotes);
  _sv('quoteInterval',   cfg.quoteInterval || 30);
  _sv('quoteOpacity',    cfg.quoteOpacity ?? 1);
  _sv('quoteSrcOpacity', cfg.quoteSrcOpacity ?? 0.68);
  _sv('wmText',          cfg.wmText || 'CHRONA');
  _sv('wmOpacity',       cfg.wmOpacity || 4);
  _sv('wmSpacing',       cfg.wmSpacing || 5);
  _sv('wmSpeed',         cfg.wmSpeed || 4);
  _sv('overlayText',     cfg.overlayText || '');
  _sv('overlayDuration', cfg.overlayDuration || 8);
  _sv('burnIn',          cfg.burnIn !== false);
  _sv('autoFullscreen',  cfg.autoFullscreen !== false);
  _sv('smoothAnimations',cfg.smoothAnimations !== false);

  // Sizing sliders
  ['scaleLogo','scaleClock','scaleMeta','scaleQuote','scaleWmFont','scaleTimer'].forEach(k => {
    _sv(k, cfg[k] ?? 1);
    _sizeLbl(k, cfg[k] ?? 1);
  });
  _sv('presenterScale', cfg.presenterScale ?? 1);
  _sizeLbl('presenterScale', cfg.presenterScale ?? 1);
  _sv('presenterInvert', cfg.presenterInvert ?? false);
  const dur = cfg.timerDuration || 120;
  _sv('timerHours',   Math.floor(dur / 60));
  _sv('timerMinutes', dur % 60);
  _sv('presenterLinked', cfg.presenterLinked !== false);

  // Slider display labels
  ['wmOpacity','wmSpacing','wmSpeed'].forEach(k => _lbl(k+'-val', cfg[k] || 4));
  _lbl('quoteInterval-val',   (cfg.quoteInterval   || 30) + 's');
  _lbl('overlayDuration-val', (cfg.overlayDuration ||  8) + 's');
  _lbl('quoteOpacity-val',    Math.round((cfg.quoteOpacity    ?? 1)    * 100) + '%');
  _lbl('quoteSrcOpacity-val', Math.round((cfg.quoteSrcOpacity ?? 0.68) * 100) + '%');

  // Quotes textarea
  if (cfg.quotes?.length) {
    const el = document.getElementById('quotesText');
    if (el) el.value = cfg.quotes.map(q =>
      typeof q === 'object'
        ? `${q.text || ''}${q.source ? ' - ' + q.source : ''}`
        : q
    ).join('\n');
  }

  // Logo
  if (cfg.logoData) {
    const prev = document.getElementById('logo-preview');
    const drop  = document.getElementById('logo-drop');
    const clr   = document.getElementById('logo-clear');
    if (prev) { prev.src = cfg.logoData; prev.style.display = 'block'; }
    if (drop) { const p = drop.querySelector('p'); if (p) p.style.display = 'none'; }
    if (clr)  clr.style.display = 'inline-block';
  }

  // Theme chips
  document.querySelectorAll('.theme-card').forEach(c => {
    c.classList.toggle('active', c.dataset.theme === cfg.theme);
  });

  // Font chips
  ['Clock','Meta','Quote','QuoteSrc','Wm'].forEach(slot => {
    const key = 'font' + slot;
    document.querySelectorAll(`[data-font-slot="${slot.toLowerCase()}"]`).forEach(c => {
      c.classList.toggle('active', c.dataset.font === cfg[key]);
    });
  });

  // Quote alignment segments
  document.querySelectorAll('.seg-btn[data-align]').forEach(b => {
    b.classList.toggle('active', b.dataset.align === (cfg.quoteAlign || 'center'));
  });

  _liveMode = cfg.liveMode !== false;
  _updateLiveUI();
}

/* ─────────────────────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────────────────────── */
function _esc(str) {
  return String(str ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}
function _sv(id, val) {
  const el = document.getElementById(id);
  if (!el) return;
  if (el.type === 'checkbox') el.checked = !!val;
  else el.value = val != null ? val : '';
}
function _lbl(id, txt) {
  const el = document.getElementById(id);
  if (el) el.textContent = txt;
}
function _sizeLbl(k, v) {
  _lbl(k + '-val', parseFloat(v).toFixed(2).replace(/\.?0+$/, '') + '×');
}

/* ─────────────────────────────────────────────────────────────
   SAVE & BROADCAST
───────────────────────────────────────────────────────────── */
let _lastPushedConfig = null;

function _save(partial, label) {
  Config.set(partial, { label });
  if (_liveMode) {
    BC.postMessage({ type: 'config', config: Config.get() });
    _lastPushedConfig = JSON.stringify(Config.get());
    _updateLiveUI();
  } else {
    _updateLiveUI();
  }
  _pushToPreview();
  _applyAccent(Config.get().theme);
}

function _pushToPreview() {
  clearTimeout(_pdTimer);
  _pdTimer = setTimeout(() => {
    const cfg = Config.get();
    _postToFrame('preview-frame', cfg);
    _postToFrame('fs-frame', cfg);
  }, 80);
}

function _syncPreviewTimerState() {
  if (!(_timerState && _timerRunning)) return;
  setTimeout(() => {
    _sendToFrame('preview-frame', {
      type: 'timer-start',
      seconds: _timerSeconds
    });
    if (_timerPaused) {
      setTimeout(() => {
        _sendToFrame('preview-frame', { type: 'timer-pause' });
      }, 50);
    }
  }, 120);
}

function _postToFrame(id, cfg) {
  try {
    const frame = document.getElementById(id);
    if (frame?.contentWindow) {
      frame.contentWindow.postMessage({ type: 'config', config: cfg }, '*');
    }
  } catch(e) { /* frame not loaded yet — safe to ignore */ }
}

function _sendToFrame(id, msg) {
  try {
    const frame = document.getElementById(id);
    if (frame?.contentWindow) {
      frame.contentWindow.postMessage(msg, '*');
    }
  } catch(e) {}
}

function _pushLive() {
  BC.postMessage({ type: 'config', config: Config.get() });
  _lastPushedConfig = JSON.stringify(Config.get());
  _pushToPreview();
  _updateLiveUI();
}

/* ─────────────────────────────────────────────────────────────
   SIMPLE BINDINGS
───────────────────────────────────────────────────────────── */
function _bind(id, key, transform) {
  const el = document.getElementById(id);
  if (!el) return;
  const ev = el.type === 'checkbox' ? 'change' : 'input';
  el.addEventListener(ev, () => {
    const val = el.type === 'checkbox'
      ? el.checked
      : (transform ? transform(el.value) : el.value);
    _save({ [key]: val });
  });
}

// Wire all simple bindings after DOM is ready
// (called from the single DOMContentLoaded block above via inline setup)
/* ── Simple bindings — wired directly, no wrapper needed ── */
function _wireSimpleBindings() {
    _bind('presenterLinked', 'presenterLinked');
  ['orgName','showOrgName','showLogo','showSeconds','showAmPm',
   'showWeather','showQuotes','wmText','overlayText',
   'burnIn','autoFullscreen','smoothAnimations',
   'annScheduleEnabled','annScheduleTime','annScheduleText']
    .forEach(k => _bind(k, k));

  document.getElementById('timerEnabled')?.addEventListener('change', function() {
    _save({ timerEnabled: this.checked });
    if (!this.checked) {
      _timerState = null;
      BC.postMessage({ type: 'timer-reset' });
      _sendToFrame('preview-frame', { type: 'timer-reset' });
      const btn = document.getElementById('btn-timer-pause');
      if (btn) btn.textContent = '⏸ Pause';
      _setTimerStatus('Timer not running');
    }
  });
  document.getElementById('timerAutoStart')?.addEventListener('change', function() {
    if (this.checked) {
      const timeVal = document.getElementById('timerStartTime')?.value.trim();
      const input   = document.getElementById('timerStartTime');
      if (!timeVal && input) {
        input.style.borderColor = 'var(--danger)';
        input.style.boxShadow   = '0 0 0 2px rgba(248,113,113,.2)';
        setTimeout(() => {
          input.style.borderColor = '';
          input.style.boxShadow   = '';
        }, 3000);
      }
    }
  });
  document.getElementById('annScheduleTime')?.addEventListener('blur', function() {
    const text    = document.getElementById('annScheduleText')?.value.trim();
    const timeVal = this.value.trim();
    const err     = document.getElementById('ann-schedule-err');
    if (timeVal && !text && err) {
      err.style.display = 'block';
    } else if (err) {
      err.style.display = 'none';
    }
  });

  document.getElementById('annScheduleText')?.addEventListener('input', function() {
    const err = document.getElementById('ann-schedule-err');
    if (this.value.trim() && err) err.style.display = 'none';
  });

  _bind('wmOpacity',       'wmOpacity',       Number);
  _bind('wmSpacing',       'wmSpacing',       Number);
  _bind('wmSpeed',         'wmSpeed',         Number);
  _bind('overlayDuration', 'overlayDuration', Number);
  _bind('quoteInterval',   'quoteInterval',   Number);
  _bind('quoteOpacity',    'quoteOpacity',    Number);
  _bind('quoteSrcOpacity', 'quoteSrcOpacity', Number);

  // Slider live labels — visual only, no save
  ['wmOpacity','wmSpacing','wmSpeed'].forEach(k => {
    document.getElementById(k)?.addEventListener('input', function() {
      _lbl(k+'-val', this.value);
    });
  });
  document.getElementById('quoteInterval')?.addEventListener('input', function() {
    _lbl('quoteInterval-val', this.value + 's');
  });
  document.getElementById('overlayDuration')?.addEventListener('input', function() {
    _lbl('overlayDuration-val', this.value + 's');
  });
  document.getElementById('quoteOpacity')?.addEventListener('input', function() {
    _lbl('quoteOpacity-val', Math.round(this.value * 100) + '%');
  });
  document.getElementById('quoteSrcOpacity')?.addEventListener('input', function() {
    _lbl('quoteSrcOpacity-val', Math.round(this.value * 100) + '%');
  });

  // Sizing sliders
  ['scaleLogo','scaleClock','scaleMeta','scaleQuote','scaleWmFont','scaleTimer'].forEach(k => {
    document.getElementById(k)?.addEventListener('input', function() {
      const v = parseFloat(this.value);
      _sizeLbl(k, v);
      _save({ [k]: v });
    });
  });

  // Quote alignment segments
  document.querySelectorAll('.seg-btn[data-align]').forEach(btn => {
    btn.addEventListener('click', () => {
      const align = btn.dataset.align;
      document.querySelectorAll('.seg-btn[data-align]').forEach(b =>
        b.classList.toggle('active', b.dataset.align === align)
      );
      _save({ quoteAlign: align }, 'Feed alignment changed');
    });
  });
}

/* ─────────────────────────────────────────────────────────────
   DYNAMIC BUILDERS
───────────────────────────────────────────────────────────── */

/* ── Theme grid ── */
function _buildThemeGrid() {
  const grid = document.getElementById('theme-grid');
  if (!grid) return;

  const currentMode = grid.dataset.mode || 'dark';

  grid.innerHTML = '';

  const FAMILY_ORDER = ['violet','blue','teal','green','amber','red','pink','slate'];
  const FAMILY_LABEL = {
    violet:'Violet', blue:'Blue', teal:'Teal', green:'Green',
    amber:'Amber', red:'Red', pink:'Pink', slate:'Slate'
  };

  const cfg = Config.get();

  FAMILY_ORDER.forEach(family => {
    const entry = Object.entries(THEMES).find(
      ([, t]) => t.family === family && t.mode === currentMode
    );
    if (!entry) return;
    const [key, t] = entry;

    const card = document.createElement('div');
    card.className = 'theme-card';
    card.dataset.theme = key;
    if (cfg.theme === key) card.classList.add('active');

    card.innerHTML = `
      <div class="theme-swatch" style="background:${t.bg}">
        <div class="theme-swatch-bar" style="background:${t.clock};box-shadow:0 0 8px ${t.clock}40"></div>
        <div class="theme-swatch-preview">
          <span class="theme-swatch-clock" style="color:${t.clock}">12:00</span>
          <span class="theme-swatch-name" style="color:${t.clock};opacity:.45">${FAMILY_LABEL[family]}</span>
        </div>
      </div>
      <div class="theme-label">
        <span>${t.label}</span>
      </div>
    `;

    card.addEventListener('click', () => {
      document.querySelectorAll('.theme-card').forEach(c => c.classList.remove('active'));
      card.classList.add('active');
      _save({ theme: key }, `Theme → ${t.label}`);
      _applyAccent(key);
    });

    grid.appendChild(card);
  });
}

function _applyAccent(theme) {
  document.body.setAttribute('data-accent', theme || 'eclipse');
}

/* ── Font slots ── */
function _buildFontSlots() {
  const container = document.getElementById('font-slots-container');
  if (!container) return;
  container.innerHTML = '';

  const cfg = Config.get();
  const slots = [
    { key:'clock',    label:'Clock',        cfgKey:'fontClock',    reg:'clock'    },
    { key:'meta',     label:'Date & Weather',cfgKey:'fontMeta',     reg:'meta'     },
    { key:'quote',    label:'Quote Text',    cfgKey:'fontQuote',    reg:'quote'    },
    { key:'quotesrc', label:'Quote Source',  cfgKey:'fontQuoteSrc', reg:'quoteSrc' },
    { key:'wm',       label:'Watermark',     cfgKey:'fontWm',       reg:'wm'       },
  ];

  slots.forEach((slot, si) => {
    const group = document.createElement('div');
    group.className = 'font-slot-group';

    const title = document.createElement('div');
    title.className = 'font-slot-title';
    title.textContent = slot.label;
    group.appendChild(title);

    const grid = document.createElement('div');
    grid.className = 'font-grid';

    const reg = FONTS[slot.reg] || {};
    Object.entries(reg).forEach(([name, meta]) => {
      loadFont(meta.url); // preload for preview
      const chip = document.createElement('div');
      chip.className = 'font-chip';
      chip.dataset.font     = name;
      chip.dataset.fontSlot = slot.key;
      chip.classList.toggle('active', cfg[slot.cfgKey] === name);

      const preview = slot.key === 'clock'
        ? '12:45'
        : (slot.key === 'quote' ? '\u201cQuote\u201d' : 'Aa');

      chip.innerHTML = `
        <span class="font-preview" style="font-family:'${_esc(name)}',Georgia,sans-serif">${preview}</span>
        <span class="font-name">${_esc(name)}</span>
        <span class="font-note">${_esc(meta.note || '')}</span>
      `;
      chip.addEventListener('click', () => {
        document.querySelectorAll(`[data-font-slot="${slot.key}"]`)
          .forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        _save({ [slot.cfgKey]: name }, `${slot.label} font → ${name}`);
      });
      grid.appendChild(chip);
    });

    group.appendChild(grid);
    container.appendChild(group);

    // Divider between groups (not after last)
    if (si < slots.length - 1) {
      const hr = document.createElement('div');
      hr.style.cssText = 'height:1px;background:var(--border);margin:2px 0';
      container.appendChild(hr);
    }
  });
}

function _buildCustomFontInputs() {
  const area = document.getElementById('custom-font-area');
  if (!area) return;
  area.innerHTML = '';

  const cfg   = Config.get();
  const slots = [
    { key:'clock',    label:'Clock',         cfgKey:'fontClock'    },
    { key:'meta',     label:'Date & Weather', cfgKey:'fontMeta'     },
    { key:'quote',    label:'Quote Text',     cfgKey:'fontQuote'    },
    { key:'quotesrc', label:'Quote Source',   cfgKey:'fontQuoteSrc' },
    { key:'wm',       label:'Watermark',      cfgKey:'fontWm'       },
  ];

  const divider = document.createElement('div');
  divider.style.cssText = 'height:1px;background:var(--border);margin:4px 0 12px';
  area.appendChild(divider);

  const heading = document.createElement('div');
  heading.className = 'sec-title';
  heading.textContent = 'Custom Google Font';
  area.appendChild(heading);

  const hint = document.createElement('p');
  hint.className = 'field-hint';
  hint.textContent = 'Paste the Google Fonts embed URL — not the specimen page. On fonts.google.com, select a font → Get embed code → copy the URL from inside href="".';
  area.appendChild(hint);

  slots.forEach(slot => {
    const saved = cfg.customFonts?.[slot.key];

    const group = document.createElement('div');
    group.className = 'field';
    group.style.marginTop = '10px';

    group.innerHTML = `
      <label class="lbl">${slot.label}</label>
      <div style="display:flex;gap:7px;align-items:center">
        <input
          type="text"
          id="custom-font-${slot.key}"
          placeholder="https://fonts.googleapis.com/css2?family=..."
          value="${_esc(saved?.url || '')}"
          style="flex:1;font-size:.7rem"
        >
        <button class="ctrl-btn" id="custom-font-apply-${slot.key}"
          style="padding:8px 12px;white-space:nowrap;flex-shrink:0">
          Apply
        </button>
        ${saved ? `<button class="ctrl-btn danger" id="custom-font-clear-${slot.key}"
          style="padding:8px 10px;flex-shrink:0">✕</button>` : ''}
      </div>
      ${saved ? `<p class="field-hint" style="color:var(--accent)">
        Active: ${_esc(saved.name)}</p>` : ''}
    `;

    area.appendChild(group);

    document.getElementById(`custom-font-apply-${slot.key}`)?.addEventListener('click', () => {
      const input = document.getElementById(`custom-font-${slot.key}`);
      const url   = input?.value.trim();
      if (!url) return;

      let parsedUrl;
      try { parsedUrl = new URL(url); } catch(e) { parsedUrl = null; }
      if (!parsedUrl || parsedUrl.protocol !== 'https:' || parsedUrl.hostname !== 'fonts.googleapis.com') {
        input.style.borderColor = 'var(--danger)';
        setTimeout(() => { input.style.borderColor = ''; }, 2000);
        return;
      }

      const name = _extractFontName(url);
      if (!name) {
        input.style.borderColor = 'var(--danger)';
        setTimeout(() => { input.style.borderColor = ''; }, 2000);
        return;
      }

      loadFont(url);

      const stack    = `'${name}', system-ui, sans-serif`;
      const regKey   = slot.key === 'quotesrc' ? 'quoteSrc' : slot.key;
      FONTS[regKey]  = FONTS[regKey] || {};
      FONTS[regKey][name] = { url, stack, note: 'Custom import' };

      const customFonts = { ...(Config.get().customFonts || {}), [slot.key]: { name, url, stack } };
      _save({ [slot.cfgKey]: name, customFonts }, `Custom font → ${name}`);

      _buildCustomFontInputs();
      _buildFontSlots();
    });

    document.getElementById(`custom-font-clear-${slot.key}`)?.addEventListener('click', () => {
      const customFonts = { ...(Config.get().customFonts || {}) };
      const slotFonts   = FONTS[slot.key === 'quotesrc' ? 'quoteSrc' : slot.key === 'wm' ? 'wm' : slot.key];

      if (customFonts[slot.key]) {
        delete slotFonts[customFonts[slot.key].name];
        delete customFonts[slot.key];
      }

      const defaultFont = Object.keys(slotFonts)[0] || 'Inter';
      _save({ [slot.cfgKey]: defaultFont, customFonts }, 'Custom font removed');
      _buildCustomFontInputs();
      _buildFontSlots();
    });
  });
}

function _extractFontName(url) {
  try {
    const parsed = new URL(url);
    const family = parsed.searchParams.get('family');
    if (!family) return null;
    const name = family.split(':')[0].replace(/\+/g, ' ').trim();
    return name || null;
  } catch(e) {
    return null;
  }
}

/* ── Timezone select ── */
function _buildTimezoneSelect() {
  const sel = document.getElementById('tzSelect');
  if (!sel) return;
  sel.innerHTML = '';
  TIMEZONES.forEach(tz => {
    const opt = document.createElement('option');
    opt.value = tz.value;
    opt.textContent = tz.label;
    if (tz.disabled) opt.disabled = true;
    sel.appendChild(opt);
  });
  const saved = Config.get().timezone;
  if (saved && saved !== 'auto') {
    const exists = Array.from(sel.options).some(o => o.value === saved);
    if (!exists) {
      const opt = document.createElement('option');
      opt.value = saved;
      opt.textContent = saved;
      sel.appendChild(opt);
    }
  }
}

/* ─────────────────────────────────────────────────────────────
   FEATURE INITS
───────────────────────────────────────────────────────────── */
/* Legacy/alternate IANA identifiers some browsers still report from
   Intl.DateTimeFormat().resolvedOptions().timeZone, mapped to the
   canonical value already present in the TIMEZONES registry (config.js).
   Sourced from the IANA tzdb 'backward' file's "Pre-1993 naming
   conventions" and "Alternate names for the same location" sections,
   restricted to zones actually offered in TIMEZONES. */
const TZ_ALIASES = {
  'Asia/Calcutta':  'Asia/Kolkata',
  'Asia/Dacca':     'Asia/Dhaka',
  'Asia/Istanbul':  'Europe/Istanbul',
  'US/Eastern':     'America/New_York',
  'EST5EDT':        'America/New_York',
  'US/Central':     'America/Chicago',
  'CST6CDT':        'America/Chicago',
  'US/Mountain':    'America/Denver',
  'MST7MDT':        'America/Denver',
  'US/Pacific':     'America/Los_Angeles',
  'PST8PDT':        'America/Los_Angeles',
  'Canada/Eastern': 'America/Toronto',
  'Brazil/East':    'America/Sao_Paulo',
  'GB':             'Europe/London',
  'GB-Eire':        'Europe/London',
  'Turkey':         'Europe/Istanbul',
  'W-SU':           'Europe/Moscow',
  'Egypt':          'Africa/Cairo',
  'Hongkong':       'Asia/Hong_Kong',
  'Japan':          'Asia/Tokyo',
  'PRC':            'Asia/Shanghai',
  'ROK':            'Asia/Seoul',
  'Singapore':      'Asia/Singapore',
  'Australia/ACT':  'Australia/Sydney',
  'Australia/NSW':  'Australia/Sydney',
  'NZ':             'Pacific/Auckland'
};

/* ── Timezone ── */
function _initTimezone() {
  const tzEl   = document.getElementById('tzSelect');
  const tzAuto = document.getElementById('btn-tz-auto');

  tzEl?.addEventListener('change', () => _save({ timezone: tzEl.value }));

  tzAuto?.addEventListener('click', () => {
    _tzStatus('loading', 'Detecting timezone…');
    tzAuto.disabled = true;

    try {
      const detectedTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (!detectedTz) throw new Error('Could not detect timezone.');

      const tz = TZ_ALIASES[detectedTz] || detectedTz;

      const option = Array.from(tzEl?.options || [])
        .find(o => o.value === tz);

      if (!option) {
        _tzStatus('error', `"${tz}" isn't available in the timezone list. Select manually.`);
        return;
      }

      if (tzEl) tzEl.value = tz;
      _save({ timezone: tz }, 'Timezone auto-detected');
      _tzStatus('success', `Detected: ${option.textContent}`);
      setTimeout(() => _tzStatus('', ''), 4000);
    } catch(e) {
      _tzStatus('error', 'Could not detect timezone. Select manually.');
    } finally {
      tzAuto.disabled = false;
    }
  });
}

function _tzStatus(state, msg) {
  const el = document.getElementById('tz-status');
  if (!el) return;
  el.className = 'weather-status';
  if (state) {
    el.classList.add('visible', state);
    el.textContent = msg;
  }
}

/* ── Logo ── */
function _initLogo() {
  const drop  = document.getElementById('logo-drop');
  const input = document.getElementById('logo-input');
  const clr   = document.getElementById('logo-clear');

  drop?.addEventListener('click', () => input?.click());
  drop?.addEventListener('dragover', e => { e.preventDefault(); drop.classList.add('drag'); });
  drop?.addEventListener('dragleave', ()  => drop.classList.remove('drag'));
  drop?.addEventListener('drop', e => {
    e.preventDefault(); drop.classList.remove('drag');
    const f = e.dataTransfer.files[0];
    if (f) _readLogoFile(f);
  });
  input?.addEventListener('change', () => {
    if (input.files[0]) _readLogoFile(input.files[0]);
  });
  clr?.addEventListener('click', () => {
    const prev = document.getElementById('logo-preview');
    if (prev) { prev.style.display = 'none'; prev.src = ''; }
    clr.style.display = 'none';
    const p = drop?.querySelector('p');
    if (p) p.style.display = 'block';
    _save({ logoData: '' }, 'Logo removed');
  });
}

function _readLogoFile(file) {
  const drop = document.getElementById('logo-drop');
  if (!file.type.startsWith('image/')) {
    _logoReject(drop, 'Not an image file');
    return;
  }
  if (file.size > 2 * 1024 * 1024) {
    _logoReject(drop, 'Image too large (max 2MB)');
    return;
  }

  const r = new FileReader();
  r.onload = () => {
    const prev = document.getElementById('logo-preview');
    const drop  = document.getElementById('logo-drop');
    const clr   = document.getElementById('logo-clear');
    if (prev) { prev.src = r.result; prev.style.display = 'block'; }
    if (drop) { const p = drop.querySelector('p'); if (p) p.style.display = 'none'; }
    if (clr)  clr.style.display = 'inline-block';
    _save({ logoData: r.result }, 'Logo uploaded');
  };
  r.onerror = () => _logoReject(drop, 'Could not read that file');
  r.readAsDataURL(file);
}

function _flashInvalid(el) {
  if (!el) return;
  el.style.borderColor = 'var(--danger)';
  el.style.boxShadow   = '0 0 0 2px rgba(248,113,113,.2)';
  setTimeout(() => {
    el.style.borderColor = '';
    el.style.boxShadow   = '';
  }, 3000);
}

function _logoReject(drop, msg) {
  if (!drop) return;
  const p = drop.querySelector('p');
  const original = p ? p.textContent : null;
  drop.style.borderColor = 'var(--danger)';
  if (p) p.textContent = msg;
  setTimeout(() => {
    drop.style.borderColor = '';
    if (p && original !== null) p.textContent = original;
  }, 2500);
}

/* ── Quotes ── */
function _initQuotes() {
  _quotePaused = !!Config.get().quotePaused;
  const pauseBtnInit = document.getElementById('btn-quote-pause');
  if (pauseBtnInit) {
    pauseBtnInit.textContent = _quotePaused ? '▶ Resume' : '⏸ Pause feed';
    pauseBtnInit.classList.toggle('active', _quotePaused);
  }

  document.getElementById('quotesText')?.addEventListener('input', function() {
    const quotes = this.value.split('\n').map(l => l.trim()).filter(Boolean);
    _save({ quotes }, 'Quotes updated');
  });

  // File upload
  document.getElementById('quotesFile')?.addEventListener('change', function() {
    const f = this.files[0]; if (!f) return;
    const label = document.getElementById('quotesFile-label') || this;
    const r = new FileReader();
    r.onload = () => {
      try {
        let quotes;
        if (f.name.endsWith('.json')) {
          const arr = JSON.parse(r.result);
          quotes = Array.isArray(arr)
            ? arr.filter(q =>
                (typeof q === 'string' && q.trim()) ||
                (q && typeof q === 'object' && typeof q.text === 'string' && q.text.trim())
              )
            : [];
        } else {
          quotes = r.result.split('\n').map(l => l.trim()).filter(Boolean);
        }
        const ta = document.getElementById('quotesText');
        if (ta) ta.value = quotes.map(q =>
          typeof q === 'object'
            ? `${q.text || ''}${q.source ? ' - ' + q.source : ''}`
            : q
        ).join('\n');
        _save({ quotes }, 'Quotes imported from file');
      } catch(e) {
        _flashInvalid(label);
      }
    };
    r.onerror = () => _flashInvalid(label);
    r.readAsText(f);
  });

  function _updateFeedBtns() {
    const hasQuotes = (Config.get().quotes?.length || 0) > 0;
    const next  = document.getElementById('btn-quote-next');
    const pause = document.getElementById('btn-quote-pause');
    if (next)  next.disabled  = !hasQuotes;
    if (pause) pause.disabled = !hasQuotes;
    if (next)  next.style.opacity  = hasQuotes ? '' : '.4';
    if (pause) pause.style.opacity = hasQuotes ? '' : '.4';
  }

  document.getElementById('quotesText')?.addEventListener('input', _updateFeedBtns);
  _updateFeedBtns();

  // Manual controls (next + pause) — broadcast to display
  document.getElementById('btn-quote-next')?.addEventListener('click', () => {
    BC.postMessage({ type: 'quote-next' });
    _sendToFrame('preview-frame', { type: 'quote-next' });
  });

  document.getElementById('btn-quote-pause')?.addEventListener('click', () => {
    _quotePaused = !_quotePaused;
    BC.postMessage({ type: 'quote-pause', paused: _quotePaused });
    _save({ quotePaused: _quotePaused }, `Quote feed ${_quotePaused ? 'paused' : 'resumed'}`);
    const btn = document.getElementById('btn-quote-pause');
    if (btn) {
      btn.textContent = _quotePaused ? '▶ Resume' : '⏸ Pause feed';
      btn.classList.toggle('active', _quotePaused);
    }
  });
}

/* ── Weather ── */
function _initWeather() {
  const cityInput = document.getElementById('weatherCity');
  const geoBtn    = document.getElementById('btn-geo');
  const saveCity  = document.getElementById('btn-save-city');

  cityInput?.addEventListener('input', function() {
    _save({ weatherCity: this.value, weatherLat: null, weatherLon: null });
  });

  // One-shot geo-detection — privacy safe, result shown in UI, not stored permanently
  geoBtn?.addEventListener('click', () => {
    if (!navigator.geolocation) {
      _weatherStatus('error', 'Geolocation not supported by this browser.');
      return;
    }
    _weatherStatus('loading', 'Detecting location…');
    geoBtn.disabled = true;

    navigator.geolocation.getCurrentPosition(
        async pos => {
          const rawLat = pos.coords.latitude;
          const rawLon = pos.coords.longitude;
          if (!Number.isFinite(rawLat) || !Number.isFinite(rawLon)) {
            _weatherStatus('error', 'Could not detect a valid location.');
            geoBtn.disabled = false;
            return;
          }
          const lat = rawLat.toFixed(4);
          const lon = rawLon.toFixed(4);
          _weatherStatus('loading', 'Detecting city name…');
          let cityName = `${lat},${lon}`;
          let geocodeFailed = false;
          const controller = new AbortController();
          const timeoutId  = setTimeout(() => controller.abort(), 8000);
          try {
            const res  = await fetch(
              `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`,
              { signal: controller.signal }
            );
            if (!res.ok) throw new Error('Reverse geocoding failed');
            const data = await res.json();
            cityName   =
              data.locality ||
              data.city ||
              data.principalSubdivision ||
              data.countryName ||
              cityName;
          } catch(e) {
            geocodeFailed = true;
          } finally {
            clearTimeout(timeoutId);
          }
          if (cityInput) cityInput.value = cityName;
          _save({ weatherCity: cityName, weatherLat: lat, weatherLon: lon });
          _weatherStatus('success', geocodeFailed
            ? `Location detected (${lat}, ${lon}) — city name unavailable`
            : `Detected: ${cityName}`);
          geoBtn.disabled = false;
          setTimeout(() => _weatherStatus('', ''), 4000);
        },
      err => {
        const msg = err.code === 1
          ? 'Location permission denied. Enter city name manually.'
          : 'Could not detect location. Enter city name manually.';
        _weatherStatus('error', msg);
        geoBtn.disabled = false;
      },
      { timeout: 8000, maximumAge: 60000 }
    );
  });

  saveCity?.addEventListener('click', () => {
    const city = cityInput?.value.trim();
    if (city) { Cities.add(city); _renderCities(); }
  });
}

function _weatherStatus(state, msg) {
  const el = document.getElementById('weather-status');
  if (!el) return;
  el.className = 'weather-status';
  if (state) {
    el.classList.add('visible', state);
    el.textContent = msg;
  }
}

function _renderCities() {
  const list  = document.getElementById('cities-list');
  const empty = document.getElementById('cities-empty');
  if (!list) return;
  list.querySelectorAll('.chip-item').forEach(c => c.remove());
  const items = Cities.getAll();
  if (!items.length) { if (empty) empty.style.display = 'block'; return; }
  if (empty) empty.style.display = 'none';

  items.forEach((city, i) => {
    const chip = document.createElement('div');
    chip.className = 'chip-item';
    chip.innerHTML = `
      <span class="chip-txt">${_esc(city.name)}</span>
      <button class="chip-del" title="Remove">✕</button>
    `;
    chip.querySelector('.chip-txt').addEventListener('click', () => {
      const cityInput = document.getElementById('weatherCity');
      if (cityInput) cityInput.value = city.name;
      _save({ weatherCity: city.name, weatherLat: null, weatherLon: null });
    });
    chip.querySelector('.chip-del').addEventListener('click', e => {
      e.stopPropagation();
      Cities.remove(i);
      _renderCities();
    });
    list.appendChild(chip);
  });
}

/* ── Announcements ── */
function _initOverlay() {
  document.getElementById('btn-save-preset')?.addEventListener('click', () => {
    const text = document.getElementById('overlayText')?.value.trim();
    if (!text) return;
    Announcements.add(text);
    _renderAnnPresets();
  });

  document.getElementById('btn-overlay')?.addEventListener('click', () => {
    const input   = document.getElementById('overlayText');
    const hint    = document.getElementById('overlay-hint');
    const text    = input?.value.trim();

    if (!text) {
      if (hint) hint.style.display = 'block';
      setTimeout(() => { if (hint) hint.style.display = 'none'; }, 3000);
      return;
    }

    if (hint) hint.style.display = 'none';
    const dur = Config.get().overlayDuration || 8;
    BC.postMessage({ type: 'overlay', text, duration: dur });
    _sendToFrame('preview-frame', { type: 'overlay', text, duration: dur });
  });

  document.getElementById('btn-overlay-cancel')?.addEventListener('click', () => {
    BC.postMessage({ type: 'overlay-cancel' });
    _sendToFrame('preview-frame', { type: 'overlay-cancel' });
  });
}

/* ── Timer ── */
function _initTimer() {
  _bind('timerAutoStart','timerAutoStart');
  _bind('timerDuration', 'timerDuration', Number);
  _bind('timerStartTime','timerStartTime');

  function _setTimerBtns(state) {
    const start = document.getElementById('btn-timer-start');
    const pause = document.getElementById('btn-timer-pause');
    const reset = document.getElementById('btn-timer-reset');
    if (state === 'idle') {
      if (start) { start.style.display = ''; start.textContent = '▶ Start'; }
      if (pause) pause.style.display = 'none';
      if (reset) reset.style.display = 'none';
    } else if (state === 'running') {
      if (start) start.style.display = 'none';
      if (pause) { pause.style.display = ''; pause.textContent = '⏸ Pause'; pause.classList.remove('active'); }
      if (reset) reset.style.display = '';
    } else if (state === 'paused') {
      if (start) start.style.display = 'none';
      if (pause) { pause.style.display = ''; pause.textContent = '▶ Resume'; pause.classList.add('active'); }
      if (reset) reset.style.display = '';
    }
  }

  function _syncTimerDuration() {
    const h = parseInt(document.getElementById('timerHours')?.value  || 0);
    const m = parseInt(document.getElementById('timerMinutes')?.value || 0);
    const total = (h * 60) + m;
    _save({ timerDuration: Math.max(1, total) });
  }
  document.getElementById('timerHours')?.addEventListener('change', _syncTimerDuration);
  document.getElementById('timerMinutes')?.addEventListener('change', _syncTimerDuration);

  document.querySelectorAll('.num-step-up, .num-step-down').forEach(btn => {
    btn.addEventListener('click', () => {
      const input = document.getElementById(btn.dataset.target);
      if (!input) return;
      btn.classList.contains('num-step-up') ? input.stepUp() : input.stepDown();
      input.dispatchEvent(new Event('change', { bubbles: true }));
    });
  });

  document.getElementById('btn-timer-start')?.addEventListener('click', () => {
    if (!Config.get().timerEnabled || _timerStartPending) return;
    const dur = (Config.get().timerDuration || 120) * 60;
    const msToNext = 1000 - (Date.now() % 1000);
    _timerStartPending = setTimeout(() => {
      _timerStartPending = null;
      _timerDurationMs   = dur * 1000;
      _timerStartedAt    = performance.now();
      _timerPausedAt     = null;
      _timerPausedMs     = 0;
      _timerSeconds = dur;
      _timerRunning = true;
      _timerPaused  = false;
      _timerState   = { type: 'timer-start', seconds: dur };
      BC.postMessage(_timerState);
      _sendToFrame('preview-frame', _timerState);
      _startTimerSync();
      _setTimerBtns('running');
      _setTimerStatus(`Running — ${Config.get().timerDuration} min`);
    }, msToNext);
  });

  document.getElementById('btn-timer-pause')?.addEventListener('click', () => {
    if (!_timerRunning) return;
    _timerPaused = !_timerPaused;
    if (_timerPaused) {
      _timerPausedAt = performance.now();
    } else if (_timerPausedAt) {
      _timerPausedMs += performance.now() - _timerPausedAt;
      _timerPausedAt  = null;
    }
    const msg = { type: 'timer-pause' };
    BC.postMessage(msg);
    _sendToFrame('preview-frame', msg);
    if (_timerState) _timerState = { ..._timerState, paused: _timerPaused };
    _setTimerBtns(_timerPaused ? 'paused' : 'running');
    _setTimerStatus(_timerPaused ? 'Paused' : `Running — ${Config.get().timerDuration} min`);
  });

  document.getElementById('btn-timer-reset')?.addEventListener('click', () => {
    if (!Config.get().timerEnabled) return;
    _resetTimerState();
    BC.postMessage({ type: 'timer-reset' });
    _sendToFrame('preview-frame', { type: 'timer-reset' });
    _setTimerBtns('idle');
    _setTimerStatus('Timer not running');
  });
}

function _currentTimerSeconds() {
  if (!_timerRunning) return 0;
  if (_timerPaused) return _timerSeconds;
  const elapsed = performance.now() - _timerStartedAt - _timerPausedMs;
  return Math.max(0, Math.round((_timerDurationMs - elapsed) / 1000));
}

function _startTimerSync() {
  if (_timerSyncInt) clearInterval(_timerSyncInt);
  _timerSyncInt = setInterval(() => {
    if (!_timerRunning || _timerPaused) return;
    _timerSeconds = _currentTimerSeconds();
    if (_timerSeconds === 0) {
      _timerRunning = false;
      clearInterval(_timerSyncInt);
      _timerSyncInt = null;
    }
  }, 1000);
}

function _resetTimerState() {
  if (_timerStartPending) { clearTimeout(_timerStartPending); _timerStartPending = null; }
  _timerState      = null;
  _timerSeconds    = 0;
  _timerRunning    = false;
  _timerPaused     = false;
  _timerDurationMs = 0;
  _timerStartedAt  = null;
  _timerPausedAt   = null;
  _timerPausedMs   = 0;
  if (_timerSyncInt) { clearInterval(_timerSyncInt); _timerSyncInt = null; }
}

function _setTimerStatus(msg) {
  const el = document.getElementById('timer-status-box');
  if (el) el.textContent = msg;
}

function _renderAnnPresets() {
  const list  = document.getElementById('ann-presets');
  const empty = document.getElementById('ann-presets-empty');
  if (!list) return;
  list.querySelectorAll('.chip-item').forEach(c => c.remove());

  const items = Announcements.getAll(); // sorted: favourites first, then by recency
  if (!items.length) { if (empty) empty.style.display = 'block'; return; }
  if (empty) empty.style.display = 'none';

  items.forEach(item => {
    const chip = document.createElement('div');
    chip.className = 'chip-item' + (item.favourite ? ' is-fav' : '');
    chip.dataset.id = item.id;

    chip.innerHTML = `
      <button class="chip-fav" title="${item.favourite ? 'Unfavourite' : 'Favourite'}">
        ${item.favourite ? '★' : '☆'}
      </button>
      <span class="chip-txt" title="${_esc(item.text)}">${_esc(item.label || item.text)}</span>
      <button class="chip-rename" title="Rename">✎</button>
      <button class="chip-del" title="Delete">✕</button>
    `;

    // Send on click
    chip.querySelector('.chip-txt').addEventListener('click', () => {
      const dur = Config.get().overlayDuration || 8;
      BC.postMessage({ type: 'overlay', text: item.text, duration: dur });
      _sendToFrame('preview-frame', { type: 'overlay', text: item.text, duration: dur });
      Announcements.markUsed(item.id);
      // Re-render to update sort order
      setTimeout(_renderAnnPresets, 50);
    });

    chip.querySelector('.chip-rename').addEventListener('click', e => {
      e.stopPropagation();
      _startChipRename(chip, item);
    });

    // Favourite toggle
    chip.querySelector('.chip-fav').addEventListener('click', e => {
      e.stopPropagation();
      Announcements.toggleFavourite(item.id);
      _renderAnnPresets();
    });

    // Delete
    chip.querySelector('.chip-del').addEventListener('click', e => {
      e.stopPropagation();
      Announcements.remove(item.id);
      _renderAnnPresets();
    });

    list.appendChild(chip);
  });
}

function _startChipRename(chip, item) {
  const txtEl = chip.querySelector('.chip-txt');
  const input = document.createElement('input');
  input.type      = 'text';
  input.value     = item.label || item.text;
  input.className = 'chip-rename-input';

  chip.replaceChild(input, txtEl);
  input.focus();
  input.select();

  let committed = false;
  function commit() {
    if (committed) return;
    committed = true;
    const newLabel = input.value.trim();
    if (newLabel) Announcements.rename(item.id, newLabel);
    _renderAnnPresets();
  }
  input.addEventListener('blur', commit);
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); commit(); }
    if (e.key === 'Escape') _renderAnnPresets();
  });
}

/* ── Sizing ── */
function _initSizing() {
  document.querySelectorAll('.preset-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const t = btn.dataset.target;
      const v = parseFloat(btn.dataset.val);
      if (!t) return;
      _sv(t, v); _sizeLbl(t, v);
      _save({ [t]: v });
    });
  });

  document.getElementById('btn-reset-sizes')?.addEventListener('click', () => {
    const keys = ['scaleLogo','scaleClock','scaleMeta','scaleQuote','scaleWmFont','scaleTimer'];
    const partial = Object.fromEntries(keys.map(k => [k, 1]));
    keys.forEach(k => { _sv(k, 1); _sizeLbl(k, 1); });
    // Batch into one save — one BC message, one history entry
    _save(partial, 'Sizes reset to default');
  });
}

/* ── Present controls ── */
// Poll every 2 seconds to detect if display window was closed externally
let _winCheckInterval = null;

function _startWinCheck() {
  if (_winCheckInterval) return;
_winCheckInterval = setInterval(() => {
    if (displayWin && displayWin.closed) {
      displayWin = null;
      _setPresentBtn(false);
      _updatePresentStatus(false);
      _updateLiveUI();
      clearInterval(_winCheckInterval);
      _winCheckInterval = null;
    }
  }, 2000);
}

function _setPresentBtn(open) {
  const btn = document.getElementById('btn-present');
  if (!btn) return;
  if (open) {
    btn.textContent = '✕ Close Display';
    btn.style.background = 'var(--surface3)';
    btn.style.color = 'var(--txt2)';
    btn.style.boxShadow = 'none';
  } else {
    btn.textContent = '▶ Present';
    btn.style.background = '';
    btn.style.color = '';
    btn.style.boxShadow = '';
  }
}

function _initPresentControls() {
  document.getElementById('btn-present')?.addEventListener('click', () => {
    if (displayWin && !displayWin.closed) {
      displayWin.close();
      displayWin = null;
      _setPresentBtn(false);
      _updatePresentStatus(false);
      if (_winCheckInterval) {
        clearInterval(_winCheckInterval);
        _winCheckInterval = null;
      }
      return;
    }

    BC.postMessage({ type: 'config', config: Config.get() });
    const sw = window.screen.width;
    const sh = window.screen.height;
    displayWin = window.open(
      'display.html', 'chrona_display',
      `width=${sw},height=${sh},left=0,top=0,` +
      'menubar=no,toolbar=no,location=no,status=no,' +
      'scrollbars=no,resizable=yes,popup=yes'
    );

    if (displayWin) {
      _liveMode = true;
      Config.set({ liveMode: true }, { silent: true });

      displayWin.addEventListener('load', () => {
        setTimeout(() => {
          BC.postMessage({ type: 'config', config: Config.get() });

          if (_timerRunning && _timerState) {
            const remaining = _currentTimerSeconds();
            setTimeout(() => {
              BC.postMessage({ type: 'timer-start', seconds: remaining });
              if (_timerPaused) {
                setTimeout(() => BC.postMessage({ type: 'timer-pause' }), 100);
              }
            }, 200);
          }

          if (Config.get().autoFullscreen) {
            try {
              displayWin.document.documentElement.requestFullscreen?.();
            } catch(e) {}
          }
        }, 400);
      });

      _setPresentBtn(true);
      _updatePresentStatus(true);
      _startWinCheck();
    }
  });

  document.getElementById('btn-live-toggle')?.addEventListener('click', () => {
    _liveMode = !_liveMode;
    Config.set({ liveMode: _liveMode }, { silent: true });
    _updateLiveUI();
  });

  document.getElementById('btn-push')?.addEventListener('click', _pushLive);
}

function _updateLiveUI() {
  const isOpen   = displayWin && !displayWin.closed;
  const btn      = document.getElementById('btn-live-toggle');
  const pushBtn  = document.getElementById('btn-push');
  const dot      = document.getElementById('preview-live-dot');
  const txt      = document.getElementById('preview-status-txt');
  const panel    = document.getElementById('preview-panel');

  if (!isOpen) {
    if (btn)   { btn.textContent = '○ Not Live'; btn.classList.remove('active'); }
    if (dot)   { dot.classList.add('offline'); dot.classList.remove('preview'); }
    if (txt)   txt.textContent = 'Not presenting';
    if (panel) { panel.classList.remove('is-live','is-preview'); }
  } else if (!_liveMode) {
    if (btn)   { btn.textContent = '◑ Preview'; btn.classList.remove('active'); }
    if (dot)   { dot.classList.add('preview'); dot.classList.remove('offline'); }
    if (txt)   txt.textContent = 'Preview only';
    if (panel) { panel.classList.add('is-preview'); panel.classList.remove('is-live'); }
  } else {
    const currentConfig = JSON.stringify(Config.get());
    const inSync = !_lastPushedConfig || _lastPushedConfig === currentConfig;
    if (btn)   { btn.textContent = inSync ? '● Live' : '● Live*'; btn.classList.add('active'); }
    if (dot)   { dot.classList.remove('offline','preview'); }
    if (txt)   txt.textContent = inSync ? 'Live' : 'Changes pending';
    if (panel) { panel.classList.add('is-live'); panel.classList.remove('is-preview'); }
  }

  if (pushBtn) pushBtn.style.display = (_liveMode || !isOpen) ? 'none' : 'block';
}

function _updatePresentStatus(presenting) {
  if (!presenting) {
    displayWin = null;
  }
  _updateLiveUI();
}

/* ── Advanced ── */
function _initAdvanced() {
  // Export
  document.getElementById('btn-export')?.addEventListener('click', () => {
    const blob = new Blob(
      [JSON.stringify(Config.get(), null, 2)],
      { type: 'application/json' }
    );
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'chrona-config.json';
    a.click();
    URL.revokeObjectURL(a.href);
  });

  // Import
  document.getElementById('btn-import-trigger')?.addEventListener('click', () => {
    document.getElementById('btn-import')?.click();
  });
  document.getElementById('btn-import')?.addEventListener('change', function() {
    const f = this.files[0]; if (!f) return;
    const trigger = document.getElementById('btn-import-trigger');
    const r = new FileReader();
    r.onload = () => {
      try {
        const parsed = JSON.parse(r.result);
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
          _flashInvalid(trigger);
          return;
        }
        const imported = { ...DEFAULTS, ...parsed };
        Config.set(imported, { silent: true });
        _populateUI();
        _applyAccent(Config.get().theme);
        _pushLive();
      } catch(e) {
        _flashInvalid(trigger);
      }
    };
    r.onerror = () => _flashInvalid(trigger);
    r.readAsText(f);
  });

  // Reset — uses inline confirm-box, not native confirm()
  document.getElementById('btn-reset-trigger')?.addEventListener('click', () => {
    document.getElementById('reset-confirm')?.classList.add('open');
  });
  document.getElementById('btn-reset-cancel')?.addEventListener('click', () => {
    document.getElementById('reset-confirm')?.classList.remove('open');
  });
  document.getElementById('btn-reset-confirm')?.addEventListener('click', () => {
    Config.reset();
    Announcements._items = [];
    Cities._items        = [];
    try {
      localStorage.removeItem(KEYS.presets);
      localStorage.removeItem(KEYS.cities);
    } catch(e) {}
    _populateUI();
    _applyAccent('eclipse');
    _pushLive();
    _renderAnnPresets();
    _renderCities();
    _renderHistory();
    document.getElementById('reset-confirm')?.classList.remove('open');
  });
  document.getElementById('btn-force-refresh')?.addEventListener('click', () => {
    // Force browser to bypass cache and reload all files fresh
    // This solves stale cache issues after app updates
    window.location.reload(true);
  });
}

function _initSettingsTheme() {
  const STORAGE_KEY = 'chrona_settings_theme';
  const body        = document.body;
  const btns        = document.querySelectorAll('[data-settings-mode]');
  const mq          = window.matchMedia('(prefers-color-scheme: light)');

  function applyTheme(mode) {
    let resolved = mode;
    if (mode === 'auto') {
      resolved = mq.matches ? 'light' : 'dark';
    }
    if (resolved === 'light') {
      body.setAttribute('data-settings-theme', 'light');
    } else {
      body.removeAttribute('data-settings-theme');
    }
  }

  function setMode(mode) {
    localStorage.setItem(STORAGE_KEY, mode);
    btns.forEach(b => b.classList.toggle('active', b.dataset.settingsMode === mode));
    applyTheme(mode);
  }

  btns.forEach(btn => {
    btn.addEventListener('click', () => setMode(btn.dataset.settingsMode));
  });

  mq.addEventListener('change', () => {
    const current = localStorage.getItem(STORAGE_KEY) || 'dark';
    if (current === 'auto') applyTheme('auto');
  });

  const saved = localStorage.getItem(STORAGE_KEY) || 'auto';
  btns.forEach(b => b.classList.toggle('active', b.dataset.settingsMode === saved));
  applyTheme(saved);
}

/* ── Disabled sections ── */
function _initDisabledSections() {
  document.querySelectorAll('[data-controls]').forEach(row => {
    const sectionId = row.dataset.controls;
    const section   = document.getElementById(sectionId);
    if (!section) return;

    const checkbox = row.querySelector('input[type=checkbox]');
    if (!checkbox) return;

    function sync() {
      if (checkbox.checked) {
        section.classList.remove('disabled-section');
      } else {
        section.classList.add('disabled-section');
      }
    }

    checkbox.addEventListener('change', sync);
    sync();
  });
}

/* ── History ── */
function _initHistory() {
  document.getElementById('btn-clear-history')?.addEventListener('click', () => {
    // Use inline confirm box — same pattern as reset
    const box = document.getElementById('history-confirm');
    if (box) box.classList.add('open');
  });
  document.getElementById('btn-history-cancel')?.addEventListener('click', () => {
    document.getElementById('history-confirm')?.classList.remove('open');
  });
  document.getElementById('btn-history-confirm')?.addEventListener('click', () => {
    History.clear();
    _renderHistory();
    document.getElementById('history-confirm')?.classList.remove('open');
  });
}

function _renderHistory() {
  const list  = document.getElementById('history-list');
  const empty = document.getElementById('history-empty');
  if (!list) return;
  list.querySelectorAll('.history-entry').forEach(e => e.remove());

  const entries = History.getAll();
  if (!entries.length) { if (empty) empty.style.display = 'block'; return; }
  if (empty) empty.style.display = 'none';

  entries.forEach(entry => {
    const div  = document.createElement('div');
    div.className = 'history-entry';
    const ts   = new Date(entry.ts);
    const time = ts.toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' });
    const date = ts.toLocaleDateString([], { month:'short', day:'numeric' });

    div.innerHTML = `
      <div style="flex:1;min-width:0">
        <div class="history-label">${_esc(entry.label || 'Settings changed')}</div>
        <div class="history-time">${date} ${time}</div>
      </div>
      <button class="history-del" title="Remove">✕</button>
    `;

    // Click label area to restore
    div.querySelector('.history-label').addEventListener('click', () => {
      // History.restore re-injects current logoData — logo is preserved
      const restored = History.restore(entry.id);
      if (!restored) return;
      _populateUI();
      _applyAccent(restored.theme);
      _pushLive();
      // Re-render so the new "Restored:" entry appears at top
      setTimeout(_renderHistory, 900);
    });

    div.querySelector('.history-del').addEventListener('click', e => {
      e.stopPropagation();
      History.remove(entry.id);
      _renderHistory();
    });

    list.appendChild(div);
  });
}

/* ── Fullscreen test ── */
function _initFullscreenTest() {
  const overlay = document.getElementById('fs-overlay');
  const frame   = document.getElementById('fs-frame');
  const close   = document.getElementById('fs-close');

  document.getElementById('btn-fullscreen-preview')?.addEventListener('click', () => {
    frame.src = 'display.html';
    overlay.classList.add('open');

    frame.addEventListener('load', () => {
      setTimeout(() => {
        _postToFrame('fs-frame', Config.get());
        overlay.requestFullscreen?.().catch(() => {
        });
      }, 400);
    }, { once: true });
  });

  function _closeFs() {
    overlay.classList.remove('open');
    setTimeout(() => { frame.src = ''; }, 300);
    if (document.fullscreenElement) {
      document.exitFullscreen?.().catch(() => {});
    }
  }

  close?.addEventListener('click', _closeFs);

  document.addEventListener('fullscreenchange', () => {
    if (!document.fullscreenElement && overlay.classList.contains('open')) {
      _closeFs();
    }
  });
}

/* ── Credit ── */
function _initCredit() {
  document.getElementById('credit-btn')?.addEventListener('click', () => {
    const el = document.getElementById('credit-btn');
    el.style.color = 'var(--accent)';
    setTimeout(() => { el.style.color = ''; }, 1200);
  });
}

/* ── Presenter ── */
let _presenterWin = null;
let _presenterCheck = null;

function _initPresenter() {
  const scaleEl = document.getElementById('presenterScale');
  scaleEl?.addEventListener('input', function() {
    const v = parseFloat(this.value);
    _sizeLbl('presenterScale', v);
    _save({ presenterScale: v });
    BC.postMessage({ type: 'presenter-scale', scale: v });
  });

  document.getElementById('presenterInvert')?.addEventListener('change', function() {
    _save({ presenterInvert: this.checked });
    BC.postMessage({ type: 'presenter-invert', inverted: this.checked });
  });
  document.getElementById('btn-open-presenter')?.addEventListener('click', () => {
    if (_presenterWin && !_presenterWin.closed) {
      _presenterWin.focus();
      return;
    }

    _presenterWin = window.open(
      'presenter.html', 'chrona_presenter',
      'width=800,height=480,left=0,top=0,' +
      'menubar=no,toolbar=no,location=no,status=no,scrollbars=no'
    );

    if (_presenterWin) {
      setTimeout(() => {
        BC.postMessage({ type: 'config', config: Config.get() });
        if (_timerRunning && _timerState) {
          const remaining = _currentTimerSeconds();
          setTimeout(() => {
            BC.postMessage({ type: 'timer-start', seconds: remaining });
            if (_timerPaused) {
              setTimeout(() => BC.postMessage({ type: 'timer-pause' }), 100);
            }
          }, 200);
        }
      }, 900);
    }

    _updateStageMonitorDot(true);

    if (_presenterCheck) clearInterval(_presenterCheck);
    _presenterCheck = setInterval(() => {
      if (_presenterWin && _presenterWin.closed) {
        _presenterWin = null;
        _updateStageMonitorDot(false);
        clearInterval(_presenterCheck);
        _presenterCheck = null;
      }
    }, 2000);
  });
}

function _updateStageMonitorDot(active) {
  const dot = document.getElementById('stage-monitor-dot');
  const txt = document.getElementById('stage-monitor-status');
  if (dot) dot.classList.toggle('active', active);
  if (txt) txt.textContent = active ? 'Stage on' : 'Stage off';
}

/* ─────────────────────────────────────────────────────────────
   NAV + SCROLL MEMORY
───────────────────────────────────────────────────────────── */
function _initNavScrollMemory() {
  document.querySelectorAll('.nav-item[data-panel]').forEach(item => {
    item.addEventListener('click', () => {
      // Save scroll position of departing panel
      const active = document.querySelector('.config-section.active');
      if (active) _scrollMem[active.id] = document.getElementById('config-panel').scrollTop;

      document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
      document.querySelectorAll('.config-section').forEach(s => s.classList.remove('active'));
      item.classList.add('active');

      const panel = document.getElementById('panel-' + item.dataset.panel);
      if (panel) {
        panel.classList.add('active');
        // Refresh history panel whenever it becomes visible
        if (item.dataset.panel === 'history') _renderHistory();
        requestAnimationFrame(() => {
          document.getElementById('config-panel').scrollTop =
            _scrollMem[panel.id] || 0;
        });
      }
    });
  });
}

/* ─────────────────────────────────────────────────────────────
   KEYBOARD NAV
───────────────────────────────────────────────────────────── */
function _initKeyNav() {
  const MAP = {
    '1':'branding','2':'clock','3':'appearance','4':'fonts',
    '5':'background','6':'sizing','7':'feed','8':'weather',
    '9':'overlay','0':'advanced',
  };
  const ALPHA_MAP = { 'h':'history', 's':'presenter', 'a':'about', 't':'timer' };
  document.addEventListener('keydown', e => {
    if (['INPUT','TEXTAREA','SELECT'].includes(e.target.tagName)) return;
    if (e.altKey && MAP[e.key]) {
      document.querySelector(`.nav-item[data-panel="${MAP[e.key]}"]`)?.click();
      e.preventDefault();
    }
    if (e.altKey && ALPHA_MAP[e.key.toLowerCase()]) {
      document.querySelector(`.nav-item[data-panel="${ALPHA_MAP[e.key.toLowerCase()]}"]`)?.click();
      e.preventDefault();
    }
    if ((e.key === 'p' || e.key === 'P') && !e.altKey && !e.ctrlKey && !e.metaKey) {
      document.getElementById('btn-present')?.click();
    }
  });
}

/* ─────────────────────────────────────────────────────────────
   PREVIEW SCALING
───────────────────────────────────────────────────────────── */
function _initPreviewScaling() {
  _doScale();
  const ro = new ResizeObserver(_doScale);
  const wrap = document.getElementById('preview-wrap');
  if (wrap) ro.observe(wrap);

  document.getElementById('preview-frame')?.addEventListener('load', () => {
    setTimeout(() => { _doScale(); _pushToPreview(); _syncPreviewTimerState(); }, 300);
  });
}

function _doScale() {
  const wrap  = document.getElementById('preview-wrap');
  const stage = document.getElementById('preview-stage');
  const frame = document.getElementById('preview-frame');
  const res   = document.getElementById('preview-res');
  if (!wrap || !stage || !frame) return;

  const { width: aw, height: ah } = wrap.getBoundingClientRect();
  const pw = aw - 32, ph = ah - 32;
  if (pw <= 0 || ph <= 0) return;

  let w = pw, h = pw * (9/16);
  if (h > ph) { h = ph; w = ph * (16/9); }
  w = Math.floor(w); h = Math.floor(h);
  const scale = w / RENDER_W;

  // Individual property assignment — safer than cssText
  Object.assign(stage.style, {
    width:        `${w}px`,
    height:       `${h}px`,
    position:     'relative',
    flexShrink:   '0',
    borderRadius: '6px',
    overflow:     'hidden',
    boxShadow:    '0 0 0 1px rgba(255,255,255,.07), 0 8px 40px rgba(0,0,0,.4)',
  });
  Object.assign(frame.style, {
    width:           `${RENDER_W}px`,
    height:          `${RENDER_H}px`,
    transform:       `scale(${scale})`,
    transformOrigin: 'top left',
    position:        'absolute',
    top: '0', left: '0',
  });

  if (res) res.textContent = `${w} × ${h}`;
}

/* ─────────────────────────────────────────────────────────────
   RESIZER
───────────────────────────────────────────────────────────── */
function _initResizer() {
  const resizer = document.getElementById('resizer');
  const config  = document.getElementById('config-panel');
  if (!resizer || !config) return;

  let dragging = false, startX = 0, startW = 0;

  resizer.addEventListener('mousedown', e => {
    dragging = true;
    startX   = e.clientX;
    startW   = config.getBoundingClientRect().width;
    resizer.classList.add('dragging');
    document.body.style.userSelect = 'none';
    document.body.style.cursor     = 'col-resize';
    e.preventDefault();
  });

  window.addEventListener('mousemove', e => {
    if (!dragging) return;
    const total = document.getElementById('shell')?.getBoundingClientRect().width  || 0;
    const side  = document.getElementById('sidebar')?.getBoundingClientRect().width || 0;
    const newW  = Math.max(240, Math.min(total - side - 5 - 200, startW + (e.clientX - startX)));
    _setConfigW(newW);
    try { localStorage.setItem(CONFIG_W_KEY, String(Math.round(newW))); } catch(ex) {}
  });

  window.addEventListener('mouseup', () => {
    if (!dragging) return;
    dragging = false;
    resizer.classList.remove('dragging');
    document.body.style.userSelect = '';
    document.body.style.cursor     = '';
    _doScale();
  });
}

function _savedConfigW() {
  try {
    const v = parseInt(localStorage.getItem(CONFIG_W_KEY), 10);
    if (v > 200) return v;
  } catch(e) {}
  return 330;
}

function _setConfigW(w) {
  const el = document.getElementById('config-panel');
  if (!el) return;
  Object.assign(el.style, {
    width:    `${w}px`,
    minWidth: `${w}px`,
    maxWidth: `${w}px`,
    flexShrink: '0',
  });
}
