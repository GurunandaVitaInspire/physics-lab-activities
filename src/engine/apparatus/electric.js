// Electricity & magnetism apparatus (Lessons 11–12): circuit board, dry cells + holder, plug key,
// analog meters with a damped needle, resistance wires, resistors, rheostat, insulated leads with
// crocodile clips, plotting compasses, horseshoe magnet, iron filings, field/force arrows, current-flow dots.
// Units are metres; every factory returns a THREE.Group whose origin sits on its base unless noted.
import * as THREE from 'three';
import { metal, brass, copper, plastic, wood, chrome, paper } from '../materials.js';
import { canvasTexture } from '../textures.js';

const UP = new THREE.Vector3(0, 1, 0);
const _q = new THREE.Quaternion();
const _m = new THREE.Matrix4();
const _s = new THREE.Vector3();
const _p = new THREE.Vector3();
const _e = new THREE.Euler(0, 0, 0, 'YXZ');

/* ================================================================= materials */
export const bakelite = (c = 0x141414) => new THREE.MeshPhysicalMaterial({ color: c, roughness: 0.34, metalness: 0, clearcoat: 0.7, clearcoatRoughness: 0.3 });
export const pvc = (c) => new THREE.MeshPhysicalMaterial({ color: c, roughness: 0.4, metalness: 0, clearcoat: 0.55, clearcoatRoughness: 0.3 });
export const nichromeMat = () => metal({ color: 0xa9a79f, roughness: 0.4 });
export const WIRE = { red: 0xc62828, black: 0x1c1c1c, yellow: 0xe0a800, blue: 0x1e4fd0, green: 0x16803c, white: 0xe8e8e2 };

/** World position of a local point of obj (matrices refreshed). */
export function worldPos(obj, local = [0, 0, 0]) {
  obj.updateWorldMatrix(true, false);
  return obj.localToWorld(Array.isArray(local) ? new THREE.Vector3(...local) : local.clone());
}

/** Flat text decal (plane facing +z). */
export function decal(text, { w = 0.02, font = '700 72px "Segoe UI", Arial', color = '#111', bg = null, pad = 10, key } = {}) {
  const k = key || `dc|${text}|${font}|${color}|${bg}`;
  const probe = document.createElement('canvas').getContext('2d'); probe.font = font;
  const tw = Math.ceil(probe.measureText(text).width + pad * 2), th = Math.ceil(parseInt(font.match(/(\d+)px/)[1], 10) * 1.3 + pad);
  const tex = canvasTexture(tw, th, (g, W, H) => {
    g.clearRect(0, 0, W, H);
    if (bg) { g.fillStyle = bg; g.fillRect(0, 0, W, H); }
    g.font = font; g.fillStyle = color; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, W / 2, H / 2 + 2);
  }, { key: k });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, (w * th) / tw), new THREE.MeshStandardMaterial({ map: tex, transparent: !bg, roughness: 0.6, depthWrite: !!bg }));
  m.raycast = () => {}; m.userData.noShadow = true;
  return m;
}

/* ===================================================================== board */
export function circuitBoard({ w = 0.62, d = 0.36, t = 0.014 } = {}) {
  const g = new THREE.Group(); g.name = 'Circuit board';
  const top = new THREE.Mesh(new THREE.BoxGeometry(w, t, d), wood({ base: '#c08a52', dark: '#6b4423', key: 'plyboard' }));
  top.position.y = t / 2; g.add(top);
  const edgeMat = wood({ base: '#8a5a32', key: 'plyedge' });
  for (const s of [-1, 1]) {
    const e = new THREE.Mesh(new THREE.BoxGeometry(w + 0.004, t + 0.002, 0.006), edgeMat); e.position.set(0, t / 2, s * (d / 2)); g.add(e);
  }
  g.topY = t; g.w = w; g.d = d;
  return g;
}

/** Dashed outline printed on the board, showing where to place a component (also a drop target). */
export function placeMark({ w = 0.1, d = 0.08, label = '', color = '#f8fafc' } = {}) {
  const tex = canvasTexture(512, Math.round((512 * d) / w), (g, W, H) => {
    g.clearRect(0, 0, W, H);
    g.strokeStyle = color; g.globalAlpha = 0.85; g.lineWidth = 8; g.setLineDash([26, 16]);
    g.strokeRect(8, 8, W - 16, H - 16);
    if (label) { g.setLineDash([]); g.fillStyle = color; g.font = '700 56px "Segoe UI", Arial'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(label, W / 2, H / 2); }
  }, { key: `mark|${w}|${d}|${label}|${color}` });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, opacity: 0.9 }));
  m.rotation.x = -Math.PI / 2; m.position.y = 0.0006; m.userData.noShadow = true;
  const g = new THREE.Group(); g.add(m); g.name = 'Place here'; g.mark = m;
  return g;
}

/* ============================================================ binding post */
/** Brass terminal: hex base, threaded stud and knurled nut. `wireY` is where a wire is clamped. */
export function bindingPost({ h = 0.014, collar = null, scale = 1 } = {}) {
  const g = new THREE.Group(); g.name = 'Terminal';
  const B = brass();
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.0052, 0.0058, 0.0032, 6), B); base.position.y = 0.0016; g.add(base);
  const stud = new THREE.Mesh(new THREE.CylinderGeometry(0.0017, 0.0017, h, 10), B); stud.position.y = h / 2; g.add(stud);
  const nut = new THREE.Mesh(new THREE.CylinderGeometry(0.0046, 0.0046, 0.0048, 18), metal({ color: 0xc9a227, roughness: 0.45 })); nut.position.y = h * 0.62; g.add(nut);
  const capMat = collar !== null ? plastic(collar, 0.35) : B;
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.0044, 0.0046, 0.0042, 18), capMat); cap.position.y = h - 0.0021; g.add(cap);
  const dome = new THREE.Mesh(new THREE.SphereGeometry(0.0044, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), capMat); dome.scale.y = 0.4; dome.position.y = h; g.add(dome);
  g.scale.setScalar(scale);
  g.wireY = h * 0.33 * scale; g.topY = h * scale;
  return g;
}

/* ================================================================ dry cell */
function cellTexture() {
  return canvasTexture(1024, 512, (g, w, h) => {
    // canvas top = + end of the cell
    const grd = g.createLinearGradient(0, 0, 0, h);
    grd.addColorStop(0, '#111'); grd.addColorStop(0.2, '#111'); grd.addColorStop(0.205, '#d4a017'); grd.addColorStop(0.225, '#d4a017');
    grd.addColorStop(0.23, '#c0262d'); grd.addColorStop(1, '#a51d24');
    g.fillStyle = grd; g.fillRect(0, 0, w, h);
    for (const x of [896, 384]) {
      g.save(); g.translate(x, h * 0.62); g.rotate(-Math.PI / 2);
      g.fillStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.font = '900 92px "Segoe UI", Arial'; g.fillText('1.5 V', 0, -8);
      g.font = '700 34px "Segoe UI", Arial'; g.fillText('DRY CELL · SIZE D', 0, 64);
      g.restore();
      g.save(); g.translate(x, h * 0.1); g.rotate(-Math.PI / 2); g.fillStyle = '#d4a017'; g.font = '900 70px Arial'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('+', 0, 0); g.restore();
    }
  }, { key: 'dcell' });
}

/** 1.5 V dry cell lying along +x (the + terminal points to +x). Origin at the cell's centre. */
export function dryCell() {
  const g = new THREE.Group(); g.name = 'Dry cell (1.5 V)';
  const r = 0.0165, L = 0.058;
  const body = new THREE.Mesh(new THREE.CylinderGeometry(r, r, L, 40, 1, true), new THREE.MeshPhysicalMaterial({ map: cellTexture(), color: 0xd8d8d8, roughness: 0.5, clearcoat: 0.3, clearcoatRoughness: 0.4, envMapIntensity: 0.6 }));
  body.rotation.z = -Math.PI / 2; g.add(body);
  const capP = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.97, r, 0.0016, 40), metal({ color: 0xc7ccd2, roughness: 0.25 }));
  capP.rotation.z = -Math.PI / 2; capP.position.x = L / 2 + 0.0008; g.add(capP);
  const nub = new THREE.Mesh(new THREE.CylinderGeometry(0.0046, 0.005, 0.003, 24), brass());
  nub.rotation.z = -Math.PI / 2; nub.position.x = L / 2 + 0.003; g.add(nub);
  const capN = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 0.97, 0.0016, 40), metal({ color: 0x9ca3af, roughness: 0.35 }));
  capN.rotation.z = -Math.PI / 2; capN.position.x = -L / 2 - 0.0008; g.add(capN);
  g.radius = r; g.halfLen = L / 2 + 0.0045;
  return g;
}

/**
 * Plastic series holder for `slots` D-cells. Cells point + towards local +x.
 * holder.slotLocal(i) -> centre for cell i; holder.tapLocal(k) -> clip lug after k cells (k = 0 is the − end).
 */
export function batteryHolder({ slots = 4 } = {}) {
  const g = new THREE.Group(); g.name = 'Cell holder';
  const P = 0.066, Lh = slots * P + 0.024, W = 0.042;
  const mat = bakelite(0x1d1d1f);
  const base = new THREE.Mesh(new THREE.BoxGeometry(Lh, 0.006, W), mat); base.position.y = 0.003; g.add(base);
  for (const s of [-1, 1]) {
    const wall = new THREE.Mesh(new THREE.BoxGeometry(Lh, 0.016, 0.003), mat); wall.position.set(0, 0.008 + 0.006, s * (W / 2 - 0.0015)); g.add(wall);
    const end = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.036, W), mat); end.position.set(s * (Lh / 2 - 0.003), 0.018, 0); g.add(end);
  }
  const x0 = -Lh / 2 + 0.012;
  const xs = (k) => x0 + P * k; // junction positions
  const plateX = (k) => xs(k) - (k === 0 ? 0.004 : 0) + (k === slots ? 0.002 : 0);
  const B = brass();
  for (let k = 0; k <= slots; k++) {
    const plate = new THREE.Mesh(new THREE.BoxGeometry(0.0012, 0.03, 0.026), B); plate.position.set(plateX(k), 0.022, 0); g.add(plate);
    const lug = new THREE.Mesh(new THREE.BoxGeometry(0.0012, 0.012, 0.008), B); lug.position.set(plate.position.x, 0.043, 0); g.add(lug);
    const hole = new THREE.Mesh(new THREE.TorusGeometry(0.0018, 0.0006, 6, 14), B); hole.rotation.y = Math.PI / 2; hole.position.set(plate.position.x, 0.045, 0); g.add(hole);
  }
  if (slots > 0) {
    const spring = new THREE.Mesh(new THREE.TorusGeometry(0.0035, 0.0006, 6, 16), chrome());
    spring.rotation.y = Math.PI / 2; spring.position.set(x0 - 0.002, 0.0245, 0); g.add(spring);
  }
  const lbl = decal('−', { w: 0.01, color: '#e5e7eb' }); lbl.rotation.x = -Math.PI / 2; lbl.position.set(x0 - 0.006, 0.0061, W / 2 + 0.004); g.add(lbl);
  g.slotLocal = (i) => new THREE.Vector3(xs(i) + P / 2 - 0.0012, 0.006 + 0.0165, 0);
  g.tapLocal = (k) => new THREE.Vector3(plateX(k), 0.046, 0);
  g.length = Lh; g.slots = slots; g.cells = [];
  return g;
}

/* =================================================================== plug key */
/** Plug key: bakelite base, two brass blocks and a removable brass plug. key.insert(lab) / key.remove(lab). */
export function plugKey() {
  const g = new THREE.Group(); g.name = 'Plug key';
  const base = new THREE.Mesh(new THREE.BoxGeometry(0.078, 0.012, 0.036), bakelite()); base.position.y = 0.006; g.add(base);
  const B = brass();
  const blocks = [];
  for (const s of [-1, 1]) {
    const blk = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.011, 0.022), B); blk.position.set(s * 0.0185, 0.0175, 0); g.add(blk); blocks.push(blk);
    const groove = new THREE.Mesh(new THREE.CylinderGeometry(0.0044, 0.0044, 0.0112, 20, 1, true, s > 0 ? Math.PI : 0, Math.PI), metal({ color: 0x8a6d14, roughness: 0.5 }));
    groove.position.set(s * 0.0034, 0.0175, 0); g.add(groove);
    const screw = new THREE.Mesh(new THREE.CylinderGeometry(0.0022, 0.0022, 0.0012, 12), metal({ color: 0x8a6d14 })); screw.position.set(s * 0.012, 0.0236, 0.006); g.add(screw);
  }
  const posts = [-1, 1].map((s) => { const p = bindingPost({ h: 0.012 }); p.position.set(s * 0.028, 0.023, -0.002); g.add(p); return p; });
  const plug = new THREE.Group(); plug.name = 'Brass plug';
  const taper = new THREE.Mesh(new THREE.CylinderGeometry(0.0043, 0.0029, 0.016, 24), B); taper.position.y = 0.008; plug.add(taper);
  const collarM = new THREE.Mesh(new THREE.CylinderGeometry(0.0052, 0.0052, 0.002, 24), B); collarM.position.y = 0.0168; plug.add(collarM);
  const knob = new THREE.Mesh(new THREE.CylinderGeometry(0.0062, 0.0058, 0.012, 24), bakelite(0x0e0e0e)); knob.position.y = 0.0236; plug.add(knob);
  const top = new THREE.Mesh(new THREE.SphereGeometry(0.0062, 24, 10, 0, Math.PI * 2, 0, Math.PI / 2), bakelite(0x0e0e0e)); top.scale.y = 0.55; top.position.y = 0.0296; plug.add(top);
  g.add(plug);
  const OUT = { x: 0.004, y: 0.0062, z: 0.034, rz: Math.PI / 2 }, IN = { x: 0, y: 0.0102, z: 0 };
  plug.position.set(OUT.x, OUT.y, OUT.z); plug.rotation.z = OUT.rz;
  g.plug = plug; g.closed = false; g.posts = posts;
  g.termLocal = (i) => new THREE.Vector3(posts[i].position.x, 0.023 + posts[i].wireY, posts[i].position.z);
  g.insert = async (lab) => {
    if (g.closed) return;
    const tl = lab.timeline({ paused: true });
    tl.to(plug.position, { y: 0.055, x: 0.002, duration: 0.35, ease: 'power2.out' })
      .to(plug.rotation, { z: 0, duration: 0.35, ease: 'power1.inOut' }, '<')
      .to(plug.position, { x: IN.x, z: IN.z, duration: 0.3, ease: 'power1.inOut' })
      .to(plug.position, { y: IN.y, duration: 0.22, ease: 'power3.in' });
    await lab.play(tl);
    g.closed = true; lab.sfx?.('switch');
  };
  g.remove = async (lab) => {
    if (!g.closed) return;
    g.closed = false; lab.sfx?.('click');
    const tl = lab.timeline({ paused: true });
    tl.to(plug.position, { y: 0.055, duration: 0.3, ease: 'power2.out' })
      .to(plug.position, { x: OUT.x, z: OUT.z, duration: 0.3, ease: 'power1.inOut' })
      .to(plug.rotation, { z: OUT.rz, duration: 0.3 }, '<')
      .to(plug.position, { y: OUT.y, duration: 0.22, ease: 'power2.in' });
    await lab.play(tl);
  };
  return g;
}

/* ======================================================================= meters */
/** Range specs for dials. */
export const RANGE = {
  A1: { max: 1, minor: 0.02, major: 0.1, label: 0.2, name: '0–1 A' },
  A3: { max: 3, minor: 0.05, major: 0.5, label: 0.5, name: '0–3 A' },
  A5: { max: 5, minor: 0.1, major: 0.5, label: 1, name: '0–5 A' },
  V5: { max: 5, minor: 0.1, major: 0.5, label: 1, name: '0–5 V' },
  V10: { max: 10, minor: 0.2, major: 1, label: 2, name: '0–10 V' },
};
const SWEEP = 0.87; // half-angle of the scale arc (rad)
/** Faint diagonal reflections that make a flat cover glass read as glass without washing out the dial. */
function glassGlint() {
  return canvasTexture(256, 192, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    const band = (x0, wd, a) => {
      const grd = g.createLinearGradient(x0, 0, x0 + wd, 0);
      grd.addColorStop(0, 'rgba(255,255,255,0)'); grd.addColorStop(0.5, `rgba(255,255,255,${a})`); grd.addColorStop(1, 'rgba(255,255,255,0)');
      g.save(); g.transform(1, 0, -0.55, 1, 0, 0); g.fillStyle = grd; g.fillRect(x0, 0, wd, h); g.restore();
    };
    band(110, 70, 0.16); band(200, 26, 0.12); band(20, 18, 0.07);
  }, { key: 'glassGlint' });
}
const DIAL = { W: 1024, H: 680, px: 512, py: 640, R1: 470 };

function dialTexture({ letter, title, ranges, key }) {
  return canvasTexture(DIAL.W, DIAL.H, (g, w, h) => {
    const { px, py, R1 } = DIAL;
    const grd = g.createRadialGradient(w / 2, h * 0.55, 50, w / 2, h * 0.55, w * 0.7);
    grd.addColorStop(0, '#fbf9f1'); grd.addColorStop(1, '#ebe6d6');
    g.fillStyle = grd; g.fillRect(0, 0, w, h);
    const ang = (f) => -Math.PI / 2 + SWEEP * (2 * f - 1);
    const near = (v, step) => Math.abs(v / step - Math.round(v / step)) < 1e-6;
    const fmt = (v) => (Math.abs(v) < 1e-9 ? '0' : Number.isInteger(+v.toFixed(6)) ? String(Math.round(v)) : String(+v.toFixed(2)));
    ranges.forEach((rg, j) => {
      const R = j === 0 ? R1 : R1 - 118;
      const col = j === 0 ? '#111' : '#b3261e';
      g.strokeStyle = col; g.fillStyle = col; g.lineWidth = 3;
      g.beginPath(); g.arc(px, py, R, ang(0), ang(1)); g.stroke();
      const n = Math.round(rg.max / rg.minor);
      for (let i = 0; i <= n; i++) {
        const v = i * rg.minor, a = ang(v / rg.max);
        const major = near(v, rg.major), half = !major && near(v, rg.major / 2);
        const len = major ? 40 : half ? 28 : 17;
        g.lineWidth = major ? 4 : 2;
        const dir = j === 0 ? -1 : 1; // outer scale ticks inward, inner scale ticks outward
        g.beginPath(); g.moveTo(px + Math.cos(a) * R, py + Math.sin(a) * R); g.lineTo(px + Math.cos(a) * (R + dir * len), py + Math.sin(a) * (R + dir * len)); g.stroke();
        if (near(v, rg.label)) {
          g.font = `${j === 0 ? 700 : 600} ${j === 0 ? 44 : 36}px "Segoe UI", Arial`; g.textAlign = 'center'; g.textBaseline = 'middle';
          const rr = j === 0 ? R + 34 : R - 30;
          g.fillText(fmt(v), px + Math.cos(a) * rr, py + Math.sin(a) * rr);
        }
      }
    });
    // anti-parallax mirror strip just inside the main scale
    const mR = R1 - 60;
    const mg = g.createLinearGradient(0, py - mR, 0, py - mR + 40);
    mg.addColorStop(0, '#9aa5b1'); mg.addColorStop(0.5, '#e8edf2'); mg.addColorStop(1, '#8a95a1');
    g.strokeStyle = mg; g.lineWidth = 14; g.beginPath(); g.arc(px, py, mR, ang(0) + 0.01, ang(1) - 0.01); g.stroke();
    // letter, title, marks
    g.fillStyle = '#b3261e'; g.font = '800 120px "Segoe UI", Arial'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(letter, px, py - 175);
    g.fillStyle = '#222'; g.font = '700 30px "Segoe UI", Arial';
    g.fillText(title, px, py - 92);
    g.font = '600 26px "Segoe UI", Arial'; g.textAlign = 'left'; g.fillText('DC  ⎓', 40, h - 40);
    g.textAlign = 'right'; g.fillText('CLASS 2.5  ⊓', w - 40, h - 40);
    if (ranges.length > 1) {
      g.textAlign = 'left'; g.font = '700 26px "Segoe UI", Arial';
      g.fillStyle = '#111'; g.fillText('▬ ' + ranges[0].name, 40, 44);
      g.fillStyle = '#b3261e'; g.fillText('▬ ' + ranges[1].name, 40, 80);
    }
  }, { key });
}

/**
 * Desk-type analog meter (ammeter/voltmeter/galvanometer). Face slopes towards the student (+z).
 * meter.setValue(v) sets the true value; the needle follows with a damped (slightly under-damped) swing.
 * meter.reading -> what the needle shows now. meter.termLocal('+'|'-') -> wire point of a terminal.
 */
export class Meter extends THREE.Group {
  constructor({ letter = 'A', title = 'DC AMMETER', ranges = [RANGE.A1], range = 0, plusLeft = false } = {}) {
    super();
    this.name = title;
    this.ranges = ranges; this.range = range;
    this.value = 0; this.f = 0; this.vel = 0;
    this.omega = 8.5; this.zeta = 0.38;
    const W = 0.11;
    const shp = new THREE.Shape();
    shp.moveTo(0.04, 0); shp.lineTo(0.04, 0.018); shp.lineTo(-0.022, 0.055); shp.lineTo(-0.04, 0.055); shp.lineTo(-0.04, 0); shp.closePath();
    const geo = new THREE.ExtrudeGeometry(shp, { depth: W, bevelEnabled: true, bevelThickness: 0.0015, bevelSize: 0.0015, bevelSegments: 2, curveSegments: 4 });
    geo.translate(0, 0, -W / 2);
    const caseM = new THREE.Mesh(geo, bakelite(0x18191b)); caseM.rotation.y = -Math.PI / 2; caseM.position.y = 0.0015; this.add(caseM);
    // sloping dial
    const zA = 0.04, yA = 0.018 + 0.0015, zB = -0.022, yB = 0.055 + 0.0015;
    const len = Math.hypot(zA - zB, yB - yA), nz = (yB - yA) / len, ny = (zA - zB) / len;
    const face = new THREE.Group();
    face.position.set(0, (yA + yB) / 2 + 0.0015 + ny * 0.0016, (zA + zB) / 2 + nz * 0.0016);
    face.rotation.x = -Math.atan2(ny, nz);
    this.add(face);
    const FW = 0.09, FH = (FW * DIAL.H) / DIAL.W, s = FW / DIAL.W;
    const tex = dialTexture({ letter, title, ranges, key: `dial|${letter}|${title}|${ranges.map((r) => r.name).join(',')}` });
    const dial = new THREE.Mesh(new THREE.PlaneGeometry(FW, FH), new THREE.MeshBasicMaterial({ map: tex, color: 0xe4e0d4 })); face.add(dial);
    const bez = bakelite(0x0f0f10);
    for (const [bw, bh, bx, by] of [[FW + 0.008, 0.004, 0, FH / 2 + 0.002], [FW + 0.008, 0.004, 0, -FH / 2 - 0.002], [0.004, FH, FW / 2 + 0.002, 0], [0.004, FH, -FW / 2 - 0.002, 0]]) {
      const b = new THREE.Mesh(new THREE.BoxGeometry(bw, bh, 0.0036), bez); b.position.set(bx, by, 0.0012); face.add(b);
    }
    const pivotY = (DIAL.H / 2 - DIAL.py) * s;
    this.needle = new THREE.Group(); this.needle.position.set(0, pivotY, 0.0011); face.add(this.needle);
    const nLen = (DIAL.R1 - 6) * s;
    const nGeo = new THREE.BoxGeometry(0.0006, nLen, 0.0003); nGeo.translate(0, nLen / 2, 0);
    const nMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.5 });
    const nd = new THREE.Mesh(nGeo, nMat); this.needle.add(nd);
    const tip = new THREE.Mesh(new THREE.BoxGeometry(0.0003, nLen * 0.35, 0.00032), new THREE.MeshStandardMaterial({ color: 0x7f1d1d, roughness: 0.5 })); tip.position.y = nLen * 0.82; this.needle.add(tip);
    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.0022, 0.006, 0.0006), nMat); tail.position.y = -0.003; this.needle.add(tail);
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.0026, 0.0026, 0.0016, 20), metal({ color: 0x2a2a2a, roughness: 0.4 })); cap.rotation.x = Math.PI / 2; cap.position.set(0, pivotY, 0.0014); face.add(cap);
    const gl = new THREE.Mesh(new THREE.PlaneGeometry(FW + 0.004, FH + 0.004), new THREE.MeshBasicMaterial({ map: glassGlint(), transparent: true, depthWrite: false }));
    gl.position.z = 0.0031; gl.renderOrder = 4; gl.raycast = () => {}; face.add(gl);
    const screw = new THREE.Mesh(new THREE.CylinderGeometry(0.0028, 0.0028, 0.0012, 16), bakelite(0x2a2a2a)); screw.rotation.x = Math.PI / 2; screw.position.set(0, -FH / 2 - 0.0045, 0.0008); face.add(screw);
    this.face = face; this.dialSize = [FW, FH];
    // terminals on the back ledge (− left/black, + right/red)
    const ledgeY = 0.055 + 0.003;
    this.posts = {};
    const ps = plusLeft ? -1 : 1;
    for (const [sgn, x, col] of [['-', -0.032 * ps, 0x111111], ['+', 0.032 * ps, 0xb91c1c]]) {
      const p = bindingPost({ h: 0.013, collar: col }); p.position.set(x, ledgeY, -0.031); this.add(p); this.posts[sgn] = p;
      const d = decal(sgn === '+' ? '+' : '−', { w: 0.007, color: sgn === '+' ? '#ef4444' : '#e5e7eb', font: '900 90px Arial' });
      d.rotation.x = -Math.PI / 2; d.position.set(x - Math.sign(x) * 0.011, ledgeY + 0.0003, -0.031); this.add(d);
    }
    if (ranges.length > 1) {
      const knob = new THREE.Group(); knob.position.set(0, ledgeY, -0.031); this.add(knob);
      const kb = new THREE.Mesh(new THREE.CylinderGeometry(0.0062, 0.0068, 0.008, 24), bakelite(0x0c0c0c)); kb.position.y = 0.004; knob.add(kb);
      const ln = new THREE.Mesh(new THREE.BoxGeometry(0.0012, 0.0006, 0.0055), new THREE.MeshStandardMaterial({ color: 0xffffff })); ln.position.set(0, 0.0082, -0.0025); knob.add(ln);
      this.knob = knob; knob.name = 'Range switch';
      this._setKnob();
    }
    // name plate on the front strip
    const np = decal(`${title.replace('DC ', '')}   ${ranges.map((r) => r.name).join(' / ')}`, { w: 0.085, color: '#e7e2d3', font: '700 54px "Segoe UI", Arial', bg: '#1f2023' });
    np.position.set(0, 0.0105, 0.04 + 0.0018); this.add(np);
  }
  _setKnob() { if (this.knob) this.knob.rotation.y = this.range === 0 ? 0.6 : -0.6; }
  setRange(i) { this.range = i; this._setKnob(); }
  get fullScale() { return this.ranges[this.range].max; }
  get reading() { return this.f * this.fullScale; }
  setValue(v) { this.value = v; }
  termLocal(sign) { const p = this.posts[sign]; return new THREE.Vector3(p.position.x, p.position.y + p.wireY, p.position.z); }
  /** True once the needle has (almost) stopped. */
  get settled() { return Math.abs(this.vel) < 0.01 && Math.abs(this.f - THREE.MathUtils.clamp(this.value / this.fullScale, -0.035, 1.06)) < 0.004; }
  update(dt) {
    const tgt = THREE.MathUtils.clamp(this.value / this.fullScale, -0.04, 1.08);
    const n = Math.max(1, Math.ceil(dt / 0.006)), h = dt / n, w = this.omega, z = this.zeta;
    for (let i = 0; i < n; i++) {
      const a = w * w * (tgt - this.f) - 2 * z * w * this.vel;
      this.vel += a * h; this.f += this.vel * h;
      if (this.f > 1.06) { this.f = 1.06; if (this.vel > 0) this.vel *= -0.3; }
      if (this.f < -0.035) { this.f = -0.035; if (this.vel < 0) this.vel *= -0.3; }
    }
    this.needle.rotation.z = -SWEEP * (2 * this.f - 1);
  }
}

/* ================================================================ resistance wires */
function stickerTexture(lines, key) {
  return canvasTexture(512, 96, (g, w, h) => {
    g.fillStyle = '#f7f3e6'; g.fillRect(0, 0, w, h);
    g.strokeStyle = '#94a3b8'; g.lineWidth = 3; g.strokeRect(2, 2, w - 4, h - 4);
    g.fillStyle = '#111'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = '800 40px "Segoe UI", Arial'; g.fillText(lines[0], w / 2, lines[1] ? 32 : h / 2);
    if (lines[1]) { g.font = '600 28px "Segoe UI", Arial'; g.fillStyle = '#334155'; g.fillText(lines[1], w / 2, 70); }
  }, { key });
}

/**
 * A resistance wire stretched between two brass terminals on a wooden strip, along local x.
 * wireStrip.endLocal(0|1) -> wire point at the left/right terminal.
 */
export function wireStrip({ len = 0.1, wireR = 0.0006, material = 'nichrome', title = 'Nichrome', sub = '', ends = null } = {}) {
  const g = new THREE.Group(); g.name = title;
  const L = len + 0.05;
  const strip = new THREE.Mesh(new THREE.BoxGeometry(L, 0.01, 0.03), wood({ base: '#8f6136', dark: '#4e2c14', key: 'stripwood2' })); strip.position.y = 0.005; g.add(strip);
  const px = len / 2 + 0.012;
  const posts = [-1, 1].map((sx) => { const p = bindingPost({ h: 0.012 }); p.position.set(sx * px, 0.01, -0.004); g.add(p); return p; });
  const wy = 0.01 + posts[0].wireY;
  const mat = material === 'copper' ? copper() : nichromeMat();
  const w = new THREE.Mesh(new THREE.CylinderGeometry(wireR, wireR, 2 * px, 10), mat); w.rotation.z = Math.PI / 2; w.position.set(0, wy, -0.004); g.add(w);
  for (const sx of [-1, 1]) { const loop = new THREE.Mesh(new THREE.TorusGeometry(0.0021, wireR * 0.9, 6, 16), mat); loop.rotation.x = Math.PI / 2; loop.position.set(sx * px, wy, -0.004); g.add(loop); }
  const st = new THREE.Mesh(new THREE.PlaneGeometry(Math.min(0.1, len * 0.8), 0.0095), new THREE.MeshStandardMaterial({ map: stickerTexture([title, sub], `st|${title}|${sub}`), color: 0xbab4a6, roughness: 0.9, envMapIntensity: 0.3 }));
  st.rotation.x = -Math.PI / 2; st.position.set(0, 0.0102, 0.0088); g.add(st);
  if (ends) ends.forEach((t, i) => { const d = decal(t, { w: 0.011, color: '#111', font: '900 80px "Segoe UI", Arial' }); d.rotation.x = -Math.PI / 2; d.position.set((i ? 1 : -1) * (px + 0.011), 0.0102, 0.006); g.add(d); });
  g.wire = w; g.len = len;
  g.endLocal = (i) => new THREE.Vector3((i ? 1 : -1) * px, wy, -0.004);
  return g;
}

/** Ceramic (cement) power resistor on a bakelite base with two terminals. */
export function powerResistor({ ohms = 5, watts = 10, name = 'R' } = {}) {
  const g = new THREE.Group(); g.name = `${name} = ${ohms} Ω`;
  const base = new THREE.Mesh(new THREE.BoxGeometry(0.092, 0.008, 0.03), bakelite(0x2b2118)); base.position.y = 0.004; g.add(base);
  const bodyTex = canvasTexture(512, 128, (c, w, h) => {
    c.fillStyle = '#f2efe6'; c.fillRect(0, 0, w, h);
    for (let i = 0; i < 1400; i++) { c.fillStyle = `rgba(120,110,90,${Math.random() * 0.08})`; c.fillRect(Math.random() * w, Math.random() * h, 2, 2); }
    c.fillStyle = '#1f2937'; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.font = '800 64px "Segoe UI", Arial'; c.fillText(`${ohms} Ω`, w * 0.36, h / 2 + 2);
    c.font = '600 36px "Segoe UI", Arial'; c.fillText(`${watts} W ±5%`, w * 0.76, h / 2 + 2);
  }, { key: `res|${ohms}|${watts}` });
  const bodyMat = new THREE.MeshStandardMaterial({ map: bodyTex, color: 0xc9c5bb, roughness: 0.95, envMapIntensity: 0.3 });
  const plain = new THREE.MeshStandardMaterial({ color: 0xbdb9b0, roughness: 0.95, envMapIntensity: 0.3 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.013, 0.013), [plain, plain, bodyMat, plain, bodyMat, plain]);
  body.position.y = 0.008 + 0.009; g.add(body);
  const posts = [-1, 1].map((sx) => { const p = bindingPost({ h: 0.012 }); p.position.set(sx * 0.038, 0.008, 0); g.add(p); return p; });
  const tin = metal({ color: 0xd4d4d8, roughness: 0.3 });
  for (const sx of [-1, 1]) {
    const lead = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(sx * 0.025, 0.017, 0), new THREE.Vector3(sx * 0.031, 0.017, 0), new THREE.Vector3(sx * 0.036, 0.013, 0), new THREE.Vector3(sx * 0.038, 0.008 + posts[0].wireY, 0)]), 12, 0.0005, 6), tin);
    g.add(lead);
  }
  const tag = decal(name, { w: 0.014, color: '#fde68a', font: '900 80px "Segoe UI", Arial' }); tag.rotation.x = -Math.PI / 2; tag.position.set(0, 0.0081, 0.0115); g.add(tag);
  g.ohms = ohms;
  g.endLocal = (i) => new THREE.Vector3((i ? 1 : -1) * 0.038, 0.008 + posts[0].wireY, 0);
  return g;
}

/** Brass connector strip with `n` terminals along local z (spacing `gap`). */
export function connectorStrip({ n = 4, gap = 0.06 } = {}) {
  const g = new THREE.Group(); g.name = 'Connector strip';
  const L = (n - 1) * gap + 0.02;
  const base = new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.006, L), bakelite(0x1f1f1f)); base.position.y = 0.003; g.add(base);
  const bar = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.002, L - 0.006), metal({ color: 0xb08a2a, roughness: 0.55 })); bar.position.y = 0.007; g.add(bar);
  const z0 = -((n - 1) * gap) / 2;
  const posts = Array.from({ length: n }, (_, i) => { const p = bindingPost({ h: 0.011 }); p.position.set(0, 0.006, z0 + i * gap); g.add(p); return p; });
  g.postLocal = (i) => new THREE.Vector3(0, 0.006 + posts[i].wireY, z0 + i * gap);
  return g;
}

/* ====================================================================== rheostat */
function windingTexture() {
  return canvasTexture(256, 2048, (g, w, h) => {
    g.fillStyle = '#3a2a1c'; g.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 5) {
      const grd = g.createLinearGradient(0, y, 0, y + 4);
      grd.addColorStop(0, '#6b4a2c'); grd.addColorStop(0.5, '#c49a6c'); grd.addColorStop(1, '#5a3c22');
      g.fillStyle = grd; g.fillRect(0, y, w, 4);
    }
    // bright track where the slider contact has scraped the enamel (faces up after rotation)
    g.fillStyle = 'rgba(235,205,160,0.55)'; g.fillRect(w * 0.72, 0, w * 0.06, h);
  }, { key: 'rheoWind' });
}

/**
 * Sliding rheostat along local x. rheo.slider moves in x between rheo.minX..rheo.maxX.
 * rheo.fraction() -> 0 at the A end (left) … 1 at the B end. Terminals: termLocal('A'|'B'|'C').
 */
export function rheostat({ len = 0.22 } = {}) {
  const g = new THREE.Group(); g.name = 'Rheostat';
  const yC = 0.042, R = 0.017;
  const tube = new THREE.Mesh(new THREE.CylinderGeometry(R, R, len, 40, 1, true), new THREE.MeshStandardMaterial({ map: windingTexture(), roughness: 0.45, metalness: 0.55 }));
  tube.rotation.z = -Math.PI / 2; tube.position.y = yC; g.add(tube);
  const cast = metal({ color: 0x5b6470, roughness: 0.5, metalness: 0.7 });
  for (const sx of [-1, 1]) {
    const plate = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.08, 0.05), cast); plate.position.set(sx * (len / 2 + 0.006), 0.04, 0); g.add(plate);
    const foot = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.006, 0.06), cast); foot.position.set(sx * (len / 2 + 0.006), 0.003, 0); g.add(foot);
    const capE = new THREE.Mesh(new THREE.CylinderGeometry(R * 1.05, R * 1.05, 0.004, 32), metal({ color: 0x7a5a3a, roughness: 0.5 })); capE.rotation.z = Math.PI / 2; capE.position.set(sx * (len / 2 - 0.001), yC, 0); g.add(capE);
  }
  const rod = new THREE.Mesh(new THREE.BoxGeometry(len + 0.016, 0.006, 0.006), chrome()); rod.position.set(0, 0.078, 0); g.add(rod);
  const slider = new THREE.Group(); slider.name = 'Rheostat slider';
  const blk = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.012, 0.014), brass()); blk.position.y = 0.078; slider.add(blk);
  const spring = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.02, 0.003), metal({ color: 0xb08a3a, roughness: 0.35 })); spring.position.set(0, 0.064, 0); slider.add(spring);
  const knob = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.0068, 0.014, 20), bakelite(0x0d0d0d)); knob.position.y = 0.091; slider.add(knob);
  g.add(slider);
  const posts = {
    A: (() => { const p = bindingPost({ h: 0.012 }); p.position.set(-len / 2 - 0.006, 0.08, 0.016); g.add(p); return p; })(),
    B: (() => { const p = bindingPost({ h: 0.012 }); p.position.set(len / 2 + 0.006, 0.08, 0.016); g.add(p); return p; })(),
    C: (() => { const p = bindingPost({ h: 0.012 }); p.position.set(len / 2 + 0.006, 0.081, -0.012); g.add(p); return p; })(),
  };
  g.slider = slider; g.minX = -len / 2 + 0.012; g.maxX = len / 2 - 0.012;
  g.fraction = () => (slider.position.x - g.minX) / (g.maxX - g.minX);
  g.setFraction = (f) => { slider.position.x = g.minX + f * (g.maxX - g.minX); };
  g.termLocal = (k) => { const p = posts[k]; return new THREE.Vector3(p.position.x, p.position.y + p.wireY, p.position.z); };
  return g;
}

/* ============================================================== leads and clips */
/** Crocodile clip: jaws point along local −y, origin at the jaw tip. */
export function crocClip(color = WIRE.red) {
  const g = new THREE.Group(); g.name = 'Crocodile clip';
  const steel = metal({ color: 0xc8ccd0, roughness: 0.3 });
  for (const s of [-1, 1]) {
    const jaw = new THREE.Mesh(new THREE.BoxGeometry(0.0055, 0.016, 0.0009), steel);
    jaw.position.set(0, 0.008, s * 0.0016); jaw.rotation.x = s * 0.12; g.add(jaw);
  }
  const hinge = new THREE.Mesh(new THREE.CylinderGeometry(0.0012, 0.0012, 0.008, 8), steel); hinge.rotation.x = Math.PI / 2; hinge.position.y = 0.014; g.add(hinge);
  const boot = new THREE.Mesh(new THREE.CylinderGeometry(0.0034, 0.0052, 0.016, 14), pvc(color)); boot.position.y = 0.023; boot.scale.z = 0.75; g.add(boot);
  return g;
}

/**
 * Insulated flexible lead between two world points, with a natural drape and optional crocodile clips.
 * lead.set(a, b, { via, liftA, liftB, floorY }) rebuilds it. lead.reveal (0..1) draws it progressively.
 */
export class Lead extends THREE.Group {
  constructor({ color = WIRE.red, r = 0.0015, clipA = false, clipB = false } = {}) {
    super();
    this.name = 'Connecting wire';
    this.r = r; this.color = color;
    this.mesh = new THREE.Mesh(new THREE.BufferGeometry(), pvc(color));
    this.mesh.castShadow = true; this.add(this.mesh);
    this.clipA = clipA ? crocClip(color) : null; this.clipB = clipB ? crocClip(color) : null;
    if (this.clipA) this.add(this.clipA);
    if (this.clipB) this.add(this.clipB);
    this._reveal = 1; this.curve = null; this.a = new THREE.Vector3(); this.b = new THREE.Vector3();
  }
  get reveal() { return this._reveal; }
  set reveal(k) {
    this._reveal = k;
    const ix = this.mesh.geometry.index;
    if (ix) this.mesh.geometry.setDrawRange(0, Math.floor((ix.count * Math.max(0, Math.min(1, k))) / 6) * 6);
    if (this.clipA) this.clipA.visible = k > 0.02;
    if (this.clipB) this.clipB.visible = k > 0.98;
  }
  set(a, b, { via = [], liftA, liftB, floorY = null, sag = 0.4 } = {}) {
    this.a.copy(a); this.b.copy(b); this.opts = { via, liftA, liftB, floorY, sag };
    const r = this.r, fy = floorY !== null ? floorY + r : null;
    liftA ??= this.clipA ? 0.035 : 0.012; liftB ??= this.clipB ? 0.035 : 0.012;
    const A1 = a.clone().add(new THREE.Vector3(0, liftA, 0)), B1 = b.clone().add(new THREE.Vector3(0, liftB, 0));
    const vias = via.map((v) => (v.length === 2 ? new THREE.Vector3(v[0], fy ?? Math.min(a.y, b.y), v[1]) : new THREE.Vector3(...v)));
    const ends = [];
    const place = (clip, tip, from) => {
      const dir = tip.clone().sub(from).normalize();
      clip.position.copy(tip); clip.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), dir);
      return tip.clone().addScaledVector(dir, -0.03);
    };
    const pA = this.clipA ? place(this.clipA, a, A1.clone().add(new THREE.Vector3(0, 0, 0))) : a.clone();
    const pB = this.clipB ? place(this.clipB, b, B1) : b.clone();
    ends.push(pA);
    if (!this.clipA) ends.push(A1); else ends.push(A1.clone().add(new THREE.Vector3(0, 0.008, 0)));
    if (vias.length) ends.push(...vias);
    else {
      const d = Math.hypot(A1.x - B1.x, A1.z - B1.z);
      if (fy !== null && d > 0.06) {
        for (const k of [0.3, 0.7]) { const p = A1.clone().lerp(B1, k); p.y = fy; ends.push(p); }
      } else if (d > 0.02) {
        const p = A1.clone().lerp(B1, 0.5); p.y = Math.max(fy ?? -1, Math.min(A1.y, B1.y) - sag * d * 0.35); ends.push(p);
      }
    }
    ends.push(this.clipB ? B1.clone().add(new THREE.Vector3(0, 0.008, 0)) : B1);
    ends.push(pB);
    this.curve = new THREE.CatmullRomCurve3(ends, false, 'centripetal', 0.5);
    if (fy !== null) { // keep the drape above the board: clamp a dense resampling
      const pts = this.curve.getSpacedPoints(Math.max(40, Math.round(this.curve.getLength() * 300)));
      const lo = Math.min(fy, a.y, b.y);
      pts.forEach((p) => { if (p.y < lo) p.y = lo; });
      this.curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal', 0.5);
    }
    const L = this.curve.getLength();
    const old = this.mesh.geometry;
    this.mesh.geometry = new THREE.TubeGeometry(this.curve, Math.max(24, Math.min(180, Math.round(L * 420))), r, 8, false);
    old.dispose();
    this.reveal = this._reveal;
    return this;
  }
  /** Points along the conductor from a to b (for current-flow dots). */
  points(n = 30) {
    if (!this.curve) return [];
    const pts = this.curve.getSpacedPoints(n);
    if (this.clipA) pts.unshift(this.a.clone());
    if (this.clipB) pts.push(this.b.clone());
    return pts;
  }
  /** Animate drawing the wire on. */
  grow(lab, duration = 0.8) { this.reveal = 0; return lab.tween(this, { reveal: 1, duration, ease: 'power1.inOut' }); }
}

/** Thick bare conductor along a polyline with rounded bends (e.g. the vertical copper wire). */
export function bentWire(points, { r = 0.0022, bend = 0.012, material } = {}) {
  const P = points.map((p) => new THREE.Vector3(...p));
  const path = new THREE.CurvePath();
  let cur = P[0].clone();
  for (let i = 1; i < P.length - 1; i++) {
    const a = P[i - 1], b = P[i], c = P[i + 1];
    const d1 = b.clone().sub(a), d2 = c.clone().sub(b);
    const r1 = Math.min(bend, d1.length() / 2), r2 = Math.min(bend, d2.length() / 2);
    const p1 = b.clone().addScaledVector(d1.normalize(), -r1), p2 = b.clone().addScaledVector(d2.normalize(), r2);
    path.add(new THREE.LineCurve3(cur, p1)); path.add(new THREE.QuadraticBezierCurve3(p1, b.clone(), p2)); cur = p2;
  }
  path.add(new THREE.LineCurve3(cur, P[P.length - 1]));
  const m = new THREE.Mesh(new THREE.TubeGeometry(path, 200, r, 12, false), material || copper());
  m.path = path; m.name = 'Thick copper wire';
  return m;
}

/* =============================================================== current flow */
/** Little glowing chevrons that travel along a path in the direction of conventional current. */
export class CurrentFlow extends THREE.Group {
  constructor({ color = 0xffd54a, size = 0.0032, max = 220, spacing = 0.026 } = {}) {
    super();
    this.spacing = spacing; this.speed = 0; this.offset = 0; this.on = false; this.lengths = [0]; this.pts = [];
    const geo = new THREE.ConeGeometry(size * 0.55, size * 1.7, 8);
    const mat = new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(2.2), toneMapped: false, transparent: true, opacity: 0.95, depthWrite: false });
    this.mesh = new THREE.InstancedMesh(geo, mat, max); this.mesh.frustumCulled = false; this.mesh.raycast = () => {};
    this.mesh.count = 0; this.add(this.mesh); this.max = max; this.renderOrder = 6;
  }
  setPath(points) {
    this.pts = points.map((p) => p.clone());
    this.lengths = [0];
    for (let i = 1; i < this.pts.length; i++) this.lengths.push(this.lengths[i - 1] + this.pts[i].distanceTo(this.pts[i - 1]));
    this.total = this.lengths[this.lengths.length - 1] || 0;
  }
  _at(s, outP, outD) {
    const L = this.lengths; let lo = 0, hi = L.length - 1;
    while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (L[mid] <= s) lo = mid; else hi = mid; }
    const a = this.pts[lo], b = this.pts[hi], seg = Math.max(1e-6, L[hi] - L[lo]);
    outP.copy(a).lerp(b, (s - L[lo]) / seg); outD.subVectors(b, a).normalize();
  }
  update(dt) {
    if (!this.on || !this.total || this.speed <= 0) { this.mesh.count = 0; return; }
    this.offset = (this.offset + this.speed * dt) % this.spacing;
    const n = Math.min(this.max, Math.floor(this.total / this.spacing));
    const d = new THREE.Vector3();
    for (let i = 0; i < n; i++) {
      const s = (this.offset + i * this.spacing) % this.total;
      this._at(s, _p, d);
      _q.setFromUnitVectors(UP, d);
      _m.compose(_p, _q, _s.set(1, 1, 1)); this.mesh.setMatrixAt(i, _m);
    }
    this.mesh.count = n; this.mesh.instanceMatrix.needsUpdate = true;
  }
}

/* ======================================================================= compass */
function compassDialTexture() {
  return canvasTexture(256, 256, (g, w, h) => {
    g.fillStyle = '#fbfaf5'; g.beginPath(); g.arc(w / 2, h / 2, w / 2, 0, Math.PI * 2); g.fill();
    g.strokeStyle = '#1f2937'; g.lineWidth = 4; g.beginPath(); g.arc(w / 2, h / 2, w / 2 - 6, 0, Math.PI * 2); g.stroke();
    for (let i = 0; i < 36; i++) { const a = (i / 36) * Math.PI * 2, l = i % 9 === 0 ? 22 : 10; g.lineWidth = i % 9 === 0 ? 4 : 2; g.beginPath(); g.moveTo(w / 2 + Math.sin(a) * (w / 2 - 8), h / 2 - Math.cos(a) * (h / 2 - 8)); g.lineTo(w / 2 + Math.sin(a) * (w / 2 - 8 - l), h / 2 - Math.cos(a) * (h / 2 - 8 - l)); g.stroke(); }
    g.fillStyle = '#b91c1c'; g.font = '900 46px Arial'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('N', w / 2, 46);
  }, { key: 'compassDial' });
}

/** Small plotting compass. setField(bx, bz) (any units); the needle swings to point along the field (N end red). */
export class PlotCompass extends THREE.Group {
  constructor({ r = 0.0075 } = {}) {
    super(); this.name = 'Compass needle';
    const rim = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 1.02, 0.004, 32), brass()); rim.position.y = 0.002; this.add(rim);
    const dial = new THREE.Mesh(new THREE.CircleGeometry(r * 0.9, 32), new THREE.MeshStandardMaterial({ map: compassDialTexture(), color: 0xc9c6be, roughness: 0.85, envMapIntensity: 0.3 }));
    dial.rotation.x = -Math.PI / 2; dial.position.y = 0.0041; this.add(dial);
    const needle = new THREE.Group(); needle.position.y = 0.0052; this.add(needle);
    const shape = (len) => { const s = new THREE.Shape(); s.moveTo(-0.0014, 0); s.lineTo(0, len); s.lineTo(0.0014, 0); s.closePath(); return new THREE.ExtrudeGeometry(s, { depth: 0.0006, bevelEnabled: false }); };
    const nN = new THREE.Mesh(shape(r * 0.78), new THREE.MeshStandardMaterial({ color: 0xc0121b, roughness: 0.45, metalness: 0.1 }));
    nN.rotation.x = -Math.PI / 2; needle.add(nN); // points −z
    const nS = new THREE.Mesh(shape(r * 0.78), new THREE.MeshStandardMaterial({ color: 0x1b2a6b, roughness: 0.45, metalness: 0.1 }));
    nS.rotation.x = Math.PI / 2; nS.position.y = 0.0005; needle.add(nS); // points +z
    const pin = new THREE.Mesh(new THREE.CylinderGeometry(0.0006, 0.0006, 0.0016, 8), brass()); pin.position.y = 0.0008; needle.add(pin);
    const top = new THREE.Mesh(new THREE.CircleGeometry(r * 0.95, 32), new THREE.MeshBasicMaterial({ map: glassGlint(), transparent: true, opacity: 0.7, depthWrite: false })); top.rotation.x = -Math.PI / 2; top.raycast = () => {}; top.position.y = 0.0066; top.renderOrder = 4; this.add(top);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(r * 0.97, 0.0006, 6, 32), brass()); ring.rotation.x = Math.PI / 2; ring.position.y = 0.0066; this.add(ring);
    this.needle = needle; this.heading = 0; this.vel = 0; this.target = 0; this.strength = 1;
  }
  /** Field in the compass' local horizontal plane; north (−z) = (0, −1). */
  setField(bx, bz) { this.target = Math.atan2(-bx, -bz); this.strength = Math.hypot(bx, bz); }
  /** Deflection of the N end from local north, in degrees (positive = towards east/+x). */
  get deflection() { let a = -this.heading; a = Math.atan2(Math.sin(a), Math.cos(a)); return THREE.MathUtils.radToDeg(a); }
  update(dt) {
    const n = Math.max(1, Math.ceil(dt / 0.008)), h = dt / n;
    const K = 60 * Math.min(this.strength, 6), C = 2.6;
    for (let i = 0; i < n; i++) {
      const diff = Math.atan2(Math.sin(this.target - this.heading), Math.cos(this.target - this.heading));
      // near the unstable 180° position a real needle is always nudged off balance (friction, tiny tilt)
      const torque = Math.abs(diff) > 2.95 ? Math.sign(diff || 1) * 0.25 : Math.sin(diff);
      this.vel += (K * torque - C * this.vel) * h;
      this.heading += this.vel * h;
    }
    this.needle.rotation.y = this.heading;
  }
}

/* ============================================================= horseshoe magnet */
/**
 * Horseshoe magnet with the gap between its pole tips centred on the origin. Arms run along −x from the
 * tips to the bend; the lower tip is N and the upper tip is S, so the field in the gap points +y.
 */
export function horseshoeMagnet({ Ro = 0.032, Ri = 0.013, arm = 0.075, width = 0.026, tipLen = 0.022 } = {}) {
  const g = new THREE.Group(); g.name = 'Horseshoe magnet';
  const s = new THREE.Shape();
  s.moveTo(arm - tipLen + 0.001, Ro); s.lineTo(0, Ro); s.absarc(0, 0, Ro, Math.PI / 2, (3 * Math.PI) / 2, false);
  s.lineTo(arm - tipLen + 0.001, -Ro); s.lineTo(arm - tipLen + 0.001, -Ri); s.lineTo(0, -Ri); s.absarc(0, 0, Ri, (3 * Math.PI) / 2, Math.PI / 2, true);
  s.lineTo(arm - tipLen + 0.001, Ri); s.closePath();
  const geo = new THREE.ExtrudeGeometry(s, { depth: width, bevelEnabled: true, bevelThickness: 0.0012, bevelSize: 0.0012, bevelSegments: 2, curveSegments: 28 });
  geo.translate(0, 0, -width / 2);
  const inner = new THREE.Group(); inner.position.x = -(arm - tipLen / 2); g.add(inner);
  const red = new THREE.MeshPhysicalMaterial({ color: 0xc81e1e, roughness: 0.32, clearcoat: 0.8, clearcoatRoughness: 0.2 });
  inner.add(new THREE.Mesh(geo, red));
  const steel = metal({ color: 0xb9bec4, roughness: 0.28 });
  for (const [sy, letter] of [[1, 'S'], [-1, 'N']]) {
    const tip = new THREE.Mesh(new THREE.BoxGeometry(tipLen, Ro - Ri + 0.0024, width + 0.0024), steel);
    tip.position.set(arm - tipLen / 2, sy * (Ri + Ro) / 2, 0); inner.add(tip);
    const d = decal(letter, { w: 0.012, color: letter === 'N' ? '#b91c1c' : '#1e3a8a', font: '900 96px "Segoe UI", Arial' });
    d.position.set(arm - tipLen / 2, sy * (Ri + Ro) / 2, width / 2 + 0.0014); inner.add(d);
    const d2 = d.clone(); d2.rotation.y = Math.PI; d2.position.z = -width / 2 - 0.0014; inner.add(d2);
  }
  g.Ro = Ro; g.Ri = Ri; g.tipLen = tipLen; g.width = width; g.arm = arm;
  return g;
}

/* ================================================================== iron filings */
/**
 * Iron filings on a horizontal sheet (local y = 0 is the sheet surface).
 * sprinkle progress `drop` (0..1) rains them down; `align` (0..1) moves them into the computed pattern.
 */
export class IronFilings extends THREE.Group {
  constructor({ count = 2600, half = 0.105, hole = 0.0045 } = {}) {
    super(); this.name = 'Iron filings';
    const geo = new THREE.BoxGeometry(1, 0.0005, 0.0006);
    const mat = new THREE.MeshStandardMaterial({ color: 0x1d1e21, roughness: 0.6, metalness: 0.5, envMapIntensity: 0.6 });
    this.mesh = new THREE.InstancedMesh(geo, mat, count); this.mesh.frustumCulled = false; this.mesh.raycast = () => {};
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage); this.add(this.mesh);
    this.f = [];
    for (let i = 0; i < count; i++) {
      let x, z;
      do { // denser near the middle, like a real sprinkle
        const rr = half * Math.pow(Math.random(), 0.75), a = Math.random() * Math.PI * 2;
        x = Math.cos(a) * rr * 1.25; z = Math.sin(a) * rr * 1.25;
      } while (Math.abs(x) > half || Math.abs(z) > half || Math.hypot(x, z) < hole);
      const ang = Math.random() * Math.PI;
      this.f.push({ x0: x, z0: z, a0: ang, x1: x, z1: z, a1: ang, len: 0.0011 + Math.random() * 0.0022, tilt: (Math.random() - 0.5) * 0.5, h: 0.05 + Math.random() * 0.05, rel: Math.random(), lag: Math.random() * 0.35, y: 0 });
    }
    this.drop = 0; this.align = 0; this.fade = 0; this.jitter = 0; this.half = half;
    this._dirty = true;
  }
  /** fieldDir(x, z) -> { a: angle (rad, about y; 0 = along +x), s: 0..1 alignment strength, ring: preferred radius or null } */
  setPattern(fieldDir) {
    for (const p of this.f) {
      const r = fieldDir(p.x0, p.z0);
      const s = r.s * (0.75 + 0.25 * Math.random());
      let da = r.a - p.a0; da = Math.atan2(Math.sin(2 * da), Math.cos(2 * da)) / 2; // filings have no head/tail
      p.a1 = p.a0 + da * s + (Math.random() - 0.5) * 0.25 * (1 - s);
      if (r.ring) { const rr = Math.hypot(p.x0, p.z0), k = (r.ring(rr) / rr - 1) * s * 0.65; p.x1 = p.x0 * (1 + k); p.z1 = p.z0 * (1 + k); } else { p.x1 = p.x0; p.z1 = p.z0; }
    }
    this._dirty = true;
  }
  /** Commit the aligned state as the new resting state (so a later pattern starts from here). */
  commit() { for (const p of this.f) { const k = 1; p.x0 = p.x0 + (p.x1 - p.x0) * k; p.z0 = p.z0 + (p.z1 - p.z0) * k; p.a0 = p.a1; } this.align = 0; this._dirty = true; }
  update(dt, t) {
    const sm = (v) => v * v * (3 - 2 * v);
    for (let i = 0; i < this.f.length; i++) {
      const p = this.f[i];
      const dk = Math.min(1, Math.max(0, (this.drop * 1.35 - p.rel * 0.95) / 0.4));
      if (dk <= 0 || this.fade >= 1) { _m.makeScale(0, 0, 0); this.mesh.setMatrixAt(i, _m); continue; }
      const y = p.h * (1 - dk * dk) + 0.00025;
      const ak = sm(Math.min(1, Math.max(0, (this.align - p.lag) / (1 - p.lag + 1e-6) * 1.0)));
      const hop = this.jitter > 0 ? Math.abs(Math.sin(t * 40 + i)) * 0.0012 * this.jitter : 0;
      const x = p.x0 + (p.x1 - p.x0) * ak + this.fade * 0.25, z = p.z0 + (p.z1 - p.z0) * ak;
      const a = p.a0 + (p.a1 - p.a0) * ak;
      _q.setFromEuler(_e.set(p.tilt * (1 - ak), -a, 0, 'YXZ'));
      const sc = this.fade > 0 ? 1 - this.fade : 1;
      _m.compose(_p.set(x, y + hop, z), _q, _s.set(p.len * sc, sc, sc));
      this.mesh.setMatrixAt(i, _m);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
  }
}

/** Shaker bottle of iron filings with a perforated cap. */
export function filingsShaker() {
  const g = new THREE.Group(); g.name = 'Iron filings shaker';
  const lbl = canvasTexture(512, 256, (c, w, h) => {
    c.fillStyle = '#e8e2cf'; c.fillRect(0, 0, w, h);
    c.fillStyle = '#7f1d1d'; c.fillRect(0, 0, w, 50);
    c.fillStyle = '#fff'; c.font = '700 34px "Segoe UI", Arial'; c.textAlign = 'center'; c.fillText('LAB SUPPLY', w / 2, 36);
    c.fillStyle = '#111'; c.font = '800 58px "Segoe UI", Arial'; c.fillText('IRON', w / 2, 120); c.fillText('FILINGS', w / 2, 184);
  }, { key: 'filingsLbl' });
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.055, 32), new THREE.MeshPhysicalMaterial({ color: 0x3b3b3b, roughness: 0.3, clearcoat: 0.6 })); body.position.y = 0.0275; g.add(body);
  const lab = new THREE.Mesh(new THREE.CylinderGeometry(0.0163, 0.0163, 0.03, 32, 1, true, -0.9, 1.8), new THREE.MeshStandardMaterial({ map: lbl, roughness: 0.8 })); lab.position.y = 0.026; g.add(lab);
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.0168, 0.0168, 0.01, 32), chrome()); cap.position.y = 0.06; g.add(cap);
  const holes = canvasTexture(128, 128, (c, w, h) => { c.fillStyle = '#d7dadd'; c.fillRect(0, 0, w, h); c.fillStyle = '#222'; for (let i = 0; i < 7; i++) { const a = (i / 7) * Math.PI * 2, r = i ? 28 : 0; c.beginPath(); c.arc(w / 2 + Math.cos(a) * r, h / 2 + Math.sin(a) * r, 6, 0, Math.PI * 2); c.fill(); } }, { key: 'shakerHoles' });
  const topD = new THREE.Mesh(new THREE.CircleGeometry(0.0166, 32), new THREE.MeshStandardMaterial({ map: holes, metalness: 0.8, roughness: 0.3 })); topD.rotation.x = -Math.PI / 2; topD.position.y = 0.0651; g.add(topD);
  g.mouthLocal = new THREE.Vector3(0, 0.066, 0);
  return g;
}

/* ===================================================================== arrows */
/** Solid labelled-style arrow pointing along local +y; set .length. */
export function arrow3D({ color = 0xef4444, length = 0.06, r = 0.0016, head = 0.011 } = {}) {
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.55, roughness: 0.4 });
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 1, 12), mat);
  const cone = new THREE.Mesh(new THREE.ConeGeometry(r * 2.8, head, 16), mat);
  g.add(shaft, cone);
  g.setLength = (L) => { const sl = Math.max(0.001, L - head); shaft.scale.y = sl; shaft.position.y = sl / 2; cone.position.y = sl + head / 2; g.length = L; };
  g.setLength(length);
  g.traverse((o) => { if (o.isMesh) { o.raycast = () => {}; o.userData.noShadow = true; } });
  return g;
}

/** Circular arrow lying in the horizontal plane, counter-clockwise seen from above (set .sense = -1 for clockwise). */
export function curlArrow({ radius = 0.03, color = 0x3b82f6, tube = 0.0014, arc = Math.PI * 1.65 } = {}) {
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.55, roughness: 0.4, side: THREE.DoubleSide });
  const inner = new THREE.Group(); inner.rotation.x = -Math.PI / 2; g.add(inner);
  const torus = new THREE.Mesh(new THREE.TorusGeometry(radius, tube, 8, 64, arc), mat); inner.add(torus);
  const cone = new THREE.Mesh(new THREE.ConeGeometry(tube * 3, tube * 8, 14), mat);
  cone.position.set(Math.cos(arc) * radius, Math.sin(arc) * radius, 0); cone.rotation.z = arc; inner.add(cone);
  g.setSense = (s) => { g.scale.z = s >= 0 ? 1 : -1; };
  g.traverse((o) => { if (o.isMesh) { o.raycast = () => {}; o.userData.noShadow = true; } });
  return g;
}

/* ================================================================= stands */
/** Wooden stand that holds a horizontal sheet (cardboard) at height h, with a hole in the middle. */
export function cardboardStand({ half = 0.12, h = 0.11, hole = 0.004 } = {}) {
  const g = new THREE.Group(); g.name = 'Cardboard';
  const legM = wood({ base: '#9b6a3c', key: 'standwood' });
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.014, h - 0.003, 0.014), legM); leg.position.set(sx * (half - 0.012), (h - 0.003) / 2, sz * (half - 0.012)); g.add(leg);
  }
  const shape = new THREE.Shape(); shape.moveTo(-half, -half); shape.lineTo(half, -half); shape.lineTo(half, half); shape.lineTo(-half, half); shape.closePath();
  const hp = new THREE.Path(); hp.absarc(0, 0, hole, 0, Math.PI * 2, true); shape.holes.push(hp);
  const card = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: 0.003, bevelEnabled: false, curveSegments: 24 }), [new THREE.MeshStandardMaterial({ color: 0xb4afa3, roughness: 1, envMapIntensity: 0.25 }), new THREE.MeshStandardMaterial({ color: 0x8a7556, roughness: 1 })]);
  card.rotation.x = -Math.PI / 2; card.position.y = h - 0.003; g.add(card);
  g.card = card; g.topY = h; g.half = half;
  g.surface = new THREE.Group(); g.surface.position.y = h + 0.0002; g.add(g.surface);
  return g;
}

/** Stand with a horizontal insulating cross-bar (along z) at height h; the bar is centred above x = 0. */
export function swingStand({ h = 0.22, span = 0.12, pillarX = -0.12 } = {}) {
  const g = new THREE.Group(); g.name = 'Stand';
  const base = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.014, 0.16), wood({ base: '#7a4a26', key: 'standbase' })); base.position.set(pillarX, 0.007, 0); g.add(base);
  const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, h + 0.03, 16), chrome()); pillar.position.set(pillarX, (h + 0.03) / 2, 0); g.add(pillar);
  const boss = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.022, 0.022), metal({ color: 0x2b2e33, roughness: 0.6, metalness: 0.7 })); boss.position.set(pillarX, h, 0); g.add(boss);
  const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.0045, 0.0045, -pillarX, 12), chrome()); arm.rotation.z = Math.PI / 2; arm.position.set(pillarX / 2, h, 0); g.add(arm);
  const bar = new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.012, span + 0.02), bakelite(0x1a1a1a)); bar.position.set(0, h, 0); g.add(bar);
  const posts = [-1, 1].map((sz) => { const p = bindingPost({ h: 0.012 }); p.position.set(0, h + 0.006, sz * (span / 2)); g.add(p); return p; });
  g.barY = h; g.span = span;
  g.postLocal = (i) => new THREE.Vector3(0, h + 0.006 + posts[i].wireY, posts[i].position.z);
  return g;
}

/** Light aluminium tube (rod) along local z, length L. */
export function aluminiumRod({ L = 0.11, r = 0.0035 } = {}) {
  const g = new THREE.Group(); g.name = 'Aluminium rod';
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, L, 24), metal({ color: 0xd9dde2, roughness: 0.22 })); m.rotation.x = Math.PI / 2; g.add(m);
  for (const sz of [-1, 1]) { const e = new THREE.Mesh(new THREE.TorusGeometry(r * 1.05, 0.0007, 6, 20), metal({ color: 0x9aa0a6, roughness: 0.4 })); e.position.z = sz * (L / 2 - 0.006); g.add(e); }
  g.L = L;
  return g;
}

export { paper };
