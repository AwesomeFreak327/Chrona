/* ─────────────────────────────────────────────────────────────
   Chrona v1.0 · display.js
   Runs only in display.html.
   Depends on: config.js (DEFAULTS, Config, History, FONTS,
               THEMES, BC, parseQuote, renderQuoteText, loadFont)
               watermark.js (Watermark)
───────────────────────────────────────────────────────────── */

/* ── MODULE STATE ─────────────────────────────────────────── */
let _cfg           = {};
let _lastFgFontKey = '';
let _lastWmFontKey = '';
let _lastQuoteKey  = '';
let _lastBurnIn    = null;

// Clock
let _clockTimeout = null;
const _el = {};

// Quotes
let _quoteList   = [];
let _quoteIdx    = 0;
let _qTimer      = null;
let _quotePaused = false;

// Weather
let _weatherTimer   = null;
let _weatherCity    = null;

// Burn-in
let _burnTimer = null;

// Overlay
let _overlayTimer = null;
let _annScheduleFiredFor = null;

// Timer auto-start
let _timerAutoStartFiredFor = null;

// Countdown timer
let _timerInterval            = null;
let _timerStartTimeout        = null;
let _timerDurationMs          = 0;
let _timerStartedAt           = null;
let _timerPausedAt            = null;
let _timerPausedMs            = 0;
let _timerRunning             = false;
let _timerPaused              = false;
let _displayPauseTimerAt      = null;
let _timerRemaining           = 0;

// State flags for CSS class system
let _wasPaused  = false;
let _wasBlanked = false;
let _isPaused   = false;
let _isBlanked  = false;

/* ── CONSTANTS ────────────────────────────────────────────── */
const DAYS   = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const MONTHS = ['January','February','March','April','May','June',
                'July','August','September','October','November','December'];
const pad = n => String(n).padStart(2, '0');

/* ── INIT ─────────────────────────────────────────────────── */
(function init() {
  Config.load();

  _cacheDom();
  _applyAll(Config.get(), true);

  // Entrance animations — applied once, removed after they complete
  _runEntranceAnimations();

  // Clock
  _tick();
  _scheduleNextTick();

  // Watermark
  Watermark.start(_el.wmCanvas);
  Watermark.update(Config.get());

  // Signal ready to settings page (iframe postMessage)
  try { window.parent?.postMessage({ type: 'ready' }, '*'); } catch(e) {}

  // Announce this display is alive — presenter.html listens for this to know whether to show "Waiting to connect"
  BC.postMessage({ type: 'display-heartbeat' });
  setInterval(() => {
    BC.postMessage({ type: 'display-heartbeat' });
  }, 3000);
})();

/* ── DOM CACHE ────────────────────────────────────────────── */
function _cacheDom() {
  _el.html       = document.documentElement;
  _el.body       = document.body;
  _el.wmCanvas   = document.getElementById('wm-canvas');
  _el.stage      = document.getElementById('stage');
  _el.logoArea   = document.getElementById('logo-area');
  _el.logoImg    = document.getElementById('logo-img');
  _el.logoName   = document.getElementById('logo-name');
  _el.clock      = document.getElementById('clock');
  _el.ampm       = document.getElementById('ampm');
  _el.dateTxt    = document.getElementById('date-txt');
  _el.wpipe      = document.getElementById('wpipe');
  _el.weatherTxt = document.getElementById('weather-txt');
  _el.quoteArea  = document.getElementById('quote-area');
  _el.quoteTxt   = document.getElementById('quote-txt');
  _el.quoteSrc   = document.getElementById('quote-src');
  _el.overlay    = document.getElementById('overlay');
  _el.timerArea    = document.getElementById('timer-area');
  _el.timerDisplay = document.getElementById('timer-display');
  _el.timerLabel   = document.getElementById('timer-label');
}

/* ── ENTRANCE ANIMATIONS ──────────────────────────────────── */
function _runEntranceAnimations() {
  const pairs = [
    [_el.logoArea,                          'entrance-logo'],
    [_el.clock?.parentElement,              'entrance-clock'],
    [document.getElementById('meta-row'),   'entrance-meta'],
    [_el.quoteArea,                         'entrance-quote'],
  ];

  pairs.forEach(([el, cls]) => {
    if (!el) return;
    el.classList.add(cls);

    el.addEventListener('animationend', () => {
      el.classList.remove(cls);
    }, { once: true });

    setTimeout(() => {
      el.classList.remove(cls);
    }, 3000);
  });
}

/* ── BROADCAST CHANNEL ────────────────────────────────────── */
BC.onmessage = e => _handleMessage(e.data);

window.addEventListener('message', e => {
  if (e.origin !== window.location.origin) return;
  if (e.data?.type === 'ping') {
    try { window.parent?.postMessage({ type: 'ready' }, '*'); } catch(ex) {}
    return;
  }
  _handleMessage(e.data);
});

function _handleMessage(d) {
  if (!d) return;
  switch (d.type) {
    case 'config':
    case 'preview':
      Config.set(d.config, { silent: true });
      _applyAll(Config.get());
      break;
    case 'overlay':
      _showOverlay(d.text, d.duration);
      break;
    case 'overlay-cancel':
      _cancelOverlay();
      break;
    case 'blank':
      _setBlank(!!d.active);
      break;
    case 'pause':
      _setPause(!!d.active);
      break;
    case 'quote-next':
      _advanceQuote();
      break;
    case 'quote-pause':
      _setQuotePaused(d.paused);
      break;
    case 'timer-start':
      if (Number.isFinite(d.seconds) && d.seconds > 0) _timerStart(d.seconds);
      break;
    case 'timer-pause':
      _timerTogglePause();
      break;
    case 'timer-reset':
      _timerReset();
      break;
    case 'timer-sync-tick':
      if (window.parent && Number.isFinite(d.seconds) && d.seconds >= 0) {
        _timerRemaining = d.seconds;
        _timerRender();
      }
      break;
  }
}

/* ── APPLY CONFIG ─────────────────────────────────────────── */
let _themeSwitchTimeout = null;

function _applyAll(cfg, immediate = false) {
  _cfg = cfg;

  // 1. Smooth animations class on <html>
  _el.html.classList.toggle('smooth', !!cfg.smoothAnimations);

  // 2. Theme
  const newTheme = _cfg.theme || 'eclipse';
  const oldTheme = document.body.getAttribute('data-theme');
  const haloEl   = document.getElementById('halo');

  if (!immediate && oldTheme && oldTheme !== newTheme) {
    const prevHalo = THEMES[oldTheme]?.halo || 'rgba(6,4,9,.82)';
    const nextHalo = THEMES[newTheme]?.halo || 'rgba(6,4,9,.82)';

    if (haloEl) {
      haloEl.style.setProperty('--halo-prev', prevHalo);
      haloEl.style.setProperty('--halo-next', nextHalo);
    }

    document.body.classList.add('theme-switching');
    document.body.setAttribute('data-theme', newTheme);

    if (_themeSwitchTimeout) clearTimeout(_themeSwitchTimeout);
    _themeSwitchTimeout = setTimeout(() => {
      _themeSwitchTimeout = null;
      document.body.classList.remove('theme-switching');
      if (haloEl) {
        haloEl.style.setProperty('--halo-prev', nextHalo);
        haloEl.style.setProperty('--halo-next', nextHalo);
      }
    }, DURATION.theme || 1300);
  } else {
    document.body.setAttribute('data-theme', newTheme);
    const haloColour = THEMES[newTheme]?.halo || 'rgba(6,4,9,.82)';
    if (haloEl) {
      haloEl.style.setProperty('--halo-prev', haloColour);
      haloEl.style.setProperty('--halo-next', haloColour);
    }
  }

  // 3. CSS custom properties (fonts, scales, opacity)
  _setCSSVars(cfg);

  // 4. Load required fonts
  _loadDisplayFonts(cfg);

  // 5. Watermark — never restarts loop, just updates params
  Watermark.update(cfg);

  // 6. Font change detection — fade out → swap → fade in
  const fgFontKey = [cfg.fontClock, cfg.fontMeta, cfg.fontQuote, cfg.fontQuoteSrc].join('|');
  const wmFontKey = cfg.fontWm;

  const fgFontChanged = !immediate && fgFontKey !== _lastFgFontKey;
  const wmFontChanged = !immediate && wmFontKey !== _lastWmFontKey;

  _lastFgFontKey = fgFontKey;
  _lastWmFontKey = wmFontKey;

  if (fgFontChanged && cfg.smoothAnimations) {
    _fontFadeSwap(() => { _applyFontVars(cfg); _applyContent(cfg); });
  } else {
    _applyFontVars(cfg);
    _applyContent(cfg);
  }

  if (wmFontChanged && cfg.smoothAnimations) {
    _wmFontFadeSwap(() => {});
  }

  // 7. Burn-in — only restart if setting changed
  if (cfg.burnIn !== _lastBurnIn) {
    _lastBurnIn = cfg.burnIn;
    _initBurnIn(cfg.burnIn);
  }
}

function _applyFontVars(cfg) {
  const s = _el.html.style;
  const fReg = FONTS;

  const fClock = fReg.clock[cfg.fontClock]?.stack        || `'${cfg.fontClock}', Georgia, serif`;
  const fMeta  = fReg.meta[cfg.fontMeta]?.stack          || `'${cfg.fontMeta}', system-ui, sans-serif`;
  const fQuote = fReg.quote[cfg.fontQuote]?.stack        || `'${cfg.fontQuote}', Georgia, serif`;
  const fQSrc  = fReg.quoteSrc[cfg.fontQuoteSrc]?.stack  || `'${cfg.fontQuoteSrc}', system-ui, sans-serif`;

  s.setProperty('--font-clock',     fClock);
  s.setProperty('--font-meta',      fMeta);
  s.setProperty('--font-quote',     fQuote);
  s.setProperty('--font-quote-src', fQSrc);
}

function _setCSSVars(cfg) {
  const s = _el.html.style;

  // Scale multipliers
  s.setProperty('--s-logo',  cfg.scaleLogo   ?? 1);
  s.setProperty('--s-clock', cfg.scaleClock  ?? 1);
  s.setProperty('--s-meta',  cfg.scaleMeta   ?? 1);
  s.setProperty('--s-quote', cfg.scaleQuote  ?? 1);
  s.setProperty('--s-wm',    cfg.scaleWmFont ?? 1);
  s.setProperty('--s-timer', cfg.scaleTimer  ?? 1);

  // Quote opacity
  s.setProperty('--q-op',   cfg.quoteOpacity    ?? 1);
  s.setProperty('--q-s-op', cfg.quoteSrcOpacity ?? 0.68);
}

function _applyContent(cfg) {
  _quotePaused = !!cfg.quotePaused;

  // Logo
  const hasLogo = cfg.showLogo && cfg.logoData;
  const hasName = cfg.showOrgName && cfg.orgName;
  _el.logoImg.src            = hasLogo ? cfg.logoData : '';
  _el.logoImg.style.display  = hasLogo ? 'block' : 'none';
  _el.logoName.textContent   = hasName ? cfg.orgName : '';
  _el.logoName.style.display = hasName ? 'block' : 'none';
  _el.logoArea.style.display = (hasLogo || hasName) ? 'flex' : 'none';

  // Quote alignment
  _el.quoteArea.classList.toggle('align-center', cfg.quoteAlign === 'center' || !cfg.quoteAlign);
  _el.quoteArea.classList.toggle('align-left',   cfg.quoteAlign === 'left');
  _el.quoteArea.classList.toggle('align-right',  cfg.quoteAlign === 'right');

  const quoteKey = JSON.stringify(cfg.quotes) + '|' + cfg.quoteInterval;
  const quotesChanged = quoteKey !== _lastQuoteKey;
  _lastQuoteKey = quoteKey;
  if (quotesChanged) _quoteIdx = 0;

  if (cfg.showQuotes && cfg.quotes?.length) {
    _quoteList = cfg.quotes;
    _el.quoteArea.style.display = 'flex';
    if (quotesChanged) _startQuotes();
  } else {
    _el.quoteArea.style.display = 'none';
    _stopQuotes();
  }

  const newCity = cfg.weatherCity ||
    (_validCoord(cfg.weatherLat, cfg.weatherLon)
      ? `${cfg.weatherLat},${cfg.weatherLon}` : '');
  if (cfg.showWeather && newCity) {
    if (newCity !== _weatherCity) {
      _weatherCity = newCity;
      if (_weatherTimer) { clearTimeout(_weatherTimer); _weatherTimer = null; }
      _fetchWeather();
    }
  } else {
    _weatherTxt(false);
    if (_weatherTimer) { clearTimeout(_weatherTimer); _weatherTimer = null; }
    _weatherCity = null;
  }
}

function _loadDisplayFonts(cfg) {
  const slotMap = {
    fontClock:    FONTS.clock,
    fontMeta:     FONTS.meta,
    fontQuote:    FONTS.quote,
    fontQuoteSrc: FONTS.quoteSrc,
    fontWm:       FONTS.wm,
  };
  Object.entries(slotMap).forEach(([key, reg]) => {
    const url = reg?.[cfg[key]]?.url;
    if (url) loadFont(url);
  });
  const customFonts = cfg.customFonts || {};
  Object.values(customFonts).forEach(f => {
    if (f?.url) loadFont(f.url);
  });
}

/* ── FONT FADE SWAP ───────────────────────────────────────── */
let _fontFadeGen = 0;

function _fontFadeSwap(swapFn) {
  const gen = ++_fontFadeGen;
  _el.body.classList.add('font-fading');

  function onFadeOut(e) {
    if (e.propertyName !== 'opacity') return;
    _el.clock.removeEventListener('transitionend', onFadeOut);
    if (gen !== _fontFadeGen) return; 
    swapFn();
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        _el.body.classList.remove('font-fading');
      });
    });
  }

  _el.clock.addEventListener('transitionend', onFadeOut);

  setTimeout(() => {
    if (gen !== _fontFadeGen) return;
    if (_el.body.classList.contains('font-fading')) {
      _el.clock.removeEventListener('transitionend', onFadeOut);
      swapFn();
      _el.body.classList.remove('font-fading');
    }
  }, (DURATION.font || 220) * 2.5);
}

let _wmFontFadeGen = 0;

function _wmFontFadeSwap(swapFn) {
  if (!_el.wmCanvas) { swapFn(); return; }
  const gen = ++_wmFontFadeGen;

  _el.wmCanvas.style.transition =
    `opacity ${DURATION.font || 220}ms ease`;
  _el.wmCanvas.style.opacity = '0';

  setTimeout(() => {
    if (gen !== _wmFontFadeGen) return;
    swapFn();
    requestAnimationFrame(() => {
      _el.wmCanvas.style.opacity = '1';
      setTimeout(() => {
        if (gen === _wmFontFadeGen) _el.wmCanvas.style.transition = '';
      }, DURATION.font || 220);
    });
  }, DURATION.font || 220);
}

/* ── CLOCK ────────────────────────────────────────────────── */
function _tick() {
  let now;
  if (_cfg.timezone && _cfg.timezone !== 'auto') {
    try {
      now = new Date(new Date().toLocaleString('en-US', { timeZone: _cfg.timezone }));
    } catch(e) {
      now = new Date();
    }
  } else {
    now = new Date();
  }

  const h24 = now.getHours();
  const m   = now.getMinutes();
  const s   = now.getSeconds();
  const isPm = h24 >= 12;
  const h12 = h24 % 12 || 12;

  if (_cfg.showAmPm) {
    _el.ampm.textContent    = isPm ? 'PM' : 'AM';
    _el.ampm.style.display  = 'inline';
  } else {
    _el.ampm.style.display  = 'none';
  }

  _el.clock.textContent =
    _cfg.showSeconds
      ? `${pad(h12)}:${pad(m)}:${pad(s)}`
      : `${pad(h12)}:${pad(m)}`;

  _el.dateTxt.textContent =
    `${DAYS[now.getDay()]}, ${MONTHS[now.getMonth()]} ${now.getDate()}, ${now.getFullYear()}`;
  _timerCheckAutoStart(_cfg, now);
  _annCheckSchedule(_cfg, now);
}

function _scheduleNextTick() {
  const now   = Date.now();
  const delay = 1000 - (now % 1000);
  _clockTimeout = setTimeout(() => {
    _tick();
    _scheduleNextTick();
  }, delay);
}

/* ── QUOTES ───────────────────────────────────────────────── */
function _startQuotes() {
  _stopQuotes();
  if (!_quoteList.length || _quotePaused) return;
  _renderQuote(_quoteIdx);
  _qTimer = setInterval(_advanceQuote, (_cfg.quoteInterval || 30) * 1000);
}

function _stopQuotes() {
  if (_qTimer) { clearInterval(_qTimer); _qTimer = null; }
}

let _quoteFadeGen = 0;

function _advanceQuote() {
  _quoteIdx = (_quoteIdx + 1) % Math.max(1, _quoteList.length);
  if (_cfg.smoothAnimations) {
    const gen = ++_quoteFadeGen;
    _el.quoteTxt.style.opacity = '0';
    _el.quoteSrc.style.opacity = '0';
    setTimeout(() => {
      if (gen !== _quoteFadeGen) return;
      _renderQuote(_quoteIdx);
      _el.quoteTxt.style.opacity = String(_cfg.quoteOpacity    ?? 1);
      _el.quoteSrc.style.opacity = String(_cfg.quoteSrcOpacity ?? 0.68);
    }, DURATION.slow || 500);
  } else {
    _renderQuote(_quoteIdx);
  }
}

function _renderQuote(i) {
  const raw = _quoteList[i];
  if (raw == null) return;
  const { text, source } = parseQuote(raw);
  _el.quoteTxt.textContent = renderQuoteText(text);
  _el.quoteSrc.textContent = source || '';
}

function _setQuotePaused(paused) {
  _quotePaused = paused;
  paused ? _stopQuotes() : _startQuotes();
}

/* ── WEATHER ──────────────────────────────────────────────── */
let _weatherReqGen = 0;

async function _fetchWeather() {
  if (_weatherTimer) { clearTimeout(_weatherTimer); _weatherTimer = null; }
  const myGen = ++_weatherReqGen;

  const loc = _validCoord(_cfg.weatherLat, _cfg.weatherLon)
    ? `${_cfg.weatherLat},${_cfg.weatherLon}`
    : _cfg.weatherCity;

  if (!loc) return;

  const controller = new AbortController();
  const timeoutId  = setTimeout(() => controller.abort(), 10000);

  try {
    let lat, lon;

    if (loc.includes(',') && !isNaN(parseFloat(loc.split(',')[0]))) {
      [lat, lon] = loc.split(',').map(s => parseFloat(s.trim()));
    } else {
      const geo = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(loc)}&count=1&language=en&format=json`,
        { signal: controller.signal }
      );
      if (!geo.ok) throw new Error('Geocoding failed');
      const geoData = await geo.json();
      if (!geoData.results?.length) throw new Error(`City not found: ${loc}`);
      lat = geoData.results[0].latitude;
      lon = geoData.results[0].longitude;
    }

    if (myGen !== _weatherReqGen) return;

    const weather = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code&timezone=auto`,
      { signal: controller.signal }
    );
    if (!weather.ok) throw new Error('Weather API failed');
    const data    = await weather.json();
    const current = data.current;
    if (!current || !Number.isFinite(current.temperature_2m) || !Number.isFinite(current.weather_code)) {
      throw new Error('Invalid weather data');
    }

    clearTimeout(timeoutId);
    if (myGen !== _weatherReqGen) return;

    _el.weatherTxt.textContent = `${Math.round(current.temperature_2m)}°C  ${_weatherCode(current.weather_code)}`;
    _weatherTxt(true);

    _weatherTimer = setTimeout(_fetchWeather, 30 * 60 * 1000);

  } catch(e) {
    clearTimeout(timeoutId);
    if (myGen !== _weatherReqGen) return;
    _weatherTxt(false);
    _weatherTimer = setTimeout(_fetchWeather, 10 * 60 * 1000);
  }
}

function _validCoord(lat, lon) {
  return Number.isFinite(lat) && Number.isFinite(lon) &&
    lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180;
}

function _weatherTxt(visible) {
  _el.weatherTxt.style.display = visible ? 'inline'        : 'none';
  _el.wpipe.style.display      = visible ? 'inline-block'  : 'none';
}

function _weatherCode(code) {
  if (code === 0)              return 'Clear';
  if (code === 1)              return 'Mostly clear';
  if (code === 2)              return 'Partly cloudy';
  if (code === 3)              return 'Cloudy';
  if (code >= 45 && code <= 48) return 'Foggy';
  if (code >= 51 && code <= 55) return code <= 51 ? 'Light drizzle' : code <= 53 ? 'Drizzle' : 'Heavy drizzle';
  if (code >= 61 && code <= 65) return code <= 61 ? 'Light rain'    : code <= 63 ? 'Rain'    : 'Heavy rain';
  if (code >= 71 && code <= 77) return code <= 71 ? 'Light snow'    : code <= 73 ? 'Snow'    : 'Heavy snow';
  if (code >= 80 && code <= 82) return code <= 80 ? 'Light showers' : code <= 81 ? 'Showers' : 'Heavy showers';
  if (code >= 85 && code <= 86) return 'Snow showers';
  if (code >= 95)               return 'Thunderstorm';
  return 'Unknown';
}

/* ── COUNTDOWN TIMER ──────────────────────────────────────── */
function _timerStart(seconds) {
  _timerReset();
  _timerDurationMs = seconds * 1000;
  _timerStartedAt  = performance.now();
  _timerPausedMs   = 0;
  _timerRunning    = true;
  _timerPaused     = false;
  if (_el.timerArea) _el.timerArea.classList.remove('hidden','finished','warning');
  const msToNext = 1000 - (Date.now() % 1000);
  _timerStartTimeout = setTimeout(() => {
    _timerStartTimeout = null;
    _timerTick();
    _timerInterval = setInterval(_timerTick, 1000);
  }, msToNext);
}

function _timerTick() {
  if (!_timerRunning || _timerPaused) return;

  const elapsed    = performance.now() - _timerStartedAt - _timerPausedMs;
  _timerRemaining  = Math.max(0, Math.round((_timerDurationMs - elapsed) / 1000));

  _timerRender();

  if (_timerRemaining <= 600 && _timerRemaining > 0) {
    _el.timerArea?.classList.add('warning');
  }

  if (_timerRemaining === 0) {
    _timerRunning = false;
    clearInterval(_timerInterval);
    _timerInterval = null;
    _el.timerArea?.classList.add('finished');
    _el.timerArea?.classList.remove('warning');
    if (_el.timerLabel) _el.timerLabel.textContent = 'Time Up';
  }
}

function _timerTogglePause() {
  if (!_timerRunning) return;
  _timerPaused = !_timerPaused;
  if (_timerPaused) {
    if (_displayPauseTimerAt) {
      _timerPausedMs += performance.now() - _displayPauseTimerAt;
      _displayPauseTimerAt = null;
    }
    _timerPausedAt = performance.now();
  } else {
    if (_timerPausedAt) {
      _timerPausedMs += performance.now() - _timerPausedAt;
      _timerPausedAt  = null;
    }
    if (_isPaused) {
      _displayPauseTimerAt = performance.now();
    } else if (!_timerInterval && !_timerStartTimeout) {
      _timerTick();
      _timerInterval = setInterval(_timerTick, 1000);
    }
  }
  if (_el.timerLabel) {
    _el.timerLabel.textContent = _timerPaused ? 'Paused' : 'Time Remaining';
  }
}

function _timerReset() {
  if (_timerStartTimeout) { clearTimeout(_timerStartTimeout); _timerStartTimeout = null; }
  clearInterval(_timerInterval);
  _timerInterval   = null;
  _timerRunning    = false;
  _timerPaused     = false;
  _timerRemaining  = 0;
  _timerDurationMs = 0;
  _timerStartedAt  = null;
  _timerPausedAt   = null;
  _timerPausedMs   = 0;
  if (_el.timerArea)    _el.timerArea.classList.add('hidden');
  if (_el.timerArea)    _el.timerArea.classList.remove('warning','finished');
  if (_el.timerDisplay) _el.timerDisplay.textContent = '0:00:00';
  if (_el.timerLabel)   _el.timerLabel.textContent   = 'Time Remaining';
}

function _timerRender() {
  if (!_el.timerDisplay) return;
  const h = Math.floor(_timerRemaining / 3600);
  const m = Math.floor((_timerRemaining % 3600) / 60);
  const s = _timerRemaining % 60;
  _el.timerDisplay.textContent = `${h}:${pad(m)}:${pad(s)}`;
}

function _timerCheckAutoStart(cfg, now = new Date()) {
  if (!cfg?.timerAutoStart || !cfg?.timerStartTime || _timerRunning) return;
  const [th, tm] = cfg.timerStartTime.split(':').map(Number);
  if (isNaN(th) || isNaN(tm)) return;

  const fireKey = `${now.toDateString()} ${cfg.timerStartTime}`;
  if (_timerAutoStartFiredFor === fireKey) return;

  const target  = new Date(now);
  target.setHours(th, tm, 0, 0);
  const diffSec = (now - target) / 1000;

  if (diffSec >= 0 && diffSec <= 120) {
    _timerAutoStartFiredFor = fireKey;
    _timerStart((cfg.timerDuration || 120) * 60);
  }
}

function _annCheckSchedule(cfg, now = new Date()) {
  if (!cfg?.annScheduleEnabled || !cfg?.annScheduleTime || !cfg?.annScheduleText) return;
  const [th, tm] = cfg.annScheduleTime.split(':').map(Number);
  if (isNaN(th) || isNaN(tm)) return;

  const fireKey = `${now.toDateString()} ${cfg.annScheduleTime}`;
  if (_annScheduleFiredFor === fireKey) return;

  const target  = new Date(now);
  target.setHours(th, tm, 0, 0);
  const diffSec = (now - target) / 1000;

  if (diffSec >= 0 && diffSec <= 120) {
    _annScheduleFiredFor = fireKey;
    _showOverlay(cfg.annScheduleText, cfg.overlayDuration || 8);
  }
}

/* ── OVERLAY ──────────────────────────────────────────────── */
function _showOverlay(text, dur) {
  if (!_el.overlay) return;
  _el.overlay.textContent = typeof text === 'string' ? text : '';
  _el.overlay.classList.add('show');
  _el.stage?.classList.add('announcing');

  if (_overlayTimer) clearTimeout(_overlayTimer);
  const seconds = Number.isFinite(dur) && dur > 0 ? dur : 8;
  _overlayTimer = setTimeout(() => _cancelOverlay(), seconds * 1000);
}

function _cancelOverlay() {
  if (!_el.overlay) return;
  _el.overlay.classList.remove('show');
  _el.stage?.classList.remove('announcing');
  if (_overlayTimer) { clearTimeout(_overlayTimer); _overlayTimer = null; }
}

/* ── BLANK ────────────────────────────────────────────────── */
function _setBlank(active) {
  if (active && !_wasBlanked) {
    _wasBlanked = true;
    _el.body.classList.add('was-blanked');
  }
  _isBlanked = active;
  _el.body.classList.toggle('blanked', active);

  if (active && _isPaused) {
    Watermark.resume();
  } else if (!active && _isPaused) {
    Watermark.pause();
  }
}

/* ── PAUSE ────────────────────────────────────────────────── */
function _setPause(active) {
  if (active && !_wasPaused) {
    _wasPaused = true;
    _el.body.classList.add('was-paused');
  }
  _isPaused = active;
  _el.body.classList.toggle('paused', active);

  if (active) {
    if (_clockTimeout) { clearTimeout(_clockTimeout); _clockTimeout = null; }
    _stopQuotes();
    if (_timerStartTimeout) { clearTimeout(_timerStartTimeout); _timerStartTimeout = null; }
    if (_timerInterval) { clearInterval(_timerInterval); _timerInterval = null; }
    if (_timerRunning && !_timerPaused) {
      _displayPauseTimerAt = performance.now();
    }
    Watermark.pause();
  } else {
    if (!_clockTimeout) {
      _tick();
      _scheduleNextTick();
    }
    if (_cfg.showQuotes && _quoteList.length && !_quotePaused) {
      _startQuotes();
    }
    if (_timerRunning && !_timerPaused) {
      if (_displayPauseTimerAt) {
        _timerPausedMs += performance.now() - _displayPauseTimerAt;
        _displayPauseTimerAt = null;
      }
      const msToNext = 1000 - (Date.now() % 1000);
      _timerStartTimeout = setTimeout(() => {
        _timerStartTimeout = null;
        _timerTick();
        _timerInterval = setInterval(_timerTick, 1000);
      }, msToNext);
    }
    if (!_isBlanked) Watermark.resume();
  }
}

/* ── BURN-IN ──────────────────────────────────────────────── */
function _initBurnIn(enabled) {
  if (_burnTimer) { clearInterval(_burnTimer); _burnTimer = null; }
  if (!enabled) { _el.stage.style.transform = ''; return; }
  _burnTimer = setInterval(() => {
    _el.stage.style.transform =
      `translate(${(Math.random() - .5) * 5}px, ${(Math.random() - .5) * 5}px)`;
  }, 4 * 60 * 1000);
}

/* ── FULLSCREEN (F key) ───────────────────────────────────── */
document.addEventListener('keydown', e => {
  if (e.key !== 'f' && e.key !== 'F') return;
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen?.();
  } else {
    document.exitFullscreen?.();
  }
});
