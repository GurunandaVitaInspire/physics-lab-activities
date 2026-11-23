// Procedural canvas textures — no external image assets, so the lab works offline.
import * as THREE from 'three';

const cache = new Map();

export function canvasTexture(w, h, draw, { key, repeat, srgb = true, aniso = 8 } = {}) {
  if (key && cache.has(key)) return cache.get(key);
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d');
  draw(g, w, h);
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = aniso;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat[0], repeat[1]); }
  if (key) cache.set(key, t);
  return t;
}

function rand(seed) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

export function woodTexture({ base = '#7a4a26', dark = '#4e2c14', key = 'wood', repeat } = {}) {
  return canvasTexture(1024, 1024, (g, w, h) => {
    const r = rand(7);
    g.fillStyle = base; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 220; i++) {
      const y = r() * h;
      g.strokeStyle = `rgba(${40 + r() * 30},${20 + r() * 15},${8},${0.08 + r() * 0.18})`;
      g.lineWidth = 1 + r() * 4;
      g.beginPath();
      g.moveTo(0, y);
      for (let x = 0; x <= w; x += 32) g.lineTo(x, y + Math.sin(x * 0.006 + i) * 6 + (r() - 0.5) * 3);
      g.stroke();
    }
    const grd = g.createLinearGradient(0, 0, w, 0);
    grd.addColorStop(0, 'rgba(0,0,0,0.06)'); grd.addColorStop(0.5, 'rgba(255,255,255,0.03)'); grd.addColorStop(1, 'rgba(0,0,0,0.08)');
    g.fillStyle = grd; g.fillRect(0, 0, w, h);
    g.fillStyle = dark; g.globalAlpha = 0.25;
    for (let i = 0; i < 6; i++) { g.beginPath(); g.ellipse(r() * w, r() * h, 10 + r() * 20, 4 + r() * 6, 0, 0, Math.PI * 2); g.fill(); }
    g.globalAlpha = 1;
  }, { key, repeat });
}

export function epoxyTexture() {
  // Black chemical-resistant bench top with faint speckle and wear.
  return canvasTexture(1024, 1024, (g, w, h) => {
    const r = rand(11);
    g.fillStyle = '#1b1d20'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 9000; i++) {
      const v = 20 + r() * 30;
      g.fillStyle = `rgba(${v},${v + 2},${v + 5},${r() * 0.5})`;
      g.fillRect(r() * w, r() * h, 1.5, 1.5);
    }
    for (let i = 0; i < 40; i++) {
      g.strokeStyle = `rgba(255,255,255,${0.015 + r() * 0.02})`;
      g.lineWidth = 0.6;
      g.beginPath(); const x = r() * w, y = r() * h; g.moveTo(x, y); g.lineTo(x + (r() - 0.5) * 120, y + (r() - 0.5) * 30); g.stroke();
    }
  }, { key: 'epoxy', repeat: [2, 1] });
}

export function epoxyRoughness() {
  return canvasTexture(512, 512, (g, w, h) => {
    const r = rand(3);
    g.fillStyle = '#7a7a7a'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 260; i++) {
      const rr = 10 + r() * 60;
      const grd = g.createRadialGradient(0, 0, 0, 0, 0, rr);
      const v = Math.floor(90 + r() * 80);
      grd.addColorStop(0, `rgba(${v},${v},${v},0.35)`); grd.addColorStop(1, `rgba(${v},${v},${v},0)`);
      g.save(); g.translate(r() * w, r() * h); g.fillStyle = grd; g.fillRect(-rr, -rr, rr * 2, rr * 2); g.restore();
    }
  }, { key: 'epoxyR', repeat: [2, 1], srgb: false });
}

export function tileTexture({ color = '#e9ecef', grout = '#c3c8ce', cols = 8, rows = 8, key = 'tiles', repeat = [6, 3] } = {}) {
  return canvasTexture(1024, 1024, (g, w, h) => {
    const r = rand(5);
    g.fillStyle = grout; g.fillRect(0, 0, w, h);
    const tw = w / cols, th = h / rows;
    for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
      const v = (r() - 0.5) * 10;
      g.fillStyle = shade(color, v);
      g.fillRect(x * tw + 3, y * th + 3, tw - 6, th - 6);
      const grd = g.createLinearGradient(x * tw, y * th, x * tw + tw, y * th + th);
      grd.addColorStop(0, 'rgba(255,255,255,0.18)'); grd.addColorStop(1, 'rgba(0,0,0,0.05)');
      g.fillStyle = grd; g.fillRect(x * tw + 3, y * th + 3, tw - 6, th - 6);
    }
  }, { key, repeat });
}

export function floorTexture() {
  return canvasTexture(1024, 1024, (g, w, h) => {
    const r = rand(9);
    const n = 4, s = w / n;
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      const v = (r() - 0.5) * 14;
      g.fillStyle = shade('#9aa1a8', v); g.fillRect(x * s, y * s, s, s);
      for (let i = 0; i < 500; i++) { g.fillStyle = `rgba(255,255,255,${r() * 0.12})`; g.fillRect(x * s + r() * s, y * s + r() * s, 2, 2); }
      g.strokeStyle = 'rgba(40,40,40,0.35)'; g.lineWidth = 3; g.strokeRect(x * s, y * s, s, s);
    }
  }, { key: 'floor', repeat: [8, 8] });
}

export function shade(hex, amt) {
  const c = new THREE.Color(hex);
  const hsl = {}; c.getHSL(hsl);
  c.setHSL(hsl.h, hsl.s, Math.min(1, Math.max(0, hsl.l + amt / 255)));
  return '#' + c.getHexString();
}

/** Bottle / reagent label. */
export function labelTexture({ title, formula = '', sub = '', color = '#b91c1c', w = 512, h = 320, hazard = false } = {}) {
  return canvasTexture(w, h, (g) => {
    g.fillStyle = '#f7f3e8'; g.fillRect(0, 0, w, h);
    // paper fibres
    const r = rand(title.length * 13);
    for (let i = 0; i < 1500; i++) { g.fillStyle = `rgba(120,100,60,${r() * 0.05})`; g.fillRect(r() * w, r() * h, 2, 1); }
    g.fillStyle = color; g.fillRect(0, 0, w, h * 0.2);
    g.fillStyle = '#fff'; g.font = `700 ${h * 0.11}px "Segoe UI", Arial`; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText('LAB REAGENT', w / 2, h * 0.1);
    g.fillStyle = '#111'; g.font = `800 ${h * 0.2}px "Segoe UI", Arial`;
    g.fillText(formula || title, w / 2, h * 0.43);
    g.font = `600 ${h * 0.1}px "Segoe UI", Arial`; g.fillStyle = '#333';
    g.fillText(formula ? title : sub, w / 2, h * 0.65);
    if (formula && sub) { g.font = `500 ${h * 0.08}px "Segoe UI", Arial`; g.fillStyle = '#555'; g.fillText(sub, w / 2, h * 0.8); }
    if (hazard) {
      g.save(); g.translate(w * 0.88, h * 0.82); g.rotate(Math.PI / 4);
      g.fillStyle = '#f59e0b'; g.fillRect(-h * 0.07, -h * 0.07, h * 0.14, h * 0.14);
      g.strokeStyle = '#111'; g.lineWidth = 3; g.strokeRect(-h * 0.07, -h * 0.07, h * 0.14, h * 0.14);
      g.restore(); g.fillStyle = '#111'; g.font = `900 ${h * 0.1}px Arial`; g.fillText('!', w * 0.88, h * 0.83);
    }
    g.strokeStyle = 'rgba(0,0,0,0.25)'; g.lineWidth = 4; g.strokeRect(2, 2, w - 4, h - 4);
  });
}

/** Graduation marks for beakers/cylinders. Transparent background. */
export function graduationTexture({ marks = 10, labelEvery = 2, max = 100, unit = 'mL', w = 256, h = 1024, color = '#ffffff' } = {}) {
  return canvasTexture(w, h, (g) => {
    g.clearRect(0, 0, w, h);
    g.strokeStyle = color; g.fillStyle = color; g.lineWidth = 4;
    g.font = '600 46px "Segoe UI", Arial'; g.textBaseline = 'middle';
    for (let i = 1; i <= marks; i++) {
      const y = h - (i / marks) * h * 0.92 - h * 0.04;
      const long = i % labelEvery === 0;
      g.beginPath(); g.moveTo(10, y); g.lineTo(long ? 110 : 64, y); g.stroke();
      if (long) g.fillText(String(Math.round((i / marks) * max)), 120, y);
    }
    g.font = '600 40px "Segoe UI", Arial'; g.fillText(unit, 120, h * 0.02 + 20);
  }, { srgb: true });
}

/** Metre scale strip in cm. */
export function rulerTexture({ cm = 100, w = 4096, h = 160, bg = '#f4e6c3', fromRight = false } = {}) {
  return canvasTexture(w, h, (g) => {
    g.fillStyle = bg; g.fillRect(0, 0, w, h);
    const r = rand(2);
    for (let i = 0; i < 3000; i++) { g.fillStyle = `rgba(120,80,30,${r() * 0.06})`; g.fillRect(r() * w, r() * h, 6, 1); }
    g.strokeStyle = '#1a1a1a'; g.fillStyle = '#1a1a1a';
    const px = w / cm;
    for (let i = 0; i <= cm * 10; i++) {
      const x = (i / 10) * px;
      const len = i % 10 === 0 ? h * 0.42 : i % 5 === 0 ? h * 0.28 : h * 0.16;
      g.lineWidth = i % 10 === 0 ? 3 : 1.5;
      g.beginPath(); g.moveTo(x, 0); g.lineTo(x, len); g.stroke();
      if (i % 10 === 0 && i > 0 && i < cm * 10) {
        g.font = `700 ${h * 0.3}px "Segoe UI", Arial`; g.textAlign = 'center';
        g.fillText(String(fromRight ? cm - i / 10 : i / 10), x, h * 0.66);
      }
    }
  }, { aniso: 16 });
}

/** Analog meter dial face (ammeter/voltmeter/galvanometer). */
export function meterFaceTexture({ letter = 'A', max = 1, divisions = 10, centerZero = false, unitLabel = '' } = {}) {
  return canvasTexture(512, 512, (g, w, h) => {
    g.fillStyle = '#f8f6ef'; g.fillRect(0, 0, w, h);
    const cx = w / 2, cy = h * 0.78, R = w * 0.4;
    const a0 = Math.PI * 1.2, a1 = Math.PI * 1.8;
    g.strokeStyle = '#111'; g.lineWidth = 3;
    g.beginPath(); g.arc(cx, cy, R, a0, a1); g.stroke();
    const n = divisions * 5;
    for (let i = 0; i <= n; i++) {
      const a = a0 + (a1 - a0) * (i / n);
      const major = i % 5 === 0;
      const r2 = R - (major ? 30 : 16);
      g.lineWidth = major ? 3 : 1.5;
      g.beginPath(); g.moveTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R); g.lineTo(cx + Math.cos(a) * r2, cy + Math.sin(a) * r2); g.stroke();
      if (major) {
        const v = centerZero ? (-max + (2 * max * i) / n) : (max * i) / n;
        g.font = '600 26px "Segoe UI", Arial'; g.fillStyle = '#111'; g.textAlign = 'center'; g.textBaseline = 'middle';
        const lab = Math.abs(v) < 1e-9 ? '0' : (Number.isInteger(v) ? String(v) : v.toFixed(1));
        g.fillText(lab, cx + Math.cos(a) * (R - 52), cy + Math.sin(a) * (R - 52));
      }
    }
    g.fillStyle = '#b91c1c'; g.font = '800 72px "Segoe UI", Arial'; g.textAlign = 'center';
    g.fillText(letter, cx, cy - R * 0.38);
    if (unitLabel) { g.fillStyle = '#333'; g.font = '600 22px "Segoe UI", Arial'; g.fillText(unitLabel, cx, cy - R * 0.12); }
    // mirror strip
    g.fillStyle = 'rgba(160,170,180,0.6)'; g.beginPath(); g.arc(cx, cy, R - 70, a0, a1); g.arc(cx, cy, R - 80, a1, a0, true); g.fill();
  });
}

/** Paper with optional grid, used as a drawing sheet. Returns { texture, canvas, ctx } so it can be drawn on live. */
export function liveSheet({ w = 2048, h = 1448, grid = false, bg = '#fbfbf7' } = {}) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d');
  const clear = () => {
    g.fillStyle = bg; g.fillRect(0, 0, w, h);
    if (grid) {
      g.strokeStyle = 'rgba(80,140,200,0.18)'; g.lineWidth = 1;
      for (let x = 0; x < w; x += 32) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); }
      for (let y = 0; y < h; y += 32) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
    }
  };
  clear();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 16;
  return { texture: t, canvas: c, ctx: g, clear: () => { clear(); t.needsUpdate = true; } };
}

/** Soft radial sprite (for glows, smoke puffs, bubbles highlights). */
export function radialSprite({ inner = 'rgba(255,255,255,1)', outer = 'rgba(255,255,255,0)', key } = {}) {
  return canvasTexture(128, 128, (g, w, h) => {
    const grd = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    grd.addColorStop(0, inner); grd.addColorStop(1, outer);
    g.fillStyle = grd; g.fillRect(0, 0, w, h);
  }, { key: key || ('rs' + inner + outer) });
}

export function smokeSprite() {
  return canvasTexture(256, 256, (g, w, h) => {
    const r = rand(21);
    for (let i = 0; i < 26; i++) {
      const x = w / 2 + (r() - 0.5) * w * 0.4, y = h / 2 + (r() - 0.5) * h * 0.4, rr = w * (0.12 + r() * 0.22);
      const grd = g.createRadialGradient(x, y, 0, x, y, rr);
      grd.addColorStop(0, 'rgba(255,255,255,0.22)'); grd.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = grd; g.fillRect(0, 0, w, h);
    }
  }, { key: 'smoke' });
}

export function textTexture(text, { font = '700 64px "Segoe UI", Arial', color = '#111', bg = null, pad = 16, w, h } = {}) {
  const c = document.createElement('canvas');
  const g = c.getContext('2d'); g.font = font;
  const m = g.measureText(text);
  c.width = w || Math.ceil(m.width + pad * 2); c.height = h || Math.ceil(parseInt(font.match(/(\d+)px/)[1]) * 1.4 + pad);
  if (bg) { g.fillStyle = bg; g.fillRect(0, 0, c.width, c.height); }
  g.font = font; g.fillStyle = color; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(text, c.width / 2, c.height / 2);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  t.userData = { aspect: c.width / c.height };
  return t;
}
