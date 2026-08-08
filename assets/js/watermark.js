/* ─────────────────────────────────────────────────────────────
   Chrona v1.0 · watermark.js

   Isolated watermark animation.
   The offset accumulates as a continuous float — it NEVER resets.
   Config changes update render params without touching the loop.

   Public API:
     Watermark.start(canvasEl)  — call once on page load
     Watermark.update(cfg)      — call on every config change
     Watermark.pause()          — freeze frame (Pause mode)
     Watermark.resume()         — continue from same offset
───────────────────────────────────────────────────────────── */

const Watermark = (() => {

  /* ── PRIVATE STATE ── */
  let canvas   = null;
  let ctx      = null;
  let raf      = null;
  let paused   = false;
  let resizeBound = false; // guard against duplicate resize listeners

  // Continuous offset — accumulates forever, never reset
  let offset = 0;
  let lastTs = null;

  // Cached render params — updated by update(), never touched by the loop
  let params = {
    text:      'CHRONA',
    opacity:   4,
    spacing:   5,
    speed:     4,
    fontName:  'Work Sans',
    fontScale: 1,
    wmR: 160, wmG: 80, wmB: 255,
  };

  // Cached computed values — recalculated only when source data changes
  let _cachedDiag      = 0;
  let _cachedLineCount = 0;
  let _cachedFont      = '';
  let _cachedFill      = '';
  let _cachedTileW     = 1;
  let _lastFontKey     = '';
  let _lastColorKey    = '';

  /* ── LOOKUP TABLES ── */
  // Speed → px/frame at 60fps. Range: very slow (0.06) → moderate (1.18).
  // Deliberately capped — Chrona is ambient, not a screensaver.
  const SPEED_TABLE = [0.06, 0.11, 0.18, 0.26, 0.36, 0.48, 0.62, 0.78, 0.96, 1.18];

  // Opacity → alpha. Range: subconscious (0.012) → strong branding (0.340).
  const OPAC_TABLE  = [0.012, 0.026, 0.046, 0.072, 0.104, 0.142, 0.186, 0.236, 0.286, 0.340];

  /* ── PUBLIC: start ── */
  function start(canvasEl) {
    canvas = canvasEl;
    ctx    = canvas.getContext('2d');
    _resize();

    if (!resizeBound) {
      window.addEventListener('resize', _resize);
      resizeBound = true;
    }

    if (!raf) _loop(performance.now());
  }

  /* ── PUBLIC: update ── */
  // Called on every config change. Never touches offset or raf.
  function update(cfg) {
    const theme = THEMES[cfg.theme] || THEMES.eclipse;
    const [r, g, b] = (theme.wm || '160,80,255').split(',').map(Number);
    params = {
      text:      (cfg.wmText     || 'CHRONA').toUpperCase(),
      opacity:   cfg.wmOpacity   ?? 4,
      spacing:   cfg.wmSpacing   ?? 5,
      speed:     cfg.wmSpeed     ?? 4,
      fontName:  cfg.fontWm      || 'Work Sans',
      fontScale: cfg.scaleWmFont ?? 1,
      wmR: r, wmG: g, wmB: b,
    };
    // Invalidate tile cache when text or font changes
    // (will be recalculated on next draw call)
    _lastFontKey  = '';
    _lastColorKey = '';
  }

  /* ── PUBLIC: pause ── */
  // Cancels rAF. Offset is frozen in place.
  // The canvas retains its last drawn frame — display stays visible.
  function pause() {
    if (paused) return;
    paused = true;
    if (raf) { cancelAnimationFrame(raf); raf = null; }
  }

  /* ── PUBLIC: resume ── */
  // Restarts loop from the frozen offset.
  // lastTs reset to null so dt doesn't spike from the pause gap.
  function resume() {
    if (!paused) return;
    paused  = false;
    lastTs  = null;
    if (!raf && canvas) _loop(performance.now());
  }

  /* ── PRIVATE: resize ── */
  function _resize() {
    if (!canvas) return;
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
    // Recalculate geometry cache on resize
    const W = canvas.width;
    const H = canvas.height;
    _cachedDiag      = Math.sqrt(W * W + H * H) * 1.2;
    _cachedLineCount = 0; // will be recalculated in _draw (depends on spacing)
    _lastFontKey     = ''; // force tile remeasure at new scale
  }

  /* ── PRIVATE: main loop ── */
  function _loop(ts) {
    if (lastTs === null) lastTs = ts;

    // Cap dt at 50ms to prevent a position jump after tab blur/focus
    const dt = Math.min(ts - lastTs, 50);
    lastTs = ts;

    const sp = SPEED_TABLE[Math.max(0, Math.min(9, params.speed - 1))];
    offset  += sp * (dt / 16.667); // normalised to 60fps

    _draw();
    raf = requestAnimationFrame(_loop);
  }

  /* ── PRIVATE: draw frame ── */
  function _draw() {
    if (!canvas || !ctx) return;

    const W = canvas.width;
    const H = canvas.height;

    ctx.clearRect(0, 0, W, H);

    // ── Update cached geometry (only on spacing change or resize) ──
    const spacing = 58 + (params.spacing - 1) * 20;
    if (_cachedDiag === 0) {
      _cachedDiag = Math.sqrt(W * W + H * H) * 1.2;
    }
    _cachedLineCount = Math.ceil(_cachedDiag / spacing) + 6;

    // ── Update cached font string (only when font/scale changes) ──
    const fontKey = `${params.fontName}|${params.fontScale}|${params.text}`;
    if (fontKey !== _lastFontKey) {
      _lastFontKey = fontKey;
      const baseSize = Math.max(11, Math.min(22, W * 0.016));
      const fontSize = baseSize * params.fontScale;
      _cachedFont = `300 ${fontSize}px '${params.fontName}', system-ui, sans-serif`;
      ctx.font = _cachedFont;
      // Re-measure tile width (expensive — only when text/font changes)
      const charW    = ctx.measureText(params.text).width;
      _cachedTileW   = Math.max(charW + fontSize * 3.5, 1);
    } else {
      // Re-apply cached font (canvas state resets on clearRect in some browsers)
      ctx.font = _cachedFont;
    }

    // ── Update cached fill style (only when colour/opacity changes) ──
    const colorKey = `${params.wmR},${params.wmG},${params.wmB},${params.opacity}`;
    if (colorKey !== _lastColorKey) {
      _lastColorKey = colorKey;
      const op      = OPAC_TABLE[Math.max(0, Math.min(9, params.opacity - 1))];
      _cachedFill   = `rgba(${params.wmR},${params.wmG},${params.wmB},${op})`;
    }
    ctx.fillStyle = _cachedFill;

    // ── Draw ──
    ctx.save();
    ctx.translate(W / 2, H / 2);
    ctx.rotate(-Math.PI / 5); // 36° diagonal

    for (let i = -_cachedLineCount; i <= _cachedLineCount; i++) {
      const dir   = i % 2 === 0 ? 1 : -1;
      // Modulo wrap within one tile — seamless at any speed, no snap
      const shift = ((offset * dir) % _cachedTileW + _cachedTileW) % _cachedTileW;

      ctx.save();
      ctx.translate(0, i * spacing);
      for (let x = -_cachedDiag - _cachedTileW + shift; x < _cachedDiag; x += _cachedTileW) {
        ctx.fillText(params.text, x, 0);
      }
      ctx.restore();
    }

    ctx.restore();
  }

  /* ── PUBLIC API ── */
  return { start, update, pause, resume };

})();
