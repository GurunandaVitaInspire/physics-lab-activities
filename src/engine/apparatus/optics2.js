// Optics apparatus, set 2 (Lessons 9 & 10): left-to-right optical bench, live image screen, drawing board with
// paper + pins + pencil + protractor (pin-tracing method), glass slab, glass prism, light box with slit, model eye,
// glass tank, volumetric beam glow, window view — plus 2-D ray tracing (Snell's law) and spectral colour helpers.
// Plane geometry convention: points in the bench plane are THREE.Vector2(x, z)  (v.y holds world z).
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { wood, metal, chrome, castIron, opticalGlass, glass, paper, plastic, rubber } from '../materials.js';
import { rulerTexture, canvasTexture, liveSheet } from '../textures.js';

export const DEG = Math.PI / 180;
export const v2 = (x, z) => new THREE.Vector2(x, z);
/** unit vector at `deg` measured from +x towards +z */
export const dirAt = (deg) => v2(Math.cos(deg * DEG), Math.sin(deg * DEG));
export const angOf = (d) => Math.atan2(d.y, d.x) / DEG;
export const cross2 = (a, b) => a.x * b.y - a.y * b.x;
const clamp01 = (x) => Math.max(0, Math.min(1, x));

/* =========================================================== 2-D ray optics */
/** Snell refraction of unit direction d at a surface with unit normal `nrm` pointing back to the incident side. */
export function refract2(d, nrm, n1, n2) {
  const cosi = -d.dot(nrm), eta = n1 / n2, k = 1 - eta * eta * (1 - cosi * cosi);
  if (k < 0) return { d: d.clone().addScaledVector(nrm, 2 * cosi).normalize(), tir: true };
  return { d: d.clone().multiplyScalar(eta).addScaledVector(nrm, eta * cosi - Math.sqrt(k)).normalize(), tir: false };
}

function polyCentroid(v) { const c = v2(0, 0); v.forEach((p) => c.add(p)); return c.multiplyScalar(1 / v.length); }

/** Nearest forward hit of ray (p, d) with the edges of convex polygon `verts`. Normal returned points outward. */
export function hitPoly(p, d, verts, skipEdge = -1) {
  let best = null;
  for (let i = 0; i < verts.length; i++) {
    if (i === skipEdge) continue;
    const a = verts[i], b = verts[(i + 1) % verts.length];
    const e = b.clone().sub(a), den = cross2(d, e);
    if (Math.abs(den) < 1e-12) continue;
    const ap = a.clone().sub(p);
    const t = cross2(ap, e) / den, s = cross2(ap, d) / den;
    if (t > 1e-6 && s >= -1e-9 && s <= 1 + 1e-9 && (!best || t < best.t)) best = { t, s, edge: i, point: p.clone().addScaledVector(d, t), a, b };
  }
  if (best) {
    const e = best.b.clone().sub(best.a);
    const n = v2(e.y, -e.x).normalize();
    const mid = best.a.clone().add(best.b).multiplyScalar(0.5);
    if (n.dot(mid.sub(polyCentroid(verts))) < 0) n.negate();
    best.normal = n;
  }
  return best;
}

/**
 * Trace a ray through convex glass bodies [{verts:[Vector2], n}] in air.
 * Returns { pts, dir, events:[{type:'in'|'out'|'tir', point, normal(outward), dIn, dOut, edge, body}] }.
 */
export function traceRay(p0, d0, bodies, { maxEvents = 10 } = {}) {
  const pts = [p0.clone()], events = [];
  let p = p0.clone(), d = d0.clone().normalize(), inside = null, skip = -1;
  for (let k = 0; k < maxEvents; k++) {
    if (!inside) {
      let best = null, body = null;
      for (const b of bodies) { const h = hitPoly(p, d, b.verts); if (h && (!best || h.t < best.t)) { best = h; body = b; } }
      if (!best) break;
      const r = refract2(d, best.normal, 1, body.n);
      events.push({ type: 'in', body, edge: best.edge, point: best.point, normal: best.normal, dIn: d.clone(), dOut: r.d });
      p = best.point; d = r.d; pts.push(p.clone()); inside = body; skip = best.edge;
    } else {
      const h = hitPoly(p, d, inside.verts, skip);
      if (!h) break;
      const r = refract2(d, h.normal.clone().negate(), inside.n, 1);
      events.push({ type: r.tir ? 'tir' : 'out', body: inside, edge: h.edge, point: h.point, normal: h.normal, dIn: d.clone(), dOut: r.d });
      p = h.point; d = r.d; pts.push(p.clone());
      if (r.tir) skip = h.edge; else { inside = null; skip = -1; }
    }
  }
  return { pts, dir: d, events, end: p };
}

/** Angle (deg) between a direction and a surface normal (0..90). */
export const angleToNormal = (d, n) => Math.acos(Math.min(1, Math.abs(d.clone().normalize().dot(n)))) / DEG;

/** Intersection of two infinite lines p1 + t d1 and p2 + s d2. */
export function lineX(p1, d1, p2, d2) {
  const den = cross2(d1, d2); if (Math.abs(den) < 1e-12) return null;
  const t = cross2(p2.clone().sub(p1), d2) / den;
  return p1.clone().addScaledVector(d1, t);
}

/** Perpendicular distance of point q from the line through p with unit direction d. */
export const distToLine = (q, p, d) => Math.abs(cross2(d, q.clone().sub(p)));

/* ======================================================= spectral colour */
/** Visible wavelength (nm) → linear-ish RGB 0..1 (Bruton approximation with edge fall-off). */
export function wl2rgb(l) {
  let r = 0, g = 0, b = 0;
  if (l < 440) { r = -(l - 440) / 60; b = 1; }
  else if (l < 490) { g = (l - 440) / 50; b = 1; }
  else if (l < 510) { g = 1; b = -(l - 510) / 20; }
  else if (l < 580) { r = (l - 510) / 70; g = 1; }
  else if (l < 645) { r = 1; g = -(l - 645) / 65; }
  else r = 1;
  const f = l < 420 ? 0.3 + (0.7 * (l - 380)) / 40 : l > 700 ? 0.3 + (0.7 * (780 - l)) / 80 : 1;
  return [r * f, g * f, b * f];
}
/** Sample wavelengths 400..700 nm with RGB weights that sum to equal-energy white. */
export function spectrumSamples(n = 48) {
  const s = [];
  for (let i = 0; i < n; i++) { const l = 400 + (300 * (i + 0.5)) / n; s.push({ l, rgb: wl2rgb(l) }); }
  const sum = [0, 0, 0]; s.forEach((q) => { sum[0] += q.rgb[0]; sum[1] += q.rgb[1]; sum[2] += q.rgb[2]; });
  s.forEach((q) => { q.w = [q.rgb[0] / sum[0], q.rgb[1] / sum[1], q.rgb[2] / sum[2]]; });
  return s;
}
/** Colour of light with spectral weight fn(λ) (1 = white) → {r,g,b} 0..1 (relative to white) */
export function mixSpectrum(fn, samples = spectrumSamples(60)) {
  let r = 0, g = 0, b = 0;
  for (const q of samples) { const k = fn(q.l); r += q.w[0] * k; g += q.w[1] * k; b += q.w[2] * k; }
  return { r, g, b };
}
export const cauchy = (A, B) => (l) => A + B / (l * l);

/* ================================================================ bench */
/** Optical bench with a metre scale whose readings increase to the right (+x). xAt(cm) / cmAt(x). */
export function opticalBench2({ length = 1.0, cx = 0 } = {}) {
  const g = new THREE.Group(); g.name = 'Optical bench';
  const left = cx - length / 2;
  const bed = new THREE.Mesh(new THREE.BoxGeometry(length + 0.06, 0.03, 0.12), wood({ base: '#7b4a26', key: 'benchbed' }));
  bed.position.set(cx, 0.015, 0); g.add(bed);
  const scale = new THREE.Mesh(new THREE.PlaneGeometry(length, 0.035), new THREE.MeshStandardMaterial({ map: rulerTexture({ cm: Math.round(length * 100), w: 4096, h: 180 }), roughness: 0.7 }));
  scale.rotation.x = -Math.PI / 2; scale.position.set(cx, 0.0302, 0.038); g.add(scale);
  for (const z of [-0.025, 0.012]) { const rail = new THREE.Mesh(new THREE.BoxGeometry(length + 0.04, 0.006, 0.006), chrome()); rail.position.set(cx, 0.033, z); g.add(rail); }
  for (const sx of [left - 0.02, left + length + 0.02]) { const foot = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.012, 0.16), castIron()); foot.position.set(sx, 0.006, 0); g.add(foot); }
  g.topY = 0.036; g.left = left; g.length = length;
  g.xAt = (cm) => left + cm / 100;
  g.cmAt = (x) => (x - left) * 100;
  return g;
}

/** Let a camera go anywhere (low, side-on views); returns a function that restores the limits. */
export function freeCam(lab) {
  const c = lab.controls;
  const s = { maxP: c.maxPolarAngle, minA: c.minAzimuthAngle, maxA: c.maxAzimuthAngle, minD: c.minDistance };
  c.maxPolarAngle = Math.PI * 0.5; c.minAzimuthAngle = -Infinity; c.maxAzimuthAngle = Infinity; c.minDistance = 0.04;
  return () => { c.maxPolarAngle = s.maxP; c.minAzimuthAngle = s.minA; c.maxAzimuthAngle = s.maxA; c.minDistance = s.minD; };
}

/* ======================================================== image screen */
/**
 * White card that shows light falling on it. Face normal = local +z, canvas right = local +x, up = local +y.
 * screen.clear(); screen.sprite(img, {x, y, h, blur, alpha, rot180, anchor}); screen.disc({...}); screen.commit();
 * x, y, h are metres on the card.
 */
export function liveScreen({ w = 0.12, h = 0.12, res = 320, frame = true, border = 0x334155 } = {}) {
  const g = new THREE.Group(); g.name = 'Screen';
  const W = res, H = Math.round((res * h) / w);
  const base = document.createElement('canvas'); base.width = W; base.height = H;
  const bg = base.getContext('2d');
  bg.fillStyle = '#f6f4ec'; bg.fillRect(0, 0, W, H);
  for (let i = 0; i < 900; i++) { bg.fillStyle = `rgba(120,110,90,${Math.random() * 0.05})`; bg.fillRect(Math.random() * W, Math.random() * H, 2, 1); }
  const glowC = document.createElement('canvas'); glowC.width = W; glowC.height = H;
  const gg = glowC.getContext('2d');
  const mapT = new THREE.CanvasTexture(base); mapT.colorSpace = THREE.SRGBColorSpace;
  const glowT = new THREE.CanvasTexture(glowC); glowT.colorSpace = THREE.SRGBColorSpace;
  const mat = new THREE.MeshStandardMaterial({ map: mapT, emissive: 0xffffff, emissiveMap: glowT, emissiveIntensity: 1.6, roughness: 0.95 });
  const face = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat); face.position.z = 0.0011; g.add(face);
  const back = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.002), paper(0xe9e5da)); g.add(back);
  if (frame) {
    const fm = metal({ color: border, roughness: 0.4 });
    for (const sx of [-1, 1]) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.004, h + 0.006, 0.004), fm); b.position.set((sx * (w + 0.004)) / 2, 0, 0); g.add(b); }
    const bot = new THREE.Mesh(new THREE.BoxGeometry(w + 0.008, 0.004, 0.004), fm); bot.position.y = -h / 2 - 0.002; g.add(bot);
  }
  const px = W / w;
  g.px = px; g.ctx = gg; g.W = W; g.H = H; g.cardW = w; g.cardH = h; g.face = face; g.mat = mat;
  g.toCanvas = (x, y) => [W / 2 + x * px, H / 2 - y * px];
  g.clear = () => { gg.save(); gg.globalCompositeOperation = 'source-over'; gg.filter = 'none'; gg.globalAlpha = 1; gg.fillStyle = '#000'; gg.fillRect(0, 0, W, H); gg.restore(); };
  g.commit = () => { glowT.needsUpdate = true; };
  g.sprite = (img, { x = 0, y = 0, h: hh = 0.03, w: ww, blur = 0, alpha = 1, rot180 = false, flipY = false, anchor = [0.5, 0.5] } = {}) => {
    const [cx, cy] = g.toCanvas(x, y);
    const H2 = Math.max(1.5, hh * px), W2 = ww ? ww * px : (H2 * img.width) / img.height;
    gg.save(); gg.globalCompositeOperation = 'lighter';
    gg.filter = blur > 0.3 ? `blur(${blur.toFixed(1)}px)` : 'none'; gg.globalAlpha = clamp01(alpha);
    gg.translate(cx, cy); if (rot180) gg.scale(-1, -1); else if (flipY) gg.scale(1, -1);
    gg.drawImage(img, -anchor[0] * W2, -anchor[1] * H2, W2, H2);
    gg.restore();
  };
  g.disc = ({ x = 0, y = 0, r = 0.005, color = 'rgba(255,255,245,1)', alpha = 1, blur = 0, soft = 0.15 } = {}) => {
    const [cx, cy] = g.toCanvas(x, y), R = Math.max(1, r * px);
    gg.save(); gg.globalCompositeOperation = 'lighter'; gg.globalAlpha = clamp01(alpha);
    gg.filter = blur > 0.3 ? `blur(${blur.toFixed(1)}px)` : 'none';
    const grd = gg.createRadialGradient(cx, cy, 0, cx, cy, R);
    grd.addColorStop(0, color); grd.addColorStop(1 - soft, color); grd.addColorStop(1, 'rgba(0,0,0,0)');
    gg.fillStyle = grd; gg.beginPath(); gg.arc(cx, cy, R, 0, Math.PI * 2); gg.fill(); gg.restore();
  };
  /** project a world point along direction `dirW` (world) onto the card plane → card-local (x, y) */
  g.projectAlong = (worldP, dirW) => {
    const inv = new THREE.Matrix4().copy(g.matrixWorld).invert();
    const p = worldP.clone().applyMatrix4(inv);
    const d = dirW.clone().transformDirection(inv);
    if (Math.abs(d.z) < 1e-6) return { x: p.x, y: p.y };
    const t = -p.z / d.z; return { x: p.x + d.x * t, y: p.y + d.y * t };
  };
  g.clear(); g.commit();
  return g;
}

/* ========================================================== sprites */
/** Candle flame + faintly lit candle body. Anchor of the flame centre = [0.5, 0.344]. FLAME = 3 cm → 200 px. */
export function candleSprite() {
  return canvasTexture(160, 320, (c, cw) => {
    c.clearRect(0, 0, cw, 320);
    const fx = cw / 2;
    const grd = c.createRadialGradient(fx, 135, 2, fx, 120, 100);
    grd.addColorStop(0, 'rgba(255,252,230,1)'); grd.addColorStop(0.35, 'rgba(255,214,120,0.95)'); grd.addColorStop(0.7, 'rgba(255,140,40,0.6)'); grd.addColorStop(1, 'rgba(255,100,20,0)');
    c.fillStyle = grd; c.beginPath(); c.moveTo(fx, 8);
    c.bezierCurveTo(cw * 0.86, 100, cw * 0.8, 184, fx, 190);
    c.bezierCurveTo(cw * 0.2, 184, cw * 0.14, 100, fx, 8); c.fill();
    const body = c.createLinearGradient(0, 200, 0, 320);
    body.addColorStop(0, 'rgba(255,236,200,0.34)'); body.addColorStop(1, 'rgba(255,236,200,0.05)');
    c.fillStyle = body; c.fillRect(fx - 60, 200, 120, 120);
  }, { key: 'candleSprite2' }).image;
}
export const CANDLE_ANCHOR = [0.5, 110 / 320];
export const CANDLE_SPRITE_H = 0.03 * (320 / 200); // metres represented by the full sprite height for a 3 cm flame

/** A bright letter (e.g. 'F') as cut in an illuminated object box. */
export function letterSprite(ch = 'F') {
  return canvasTexture(128, 128, (c, w, h) => {
    c.clearRect(0, 0, w, h);
    c.fillStyle = 'rgba(255,246,214,1)'; c.font = '900 118px Arial'; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText(ch, w / 2, h / 2 + 6);
  }, { key: 'letter' + ch }).image;
}

/** Outdoor view (sky, distant hills, a tree) as seen through a window — used for 'object at infinity'. */
export function outdoorSprite() {
  return canvasTexture(320, 240, (c, w, h) => {
    const sky = c.createLinearGradient(0, 0, 0, h * 0.7);
    sky.addColorStop(0, '#9ec9f0'); sky.addColorStop(1, '#eaf4fb');
    c.fillStyle = sky; c.fillRect(0, 0, w, h);
    c.fillStyle = '#8fae8a'; c.beginPath(); c.moveTo(0, h * 0.68);
    for (let x = 0; x <= w; x += 20) c.lineTo(x, h * 0.64 - Math.sin(x * 0.03) * 10 - Math.sin(x * 0.011) * 8);
    c.lineTo(w, h); c.lineTo(0, h); c.fill();
    c.fillStyle = '#5f8a3e'; c.fillRect(0, h * 0.78, w, h * 0.22);
    // tree
    c.fillStyle = '#4a3220'; c.fillRect(w * 0.6, h * 0.42, 12, h * 0.4);
    const blob = (x, y, r, col) => { c.fillStyle = col; c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill(); };
    [[0.62, 0.36, 40], [0.55, 0.42, 30], [0.7, 0.42, 32], [0.63, 0.25, 30]].forEach(([x, y, r]) => blob(w * x, h * y, r, '#2f6b2a'));
    [[0.6, 0.3, 18], [0.68, 0.36, 16]].forEach(([x, y, r]) => blob(w * x, h * y, r, '#3f8a35'));
    c.fillStyle = '#fff6c8'; c.beginPath(); c.arc(w * 0.18, h * 0.18, 14, 0, Math.PI * 2); c.fill();
    // window bars
    c.fillStyle = 'rgba(40,34,28,0.95)'; c.fillRect(0, 0, w, 10); c.fillRect(0, h - 10, w, 10); c.fillRect(0, 0, 10, h); c.fillRect(w - 10, 0, 10, h);
    c.fillRect(w / 2 - 4, 0, 8, h); c.fillRect(0, h * 0.48, w, 7);
  }, { key: 'outdoor' }).image;
}

/** A bright outdoor scene in the classroom window (left wall). Returns the plane (MeshBasic, unaffected by dimming). */
export function windowView() {
  const tex = canvasTexture(1024, 880, (c, w, h) => {
    const img = outdoorSprite();
    c.drawImage(img, 0, 0, w, h);
  }, { key: 'windowView' });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 1.2), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }));
  m.position.set(-2.18, 0.6, -0.4); m.rotation.y = Math.PI / 2; m.userData.noPick = true;
  return m;
}

/* ===================================================== drawing board */
/**
 * Drawing board with a sheet of white A4 paper (board origin = board centre on the bench; paper on top at topY).
 * board.paper.add(stroke) / .redraw(); strokes: {type:'line'|'poly'|'text'|'arc'|'circle'|'cross', ...} with points in
 * board-local Vector2(x, z) metres.  Progress `p` (0..1) draws a stroke partially (used for live pencil drawing).
 */
export function drawingBoard({ w = 0.5, d = 0.34, paperW = 0.297, paperD = 0.21 } = {}) {
  const g = new THREE.Group(); g.name = 'Drawing board';
  const bt = 0.016;
  const board = new THREE.Mesh(new THREE.BoxGeometry(w, bt, d), wood({ base: '#9c6d3e', dark: '#6b4523', key: 'drawboard' }));
  board.position.y = bt / 2; g.add(board);
  const sheet = liveSheet({ w: 2048, h: Math.round((2048 * paperD) / paperW) });
  // paper albedo kept below 1 so a sheet seen from above under the lab lights is not blown out
  const pm = new THREE.Mesh(new THREE.PlaneGeometry(paperW, paperD), new THREE.MeshStandardMaterial({ map: sheet.texture, color: 0xb9b8b2, roughness: 0.95 }));
  pm.rotation.x = -Math.PI / 2; pm.position.y = bt + 0.0003; pm.receiveShadow = true; g.add(pm);
  // drawing pins at the paper corners
  const tackM = metal({ color: 0xd4b04a, roughness: 0.3 });
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const t = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.0015, 18), tackM);
    t.position.set(sx * (paperW / 2 - 0.008), bt + 0.0012, sz * (paperD / 2 - 0.008)); g.add(t);
  }
  g.topY = bt + 0.0004;
  g.paper = new PaperSketch(sheet, paperW, paperD);
  g.paperMesh = pm;
  return g;
}

export class PaperSketch {
  constructor(sheet, W, D) { this.s = sheet; this.c = sheet.ctx; this.k = sheet.canvas.width / W; this.W = W; this.D = D; this.strokes = []; }
  px(p) { return [(p.x + this.W / 2) * this.k, (p.y + this.D / 2) * this.k]; }
  add(s) { if (s.p === undefined) s.p = 1; this.strokes.push(s); this.redraw(); return s; }
  remove(s) { this.strokes = this.strokes.filter((x) => x !== s); this.redraw(); }
  static len(s) {
    if (s.type === 'line') return s.a.distanceTo(s.b);
    if (s.type === 'poly') { let L = 0; const P = s.closed ? [...s.pts, s.pts[0]] : s.pts; for (let i = 1; i < P.length; i++) L += P[i].distanceTo(P[i - 1]); return L; }
    if (s.type === 'arc') return Math.abs(s.a1 - s.a0) * DEG * s.r;
    return 0.01;
  }
  /** current pen point (board-local) of a partially drawn stroke */
  static tip(s) {
    if (s.type === 'line') return s.a.clone().lerp(s.b, s.p);
    if (s.type === 'poly') {
      const P = s.closed ? [...s.pts, s.pts[0]] : s.pts; let L = PaperSketch.len(s) * s.p;
      for (let i = 1; i < P.length; i++) { const seg = P[i].distanceTo(P[i - 1]); if (L <= seg) return P[i - 1].clone().lerp(P[i], seg ? L / seg : 0); L -= seg; }
      return P[P.length - 1].clone();
    }
    if (s.type === 'arc') { const a = (s.a0 + (s.a1 - s.a0) * s.p) * DEG; return s.c.clone().add(v2(Math.cos(a) * s.r, Math.sin(a) * s.r)); }
    return (s.at || s.c).clone();
  }
  static start(s) { const p = s.p; s.p = 0; const t = PaperSketch.tip(s); s.p = p; return t; }
  redraw() {
    const g = this.c, k = this.k;
    this.s.clear();
    for (const s of this.strokes) {
      if (s.p <= 0) continue;
      g.save();
      g.strokeStyle = s.color || 'rgba(55,55,62,0.92)'; g.fillStyle = s.color || 'rgba(55,55,62,0.92)';
      g.lineWidth = (s.width || 0.00045) * k; g.lineCap = 'round'; g.lineJoin = 'round';
      if (s.dash) g.setLineDash(s.dash.map((x) => x * k));
      if (s.type === 'line') {
        const [x0, y0] = this.px(s.a), [x1, y1] = this.px(PaperSketch.tip(s));
        g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke();
        if (s.arrow && s.p > 0.98) this._arrow(s.a, s.b, s.arrowAt ?? 0.55);
      } else if (s.type === 'poly') {
        const P = s.closed ? [...s.pts, s.pts[0]] : s.pts; let L = PaperSketch.len(s) * s.p;
        g.beginPath(); g.moveTo(...this.px(P[0]));
        for (let i = 1; i < P.length && L > 0; i++) { const seg = P[i].distanceTo(P[i - 1]); const q = L >= seg ? P[i] : P[i - 1].clone().lerp(P[i], L / seg); g.lineTo(...this.px(q)); L -= seg; }
        g.stroke();
      } else if (s.type === 'arc') {
        const [cx, cy] = this.px(s.c); g.beginPath(); const a1 = s.a0 + (s.a1 - s.a0) * s.p;
        g.arc(cx, cy, s.r * k, Math.min(s.a0, a1) * DEG, Math.max(s.a0, a1) * DEG); g.stroke();
      } else if (s.type === 'circle') {
        const [cx, cy] = this.px(s.c); g.beginPath(); g.arc(cx, cy, s.r * k, 0, Math.PI * 2 * s.p); g.stroke();
      } else if (s.type === 'dot') {
        const [cx, cy] = this.px(s.c); g.beginPath(); g.arc(cx, cy, (s.r || 0.0006) * k, 0, Math.PI * 2); g.fill();
      } else if (s.type === 'cross') {
        const [cx, cy] = this.px(s.c), r = (s.r || 0.0022) * k; g.beginPath(); g.moveTo(cx - r, cy - r); g.lineTo(cx + r, cy + r); g.moveTo(cx + r, cy - r); g.lineTo(cx - r, cy + r); g.stroke();
      } else if (s.type === 'text') {
        g.globalAlpha = Math.min(1, s.p * 1.5);
        g.font = `${s.italic ? 'italic ' : ''}600 ${(s.size || 0.005) * k}px "Segoe Print", "Comic Sans MS", "Segoe UI", sans-serif`;
        g.textAlign = 'center'; g.textBaseline = 'middle'; const [x, y] = this.px(s.at); g.fillText(s.text, x, y);
      }
      g.restore();
    }
    this.s.texture.needsUpdate = true;
  }
  _arrow(a, b, at) {
    const g = this.c, k = this.k; const d = b.clone().sub(a).normalize(); const m = a.clone().lerp(b, at);
    const n = v2(-d.y, d.x), L = 0.0035;
    const p1 = m.clone().addScaledVector(d, -L).addScaledVector(n, L * 0.55), p2 = m.clone().addScaledVector(d, -L).addScaledVector(n, -L * 0.55);
    g.beginPath(); g.moveTo(...this.px(p1)); g.lineTo(...this.px(m)); g.lineTo(...this.px(p2)); g.stroke();
    void k;
  }
}

/** Steel pin with a coloured plastic head. Origin = tip. `lower` (0..splitY) can be shifted to show an image seen through glass. */
export function pin({ color = 0xdc2626, len = 0.034, splitY = 0.02 } = {}) {
  const g = new THREE.Group(); g.name = 'Pin';
  const steel = metal({ color: 0xd8dbe0, roughness: 0.2 });
  const lower = new THREE.Mesh(new THREE.CylinderGeometry(0.00045, 0.00045, 1, 8), steel);
  const upper = new THREE.Mesh(new THREE.CylinderGeometry(0.00045, 0.00045, 1, 8), steel);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.0028, 18, 14), new THREE.MeshPhysicalMaterial({ color, roughness: 0.25, clearcoat: 1 }));
  const tip = new THREE.Mesh(new THREE.ConeGeometry(0.00045, 0.002, 8), steel); tip.rotation.x = Math.PI; tip.position.y = -0.001;
  g.add(lower, upper, head, tip);
  const proxy = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, len + 0.008, 8), new THREE.MeshBasicMaterial({ visible: false }));
  proxy.position.y = (len + 0.008) / 2; g.add(proxy);
  g.setSplit = (y) => {
    g.splitY = y;
    lower.scale.y = y; lower.position.y = y / 2;
    upper.scale.y = len - y; upper.position.y = y + (len - y) / 2;
  };
  head.position.y = len + 0.0022;
  g.setSplit(splitY);
  g.lower = lower; g.len = len;
  return g;
}

/** Yellow hexagonal pencil. Origin at the graphite tip; it rests lying on the bench (`restPose`) or leans when drawing. */
export function pencil() {
  const g = new THREE.Group(); g.name = 'Pencil';
  const body = new THREE.Group(); g.add(body);
  const L = 0.15;
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.0036, 0.0036, L, 6), new THREE.MeshPhysicalMaterial({ color: 0xf2b705, roughness: 0.35, clearcoat: 0.6 }));
  shaft.position.y = 0.017 + L / 2; body.add(shaft);
  const cone = new THREE.Mesh(new THREE.ConeGeometry(0.0036, 0.015, 12), wood({ base: '#e2c08f', key: 'pencilwood' })); cone.rotation.x = Math.PI; cone.position.y = 0.0095; body.add(cone);
  const lead = new THREE.Mesh(new THREE.ConeGeometry(0.0011, 0.004, 10), new THREE.MeshStandardMaterial({ color: 0x2b2b2e, roughness: 0.4, metalness: 0.3 })); lead.rotation.x = Math.PI; lead.position.y = 0.002; body.add(lead);
  const ferrule = new THREE.Mesh(new THREE.CylinderGeometry(0.0039, 0.0039, 0.01, 16), metal({ color: 0xc0c4c8, roughness: 0.3 })); ferrule.position.y = 0.017 + L + 0.005; body.add(ferrule);
  const eraser = new THREE.Mesh(new THREE.CylinderGeometry(0.0036, 0.0036, 0.008, 16), rubber(0xe58b9a)); eraser.position.y = 0.017 + L + 0.014; body.add(eraser);
  g.drawRot = { x: -0.35, y: 0, z: -0.45 };
  g.restRot = { x: 0, y: 0.3, z: Math.PI / 2 };
  return g;
}

/** Transparent 180° protractor (r = 5 cm). Origin = centre of the base line; arc bulges towards local -z. */
export function protractor({ r = 0.05 } = {}) {
  const g = new THREE.Group(); g.name = 'Protractor';
  const tex = canvasTexture(1024, 1024, (c, w, h) => {
    c.clearRect(0, 0, w, h);
    const cx = w / 2, cy = h / 2, R = w / 2 - 2;
    c.fillStyle = 'rgba(214,232,250,0.42)'; c.beginPath(); c.arc(cx, cy, R, Math.PI, 0); c.closePath(); c.fill();
    c.strokeStyle = 'rgba(20,40,90,0.95)'; c.fillStyle = 'rgba(20,40,90,0.95)';
    for (let d = 0; d <= 180; d++) {
      const a = Math.PI + (d * Math.PI) / 180; const L = d % 10 === 0 ? 44 : d % 5 === 0 ? 30 : 18;
      c.lineWidth = d % 10 === 0 ? 3 : 1.6;
      c.beginPath(); c.moveTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R); c.lineTo(cx + Math.cos(a) * (R - L), cy + Math.sin(a) * (R - L)); c.stroke();
      if (d % 10 === 0) {
        c.save(); c.translate(cx + Math.cos(a) * (R - 66), cy + Math.sin(a) * (R - 66)); c.rotate(a + Math.PI / 2);
        c.font = '600 26px Arial'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(String(d), 0, 0);
        c.font = '500 20px Arial'; c.fillStyle = 'rgba(160,20,20,0.9)'; c.fillText(String(180 - d), 0, 30); c.restore();
      }
    }
    c.lineWidth = 2.5; c.beginPath(); c.moveTo(cx - R, cy - 1); c.lineTo(cx + R, cy - 1); c.stroke();
    c.beginPath(); c.moveTo(cx, cy - 20); c.lineTo(cx, cy - R * 0.25); c.stroke();
    c.beginPath(); c.arc(cx, cy - 2, 7, 0, Math.PI * 2); c.stroke();
  }, { key: 'protractor' });
  const m = new THREE.Mesh(new THREE.CircleGeometry(r, 72, 0, Math.PI), new THREE.MeshStandardMaterial({ map: tex, transparent: true, roughness: 0.3, side: THREE.DoubleSide, depthWrite: false }));
  m.rotation.x = -Math.PI / 2; m.position.y = 0.0009; m.renderOrder = 6; g.add(m);
  const edge = new THREE.Mesh(new THREE.TorusGeometry(r, 0.0007, 6, 72, Math.PI), new THREE.MeshPhysicalMaterial({ color: 0xcfe6ff, transparent: true, opacity: 0.6, roughness: 0.2 }));
  edge.rotation.x = -Math.PI / 2; edge.position.y = 0.0009; g.add(edge);
  const proxy = new THREE.Mesh(new THREE.BoxGeometry(r * 2, 0.006, r), new THREE.MeshBasicMaterial({ visible: false })); proxy.position.set(0, 0.003, -r / 2); g.add(proxy);
  return g;
}

/**
 * opticalGlass() is tuned with thickness = 1.2 (m); for centimetre-sized blocks that shifts the transmitted view so
 * much that the glass looks like a mirror. Use a physically sized thickness and a softer clear-coat instead.
 */
export function smallGlass(thick = 0.04, tint = 0xeefcf6) {
  const m = opticalGlass({ tint });
  if (m.isMeshPhysicalMaterial && m.transmission > 0) { m.thickness = thick; m.clearcoat = 0.35; m.envMapIntensity = 1.0; m.attenuationDistance = 0.6; m.attenuationColor = new THREE.Color(0xcff3e8); }
  return m;
}

/** Rectangular glass slab (w along x, d along z, h tall). Origin at the centre of its base. Ends are ground (frosted). */
export function glassSlab({ w = 0.1, d = 0.06, h = 0.018 } = {}) {
  const g = new THREE.Group(); g.name = 'Glass slab';
  const m = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 2, 0.0012), smallGlass(d));
  m.position.y = h / 2; g.add(m);
  const frost = new THREE.MeshStandardMaterial({ color: 0xe8f0ee, roughness: 0.9, transparent: true, opacity: 0.45, depthWrite: false });
  for (const sx of [-1, 1]) { const f = new THREE.Mesh(new THREE.PlaneGeometry(d - 0.002, h - 0.002), frost); f.rotation.y = (sx * Math.PI) / 2; f.position.set(sx * (w / 2 + 0.0002), h / 2, 0); g.add(f); }
  g.w = w; g.d = d; g.h = h; g.body = m;
  /** polygon of the slab outline in parent plane coords (assumes no rotation) */
  g.poly = () => [v2(g.position.x - w / 2, g.position.z - d / 2), v2(g.position.x + w / 2, g.position.z - d / 2), v2(g.position.x + w / 2, g.position.z + d / 2), v2(g.position.x - w / 2, g.position.z + d / 2)];
  return g;
}

/**
 * Equilateral glass prism lying on a triangular face. Local plane vertices (x, z): A apex towards -z, B left, C right.
 * Origin = centroid of the base triangle at the bottom face. g.polyWorld() gives the outline in world (x,z).
 */
export function glassPrism({ side = 0.06, h = 0.025, tint = 0xeefcf6 } = {}) {
  const g = new THREE.Group(); g.name = 'Glass prism';
  const s = side, ra = s / Math.sqrt(3), ri = s / (2 * Math.sqrt(3));
  const local = [v2(0, -ra), v2(-s / 2, ri), v2(s / 2, ri)];
  const shape = new THREE.Shape(local.map((p) => new THREE.Vector2(p.x, -p.y)));
  const geo = new THREE.ExtrudeGeometry(shape, { depth: h, bevelEnabled: true, bevelThickness: 0.0006, bevelSize: 0.0006, bevelSegments: 1 });
  geo.rotateX(-Math.PI / 2); // shape y -> -z, extrusion -> +y
  const m = new THREE.Mesh(geo, smallGlass(s * 0.6, tint)); m.position.y = 0.0006; g.add(m);
  g.local = local; g.side = s; g.h = h; g.body = m; g.inradius = ri;
  g.polyWorld = () => { g.updateWorldMatrix(true, false); return local.map((p) => { const w = new THREE.Vector3(p.x, 0, p.y).applyMatrix4(g.matrixWorld); return v2(w.x, w.z); }); };
  return g;
}

/* ======================================================= light sources */
/**
 * Ray box / lamp house: black metal box with a bulb, emitting through a circular window on its +x face.
 * box.setOn(bool); box.windowLocal (Vector3) = centre of the exit window. Origin on its base.
 */
export function lightBox({ w = 0.09, d = 0.07, h = 0.08, beamY = 0.05 } = {}) {
  const g = new THREE.Group(); g.name = 'Light box';
  const body = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 2, 0.004), new THREE.MeshStandardMaterial({ color: 0x1d2027, roughness: 0.55, metalness: 0.6 }));
  body.position.y = h / 2 + 0.004; g.add(body);
  const feet = new THREE.Mesh(new THREE.BoxGeometry(w + 0.01, 0.004, d + 0.01), castIron()); feet.position.y = 0.002; g.add(feet);
  for (let i = 0; i < 4; i++) { const v = new THREE.Mesh(new THREE.BoxGeometry(w * 0.6, 0.003, 0.004), plastic(0x0b0c10)); v.position.set(0, h + 0.005, -d / 3 + (i * d) / 4.5); g.add(v); } // vents
  const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.03, 32, 1, true), new THREE.MeshStandardMaterial({ color: 0x23262d, roughness: 0.5, metalness: 0.7, side: THREE.DoubleSide }));
  tube.rotation.z = Math.PI / 2; tube.position.set(w / 2 + 0.015, beamY, 0); g.add(tube);
  const lensM = new THREE.MeshPhysicalMaterial({ color: 0xfff7e0, emissive: 0xfff1c8, emissiveIntensity: 0, roughness: 0.1, transmission: 0, toneMapped: false });
  const win = new THREE.Mesh(new THREE.CircleGeometry(0.0145, 32), lensM); win.rotation.y = Math.PI / 2; win.position.set(w / 2 + 0.03, beamY, 0); g.add(win);
  const sw = new THREE.Group(); sw.position.set(-w / 4, h * 0.45, d / 2 + 0.001); g.add(sw);
  const swBase = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.012, 0.004), plastic(0x111111)); sw.add(swBase);
  const rocker = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.007, 0.005), plastic(0xd61f1f, 0.35)); rocker.position.z = 0.002; rocker.rotation.x = 0.25; sw.add(rocker);
  const plate = new THREE.Mesh(new THREE.PlaneGeometry(0.05, 0.014), new THREE.MeshStandardMaterial({ map: canvasTexture(256, 72, (c, W, H) => { c.fillStyle = '#c9ccd2'; c.fillRect(0, 0, W, H); c.fillStyle = '#111'; c.font = '700 34px Arial'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('LIGHT SOURCE', W / 2, H / 2 + 2); }, { key: 'lbplate' }), roughness: 0.6, metalness: 0.4 }));
  plate.position.set(w / 6, h * 0.45, d / 2 + 0.0015); g.add(plate);
  const light = new THREE.PointLight(0xfff1d6, 0, 0.6, 2); light.position.set(w / 2 + 0.04, beamY, 0); g.add(light);
  g.switch = sw; g.windowLocal = new THREE.Vector3(w / 2 + 0.03, beamY, 0); g.beamY = beamY;
  g.on = false;
  g.setOn = (v) => { g.on = v; lensM.emissiveIntensity = v ? 6 : 0; light.intensity = v ? 0.05 : 0; rocker.rotation.x = v ? -0.25 : 0.25; };
  return g;
}

/** Black cardboard on a small stand with a narrow vertical slit (or a round hole) at height beamY, facing ±x. */
export function slitCard({ w = 0.09, h = 0.09, beamY = 0.05, slit = 0.0012, slitH = 0.022, hole = 0 } = {}) {
  const g = new THREE.Group(); g.name = hole ? 'Cardboard with a hole' : 'Cardboard with a slit';
  const cardM = new THREE.MeshStandardMaterial({ color: 0x24211d, roughness: 0.95 });
  const t = 0.0025, y0 = 0.012, top = y0 + h;
  const shape = new THREE.Shape();
  shape.moveTo(-w / 2, y0); shape.lineTo(w / 2, y0); shape.lineTo(w / 2, top); shape.lineTo(-w / 2, top); shape.closePath();
  const hp = new THREE.Path();
  if (hole) hp.absarc(0, beamY, hole, 0, Math.PI * 2, true);
  else { hp.moveTo(-slit / 2, beamY - slitH / 2); hp.lineTo(-slit / 2, beamY + slitH / 2); hp.lineTo(slit / 2, beamY + slitH / 2); hp.lineTo(slit / 2, beamY - slitH / 2); hp.closePath(); }
  shape.holes.push(hp);
  const geo = new THREE.ExtrudeGeometry(shape, { depth: t, bevelEnabled: false, curveSegments: 32 });
  geo.translate(0, 0, -t / 2); geo.rotateY(Math.PI / 2);
  g.add(new THREE.Mesh(geo, cardM));
  const base = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.012, 0.05), wood({ base: '#6b4a2b', key: 'cardbase' })); base.position.y = 0.006; g.add(base);
  return g;
}

/** Thin glowing beam column (volumetric look). Lies along local +x from x=0 to x=length. setGradient([[r,g,b]...]). */
export class BeamGlow extends THREE.Mesh {
  constructor({ radius = 0.006, length = 0.2, intensity = 1, flat = false } = {}) {
    const geo = flat ? new THREE.PlaneGeometry(1, radius * 2, 1, 1) : new THREE.CylinderGeometry(radius, radius, 1, 24, 1, true);
    if (flat) geo.rotateX(-Math.PI / 2); else geo.rotateZ(-Math.PI / 2);
    geo.translate(0.5, 0, 0);
    const data = new Uint8Array(32 * 4).fill(255);
    const tex = new THREE.DataTexture(data, 32, 1); tex.magFilter = THREE.LinearFilter; tex.minFilter = THREE.LinearFilter; tex.needsUpdate = true;
    const mat = new THREE.ShaderMaterial({
      uniforms: { uGrad: { value: tex }, uI: { value: intensity }, uFlat: { value: flat ? 1 : 0 } },
      vertexShader: `varying float vT; varying vec3 vN; varying vec3 vV; varying vec2 vUv;
        void main(){ vT = position.x; vUv = uv; vec4 mv = modelViewMatrix*vec4(position,1.0); vN = normalize(normalMatrix*normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix*mv; }`,
      fragmentShader: `uniform sampler2D uGrad; uniform float uI; uniform float uFlat; varying float vT; varying vec3 vN; varying vec3 vV; varying vec2 vUv;
        void main(){ float a = uFlat > 0.5 ? pow(sin(3.14159*vUv.y), 1.5) : pow(abs(dot(vN, vV)), 1.6);
          vec3 c = texture2D(uGrad, vec2(clamp(vT,0.0,1.0), 0.5)).rgb; gl_FragColor = vec4(c*uI*a, 1.0); }`,
      transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, side: THREE.DoubleSide,
    });
    super(geo, mat);
    this.tex = tex; this.raycast = () => {}; this.renderOrder = 8; this.scale.x = length; this.userData.noShadow = true;
  }
  set intensity(v) { this.material.uniforms.uI.value = v; }
  get intensity() { return this.material.uniforms.uI.value; }
  setGradient(cols) {
    const d = this.tex.image.data;
    for (let i = 0; i < 32; i++) {
      const f = (i / 31) * (cols.length - 1), k = Math.floor(f), t = f - k; const a = cols[k], b = cols[Math.min(cols.length - 1, k + 1)];
      for (let c = 0; c < 3; c++) d[i * 4 + c] = Math.round(255 * clamp01(a[c] + (b[c] - a[c]) * t));
    }
    this.tex.needsUpdate = true;
  }
  /** place from world point a to world point b (parent must be unrotated scene-level) */
  between(a, b) { this.position.copy(a); const d = b.clone().sub(a); this.scale.x = d.length(); this.quaternion.setFromUnitVectors(new THREE.Vector3(1, 0, 0), d.normalize()); }
}

/* ========================================================= model eye */
/**
 * Cut-away model eye (back half of the eyeball, so the inside is visible from the front/+z).
 * Optical axis along x, looking towards -x. Eye lens centre at local x = -0.05, retina at x = +0.05 (10 cm behind).
 * eye.retina: { ctx, px, size, clear(), commit(), sprite(img, {...}) } — the retina is a round screen facing -x.
 * eye.setLensBulge(k) changes the visible curvature of the eye lens.
 */
export function modelEye({ R = 0.058 } = {}) {
  const g = new THREE.Group(); g.name = 'Model eye';
  const shellGeo = new THREE.SphereGeometry(R, 64, 40, Math.PI, Math.PI);
  const outer = new THREE.Mesh(shellGeo, new THREE.MeshPhysicalMaterial({ color: 0xf4eee4, roughness: 0.45, clearcoat: 0.6, side: THREE.FrontSide }));
  const inner = new THREE.Mesh(shellGeo, new THREE.MeshStandardMaterial({ color: 0x6b1f22, roughness: 0.7, side: THREE.BackSide }));
  g.add(outer, inner);
  // cut rim (section through the wall)
  const rim = new THREE.Mesh(new THREE.RingGeometry(R - 0.002, R, 96), new THREE.MeshStandardMaterial({ color: 0xd9c7b5, roughness: 0.8, side: THREE.DoubleSide }));
  g.add(rim);
  // blood vessels hint on the outside
  const vesselsT = canvasTexture(512, 256, (c, w, h) => { c.clearRect(0, 0, w, h); c.strokeStyle = 'rgba(180,40,40,0.55)'; c.lineWidth = 2; for (let i = 0; i < 14; i++) { c.beginPath(); let x = Math.random() * w, y = Math.random() * h; c.moveTo(x, y); for (let k = 0; k < 6; k++) { x += (Math.random() - 0.3) * 40; y += (Math.random() - 0.5) * 30; c.lineTo(x, y); } c.stroke(); } }, { key: 'eyeVessels' });
  const veins = new THREE.Mesh(new THREE.SphereGeometry(R + 0.0003, 48, 32, Math.PI, Math.PI), new THREE.MeshStandardMaterial({ map: vesselsT, transparent: true, depthWrite: false, roughness: 0.5 }));
  g.add(veins);
  // cornea (clear bulge) + iris
  const cornea = new THREE.Mesh(new THREE.SphereGeometry(0.03, 40, 20, 0, Math.PI * 2, 0, 0.75), glass({ opacity: 0.12, edge: 0.6 }));
  cornea.rotation.z = Math.PI / 2; cornea.position.x = -R + 0.03 * Math.cos(0.75) - 0.004; g.add(cornea);
  const irisT = canvasTexture(256, 256, (c, w, h) => { const grd = c.createRadialGradient(w / 2, h / 2, w * 0.18, w / 2, h / 2, w / 2); grd.addColorStop(0, '#2a1608'); grd.addColorStop(0.35, '#6b3d1a'); grd.addColorStop(0.9, '#3b230f'); grd.addColorStop(1, '#1c1008'); c.fillStyle = grd; c.fillRect(0, 0, w, h); c.strokeStyle = 'rgba(200,150,90,0.35)'; for (let i = 0; i < 90; i++) { const a = (i / 90) * Math.PI * 2; c.beginPath(); c.moveTo(w / 2 + Math.cos(a) * w * 0.2, h / 2 + Math.sin(a) * h * 0.2); c.lineTo(w / 2 + Math.cos(a) * w * 0.47, h / 2 + Math.sin(a) * h * 0.47); c.stroke(); } }, { key: 'iris' });
  const iris = new THREE.Mesh(new THREE.RingGeometry(0.0062, 0.021, 48), new THREE.MeshStandardMaterial({ map: irisT, roughness: 0.6, side: THREE.DoubleSide }));
  iris.rotation.y = Math.PI / 2; iris.position.x = -0.0535; g.add(iris);
  // eye lens (biconvex, slightly yellow)
  const lensG = new THREE.Group(); lensG.position.x = -0.05; g.add(lensG);
  const prof = []; const lr = 0.016;
  for (let i = 0; i <= 20; i++) { const r = (i / 20) * lr; prof.push(new THREE.Vector2(r, 0.0005 + 0.0055 * (1 - (r / lr) ** 2))); }
  for (let i = 20; i >= 0; i--) { const r = (i / 20) * lr; prof.push(new THREE.Vector2(r, -0.0005 - 0.0055 * (1 - (r / lr) ** 2))); }
  const lgeo = new THREE.LatheGeometry(prof, 48); lgeo.rotateZ(Math.PI / 2);
  const lens = new THREE.Mesh(lgeo, new THREE.MeshPhysicalMaterial({ color: 0xfff4d0, roughness: 0.08, transmission: 0.85, thickness: 0.5, ior: 1.42, transparent: true, opacity: 0.8, clearcoat: 1 }));
  lensG.add(lens);
  // ciliary muscles (ring)
  const cil = new THREE.Mesh(new THREE.TorusGeometry(0.019, 0.0025, 10, 48), new THREE.MeshStandardMaterial({ color: 0x9c3b3b, roughness: 0.6 })); cil.rotation.y = Math.PI / 2; lensG.add(cil);
  g.setLensBulge = (k) => { lens.scale.x = k; };
  // retina screen
  const RS = 0.026, RES = 256;
  const rc = document.createElement('canvas'); rc.width = RES; rc.height = RES; const rg = rc.getContext('2d');
  const rT = new THREE.CanvasTexture(rc); rT.colorSpace = THREE.SRGBColorSpace;
  const baseT = canvasTexture(256, 256, (c, w, h) => { const grd = c.createRadialGradient(w / 2, h / 2, 4, w / 2, h / 2, w / 2); grd.addColorStop(0, '#d9a07a'); grd.addColorStop(1, '#a8573f'); c.fillStyle = grd; c.fillRect(0, 0, w, h); c.strokeStyle = 'rgba(140,30,30,0.6)'; c.lineWidth = 2; for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; c.beginPath(); c.moveTo(w * 0.62, h * 0.52); c.quadraticCurveTo(w * 0.62 + Math.cos(a) * 60, h * 0.52 + Math.sin(a) * 30, w * 0.62 + Math.cos(a) * 140, h * 0.52 + Math.sin(a) * 120); c.stroke(); } c.fillStyle = '#f1d9a8'; c.beginPath(); c.arc(w * 0.62, h * 0.52, 14, 0, Math.PI * 2); c.fill(); }, { key: 'retinaBase' });
  const retMat = new THREE.MeshStandardMaterial({ map: baseT, emissive: 0xffffff, emissiveMap: rT, emissiveIntensity: 1.8, roughness: 0.9, side: THREE.DoubleSide });
  const retina = new THREE.Mesh(new THREE.CircleGeometry(RS, 64), retMat);
  retina.rotation.y = -Math.PI / 2; retina.position.x = 0.05; g.add(retina);
  const px = RES / (2 * RS);
  g.retina = {
    ctx: rg, px, size: RS, mesh: retina,
    toCanvas: (x, y) => [RES / 2 + x * px, RES / 2 - y * px],
    clear() { rg.save(); rg.globalCompositeOperation = 'source-over'; rg.filter = 'none'; rg.fillStyle = '#000'; rg.fillRect(0, 0, RES, RES); rg.restore(); },
    commit() { rT.needsUpdate = true; },
    sprite(img, { x = 0, y = 0, h = 0.01, blur = 0, alpha = 1, rot180 = true, anchor = [0.5, 0.5] } = {}) {
      const [cx, cy] = this.toCanvas(x, y); const H2 = Math.max(1, h * px), W2 = (H2 * img.width) / img.height;
      rg.save(); rg.globalCompositeOperation = 'lighter'; rg.globalAlpha = clamp01(alpha); rg.filter = blur > 0.3 ? `blur(${blur.toFixed(1)}px)` : 'none';
      rg.translate(cx, cy); if (rot180) rg.scale(-1, -1); rg.drawImage(img, -anchor[0] * W2, -anchor[1] * H2, W2, H2); rg.restore();
    },
  };
  g.retina.clear(); g.retina.commit();
  // optic nerve
  const nerve = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.009, 0.04, 20), new THREE.MeshStandardMaterial({ color: 0xe8d39a, roughness: 0.6 }));
  nerve.rotation.z = Math.PI / 2; nerve.position.set(R + 0.016, 0.004, -0.006); g.add(nerve);
  g.lensX = -0.05; g.retinaX = 0.05; g.lens = lens; g.R = R;
  return g;
}

/* ========================================================== glass tank */
/** Rectangular glass tank (L along x, W along z, H tall) with a live liquid block. Origin at the base centre. */
export function glassTank({ L = 0.2, W = 0.1, H = 0.12, wall = 0.003 } = {}) {
  const g = new THREE.Group(); g.name = 'Glass tank';
  const gm = glass({ tint: 0xeaf7f3, opacity: 0.1, edge: 0.6 });
  const pane = (w, h, d, x, y, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), gm); m.position.set(x, y, z); m.renderOrder = 4; g.add(m); return m; };
  pane(L, wall, W, 0, wall / 2, 0);
  pane(L, H, wall, 0, H / 2, -W / 2 + wall / 2); pane(L, H, wall, 0, H / 2, W / 2 - wall / 2);
  pane(wall, H, W - 2 * wall, -L / 2 + wall / 2, H / 2, 0); pane(wall, H, W - 2 * wall, L / 2 - wall / 2, H / 2, 0);
  const seam = new THREE.MeshStandardMaterial({ color: 0x2a3a3a, roughness: 0.6, transparent: true, opacity: 0.55 });
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) { const s = new THREE.Mesh(new THREE.BoxGeometry(0.003, H, 0.003), seam); s.position.set(sx * (L / 2 - 0.0015), H / 2, sz * (W / 2 - 0.0015)); g.add(s); }
  const liqMat = new THREE.MeshPhysicalMaterial({ color: 0xdff1f7, roughness: 0.05, transparent: true, opacity: 0.16, ior: 1.33, depthWrite: false, clearcoat: 1 });
  const liq = new THREE.Mesh(new THREE.BoxGeometry(L - 2 * wall - 0.0006, 1, W - 2 * wall - 0.0006), liqMat);
  liq.renderOrder = 2; liq.userData.noShadow = true; g.add(liq);
  g.liqMat = liqMat; g.inner = { L: L - 2 * wall, W: W - 2 * wall, bottom: wall };
  g.setLevel = (h) => { g.level = h; liq.visible = h > 0.001; liq.scale.y = Math.max(0.001, h); liq.position.y = wall + h / 2; };
  g.setLevel(0);
  g.L = L; g.W = W; g.H = H;
  return g;
}

/* ================================================ pin-tracing helper */
/**
 * Drives the classic "four-pin" ray-tracing method on a drawingBoard placed at the world origin (unrotated):
 * pencil drawing, protractor, fixing pins, sighting through glass (images of P, Q shifted), removing pins.
 */
export class PinTracer {
  constructor(lab, ui, { board, glassH, colors = [0xdc2626, 0xdc2626, 0x2563eb, 0x2563eb] }) {
    this.lab = lab; this.ui = ui; this.board = board; this.paper = board.paper; this.top = board.topY; this.glassH = glassH;
    const pen = this.pen = pencil(); lab.add(pen);
    this.penRest = new THREE.Vector3(0.228, this.top + 0.0037, 0.135);
    pen.position.copy(this.penRest); pen.rotation.set(-Math.PI / 2, 0, 0.05);
    pen.drawRot = { x: 0.4, y: 0, z: -0.4 }; pen.restRot = { x: -Math.PI / 2, y: 0, z: 0.05 };
    lab.pickable(pen, 'Pencil');
    const pr = this.prot = protractor(); lab.add(pr);
    this.protRest = new THREE.Vector3(0.163, this.top, -0.09); pr.position.copy(this.protRest); pr.rotation.y = -Math.PI / 2;
    lab.pickable(pr, 'Protractor');
    // pins stuck in the board margin, ready to use
    this.pins = colors.map((c, i) => {
      const p = pin({ color: c, splitY: glassH + 0.003 });
      p.home = new THREE.Vector3(0.186 + (i % 2) * 0.014, this.top - 0.003, 0.03 + Math.floor(i / 2) * 0.016);
      p.position.copy(p.home); lab.add(p); return p;
    });
  }
  W(p, y = 0) { return new THREE.Vector3(p.x, this.top + y, p.y); }

  /** Pencil draws the strokes one after another (live on the paper). */
  async draw(strokes, { speed = 0.11 } = {}) {
    const lab = this.lab, pen = this.pen, top = this.top;
    await Promise.all([lab.tween(pen.rotation, { ...pen.drawRot, duration: 0.35 }), lab.tween(pen.position, { y: top + 0.03, duration: 0.35 })]);
    for (const s of [].concat(strokes)) {
      const st = PaperSketch.start(s);
      await lab.tween(pen.position, { x: st.x, y: top + 0.0004, z: st.y, duration: 0.28, ease: 'power2.inOut' });
      s.p = 0; this.paper.add(s);
      const L = PaperSketch.len(s);
      await lab.tween(s, { p: 1, duration: Math.min(1.5, Math.max(0.18, L / speed)), ease: 'none', onUpdate: () => { const q = PaperSketch.tip(s); pen.position.set(q.x, top + 0.0004, q.y); this.paper.redraw(); } });
      this.paper.redraw();
    }
    await lab.tween(pen.position, { y: top + 0.04, duration: 0.2 });
    await Promise.all([
      lab.tween(pen.position, { x: this.penRest.x, y: this.penRest.y, z: this.penRest.z, duration: 0.5, ease: 'power2.inOut' }),
      lab.tween(pen.rotation, { ...pen.restRot, duration: 0.5 }),
    ]);
  }

  /** Student drags (or taps) a pin onto a pencil cross; it is pushed into the board. */
  async fixPin(p, at, label) {
    const lab = this.lab;
    const mk = new THREE.Object3D(); mk.position.copy(this.W(at)); lab.scene.add(mk);
    const tag = lab.tag(p, label, { offset: [0, 0.048, 0], cls: 'mono' });
    await lab.waitDrop(p, mk, { radius: 0.03 });
    lab.scene.remove(mk);
    await lab.carry(p, [at.x, this.top + 0.006, at.y], { lift: 0.04, duration: 0.8 });
    await lab.tween(p.position, { y: this.top - 0.003, duration: 0.22, ease: 'power2.in' });
    lab.sfx('click'); p.tagObj = tag;
    return p;
  }
  /** Stick a pin at a position (student taps it). */
  async stickPin(p, at, label) {
    const lab = this.lab;
    const tag = lab.tag(p, label, { offset: [0, 0.048, 0], cls: 'mono' });
    await lab.waitClick(p);
    await lab.carry(p, [at.x, this.top + 0.006, at.y], { lift: 0.04, duration: 0.8 });
    await lab.tween(p.position, { y: this.top - 0.003, duration: 0.22, ease: 'power2.in' });
    lab.sfx('click'); p.tagObj = tag;
  }

  /**
   * Low view along the emergent ray. imgs: [[pin, imagePos]] (lower parts of P, Q appear there through the glass).
   * movers: [{pin, name, axis:'x'|'z'}] — student slides each until it hides the images. Returns final positions.
   */
  async sight({ imgs, movers, E, dE, text, glassObj }) {
    const lab = this.lab, ui = this.ui, top = this.top;
    const restore = freeCam(lab);
    const gm = glassObj?.body?.material, gsave = gm && { cc: gm.clearcoat, env: gm.envMapIntensity, sp: gm.specularIntensity };
    if (gm) { gm.clearcoat = 0; gm.envMapIntensity = 0.25; gm.specularIntensity = 0.4; }
    imgs.forEach(([p, ip]) => { p.lower.position.x = ip.x - p.position.x; p.lower.position.z = ip.y - p.position.z; });
    const lastP = movers[movers.length - 1].pin.position;
    const far = E.clone().addScaledVector(dE, Math.max(0.075, v2(lastP.x, lastP.z).sub(E).dot(dE)) + 0.05);
    const look = E.clone().addScaledVector(dE, -0.05);
    const eyeY = top + this.glassH * 0.5;
    await lab.focus({ pos: [far.x, eyeY, far.y], target: [look.x, eyeY - 0.002, look.y] }, 1.8);
    const out = [];
    for (const m of movers) {
      const p = m.pin, ax = m.axis;
      const tgt = ax === 'x' ? E.x + (dE.x * (p.position.z - E.y)) / dE.y : E.y + (dE.y * (p.position.x - E.x)) / dE.x;
      const base = p.position[ax];
      const off = () => cross2(dE, v2(p.position.x, p.position.z).sub(E));
      ui.instruct(text(m.name), { sub: 'Drag the pin (or use the slider below) until it exactly hides the images of P and Q seen through the glass.' });
      const ctl = ui.control({ type: 'slider', label: `Move pin ${m.name}`, min: -25, max: 25, step: 0.1, value: 0, format: (v) => `${v > 0 ? '+' : ''}${v.toFixed(1)} mm`, onInput: (v) => { p.position[ax] = base + v / 1000; } });
      const stop = lab.slider(p, { axis: ax, min: base - 0.025, max: base + 0.025, step: 0.0001, label: `Pin ${m.name} — slide sideways`, onChange: (v) => ctl.set(((v - base) * 1000).toFixed(1)) });
      const aligned = () => Math.abs(off()) < 0.00035;
      const ro = lab.onUpdate(() => ui.readout('align', `Pin ${m.name} and images of P, Q`, aligned() ? 'In one line ✓' : 'Not in line', { color: aligned() ? '#22c55e' : '#f59e0b' }));
      await lab.waitUntil(() => aligned() && !lab.drag, { auto: () => lab.tween(p.position, { [ax]: tgt, duration: 1.2, ease: 'power2.inOut', onUpdate: () => ctl.set(((p.position[ax] - base) * 1000).toFixed(1)) }) });
      stop(); ro(); ctl.remove(); lab.unpickable(p);
      p.position[ax] = tgt; // final fine adjustment: the pin now exactly hides both images
      lab.sfx('success');
      out.push(v2(p.position.x, p.position.z));
      await lab.wait(0.6);
    }
    ui.clearReadout('align');
    await lab.wait(0.8);
    await lab.home(1.4);
    imgs.forEach(([p]) => { p.lower.position.x = 0; p.lower.position.z = 0; });
    if (gm) { gm.clearcoat = gsave.cc; gm.envMapIntensity = gsave.env; gm.specularIntensity = gsave.sp; }
    restore();
    return out;
  }

  /** Pull the pins out: each leaves a hole that is circled and labelled. Returns the strokes to draw. */
  async removePins(list) {
    const lab = this.lab, strokes = [];
    for (const [p, label, labelOff] of list) {
      const at = v2(p.position.x, p.position.z);
      lab.untag(p.tagObj); p.tagObj = null;
      await lab.tween(p.position, { y: this.top + 0.02, duration: 0.2 });
      lab.carry(p, [p.home.x, p.home.y, p.home.z], { lift: 0.03, duration: 0.6 }).catch(() => {});
      this.paper.add({ type: 'dot', c: at, r: 0.0005 });
      strokes.push({ type: 'circle', c: at, r: 0.0016 }, { type: 'text', at: at.clone().add(labelOff || v2(0.006, -0.004)), text: label, size: 0.0055 });
      await lab.wait(0.15);
    }
    await lab.wait(0.6);
    return strokes;
  }

  /**
   * Put the protractor at `at` with its 90° mark along direction `refDeg`; read the angle to `rayDeg`.
   * Draws the arc + label on the paper and shows a readout. Returns the angle (deg, rounded to 0.5°).
   */
  async measure({ at, refDeg, rayDeg, label, key, roLabel, color = '#0ea5e9', arcR = 0.011 }) {
    const lab = this.lab, pr = this.prot;
    let rot = (-90 - refDeg) * DEG;
    while (rot - pr.rotation.y > Math.PI) rot -= 2 * Math.PI;
    while (rot - pr.rotation.y < -Math.PI) rot += 2 * Math.PI;
    await lab.carry(pr, [at.x, this.top + 0.0002, at.y], { lift: 0.03, duration: 0.9, rotate: { y: rot } });
    let d = rayDeg - refDeg; while (d > 180) d -= 360; while (d < -180) d += 360;
    const ang = Math.round(Math.abs(d) * 2) / 2;
    const mid = (refDeg + d / 2) * DEG;
    await lab.wait(0.4);
    this.paper.add({ type: 'arc', c: at, r: arcR, a0: refDeg, a1: refDeg + d, color: 'rgba(30,64,175,0.95)' });
    this.paper.add({ type: 'text', at: at.clone().add(v2(Math.cos(mid) * (arcR + 0.006), Math.sin(mid) * (arcR + 0.006))), text: label, size: 0.0048, color: 'rgba(30,64,175,0.95)', italic: true });
    this.ui.readout(key, roLabel, ang.toFixed(1), { unit: '°', color });
    lab.sfx('tick');
    await lab.wait(1.0);
    return ang;
  }
  async parkProtractor() {
    await this.lab.carry(this.prot, [this.protRest.x, this.protRest.y, this.protRest.z], { lift: 0.03, duration: 0.8, rotate: { y: -Math.PI / 2 } });
  }
}
