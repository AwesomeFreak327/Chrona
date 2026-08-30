/* ─────────────────────────────────────────────────────────────
   Chrona v1.0 · watermark.js

   Isolated watermark animation.
   The offset accumulates as a continuous float — it NEVER resets.
   Config changes update render params without touching the loop.
───────────────────────────────────────────────────────────── */

const Watermark = (() => {

  /* ── PRIVATE STATE ── */
  let canvas   = null;
  let ctx      = null;
  let raf      = null;
  let paused   = false;
  let resizeBound = false;
  let _cssW = 0, _cssH = 0;
  let offset = 0;
  let lastTs = null;
  let params = {
    text:      'CHRONA',
    opacity:   4,
    spacing:   5,
    speed:     4,
    fontName:  'Work Sans',
    fontScale: 1,
    wmR: 160, wmG: 80, wmB: 255,
  };
  let _cachedDiag      = 0;
  let _cachedLineCount = 0;
  let _cachedFont      = '';
  let _cachedFill      = '';
  let _cachedTileW     = 1;
  let _lastFontKey     = '';
  let _lastColorKey    = '';
  let _lastSpacingKey  = '';

  /* ── LOOKUP TABLES ── */
  const SPEED_TABLE = [0.06, 0.11, 0.18, 0.26, 0.36, 0.48, 0.62, 0.78, 0.96, 1.18];
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

    if (!raf && !paused) _loop(performance.now());
  }

  /* ── PUBLIC: update ── */
  function update(cfg) {
    const theme = THEMES[cfg.theme] || THEMES.eclipse;
    const [r, g, b] = (theme.wm || '160,80,255').split(',').map(Number);
    const clampParam = (v, def, lo, hi) => {
      const n = Number(v);
      return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : def;
    };
    params = {
      text:      (cfg.wmText     || 'CHRONA').toUpperCase(),
      opacity:   clampParam(cfg.wmOpacity,   4, 1, 10),
      spacing:   clampParam(cfg.wmSpacing,   5, 1, 10),
      speed:     clampParam(cfg.wmSpeed,     4, 1, 10),
      fontName:  cfg.fontWm      || 'Work Sans',
      fontScale: clampParam(cfg.scaleWmFont, 1, 0.4, 4),
      wmR: r, wmG: g, wmB: b,
    };
  }

  /* ── PUBLIC: pause ── */
  function pause() {
    if (paused) return;
    paused = true;
    if (raf) { cancelAnimationFrame(raf); raf = null; }
  }

  /* ── PUBLIC: resume ── */
  function resume() {
    if (!paused) return;
    paused  = false;
    lastTs  = null;
    if (!raf && canvas) _loop(performance.now());
  }

  /* ── PRIVATE: resize ── */
  function _resize() {
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    _cssW = window.innerWidth;
    _cssH = window.innerHeight;
    canvas.width       = Math.round(_cssW * dpr);
    canvas.height      = Math.round(_cssH * dpr);
    canvas.style.width  = _cssW + 'px';
    canvas.style.height = _cssH + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    _cachedDiag      = Math.sqrt(_cssW * _cssW + _cssH * _cssH) * 1.2;
    _cachedLineCount = 0;
    _lastFontKey     = '';
  }

  /* ── PRIVATE: main loop ── */
  function _loop(ts) {
    if (lastTs === null) lastTs = ts;
    const dt = Math.min(ts - lastTs, 50);
    lastTs = ts;

    const sp = SPEED_TABLE[Math.max(0, Math.min(9, params.speed - 1))];
    offset  += sp * (dt / 16.667);

    _draw();
    raf = requestAnimationFrame(_loop);
  }

  /* ── PRIVATE: draw frame ── */
  function _draw() {
    if (!canvas || !ctx) return;

    const W = _cssW;
    const H = _cssH;
    ctx.clearRect(0, 0, W, H);

    const spacing = 58 + (params.spacing - 1) * 20;
    if (_cachedDiag === 0) {
      _cachedDiag = Math.sqrt(W * W + H * H) * 1.2;
    }
    const spacingKey = `${spacing}|${_cachedDiag}`;
    if (spacingKey !== _lastSpacingKey) {
      _lastSpacingKey  = spacingKey;
      _cachedLineCount = Math.ceil(_cachedDiag / spacing) + 6;
    }

    const fontKey = `${params.fontName}|${params.fontScale}|${params.text}`;
    if (fontKey !== _lastFontKey) {
      _lastFontKey = fontKey;
      const baseSize = Math.max(11, Math.min(22, W * 0.016));
      const fontSize = baseSize * params.fontScale;
      _cachedFont = `300 ${fontSize}px '${params.fontName}', system-ui, sans-serif`;
      ctx.font = _cachedFont;
      const charW    = ctx.measureText(params.text).width;
      _cachedTileW   = Math.max(charW + fontSize * 3.5, 1);
    } else {
      ctx.font = _cachedFont;
    }

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
    ctx.rotate(-Math.PI / 5);

    for (let i = -_cachedLineCount; i <= _cachedLineCount; i++) {
      const dir   = i % 2 === 0 ? 1 : -1;
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
