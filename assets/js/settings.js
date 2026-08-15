/* ─────────────────────────────────────────────────────────────
   Chrona v1.0 · settings.js
   Runs only in index.html (settings page).
   Depends on: config.js (Config, History, Announcements,
               Cities, THEMES, FONTS, TIMEZONES, DEFAULTS,
               DURATION, BC, loadFont, loadAllFontsForSlot)
───────────────────────────────────────────────────────────── */

const RENDER_W    = 1920;
const RENDER_H    = 1080;
const CONFIG_W_KEY = 'chrona_config_w';

/* ── MODULE STATE ─────────────────────────────────────────── */
let displayWin   = null;
let _liveMode    = true;
let _quotePaused = false;
let _pdTimer     = null;
let _scrollMem   = {};
let _timerState   = null;

/* ── SINGLE INIT ──────────────────────────────────────────── */
window.addEventListener('DOMContentLoaded', () => {
  // Load all persisted data
  Config.load();
  History.load();
  Announcements.load();
  Cities.load();

  // Build dynamic UI sections
  _buildTimezoneSelect();
  _buildThemeGrid();
  _buildFontSlots();

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
function _save(partial, label) {
  Config.set(partial, { label });
  if (_liveMode) {
    BC.postMessage({ type: 'config', config: Config.get() });
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
    if (_timerState) {
      setTimeout(() => {
        _sendToFrame('preview-frame', _timerState);
        if (_timerState.paused) {
          setTimeout(() => {
            _sendToFrame('preview-frame', { type: 'timer-pause' });
          }, 50);
        }
      }, 120);
    }
  }, 80);
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
  _pushToPreview();
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
  ['orgName','showOrgName','showLogo','showSeconds','showAmPm',
   'showWeather','showQuotes','wmText','overlayText',
   'burnIn','autoFullscreen','smoothAnimations',
   'annScheduleEnabled','annScheduleTime','annScheduleText']
    .forEach(k => _bind(k, k));

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
  grid.innerHTML = '';
  Object.entries(THEMES).forEach(([key, t]) => {
    const card = document.createElement('div');
    card.className = 'theme-card';
    card.dataset.theme = key;
    card.innerHTML = `
      <div class="theme-swatch" style="background:${t.bg}">
        <span class="theme-swatch-digit" style="color:${t.clock}">12</span>
      </div>
      <div class="theme-label">${t.label}<span class="theme-dot"></span></div>
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
        <span class="font-preview" style="font-family:'${name}',Georgia,sans-serif">${preview}</span>
        <span class="font-name">${name}</span>
        <span class="font-note">${meta.note || ''}</span>
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
}

/* ─────────────────────────────────────────────────────────────
   FEATURE INITS
───────────────────────────────────────────────────────────── */

/* ── Timezone ── */
function _initTimezone() {
  const tzEl   = document.getElementById('tzSelect');
  const tzAuto = document.getElementById('btn-tz-auto');

  tzEl?.addEventListener('change', () => _save({ timezone: tzEl.value }));

  tzAuto?.addEventListener('click', () => {
    _tzStatus('loading', 'Detecting timezone…');
    tzAuto.disabled = true;

    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (!tz) throw new Error('Could not detect timezone.');

      // Check if detected timezone exists in our dropdown
      const exists = Array.from(tzEl?.options || []).some(o => o.value === tz);

      if (tzEl) {
        if (exists) {
          tzEl.value = tz;
        } else {
          // Add it dynamically if not in our curated list
          const opt = document.createElement('option');
          opt.value = tz;
          opt.textContent = tz;
          tzEl.appendChild(opt);
          tzEl.value = tz;
        }
      }

      _save({ timezone: tz }, 'Timezone auto-detected');
      _tzStatus('success', `Detected: ${tz}`);
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
  r.readAsDataURL(file);
}

/* ── Quotes ── */
function _initQuotes() {
  document.getElementById('quotesText')?.addEventListener('input', function() {
    const quotes = this.value.split('\n').map(l => l.trim()).filter(Boolean);
    _save({ quotes }, 'Quotes updated');
  });

  // File upload
  document.getElementById('quotesFile')?.addEventListener('change', function() {
    const f = this.files[0]; if (!f) return;
    const r = new FileReader();
    r.onload = () => {
      try {
        let quotes;
        if (f.name.endsWith('.json')) {
          const arr = JSON.parse(r.result);
          quotes = Array.isArray(arr) ? arr : [];
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
      } catch(e) { /* corrupt file — do nothing */ }
    };
    r.readAsText(f);
  });

  // Manual controls (next + pause) — broadcast to display
  document.getElementById('btn-quote-next')?.addEventListener('click', () => {
    BC.postMessage({ type: 'quote-next' });
    _sendToFrame('preview-frame', { type: 'quote-next' });
  });

  document.getElementById('btn-quote-pause')?.addEventListener('click', () => {
    _quotePaused = !_quotePaused;
    BC.postMessage({ type: 'quote-pause', paused: _quotePaused });
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
  const statusEl  = document.getElementById('weather-status');

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
      pos => {
        const lat = pos.coords.latitude.toFixed(4);
        const lon = pos.coords.longitude.toFixed(4);
        if (cityInput) cityInput.value = `${lat},${lon}`;
        _save({ weatherCity: `${lat},${lon}`, weatherLat: lat, weatherLon: lon });
        _weatherStatus('success', 'Location detected.');
        geoBtn.disabled = false;
        // Auto-clear status after 3s
        setTimeout(() => _weatherStatus('', ''), 3000);
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
      <span class="chip-txt">${city.name}</span>
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
  document.getElementById('btn-overlay')?.addEventListener('click', () => {
    const text = document.getElementById('overlayText')?.value.trim();
    if (!text) return;
    const dur = Config.get().overlayDuration || 8;
    BC.postMessage({ type: 'overlay', text, duration: dur });
    _sendToFrame('preview-frame', { type: 'overlay', text, duration: dur });
  });

  document.getElementById('btn-overlay-cancel')?.addEventListener('click', () => {
    BC.postMessage({ type: 'overlay-cancel' });
    _sendToFrame('preview-frame', { type: 'overlay-cancel' });
  });

  document.getElementById('btn-save-preset')?.addEventListener('click', () => {
    const text = document.getElementById('overlayText')?.value.trim();
    if (!text) return;
    Announcements.add(text);
    _renderAnnPresets();
  });
}

/* ── Timer ── */
function _initTimer() {
  // Simple bindings
  _bind('timerEnabled',  'timerEnabled');
  _bind('timerAutoStart','timerAutoStart');
  _bind('timerDuration', 'timerDuration', Number);
  _bind('timerStartTime','timerStartTime');

  // Scale slider
  const scaleEl = document.getElementById('scaleTimer');
  scaleEl?.addEventListener('input', function() {
    const v = parseFloat(this.value);
    _sizeLbl('scaleTimer', v);
    _save({ scaleTimer: v });
  });

  // Start button
  document.getElementById('btn-timer-start')?.addEventListener('click', () => {
    if (!Config.get().timerEnabled) return;
    const dur = (Config.get().timerDuration || 120) * 60;
    _timerState = { type: 'timer-start', seconds: dur };
    BC.postMessage(_timerState);
    _sendToFrame('preview-frame', _timerState);
    _setTimerStatus(`Running — ${Config.get().timerDuration} min`);
  });

  // Pause button
  document.getElementById('btn-timer-pause')?.addEventListener('click', () => {
    if (!Config.get().timerEnabled) return;
    const btn    = document.getElementById('btn-timer-pause');
    const paused = btn?.textContent.includes('Pause');
    const msg    = { type: 'timer-pause' };
    BC.postMessage(msg);
    _sendToFrame('preview-frame', msg);
    // Update saved state so re-syncs know current pause status
    if (_timerState) _timerState = { ..._timerState, paused: !paused };
    if (btn) btn.textContent = paused ? '▶ Resume' : '⏸ Pause';
    _setTimerStatus(paused ? 'Paused' : `Running — ${Config.get().timerDuration} min`);
  });

  // Reset button
  document.getElementById('btn-timer-reset')?.addEventListener('click', () => {
    if (!Config.get().timerEnabled) return;
    _timerState = null;
    BC.postMessage({ type: 'timer-reset' });
    _sendToFrame('preview-frame', { type: 'timer-reset' });
    const btn = document.getElementById('btn-timer-pause');
    if (btn) btn.textContent = '⏸ Pause';
    _setTimerStatus('Timer not running');
  });
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
      <span class="chip-txt" title="${item.text}">${item.label || item.text}</span>
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

    // Double-click to rename
    chip.querySelector('.chip-txt').addEventListener('dblclick', e => {
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

  function commit() {
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
      _syncDotState();
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
    // If display is already open — close it
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

    // Open display window
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
      if (Config.get().autoFullscreen) {
        displayWin.addEventListener('load', () => {
          setTimeout(() => {
            try {
              displayWin.document.documentElement.requestFullscreen?.();
            } catch(e) {}
          }, 600);
        });
      }
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
  const btn     = document.getElementById('btn-live-toggle');
  const pushBtn = document.getElementById('btn-push');

  if (btn) {
    btn.textContent = _liveMode ? '● Live' : '○ Preview';
    btn.classList.toggle('active', _liveMode);
  }
  if (pushBtn) pushBtn.style.display = _liveMode ? 'none' : 'block';

  _syncDotState();
}

function _updatePresentStatus(presenting) {
  const dot = document.getElementById('preview-live-dot');
  const txt = document.getElementById('preview-status-txt');

  if (!presenting) {
    if (dot) { dot.classList.add('offline'); dot.classList.remove('preview'); }
    if (txt) txt.textContent = 'Not presenting';
  } else if (!_liveMode) {
    if (dot) { dot.classList.add('preview'); dot.classList.remove('offline'); }
    if (txt) txt.textContent = 'Preview only';
  } else {
    if (dot) { dot.classList.remove('offline','preview'); }
    if (txt) txt.textContent = 'Live';
  }

  _syncDotState();
}

// Syncs the sidebar live dot with current state
// Three states: not open → preview only → live
function _syncDotState() {
  const isOpen = displayWin && !displayWin.closed;
  const btn = document.getElementById('btn-live-toggle');

  if (!isOpen) {
    if (btn) { btn.textContent = '○ Not Live'; btn.classList.remove('active'); }
  } else if (!_liveMode) {
    if (btn) { btn.textContent = '◑ Preview'; btn.classList.remove('active'); }
  } else {
    if (btn) { btn.textContent = '● Live'; btn.classList.add('active'); }
  }
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
    const r = new FileReader();
    r.onload = () => {
      try {
        const imported = { ...DEFAULTS, ...JSON.parse(r.result) };
        Config.set(imported, { silent: true });
        _populateUI();
        _applyAccent(Config.get().theme);
        _pushLive();
      } catch(e) { /* invalid JSON — do nothing */ }
    };
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
        <div class="history-label">${entry.label || 'Settings changed'}</div>
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
function _initPresenter() {
  document.getElementById('btn-open-presenter')?.addEventListener('click', () => {
    window.open(
      'presenter.html', 'chrona_presenter',
      `width=800,height=480,left=0,top=0,` +
      'menubar=no,toolbar=no,location=no,status=no,scrollbars=no'
    );
  });
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
  document.addEventListener('keydown', e => {
    // Don't intercept when user is typing in a form field
    if (['INPUT','TEXTAREA','SELECT'].includes(e.target.tagName)) return;
    if (e.altKey && MAP[e.key]) {
      document.querySelector(`.nav-item[data-panel="${MAP[e.key]}"]`)?.click();
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
    setTimeout(() => { _doScale(); _pushToPreview(); }, 300);
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
