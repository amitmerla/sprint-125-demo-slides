/* Sprint 125 · Transformers Squad · Leonida Edition (GTA VI theme) */
(function () {
  'use strict';

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var dpr = Math.min(window.devicePixelRatio || 1, 2);
  var COLORS = ['255,79,139', '255,143,90', '138,79,255', '255,194,122'];

  /* ============ opening-screen music ============
     Plays "Leonida Nights", an original dusk soft-rock loop generated live with Web Audio.
     To use your own track instead (one you have the rights to), put it in audio/ and set
     data-src="audio/your-track.mp3" on #soundBtn in index.html. */
  var music = (function () {
    var btn = $('#soundBtn');
    var label = $('.sound__label', btn);
    var TRACK = btn.getAttribute('data-src') || '';
    var BPM = 118, BEAT = 60 / BPM, SIX = BEAT / 4, BAR = BEAT * 4;
    var ctx = null, master, verb, gverb, delay, noise, lastLead = 0, timer = null, nextT = 0, step = 0, stopT = null;
    var enabled = false, level = 0.7;

    // optional user-supplied track
    var file = new Audio(), hasFile = false, fadeIv = null;
    file.loop = true; file.preload = 'auto'; file.volume = 0;
    file.addEventListener('canplay', function () { hasFile = true; });
    file.addEventListener('error', function () { hasFile = false; });
    if (TRACK) file.src = TRACK;

    var mtof = function (m) { return 440 * Math.pow(2, (m - 69) / 12); };
    // 80s synth-pop, original writing: Am → F → C → G, octave-bouncing synth bass,
    // gated-reverb snare + claps, brass stabs, DX7-style FM e-piano, chorused pad, gliding lead.
    var CHORDS = [[57, 60, 64, 69], [53, 57, 60, 65], [55, 60, 64, 67], [55, 59, 62, 67]];
    var ROOTS = [33, 29, 36, 31];
    var ARP = [0, 1, 2, 3, 2, 1, 3, 2];
    var STABS = { 0: 4, 6: 2, 10: 4 };       // step → length in 16ths
    var TOMS = { 12: 210, 13: 170, 14: 138, 15: 108 };
    // [bar, step, midi, length in 16ths]: an original hook
    var MELODY = [[0, 0, 76, 3], [0, 3, 74, 3], [0, 6, 72, 2], [0, 8, 74, 4], [0, 12, 72, 2], [0, 14, 69, 2],
      [1, 0, 72, 6], [1, 6, 69, 2], [1, 8, 65, 8],
      [2, 0, 67, 3], [2, 3, 69, 3], [2, 6, 72, 2], [2, 8, 76, 4], [2, 12, 79, 4],
      [3, 0, 74, 6], [3, 6, 71, 2], [3, 8, 74, 4], [3, 12, 76, 4]];

    // gated: a flat burst of reverb that slams shut, the classic 80s drum sound
    function impulse(sec, gated) {
      var len = Math.floor(ctx.sampleRate * sec), b = ctx.createBuffer(2, len, ctx.sampleRate);
      for (var c = 0; c < 2; c++) {
        var d = b.getChannelData(c);
        for (var i = 0; i < len; i++) {
          var k = i / len;
          d[i] = (Math.random() * 2 - 1) * (gated ? (k < 0.92 ? 1 - k * 0.35 : (1 - k) * 8) : Math.pow(1 - k, 3));
        }
      }
      return b;
    }
    function init() {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      ctx = new AC();
      master = ctx.createGain(); master.gain.value = 0;
      var comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -16; comp.ratio.value = 4;
      master.connect(comp); comp.connect(ctx.destination);
      verb = ctx.createConvolver(); verb.buffer = impulse(2.4);
      var vg = ctx.createGain(); vg.gain.value = 0.28; verb.connect(vg); vg.connect(master);
      gverb = ctx.createConvolver(); gverb.buffer = impulse(0.3, true);
      var gg = ctx.createGain(); gg.gain.value = 0.55; gverb.connect(gg); gg.connect(master);
      delay = ctx.createDelay(1); delay.delayTime.value = BEAT * 0.75;
      var fb = ctx.createGain(); fb.gain.value = 0.35; delay.connect(fb); fb.connect(delay);
      var dg = ctx.createGain(); dg.gain.value = 0.3; delay.connect(dg); dg.connect(master);
      noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      var nd = noise.getChannelData(0);
      for (var i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
      return true;
    }
    function out(node, wet, dly, gate) {
      node.connect(master);
      if (wet) { var g = ctx.createGain(); g.gain.value = wet; node.connect(g); g.connect(verb); }
      if (dly) { var g2 = ctx.createGain(); g2.gain.value = dly; node.connect(g2); g2.connect(delay); }
      if (gate) { var g3 = ctx.createGain(); g3.gain.value = gate; node.connect(g3); g3.connect(gverb); }
    }
    function osc(type, f, t, end, dest, detune) {
      var o = ctx.createOscillator(); o.type = type; o.frequency.value = f;
      if (detune) o.detune.value = detune;
      o.connect(dest); o.start(t); o.stop(end);
      return o;
    }
    // lush chorused pad: three detuned saws per note with a slow wobble
    function pad(t, notes) {
      var g = ctx.createGain(), f = ctx.createBiquadFilter(), lfo = ctx.createOscillator(), lg = ctx.createGain();
      f.type = 'lowpass'; f.frequency.value = 2600; f.Q.value = 0.4;
      lfo.frequency.value = 0.45; lg.gain.value = 7; lfo.connect(lg); lfo.start(t); lfo.stop(t + BAR + 0.7);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.02, t + 0.35); g.gain.setValueAtTime(0.02, t + BAR - 0.1); g.gain.linearRampToValueAtTime(0, t + BAR + 0.6);
      f.connect(g);
      notes.forEach(function (n) {
        [-14, 0, 14].forEach(function (d) { lg.connect(osc('sawtooth', mtof(n), t, t + BAR + 0.7, f, d).detune); });
      });
      out(g, 0.5);
    }
    // DX7-style FM electric piano: sine carrier, sine modulator + a short bright "tine"
    function epiano(t, n, v) {
      var f0 = mtof(n), g = ctx.createGain(), car = ctx.createOscillator();
      var mod = ctx.createOscillator(), mg = ctx.createGain(), tine = ctx.createOscillator(), tg = ctx.createGain();
      car.frequency.value = f0; mod.frequency.value = f0; tine.frequency.value = f0 * 14;
      mg.gain.setValueAtTime(f0 * 2.2, t); mg.gain.exponentialRampToValueAtTime(f0 * 0.25, t + 0.7);
      tg.gain.setValueAtTime(f0 * 1.6, t); tg.gain.exponentialRampToValueAtTime(1, t + 0.06);
      mod.connect(mg); mg.connect(car.frequency); tine.connect(tg); tg.connect(car.frequency);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.085 * v, t + 0.004); g.gain.exponentialRampToValueAtTime(0.0008, t + 1.4);
      car.connect(g);
      [car, mod, tine].forEach(function (o) { o.start(t); o.stop(t + 1.5); });
      out(g, 0.35, 0.3);
    }
    // synth bass: two saws through a resonant filter that snaps shut
    function bass(t, n, len, acc) {
      var g = ctx.createGain(), f = ctx.createBiquadFilter();
      f.type = 'lowpass'; f.Q.value = 7;
      f.frequency.setValueAtTime(1900 * acc, t); f.frequency.exponentialRampToValueAtTime(260, t + 0.16);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.2, t + 0.006); g.gain.setTargetAtTime(0.13, t + 0.02, 0.08); g.gain.linearRampToValueAtTime(0, t + len);
      f.connect(g);
      osc('sawtooth', mtof(n), t, t + len + 0.02, f, -6);
      osc('sawtooth', mtof(n), t, t + len + 0.02, f, 6);
      out(g, 0.02);
    }
    // synth brass stab: stacked saws, filter swells open then settles
    function brass(t, notes, len) {
      var g = ctx.createGain(), f = ctx.createBiquadFilter();
      f.type = 'lowpass'; f.Q.value = 1.8;
      f.frequency.setValueAtTime(500, t); f.frequency.exponentialRampToValueAtTime(4200, t + 0.05); f.frequency.exponentialRampToValueAtTime(1300, t + 0.3);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.035, t + 0.015); g.gain.setTargetAtTime(0.024, t + 0.05, 0.1); g.gain.linearRampToValueAtTime(0, t + len + 0.08);
      f.connect(g);
      notes.forEach(function (n) { [-11, 0, 11].forEach(function (d) { osc('sawtooth', mtof(n), t, t + len + 0.1, f, d); }); });
      out(g, 0.3, 0.12);
    }
    // gliding lead: square + saw, portamento from the previous note, delayed vibrato
    function lead(t, n, len) {
      var g = ctx.createGain(), f = ctx.createBiquadFilter();
      f.type = 'lowpass'; f.frequency.value = 3200; f.Q.value = 1.2;
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.06, t + 0.02); g.gain.setTargetAtTime(0.045, t + 0.08, 0.2); g.gain.linearRampToValueAtTime(0, t + len + 0.1);
      f.connect(g);
      var from = lastLead ? mtof(lastLead) : mtof(n);
      var lfo = ctx.createOscillator(), lg = ctx.createGain();
      lfo.frequency.value = 5.5; lg.gain.setValueAtTime(0, t); lg.gain.linearRampToValueAtTime(12, t + Math.max(0.2, len * 0.7));
      lfo.connect(lg); lfo.start(t); lfo.stop(t + len + 0.15);
      [['square', 0], ['sawtooth', 7]].forEach(function (v) {
        var o = osc(v[0], from, t, t + len + 0.15, f, v[1]);
        o.frequency.setValueAtTime(from, t); o.frequency.exponentialRampToValueAtTime(mtof(n), t + 0.06);
        lg.connect(o.detune);
      });
      lastLead = n;
      out(g, 0.35, 0.45);
    }
    function hiss(t, type, f, peak, dec, wet, gate) {
      var s = ctx.createBufferSource(), fl = ctx.createBiquadFilter(), g = ctx.createGain();
      s.buffer = noise; fl.type = type; fl.frequency.value = f;
      g.gain.setValueAtTime(peak, t); g.gain.exponentialRampToValueAtTime(0.0008, t + dec);
      s.connect(fl); fl.connect(g); s.start(t, Math.random() * 0.5); s.stop(t + dec + 0.05);
      out(g, wet, 0, gate);
    }
    function kick(t) {
      var g = ctx.createGain(), o = ctx.createOscillator();
      o.frequency.setValueAtTime(155, t); o.frequency.exponentialRampToValueAtTime(46, t + 0.1);
      g.gain.setValueAtTime(0.95, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.32);
      o.connect(g); o.start(t); o.stop(t + 0.35);
      out(g, 0, 0, 0.08);
      hiss(t, 'highpass', 3000, 0.12, 0.012, 0);
    }
    // gated snare + handclap, the sound of 1985
    function snare(t) {
      hiss(t, 'bandpass', 2000, 0.3, 0.17, 0.08, 1);
      var g = ctx.createGain(), o = ctx.createOscillator();
      o.type = 'triangle';
      o.frequency.setValueAtTime(200, t); o.frequency.exponentialRampToValueAtTime(160, t + 0.08);
      g.gain.setValueAtTime(0.3, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
      o.connect(g); o.start(t); o.stop(t + 0.12);
      out(g, 0, 0, 0.8);
      [0, 0.011, 0.022].forEach(function (d, k) { hiss(t + d, 'bandpass', 1150, 0.16, k === 2 ? 0.13 : 0.018, 0.05, 0.5); });
    }
    function tom(t, f0) {
      var g = ctx.createGain(), o = ctx.createOscillator();
      o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f0 * 0.6, t + 0.25);
      g.gain.setValueAtTime(0.5, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
      o.connect(g); o.start(t); o.stop(t + 0.38);
      out(g, 0.05, 0, 0.7);
    }
    function sched(i, t) {
      var s = i % 16, bar = Math.floor(i / 16) % 4, cycle = Math.floor(i / 64);
      var ch = CHORDS[bar], root = ROOTS[bar], full = cycle >= 1;
      var fill = bar === 3 && s >= 12 && (full || cycle === 0);
      if (s === 0) pad(t, ch);
      if (s % 2 === 0) epiano(t, ch[ARP[s / 2]] + 12, full ? 0.5 : (s % 4 === 0 ? 1 : 0.75));
      if (fill) tom(t, TOMS[s]);
      if (!full) {
        // intro: e-piano + pad, snare roll building into the band
        if (bar === 3 && s >= 4 && s < 12) hiss(t, 'bandpass', 2000, 0.04 + (s - 4) * 0.02, 0.09, 0.05, 0.6);
      } else {
        // octave-bouncing eighth-note bass
        if (s % 2 === 0) bass(t, s % 4 === 0 ? root : root + 12, SIX * 1.7, s === 0 ? 1.4 : 1);
        if (s === 0 || s === 8 || (s === 10 && bar % 2)) kick(t);
        if (!fill) {
          if (s === 4 || s === 12) snare(t);
          hiss(t, 'highpass', 9000, s === 14 ? 0.06 : s % 4 === 2 ? 0.045 : 0.02, s === 14 ? 0.22 : 0.035, 0.03);
        }
        if (STABS[s]) brass(t, ch, STABS[s] * SIX);
      }
      if (cycle >= 2 && cycle % 2 === 0) {
        MELODY.forEach(function (m) { if (m[0] === bar && m[1] === s) lead(t, m[2], m[3] * SIX); });
      } else if (s === 0) lastLead = 0;
    }
    function tick() {
      while (nextT < ctx.currentTime + 0.15) { sched(step, nextT); nextT += SIX; step++; }
    }
    function ramp(to, sec) {
      if (hasFile) {
        clearInterval(fadeIv);
        var from = file.volume, t0 = performance.now();
        fadeIv = setInterval(function () {
          var k = Math.min(1, (performance.now() - t0) / (sec * 1000));
          file.volume = Math.max(0, Math.min(1, from + (to - from) * k));
          if (k >= 1) { clearInterval(fadeIv); if (to === 0) file.pause(); }
        }, 50);
        return;
      }
      var now = ctx.currentTime;
      master.gain.cancelScheduledValues(now);
      master.gain.setValueAtTime(master.gain.value, now);
      master.gain.linearRampToValueAtTime(to, now + sec);
    }
    function play() {
      clearTimeout(stopT);
      if (hasFile) { file.play().catch(function () {}); ramp(level, 2); return; }
      if (!ctx && !init()) return;
      ctx.resume();
      if (!timer) { nextT = ctx.currentTime + 0.1; step = 0; timer = setInterval(tick, 25); }
      ramp(level, 2.5);
    }
    function halt(sec) {
      if (hasFile) { ramp(0, sec); return; }
      if (!ctx) return;
      ramp(0, sec);
      clearTimeout(stopT);
      stopT = setTimeout(function () { clearInterval(timer); timer = null; ctx.suspend(); }, sec * 1000 + 100);
    }
    function render() {
      btn.classList.toggle('is-on', enabled);
      btn.setAttribute('aria-pressed', enabled ? 'true' : 'false');
      label.textContent = enabled ? (hasFile ? 'Now playing' : 'Now playing · Leonida Nights') : 'Sound off';
    }
    function toggle() {
      enabled = !enabled;
      if (enabled) play(); else halt(0.8);
      render();
    }
    btn.addEventListener('click', function (e) { e.stopPropagation(); toggle(); });
    render();

    return {
      toggle: toggle,
      // music belongs to the opening screen: fade out when the deck starts, come back with the title card
      leaveIntro: function () { if (enabled) halt(1.6); },
      enterIntro: function (lvl) { level = lvl || 0.7; if (enabled) play(); }
    };
  })();

  /* ============ intro collage: repeat the panels so the tilted grid fills the screen ============ */
  (function () {
    var grid = $('.collage__grid');
    var base = $$('.pc', grid);
    [1, 2].forEach(function (round) {
      base.forEach(function (pc, k) {
        var c = pc.cloneNode(true);
        c.style.setProperty('--i', base.length * round + ((k * 5) % base.length));
        grid.appendChild(c);
      });
    });
  })();

  /* ============ neon dust ============ */
  var dust = (function () {
    var cv = $('#dust');
    var ctx = cv.getContext('2d');
    var W = 0, H = 0, parts = [];
    var mouse = { x: -999, y: -999 };
    function spawn(anywhere) {
      return {
        x: Math.random() * W, y: anywhere ? Math.random() * H : H + 10,
        vx: (Math.random() - 0.5) * 0.15, vy: -(0.12 + Math.random() * 0.4),
        r: 0.4 + Math.random() * 1.6, a: 0.15 + Math.random() * 0.5,
        ph: Math.random() * Math.PI * 2,
        c: COLORS[Math.random() < 0.5 ? 0 : Math.floor(Math.random() * COLORS.length)]
      };
    }
    function resize() {
      W = window.innerWidth; H = window.innerHeight;
      cv.width = W * dpr; cv.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      var n = Math.round(Math.min(140, (W * H) / 14000));
      parts = [];
      for (var i = 0; i < n; i++) parts.push(spawn(true));
    }
    window.addEventListener('mousemove', function (e) { mouse.x = e.clientX; mouse.y = e.clientY; });
    window.addEventListener('resize', resize);
    resize();
    return function tick(t) {
      ctx.clearRect(0, 0, W, H);
      ctx.globalCompositeOperation = 'lighter';
      for (var i = 0; i < parts.length; i++) {
        var p = parts[i];
        var dx = p.x - mouse.x, dy = p.y - mouse.y, d2 = dx * dx + dy * dy;
        if (d2 < 14400) { var f = (1 - d2 / 14400) * 0.6; p.x += (dx / 120) * f; p.y += (dy / 120) * f; }
        p.x += p.vx + Math.sin(t * 0.0006 + p.ph) * 0.15;
        p.y += p.vy;
        if (p.y < -10) parts[i] = spawn(false);
        var tw = 0.6 + 0.4 * Math.sin(t * 0.003 + p.ph);
        ctx.fillStyle = 'rgba(' + p.c + ',' + p.a * tw + ')';
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
        if (p.r > 1.3) {
          ctx.fillStyle = 'rgba(' + p.c + ',' + 0.06 * tw + ')';
          ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 5, 0, Math.PI * 2); ctx.fill();
        }
      }
      ctx.globalCompositeOperation = 'source-over';
    };
  })();

  /* ============ Shopify · the checkout job ============ */
  var heist = (function () {
    var map = $('#map');
    var road = $('#road');
    var trail = $('#trail');
    var dark = $('#dark');
    var blip = $('#blip');
    var wpsEl = $('#wps');
    var banner = $('#banner');
    var bannerT = $('#bannerT');
    var bannerS = $('#bannerS');
    var countEl = $('#evCount');
    var pctEl = $('#covPct');
    var bar = $('#covBar');
    var seg = $('#heistSeg');
    var opts = $$('.seg__opt', seg);
    var thumb = $('.seg__thumb', seg);
    var LEN = road.getTotalLength();

    var ICON = {
      store: '<path d="M4 10v10h16V10M3 10l2-6h14l2 6M3 10h18M9 20v-6h6v6"/>',
      product: '<path d="M20 12l-8 8-9-9V3h8z"/><circle cx="7.5" cy="7.5" r="1.5"/>',
      cart: '<circle cx="9" cy="20" r="1.5"/><circle cx="18" cy="20" r="1.5"/><path d="M2 3h3l3 12h11l2-8H6.5"/>',
      lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
      shield: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M8.5 12l2.5 2.5 4.5-5"/>'
    };
    // u: fraction along the road; up: label above the pin
    var WPS = [
      { u: 0.0, name: 'Storefront', ic: 'store' },
      { u: 0.34, name: 'Product page', ic: 'product', up: true },
      { u: 0.66, name: 'Cart', ic: 'cart' },
      { u: 1.0, name: 'Secured checkout', ic: 'lock', vault: true, up: true }
    ];
    var EVENTS = 248, CART_U = WPS[2].u;

    WPS.forEach(function (w) {
      var pt = road.getPointAtLength(w.u * LEN);
      var el = document.createElement('div');
      el.className = 'wp' + (w.vault ? ' wp--vault' : '') + (w.up ? ' wp--up' : '');
      el.style.left = (pt.x / 600) * 100 + '%';
      el.style.top = (pt.y / 360) * 100 + '%';
      el.innerHTML = '<span class="wp__pin"><svg viewBox="0 0 24 24">' + ICON[w.ic] + '</svg></span>' +
        '<span class="wp__label">' + w.name + '</span><span class="wp__tag">REC</span>';
      wpsEl.appendChild(el);
      w.el = el; w.pin = $('svg', el); w.tag = $('.wp__tag', el);
    });

    var mode = 0, u = 0, phase = 'wait', phaseT = 0, last = 0, locked = false;

    function placeThumb() {
      var o = opts[mode];
      thumb.style.width = o.offsetWidth + 'px';
      thumb.style.transform = 'translateX(' + (o.offsetLeft - 4) + 'px)';
    }
    function reset() {
      u = 0; phase = 'wait'; phaseT = 0;
      banner.classList.remove('is-on', 'is-fail');
      map.classList.remove('is-dark');
      WPS.forEach(function (w) {
        w.el.classList.remove('is-rec', 'is-lost');
        if (w.vault) { w.pin.innerHTML = ICON.lock; w.tag.textContent = 'REC'; }
      });
      draw();
    }
    function setMode(m) {
      mode = m;
      opts.forEach(function (o, k) { o.classList.toggle('is-on', k === m); });
      seg.classList.toggle('is-on', m === 1);
      placeThumb();
      reset();
    }
    opts.forEach(function (o, k) { o.addEventListener('click', function () { setMode(k); }); });
    window.addEventListener('resize', placeThumb);

    function recordedU() { return mode === 1 ? u : Math.min(u, CART_U); }
    function draw() {
      var pt = road.getPointAtLength(u * LEN);
      blip.style.left = (pt.x / 600) * 100 + '%';
      blip.style.top = (pt.y / 360) * 100 + '%';
      var r = recordedU() * LEN;
      trail.style.strokeDasharray = r + ' ' + LEN;
      // the part of the route that went unrecorded (before Sprint 125)
      dark.style.strokeDasharray = '0 ' + CART_U * LEN + ' ' + Math.max(0, (u - CART_U) * LEN) + ' ' + LEN;
      var pct = Math.round(recordedU() * 100);
      pctEl.textContent = pct + '%';
      bar.style.width = pct + '%';
      bar.classList.toggle('is-fail', mode === 0 && u > CART_U);
      countEl.textContent = Math.round(recordedU() * EVENTS);
    }
    function finish() {
      phase = 'hold'; phaseT = 0;
      if (mode === 1) {
        bannerT.textContent = 'Mission passed';
        bannerS.textContent = 'Secured checkout recorded';
      } else {
        banner.classList.add('is-fail');
        bannerT.textContent = 'Mission failed';
        bannerS.textContent = 'Checkout went unrecorded';
      }
      banner.classList.add('is-on');
    }

    return {
      enter: function () { placeThumb(); setMode(0); last = 0; },
      leave: function () { reset(); },
      setMode: setMode,
      lock: function (on) { locked = on; },
      tick: function (t) {
        var dt = last ? Math.min(50, t - last) : 16; last = t;
        phaseT += dt;
        if (phase === 'wait') {
          if (phaseT > 700) { phase = 'drive'; phaseT = 0; }
        } else if (phase === 'drive') {
          u = Math.min(1, u + dt / 5200);
          WPS.forEach(function (w) {
            if (u < w.u || w.el.classList.contains('is-rec') || w.el.classList.contains('is-lost')) return;
            if (w.vault && mode === 0) { w.el.classList.add('is-lost'); w.tag.textContent = 'NO SIGNAL'; map.classList.add('is-dark'); }
            else {
              w.el.classList.add('is-rec');
              if (w.vault) { w.pin.innerHTML = ICON.shield; w.tag.textContent = 'REC · SECURED'; }
            }
          });
          draw();
          if (u >= 1) finish();
        } else if (phase === 'hold' && phaseT > 3000) {
          setMode(locked ? mode : mode ? 0 : 1);
        }
      }
    };
  })();

  /* ============ support tickets · the hit list ============ */
  var bounty = (function () {
    var board = $('#board');
    var banner = $('#bountyBanner');
    var countEl = $('#tkCount');
    var sla = $('.sla');
    var slaFill = $('#slaFill');
    var slaCut = $('#slaCut');
    var slaTag = $('#slaTag');
    var STAR = '<svg viewBox="0 0 24 24"><path d="M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3l-5.9 3.3 1.3-6.6-4.9-4.6 6.6-.8z"/></svg>';
    var AIM = '<svg viewBox="0 0 48 48"><circle cx="24" cy="24" r="15"/><circle cx="24" cy="24" r="3"/><path d="M24 2v12M24 34v12M2 24h12M34 24h12"/></svg>';
    var N = 10, SLA_END = 32; // bar shrinks to ~a third (illustrative)
    $('#wlStars').innerHTML = new Array(6).join(STAR);
    var stars = $$('#wlStars svg');
    var cards = [];
    for (var i = 0; i < N; i++) {
      var c = document.createElement('div');
      c.className = 'tk';
      c.innerHTML = '<span class="tk__id">TICKET ' + ('0' + (i + 1)).slice(-2) + '</span>' +
        '<i class="tk__bar"></i><i class="tk__bar"></i><i class="tk__bar"></i>' +
        '<span class="tk__st">OPEN</span><span class="tk__aim">' + AIM + '</span><span class="tk__stamp">ELIMINATED</span>';
      board.insertBefore(c, banner);
      cards.push(c);
    }
    var timers = [];
    function later(fn, ms) { timers.push(setTimeout(fn, ms)); }
    function clear() { timers.forEach(clearTimeout); timers = []; }
    function setStars(n) { stars.forEach(function (s, j) { s.classList.toggle('is-on', j < n); }); }
    function setSla(k) {
      var w = 100 - (100 - SLA_END) * (k / N);
      slaFill.style.width = w + '%';
      slaCut.style.left = w + '%';
    }
    function reset() {
      cards.forEach(function (c) { c.classList.remove('is-down', 'is-aim'); });
      countEl.textContent = '0';
      banner.classList.remove('is-on');
      sla.classList.remove('is-going');
      slaTag.classList.remove('is-cut'); slaTag.textContent = 'SLA';
      setStars(5); setSla(0);
    }
    function run() {
      reset();
      // take them down in a random order each run
      var order = cards.slice().sort(function () { return Math.random() - 0.5; });
      var t0 = 900, gap = 520;
      order.forEach(function (c, k) {
        later(function () { c.classList.add('is-aim'); }, t0 + k * gap - 240);
        later(function () {
          c.classList.remove('is-aim'); c.classList.add('is-down');
          countEl.textContent = k + 1;
          sla.classList.add('is-going'); setSla(k + 1);
          var n = 5 - Math.floor((k + 1) / 2);
          setStars(n);
          if (stars[n]) { stars[n].classList.remove('is-blink'); void stars[n].offsetWidth; stars[n].classList.add('is-blink'); }
        }, t0 + k * gap);
      });
      var end = t0 + N * gap + 300;
      later(function () { slaTag.classList.add('is-cut'); slaTag.textContent = 'SLA CUT'; banner.classList.add('is-on'); }, end);
      later(run, end + 3800);
    }
    return {
      enter: function () { clear(); run(); },
      leave: function () { clear(); reset(); }
    };
  })();

  /* ============ live demo cutaway ============ */
  var live = (function () {
    var msg = $('#liveMsg');
    var LINES = ['Switching to live feed…', 'Loading the Leonida storefront…', 'Arming the recorder…', 'Over to the live demo'];
    var iv = null;
    return {
      enter: function () {
        var i = 0; msg.textContent = LINES[0];
        clearInterval(iv);
        iv = setInterval(function () { i = Math.min(LINES.length - 1, i + 1); msg.textContent = LINES[i]; if (i === LINES.length - 1) clearInterval(iv); }, 1600);
      },
      leave: function () { clearInterval(iv); }
    };
  })();

  /* ============ particle Q&A finale ============ */
  var finale = (function () {
    var host = $('#finale');
    var cv = $('#finaleCanvas');
    var ctx = cv.getContext('2d');
    var shock = $('#shock');
    var W = 0, H = 0, parts = [], pull = 0, formed = false, last = 0, enterT = 0;
    var mouse = { x: -999, y: -999 };

    function targets() {
      var off = document.createElement('canvas');
      off.width = W; off.height = H;
      var o = off.getContext('2d');
      var fs = Math.min(W * 0.36, H * 0.5);
      o.fillStyle = '#fff'; o.textAlign = 'center'; o.textBaseline = 'middle';
      o.font = '900 ' + fs + 'px "Inter Tight", Inter, Helvetica, Arial, sans-serif';
      o.fillText('Q&A', W / 2, H * 0.47);
      var data = o.getImageData(0, 0, W, H).data;
      var gap = Math.max(3, Math.round(fs / 64));
      var pts = [];
      for (var y = 0; y < H; y += gap) for (var x = 0; x < W; x += gap) if (data[(y * W + x) * 4 + 3] > 128) pts.push([x, y]);
      return { pts: pts, top: H * 0.47 - fs * 0.42, h: fs * 0.84, gap: gap };
    }
    // GTA VI dusk ramp: peach top → pink → magenta → purple bottom
    var STOPS = [[255, 194, 122], [255, 143, 90], [255, 79, 139], [176, 58, 168], [138, 79, 255]];
    function ramp(r) {
      r = Math.max(0, Math.min(0.999, r)) * (STOPS.length - 1);
      var i = Math.floor(r), f = r - i, a = STOPS[i], b = STOPS[i + 1];
      return 'rgb(' + (a[0] + (b[0] - a[0]) * f | 0) + ',' + (a[1] + (b[1] - a[1]) * f | 0) + ',' + (a[2] + (b[2] - a[2]) * f | 0) + ')';
    }
    function build() {
      W = host.clientWidth; H = host.clientHeight;
      cv.width = W * dpr; cv.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      var tg = targets();
      parts = tg.pts.map(function (p) {
        var teal = Math.random() < 0.08;
        var a = Math.random() * Math.PI * 2, r = Math.max(W, H) * (0.6 + Math.random() * 0.6);
        return {
          tx: p[0], ty: p[1], x: W / 2 + Math.cos(a) * r, y: H / 2 + Math.sin(a) * r, vx: 0, vy: 0,
          s: tg.gap * (teal ? 0.6 : 0.5),
          c: teal ? 'rgb(34,211,214)' : ramp((p[1] - tg.top) / tg.h),
          ph: Math.random() * Math.PI * 2
        };
      });
    }
    function snap() {
      formed = false; pull = -0.6;
      parts.forEach(function (p) {
        var dx = p.x - W / 2, dy = p.y - H / 2, d = Math.sqrt(dx * dx + dy * dy) || 1, f = 10 + Math.random() * 22;
        p.vx = (dx / d) * f + (Math.random() - 0.5) * 8;
        p.vy = (dy / d) * f + (Math.random() - 0.5) * 8;
      });
    }
    function boom() {
      shock.classList.remove('is-on'); void shock.offsetWidth; shock.classList.add('is-on');
      host.classList.remove('is-flash'); void host.offsetWidth; host.classList.add('is-flash');
    }
    host.addEventListener('pointermove', function (e) { var r = host.getBoundingClientRect(); mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top; });
    host.addEventListener('pointerleave', function () { mouse.x = mouse.y = -999; });
    host.addEventListener('click', snap);
    window.addEventListener('resize', function () { if (W) build(); });

    return {
      snap: snap,
      enter: function () {
        var go = function () { build(); pull = 0; formed = false; last = 0; enterT = 0; };
        if (document.fonts && document.fonts.load) document.fonts.load('900 100px "Inter Tight"').then(go, go); else go();
      },
      tick: function (t) {
        var dt = last ? Math.min(50, t - last) : 16; last = t;
        enterT += dt;
        if (enterT < 500) { ctx.clearRect(0, 0, W, H); return; }
        pull = Math.min(1, pull + dt * 0.0007);
        var k = 0.012 * Math.max(0, pull);
        var sweep = ((t * 0.00035) % 1.6 - 0.3) * W;
        var err = 0;
        ctx.clearRect(0, 0, W, H);
        ctx.globalCompositeOperation = 'lighter';
        for (var i = 0; i < parts.length; i++) {
          var p = parts[i];
          var dx = p.x - mouse.x, dy = p.y - mouse.y, d2 = dx * dx + dy * dy;
          if (d2 < 8100) { var f = (1 - d2 / 8100) * 3.2, d = Math.sqrt(d2) || 1; p.vx += (dx / d) * f; p.vy += (dy / d) * f; }
          p.vx += (p.tx - p.x) * k; p.vy += (p.ty - p.y) * k;
          p.vx *= 0.88; p.vy *= 0.88;
          p.x += p.vx; p.y += p.vy;
          err += Math.abs(p.tx - p.x) + Math.abs(p.ty - p.y);
          var glow = Math.max(0, 1 - Math.abs(p.x - sweep) / 90);
          ctx.globalAlpha = Math.min(1, 0.8 + glow * 0.2 + 0.12 * Math.sin(t * 0.004 + p.ph));
          ctx.fillStyle = glow > 0.4 ? '#fff4e0' : p.c;
          ctx.fillRect(p.x, p.y, p.s, p.s);
        }
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = 'source-over';
        if (!formed && pull >= 0.5 && err / (parts.length || 1) < 3) { formed = true; boom(); }
      }
    };
  })();

  /* ============ deck ============ */
  // add a slide: give its <section> data-hook="name" and register the hook here
  var HOOKS = { heist: heist, live: live, bounty: bounty, finale: finale };
  var slides = $$('.slide');
  var hooks = slides.map(function (s) { return HOOKS[s.getAttribute('data-hook')] || {}; });
  var slideIndex = function (hook) { return slides.findIndex(function (s) { return s.getAttribute('data-hook') === hook; }); };
  $('#total').textContent = ('0' + slides.length).slice(-2);
  var dotsEl = $('#dots');
  var idx = -1, live_ = false;

  slides.forEach(function (s, i) {
    var b = document.createElement('button');
    b.className = 'dotbtn';
    b.setAttribute('data-n', '0' + (i + 1));
    b.innerHTML = '<span>' + s.getAttribute('data-title') + '</span>';
    b.addEventListener('click', function () { go(i); });
    dotsEl.appendChild(b);
  });
  var dots = $$('.dotbtn', dotsEl);

  // wanted-level stars light up as the deck progresses
  var STAR = '<svg viewBox="0 0 24 24"><path d="M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3l-5.9 3.3 1.3-6.6-4.9-4.6 6.6-.8z"/></svg>';
  var wanted = $('#wanted');
  wanted.innerHTML = new Array(6).join(STAR);
  var stars = $$('svg', wanted);
  function setStars(i) {
    var n = Math.round(((i + 1) / slides.length) * stars.length);
    stars.forEach(function (s, k) { s.classList.toggle('is-on', k < n); });
  }

  function go(i) {
    i = Math.max(0, Math.min(slides.length - 1, i));
    if (i === idx) return;
    var dir = i > idx ? 1 : -1;
    var prev = slides[idx];
    if (prev) {
      if (hooks[idx].leave) hooks[idx].leave();
      prev.classList.remove('is-active');
      prev.classList.add(dir > 0 ? 'is-leaving-left' : 'is-leaving-right');
      setTimeout(function () { prev.classList.remove('is-leaving-left', 'is-leaving-right'); }, 1100);
      var w = $('#wipe');
      w.className = 'wipe'; void w.offsetWidth;
      w.classList.add(dir > 0 ? 'go-right' : 'go-left');
    }
    idx = i;
    slides[i].classList.add('is-active');
    dots.forEach(function (d, k) { d.classList.toggle('is-on', k === i); });
    $('#cur').textContent = ('0' + (i + 1)).slice(-2);
    $('#progress').style.width = ((i + 1) / slides.length) * 100 + '%';
    setStars(i);
    if (history.replaceState) history.replaceState(null, '', '#' + (i + 1));
    requestAnimationFrame(function () { if (hooks[i].enter) hooks[i].enter(); });
  }

  function start(target) {
    if (live_) return;
    live_ = true;
    $('#intro').classList.add('is-out');
    document.body.classList.add('is-live');
    music.leaveIntro();
    var h = parseInt((location.hash || '').slice(1), 10);
    if (typeof target !== 'number') target = h >= 1 && h <= slides.length ? h - 1 : 0;
    setTimeout(function () { go(target); }, 350);
  }

  function showIntro() {
    if (idx > -1) {
      if (hooks[idx].leave) hooks[idx].leave();
      slides[idx].classList.remove('is-active');
      dots.forEach(function (d) { d.classList.remove('is-on'); });
      idx = -1;
    }
    live_ = false;
    document.body.classList.remove('is-live');
    var intro = $('#intro');
    intro.classList.remove('is-out');
    music.enterIntro(tour.active() ? 0.3 : 0.7); // duck under Claudine's narration
    if (intro.getAnimations) intro.getAnimations({ subtree: true }).forEach(function (a) { a.cancel(); a.play(); });
  }

  $('#intro').addEventListener('click', function (e) {
    if (tour.active() || e.target.closest('#tourIntroBtn')) return;
    start();
  });
  $('#prev').addEventListener('click', function () { go(idx - 1); });
  $('#next').addEventListener('click', function () { go(idx + 1); });

  document.addEventListener('keydown', function (e) {
    if (e.target.tagName === 'SELECT') return;
    if (tour.active()) {
      if (e.key === 'Escape') { tour.stop(); return; }
      if (e.key === ' ') { e.preventDefault(); tour.togglePause(); return; }
      if (/^Arrow|^Page|^Home$|^End$/.test(e.key)) tour.stop();
      else if (e.key !== 'f' && e.key !== 'F') return;
    } else if (e.key === 't' || e.key === 'T') { tour.play(); return; }
    if (e.key === 'm' || e.key === 'M') { music.toggle(); return; }
    if (e.key === 'f' || e.key === 'F') {
      if (!document.fullscreenElement) document.documentElement.requestFullscreen && document.documentElement.requestFullscreen();
      else document.exitFullscreen && document.exitFullscreen();
      return;
    }
    if (!live_) {
      if (['Enter', ' ', 'ArrowRight', 'PageDown'].indexOf(e.key) > -1) { e.preventDefault(); start(); }
      return;
    }
    if (['ArrowRight', 'ArrowDown', 'PageDown', ' ', 'Enter'].indexOf(e.key) > -1) { e.preventDefault(); go(idx + 1); }
    else if (['ArrowLeft', 'ArrowUp', 'PageUp', 'Backspace'].indexOf(e.key) > -1) { e.preventDefault(); go(idx - 1); }
    else if (e.key === 'Home') go(0);
    else if (e.key === 'End') go(slides.length - 1);
    else if (/^[1-9]$/.test(e.key)) go(+e.key - 1);
  });

  var tx = null;
  window.addEventListener('touchstart', function (e) { tx = e.touches[0].clientX; }, { passive: true });
  window.addEventListener('touchend', function (e) {
    if (tx === null) return;
    var dx = e.changedTouches[0].clientX - tx; tx = null;
    if (!live_) { start(); return; }
    if (Math.abs(dx) > 50) go(idx + (dx < 0 ? 1 : -1));
  });

  /* ============ narrated tour · Claudine ============ */
  var tour = (function () {
    var synth = window.speechSynthesis;
    var cap = $('#tourCap');
    var stepEl = $('#tourStep');
    var sel = $('#tourVoice');
    var pauseBtn = $('#tourPause');
    var VOICE_KEY = 'sprint125.claudineVoice';
    var S = { shop: slideIndex('heist'), live: slideIndex('live'), tickets: slideIndex('bounty'), end: slideIndex('finale') };

    // s: slide index (-1 = title card), focus: selector inside that slide, act: demo cue
    var STEPS = [
      { s: -1, pre: 600, say: "Hi, I'm Claudine. Welcome to the Sprint 125 demo." },
      { s: -1, say: 'Glassbox R&D presents, a Transformers Squad production.' },
      { s: -1, say: 'Sprint 125. The Leonida edition.' },
      { s: -1, say: "One big score this sprint. Let's start the mission." },
      { s: S.shop, focus: '.headline', say: 'Mission one. Shopify. Every store, even the vault.' },
      { s: S.shop, focus: '.panel--heist', act: function () { heist.lock(true); heist.setMode(0); },
        say: 'Until now, a Shopify shopper could walk all the way to checkout, and the recording went dark right where the money changes hands.' },
      { s: S.shop, focus: '.panel--heist', act: function () { heist.setMode(1); },
        say: 'This sprint, Glassbox fully supports recording Shopify stores, including the secured checkout page.' },
      { s: S.shop, focus: '.chips', say: 'Storefront, product, cart and checkout. The whole journey, captured end to end. Mission passed.' },
      { s: S.shop, focus: '.heroes', say: 'Pulled off by Bartek.' },
      { s: S.live, focus: '.live__title', say: "And now, the checkout job. Live, on a real Shopify store. Over to the crew." },
      { s: S.tickets, focus: '.headline', say: 'Mission two. Support. Ten targets, ten eliminated.' },
      { s: S.tickets, focus: '.panel--bounty', say: 'The crew went after the support queue and closed ten tickets this sprint.' },
      { s: S.tickets, focus: '.sla', say: 'And our SLAs? Aggressively cut. Wanted level, cleared.' },
      { s: S.tickets, focus: '.heroes', say: 'Taken down by Adiram, Naor and Michael.' },
      { s: S.end, pre: 2400, say: "That's a wrap on Sprint 125." },
      { s: S.end, act: function () { finale.snap(); }, say: 'Mission passed. Questions?' }
    ];

    var running = false, paused = false, token = 0, voice = null, voices = [], focused = null;
    var pad = function (n) { return ('0' + n).slice(-2); };

    var FEMALE = /female|woman|samantha|ava|allison|susan|zoe|karen|moira|serena|tessa|victoria|fiona|kate|nicky|joelle|aria|jenny|sonia|libby|natasha|michelle|emma|ana\b|clara|hazel|zira|catherine|veena|kathy|vicki/i;
    var MALE = /\bmale\b|daniel|alex\b|fred|tom\b|evan|nathan|aaron|arthur|oliver|rishi|guy\b|ryan|christopher|eric\b|david|mark\b|george|james|thomas|reed|rocko|ralph|albert|junior|gordon|lee\b/i;
    var NOVELTY = /bad news|good news|bells|bubbles|cellos|jester|organ|superstar|trinoids|whisper|wobble|zarvox|boing|bahh|deranged|hysterical|grandma|grandpa|eddy|flo\b|reed|rocko|sandy|shelley/i;
    function score(v) {
      var n = v.name, s = 0;
      if (/premium|enhanced|natural|neural/i.test(n)) s += 6;
      if (/google uk english female|google us english/i.test(n)) s += 4;
      if (FEMALE.test(n)) s += 5;
      if (/^en[-_]US/i.test(v.lang)) s += 1;
      return s;
    }
    function loadVoices() {
      if (!synth) return Promise.resolve([]);
      return new Promise(function (res) {
        var v = synth.getVoices();
        if (v.length) return res(v);
        var done = false;
        var finish = function () { if (!done) { done = true; res(synth.getVoices()); } };
        synth.addEventListener('voiceschanged', finish);
        setTimeout(finish, 1500);
      });
    }
    var voicesReady = loadVoices().then(function (all) {
      voices = all
        .filter(function (v) { return /^en/i.test(v.lang) && !NOVELTY.test(v.name) && (!MALE.test(v.name) || /female/i.test(v.name)); })
        .sort(function (a, b) { return score(b) - score(a); });
      sel.innerHTML = '';
      if (!voices.length) { sel.innerHTML = '<option>Captions only</option>'; sel.disabled = true; return; }
      voices.forEach(function (v, i) {
        var o = document.createElement('option');
        o.value = i;
        o.textContent = 'Claudine · ' + v.name.replace(/^(Microsoft|Google)\s+/, '').replace(/\s*\(.*\)$/, '');
        sel.appendChild(o);
      });
      var saved = null;
      try { saved = localStorage.getItem(VOICE_KEY); } catch (e) {}
      var i = voices.findIndex(function (v) { return v.name === saved; });
      sel.value = i > -1 ? i : 0;
      voice = voices[+sel.value];
    });
    sel.addEventListener('change', function () {
      voice = voices[+sel.value];
      try { localStorage.setItem(VOICE_KEY, voice.name); } catch (e) {}
    });

    function wait(ms, tk) {
      return new Promise(function (res) {
        var t = 0;
        var iv = setInterval(function () {
          if (tk !== token) { clearInterval(iv); return res(); }
          if (!paused) t += 50;
          if (t >= ms) { clearInterval(iv); res(); }
        }, 50);
      });
    }
    function render(text) {
      cap.innerHTML = '';
      cap.classList.remove('is-in'); void cap.offsetWidth; cap.classList.add('is-in');
      var words = [], re = /\S+/g, m;
      while ((m = re.exec(text))) {
        var el = document.createElement('span');
        el.className = 'w'; el.textContent = m[0];
        cap.appendChild(el);
        words.push({ el: el, start: m.index, len: m[0].length });
      }
      return words;
    }
    function highlight(words, k) {
      for (var i = 0; i < words.length; i++) {
        words[i].el.classList.toggle('is-past', i < k);
        words[i].el.classList.toggle('is-now', i === k);
      }
    }
    function speak(text, tk) {
      var words = render(text);
      var total = words.reduce(function (a, w) { return a + w.len + 2; }, 0);
      var est = text.length * 68 + 400;
      return new Promise(function (res) {
        var done = false, gotBoundary = false, activeMs = 0, fbMs = 0;
        var limit = synth && voice ? est * 2 + 3000 : est;
        function finish() { if (done) return; done = true; clearInterval(iv); highlight(words, words.length); res(); }
        var iv = setInterval(function () {
          if (tk !== token) return finish();
          if (paused) return;
          activeMs += 50;
          if (activeMs > limit) return finish();
          if (!gotBoundary && activeMs > 600) {
            fbMs += 50;
            var target = (fbMs / est) * total, acc = 0, k = 0;
            while (k < words.length - 1 && acc + words[k].len + 2 < target) { acc += words[k].len + 2; k++; }
            highlight(words, k);
          }
        }, 50);
        highlight(words, 0);
        if (!synth || !voice) return;
        var u = new SpeechSynthesisUtterance(text);
        u.voice = voice; u.lang = voice.lang; u.rate = 1; u.pitch = 1.05;
        u.onboundary = function (e) {
          if (e.name && e.name !== 'word') return;
          gotBoundary = true;
          var k = 0;
          while (k < words.length - 1 && words[k + 1].start <= e.charIndex) k++;
          highlight(words, k);
        };
        u.onend = finish; u.onerror = finish;
        synth.speak(u);
      });
    }
    function setFocus(step) {
      if (focused) focused.classList.remove('tour-focus');
      focused = null;
      if (!step.focus || step.s < 0) return;
      focused = slides[step.s].querySelector(step.focus);
      if (focused) focused.classList.add('tour-focus');
    }
    function cleanup() {
      running = false; paused = false;
      if (synth) synth.cancel();
      if (focused) focused.classList.remove('tour-focus');
      focused = null;
      heist.lock(false);
      pauseBtn.textContent = 'Pause';
      document.body.classList.remove('is-touring');
    }
    function play() {
      if (running) return;
      running = true; paused = false;
      var tk = ++token;
      if (synth) synth.cancel();
      document.body.classList.add('is-touring');
      cap.innerHTML = '';
      showIntro();
      voicesReady.then(function () {
        var i = 0;
        function next() {
          if (tk !== token) return;
          if (i >= STEPS.length) return wait(2500, tk).then(function () { if (tk === token) cleanup(); });
          var st = STEPS[i++];
          stepEl.textContent = pad(i) + ' / ' + pad(STEPS.length);
          var p = Promise.resolve();
          if (st.s > -1 && st.s !== idx) {
            if (!live_) start(st.s); else go(st.s);
            if (focused) { focused.classList.remove('tour-focus'); focused = null; }
            p = wait(1300, tk);
          }
          return p
            .then(function () { return wait(st.pre || 0, tk); })
            .then(function () {
              if (tk !== token) return;
              setFocus(st);
              if (st.act) st.act();
              return speak(st.say, tk);
            })
            .then(function () { return wait(st.post || 380, tk); })
            .then(next);
        }
        next();
      });
    }
    function stop() { token++; cleanup(); }
    function togglePause() {
      if (!running) return;
      paused = !paused;
      if (synth) paused ? synth.pause() : synth.resume();
      pauseBtn.textContent = paused ? 'Resume' : 'Pause';
    }
    $('#tourBtn').addEventListener('click', play);
    $('#tourIntroBtn').addEventListener('click', function (e) { e.stopPropagation(); play(); });
    $('#tourStop').addEventListener('click', stop);
    pauseBtn.addEventListener('click', togglePause);
    return { play: play, stop: stop, togglePause: togglePause, active: function () { return running; } };
  })();

  $('#startBtn').addEventListener('click', function (e) { e.stopPropagation(); if (!tour.active()) start(); });

  /* parallax + spotlight */
  var mx = 0, my = 0, px = 0, py = 0;
  window.addEventListener('mousemove', function (e) {
    mx = e.clientX / window.innerWidth - 0.5;
    my = e.clientY / window.innerHeight - 0.5;
    document.body.style.setProperty('--mx', e.clientX + 'px');
    document.body.style.setProperty('--my', e.clientY + 'px');
  });

  function loop(t) {
    dust(t);
    if (idx > -1) {
      var h = hooks[idx];
      if (h.tick) h.tick(t);
      px += (mx - px) * 0.06; py += (my - py) * 0.06;
      var v = slides[idx].querySelector('.visual > *');
      if (v && !reduced) v.style.transform = 'perspective(1200px) rotateY(' + (px * 6).toFixed(2) + 'deg) rotateX(' + (-py * 5).toFixed(2) + 'deg) translate3d(' + (px * -10).toFixed(1) + 'px,' + (py * -8).toFixed(1) + 'px,0)';
    }
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
})();
