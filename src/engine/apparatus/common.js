// Shared laboratory apparatus. Units are metres; the bench top is at y = 0.
// Every factory returns a THREE.Group whose origin sits on its base (so lab.add(obj,[x,0,z]) stands it on the bench).
import * as THREE from 'three';
import gsap from 'gsap';
import { glass, liquid, metal, chrome, brass, castIron, plastic, rubber, wood, paper, powder } from '../materials.js';
import { labelTexture, graduationTexture, canvasTexture } from '../textures.js';
import { Flame, Bubbles, Fumes, Precipitate, Stream } from '../effects.js';

const SEG = 48;

/* ===================================================================== Vessel */
/**
 * A glass container defined by its INNER profile [[r, y], ...] from bottom-centre to rim.
 * Supports a live liquid with level, colour and cloudiness, plus solids inside (`contents` group).
 *
 * vessel.setLevel(h)            -> liquid height above the inner bottom (m)
 * vessel.fill(h, seconds)       -> animated, returns promise-like gsap tween
 * vessel.setLiquidColor(c, {cloudy})  / vessel.tintTo(c, seconds, {cloudy})
 * vessel.mouthWorld()           -> world position of the rim centre
 * vessel.radiusAt(y)            -> inner radius at local y
 * vessel.addBubbles(opts) / addFumes(opts) / addPrecipitate(opts)  -> effects positioned inside
 */
export class Vessel extends THREE.Group {
  constructor(profile, { wall = 0.0012, name = 'vessel', liquidColor = 0xdbeafe, level = 0, lip = true, tint } = {}) {
    super();
    this.name = name;
    this.profile = profile.map(([r, y]) => new THREE.Vector2(r, y));
    this.rimY = profile[profile.length - 1][1];
    this.bottomY = profile[0][1];
    this.wall = wall;
    // Glass body: outer wall up, rounded lip, inner wall down.
    const outer = this.profile.map((p, i) => new THREE.Vector2(i === 0 ? 0 : p.x + wall, i === 0 ? p.y - wall : p.y));
    const inner = [...this.profile].reverse().map((p) => new THREE.Vector2(p.x, p.y));
    const pts = [...outer];
    if (lip) { const R = this.profile[this.profile.length - 1].x; pts.push(new THREE.Vector2(R + wall * 2.2, this.rimY + wall * 0.6)); pts.push(new THREE.Vector2(R + wall * 0.6, this.rimY + wall * 1.6)); }
    pts.push(...inner);
    pts[pts.length - 1] = new THREE.Vector2(0, this.bottomY);
    this.glassMat = glass(tint ? { tint } : {});
    this.glassMat.side = THREE.FrontSide; // the lathe is a closed solid: back faces only add haze
    this.body = new THREE.Mesh(new THREE.LatheGeometry(pts, SEG), this.glassMat);
    this.body.renderOrder = 3;
    this.add(this.body);

    this.contents = new THREE.Group(); this.add(this.contents);

    this.liqMat = liquid(liquidColor);
    this.liquidMesh = new THREE.Mesh(new THREE.BufferGeometry(), this.liqMat);
    this.liquidMesh.renderOrder = 1;
    this.liquidMesh.userData.noShadow = true;
    this.add(this.liquidMesh);
    this.level = -1; this.setLevel(level);
    this.userData.vessel = true;
  }
  radiusAt(y) {
    const p = this.profile;
    if (y <= p[0].y) return p[0].x;
    for (let i = 1; i < p.length; i++) {
      if (y <= p[i].y) { const k = (y - p[i - 1].y) / Math.max(1e-6, p[i].y - p[i - 1].y); return THREE.MathUtils.lerp(p[i - 1].x, p[i].x, k); }
    }
    return p[p.length - 1].x;
  }
  get surfaceY() { return this.bottomY + this.level; }
  setLevel(h) {
    h = Math.max(0, Math.min(h, this.rimY - this.bottomY - 0.002));
    if (Math.abs(h - this.level) < 1e-5) return;
    this.level = h;
    this.liquidMesh.geometry.dispose();
    if (h < 0.0004) { this.liquidMesh.visible = false; this.liquidMesh.geometry = new THREE.BufferGeometry(); return; }
    this.liquidMesh.visible = true;
    const top = this.bottomY + h, shrink = 0.00025;
    const pts = [new THREE.Vector2(0, this.bottomY + shrink)];
    for (const p of this.profile) { if (p.y > this.bottomY && p.y < top) pts.push(new THREE.Vector2(Math.max(0, p.x - shrink), p.y)); }
    const rTop = Math.max(0, this.radiusAt(top) - shrink);
    pts.push(new THREE.Vector2(rTop, top - 0.0008));
    pts.push(new THREE.Vector2(rTop * 0.94, top)); // meniscus
    pts.push(new THREE.Vector2(0, top));
    this.liquidMesh.geometry = new THREE.LatheGeometry(pts, SEG);
    this.dispatchEvent?.({ type: 'level', level: h });
    this._effects?.forEach((e) => { if ('surfaceY' in e) e.surfaceY = top - 0.001; if (e.cfg && 'topY' in e.cfg) e.cfg.topY = top - 0.002; });
  }
  fill(h, duration = 1.5, ease = 'power1.inOut') {
    const o = { v: this.level };
    return gsap.to(o, { v: h, duration, ease, onUpdate: () => this.setLevel(o.v) });
  }
  /** Opacity a liquid of this colour should have: clear solutions are see-through, strong colours denser. */
  static clarity(c, cloudy = 0) {
    // Use chroma (max − min channel), not HSL saturation: near-whites like 0xeef6ff have high "saturation"
    // but are really colourless and must stay see-through.
    const col = new THREE.Color(c);
    const chroma = Math.max(col.r, col.g, col.b) - Math.min(col.r, col.g, col.b);
    const base = THREE.MathUtils.lerp(0.14, 0.82, Math.min(1, chroma * 1.4));
    return THREE.MathUtils.lerp(base, 0.97, cloudy);
  }
  setLiquidColor(c, { cloudy = 0, opacity } = {}) {
    this.liqMat.color.set(c); this.liqMat.sheenColor?.set(c);
    this.liqMat.opacity = opacity ?? Vessel.clarity(c, cloudy); this.liqMat.sheen = cloudy * 0.6;
  }
  tintTo(c, duration = 2, { cloudy = 0, opacity } = {}) {
    const to = new THREE.Color(c);
    const tl = gsap.timeline();
    tl.to(this.liqMat.color, { r: to.r, g: to.g, b: to.b, duration, ease: 'sine.inOut' }, 0);
    if (this.liqMat.sheenColor) tl.to(this.liqMat.sheenColor, { r: to.r, g: to.g, b: to.b, duration, ease: 'sine.inOut' }, 0);
    tl.to(this.liqMat, { opacity: opacity ?? Vessel.clarity(c, cloudy), sheen: cloudy * 0.6, duration }, 0);
    return tl;
  }
  mouthLocal() { return new THREE.Vector3(0, this.rimY, 0); }
  mouthWorld() { return this.localToWorld(this.mouthLocal()); }
  _track(e) { (this._effects ||= []).push(e); return e; }
  addBubbles(opts = {}) {
    const b = new Bubbles({ radius: this.radiusAt(this.bottomY + 0.01) * 0.9, bottomY: this.bottomY + 0.002, surfaceY: this.surfaceY - 0.001, ...opts });
    b.mesh.renderOrder = 2; this.add(b); return this._track(b);
  }
  addPrecipitate(opts = {}) {
    const p = new Precipitate({ radius: this.radiusAt(this.bottomY + 0.01) * 0.95, bottomY: this.bottomY + 0.0005, topY: this.surfaceY - 0.002, ...opts });
    p.mesh.renderOrder = 2; this.add(p); return this._track(p);
  }
  addFumes(opts = {}) {
    const f = new Fumes(opts); f.position.y = this.rimY - 0.01; this.add(f); return f;
  }
}

/* ------------------------------------------------------------- profiles */
export function roundBottomProfile(r, h, n = 10) {
  const pts = [];
  for (let i = 0; i <= n; i++) { const a = (i / n) * Math.PI / 2; pts.push([Math.sin(a) * r, r - Math.cos(a) * r]); }
  pts.push([r, h]);
  return pts;
}
export function flatBottomProfile(r, h, fillet = 0.004) {
  const pts = [[0, 0.0015]];
  for (let i = 0; i <= 6; i++) { const a = (i / 6) * Math.PI / 2; pts.push([r - fillet + Math.sin(a) * fillet, 0.0015 + fillet - Math.cos(a) * fillet]); }
  pts.push([r, h]);
  return pts;
}

/* ============================================================ glassware */
export function testTube({ r = 0.008, h = 0.15, ...o } = {}) {
  const v = new Vessel(roundBottomProfile(r, h), { name: 'Test tube', ...o });
  return v;
}
export function boilingTube({ r = 0.012, h = 0.15, ...o } = {}) {
  return new Vessel(roundBottomProfile(r, h), { name: 'Boiling tube', wall: 0.0016, ...o });
}
export function beaker({ r = 0.034, h = 0.09, capacity = 250, ...o } = {}) {
  const v = new Vessel(flatBottomProfile(r, h), { name: 'Beaker', wall: 0.0018, ...o });
  // spout
  const spout = new THREE.Mesh(new THREE.TorusGeometry(0.006, 0.0012, 8, 16, Math.PI), v.glassMat);
  spout.position.set(r + 0.0015, h, 0); spout.rotation.set(Math.PI / 2, 0, Math.PI / 2); v.add(spout);
  // printed graduations (white enamel)
  const grad = new THREE.Mesh(new THREE.CylinderGeometry(r + 0.0019, r + 0.0019, h * 0.72, 32, 1, true, -0.45, 0.9),
    new THREE.MeshBasicMaterial({ map: graduationTexture({ max: capacity, marks: 10 }), transparent: true, depthWrite: false, side: THREE.FrontSide }));
  grad.position.y = h * 0.42; grad.renderOrder = 4; grad.raycast = () => {}; v.add(grad);
  return v;
}
export function conicalFlask({ R = 0.04, neck = 0.013, h = 0.13, neckH = 0.035, ...o } = {}) {
  const body = h - neckH;
  const prof = flatBottomProfile(R, 0.006).slice(0, -1);
  prof.push([R, 0.006]); prof.push([neck, body]); prof.push([neck, h]);
  return new Vessel(prof, { name: 'Conical flask', wall: 0.0018, ...o });
}
export function measuringCylinder({ r = 0.012, h = 0.18, ...o } = {}) {
  const v = new Vessel(flatBottomProfile(r, h, 0.002), { name: 'Measuring cylinder', ...o });
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.032, 0.008, 6), v.glassMat);
  base.position.y = -0.003; v.add(base); v.body.position.y = 0.002; v.liquidMesh.position.y = 0.002;
  const grad = new THREE.Mesh(new THREE.CylinderGeometry(r + 0.0013, r + 0.0013, h * 0.85, 24, 1, true, -0.5, 1),
    new THREE.MeshBasicMaterial({ map: graduationTexture({ max: 100, marks: 20, labelEvery: 4 }), transparent: true, depthWrite: false }));
  grad.position.y = h * 0.47; grad.renderOrder = 4; v.add(grad);
  return v;
}
export function chinaDish({ r = 0.04 } = {}) {
  const g = new THREE.Group(); g.name = 'China dish';
  const pts = []; for (let i = 0; i <= 12; i++) { const a = (i / 12) * Math.PI * 0.42; pts.push(new THREE.Vector2(Math.sin(a) * r * 1.6, (1 - Math.cos(a)) * r * 1.6)); }
  const inner = pts.map((p) => new THREE.Vector2(p.x * 0.95, p.y + 0.002)).reverse();
  const m = new THREE.Mesh(new THREE.LatheGeometry([...pts, ...inner], SEG), new THREE.MeshPhysicalMaterial({ color: 0xf5f5f0, roughness: 0.25, clearcoat: 0.8 }));
  g.add(m); g.userData.innerY = 0.004; return g;
}
export function watchGlass({ r = 0.035 } = {}) {
  const g = new THREE.Group();
  const geo = new THREE.SphereGeometry(r * 2.2, 40, 10, 0, Math.PI * 2, Math.PI - Math.asin(1 / 2.2), Math.asin(1 / 2.2));
  const m = new THREE.Mesh(geo, glass()); m.position.y = r * 2.2 * Math.cos(Math.asin(1 / 2.2)) + 0.001; g.add(m); g.name = 'Watch glass';
  return g;
}
export function petriDish({ r = 0.045 } = {}) {
  const v = new Vessel([[0, 0.0015], [r, 0.0015], [r, 0.014]], { name: 'Petri dish', wall: 0.001 });
  return v;
}
export function glassRod({ len = 0.18 } = {}) {
  const g = new THREE.Group(); g.name = 'Glass rod';
  const m = new THREE.Mesh(new THREE.CapsuleGeometry(0.0025, len, 6, 12), glass({ opacity: 0.35, edge: 0.95 }));
  m.position.y = len / 2; g.add(m); return g;
}
export function dropper({ color = 0xdbeafe, filled = true } = {}) {
  const g = new THREE.Group(); g.name = 'Dropper';
  const tube = new Vessel([[0, 0.0], [0.0012, 0.004], [0.0035, 0.02], [0.0035, 0.07]], { name: 'Dropper', wall: 0.0007, lip: false, liquidColor: color, level: filled ? 0.04 : 0 });
  g.add(tube); g.tube = tube;
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.0075, 20, 16), rubber(0xb91c1c));
  bulb.scale.y = 1.5; bulb.position.y = 0.083; g.add(bulb);
  return g;
}
export function delivery({ points, r = 0.0025 } = {}) {
  const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)));
  const m = new THREE.Mesh(new THREE.TubeGeometry(curve, 64, r, 10, false), glass({ opacity: 0.25, edge: 0.9 }));
  m.name = 'Delivery tube'; m.renderOrder = 3; return m;
}
export function cork({ r = 0.009, h = 0.014, color = 0xb08a5a, holes = 0 } = {}) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r * 1.12, r * 0.92, h, 24), new THREE.MeshStandardMaterial({ color, roughness: 0.95 }));
  m.name = 'Cork'; return m;
}

/* ================================================================ stands */
export function testTubeStand({ holes = 5, spacing = 0.035 } = {}) {
  const g = new THREE.Group(); g.name = 'Test tube stand';
  const w = holes * spacing + 0.02;
  const mat = wood({ base: '#9b6a3c', key: 'rack' });
  const base = new THREE.Mesh(new THREE.BoxGeometry(w, 0.012, 0.06), mat); base.position.y = 0.006; g.add(base);
  for (const yy of [0.06, 0.1]) {
    const shape = new THREE.Shape(); shape.moveTo(-w / 2, -0.03); shape.lineTo(w / 2, -0.03); shape.lineTo(w / 2, 0.03); shape.lineTo(-w / 2, 0.03); shape.closePath();
    for (let i = 0; i < holes; i++) { const h = new THREE.Path(); h.absarc(-w / 2 + 0.01 + spacing * (i + 0.5), 0, 0.011, 0, Math.PI * 2, true); shape.holes.push(h); }
    const plate = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: 0.008, bevelEnabled: false, curveSegments: 20 }), mat);
    plate.rotation.x = -Math.PI / 2; plate.position.y = yy; g.add(plate);
  }
  for (const sx of [-1, 1]) { const leg = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.11, 0.06), mat); leg.position.set(sx * (w / 2 - 0.005), 0.055, 0); g.add(leg); }
  g.slots = Array.from({ length: holes }, (_, i) => new THREE.Vector3(-w / 2 + 0.01 + spacing * (i + 0.5), 0.013, 0));
  return g;
}

/** Retort stand with a boss-head clamp. clamp.position.y adjustable; attach things to `g.clampPoint`. */
export function retortStand({ height = 0.5, clampY = 0.22, armLen = 0.14 } = {}) {
  const g = new THREE.Group(); g.name = 'Retort stand';
  const base = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.012, 0.24), castIron()); base.position.set(0, 0.006, 0); g.add(base);
  const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, height, 16), chrome()); rod.position.set(0, height / 2, -0.08); g.add(rod);
  const clamp = new THREE.Group(); clamp.position.set(0, clampY, -0.08); g.add(clamp);
  const boss = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.022, 0.022), castIron()); clamp.add(boss);
  const screw = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.003, 0.03, 8), chrome()); screw.rotation.z = Math.PI / 2; screw.position.x = 0.02; clamp.add(screw);
  const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, armLen, 12), chrome()); arm.rotation.x = Math.PI / 2; arm.position.z = armLen / 2; clamp.add(arm);
  const jaw = new THREE.Group(); jaw.position.z = armLen; clamp.add(jaw);
  for (const s of [-1, 1]) {
    const j = new THREE.Mesh(new THREE.TorusGeometry(0.014, 0.0025, 8, 20, Math.PI * 0.8), chrome());
    j.rotation.set(Math.PI / 2, 0, s > 0 ? 0.3 : Math.PI - 0.3 - Math.PI * 0.8 + Math.PI * 0.8); j.scale.set(1, 1, 1); jaw.add(j);
    const pad = new THREE.Mesh(new THREE.BoxGeometry(0.004, 0.016, 0.01), new THREE.MeshStandardMaterial({ color: 0xd8c7a0, roughness: 1 })); pad.position.set(s * 0.012, 0, 0); jaw.add(pad);
  }
  g.clamp = clamp; g.clampPoint = jaw; g.rod = rod;
  return g;
}

export function tripod({ h = 0.12 } = {}) {
  const g = new THREE.Group(); g.name = 'Tripod stand';
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.004, 8, 36), castIron()); ring.rotation.x = Math.PI / 2; ring.position.y = h; g.add(ring);
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.0035, 0.0035, h * 1.02, 8), castIron());
    leg.position.set(Math.cos(a) * 0.058, h / 2, Math.sin(a) * 0.058); leg.rotation.set(Math.sin(a) * -0.12, 0, Math.cos(a) * 0.12); g.add(leg);
  }
  const gauze = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.002, 0.13), new THREE.MeshStandardMaterial({ color: 0x8a8f96, metalness: 0.6, roughness: 0.6 }));
  gauze.position.y = h + 0.005; g.add(gauze);
  const pad = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.0025, 32), new THREE.MeshStandardMaterial({ color: 0xe8e4dc, roughness: 1 }));
  pad.position.y = h + 0.007; g.add(pad);
  g.topY = h + 0.0085; return g;
}

/* ================================================================ heaters */
export function bunsenBurner() {
  const g = new THREE.Group(); g.name = 'Bunsen burner';
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.036, 0.012, 32), castIron()); base.position.y = 0.006; g.add(base);
  const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.0065, 0.0065, 0.11, 24), chrome()); tube.position.y = 0.067; g.add(tube);
  const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.0085, 0.0085, 0.016, 24), brass()); collar.position.y = 0.025; g.add(collar);
  const nozzle = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.003, 0.03, 12), brass()); nozzle.rotation.z = Math.PI / 2; nozzle.position.set(0.022, 0.012, 0); g.add(nozzle);
  const hose = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(0.035, 0.012, 0), new THREE.Vector3(0.09, 0.006, 0.02), new THREE.Vector3(0.2, 0.004, -0.05)]), 30, 0.0045, 10), rubber(0xc2410c));
  g.add(hose);
  // the hose ends on a bench gas tap, not in mid-air
  const tapBase = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.014, 0.01, 20), brass()); tapBase.position.set(0.215, 0.005, -0.055); g.add(tapBase);
  const tapBody = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.04, 14), brass()); tapBody.position.set(0.215, 0.03, -0.055); g.add(tapBody);
  const nozzleT = new THREE.Mesh(new THREE.CylinderGeometry(0.0035, 0.0045, 0.022, 12), brass()); nozzleT.rotation.z = Math.PI / 2.4; nozzleT.position.set(0.205, 0.012, -0.052); g.add(nozzleT);
  const lever = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.004, 0.006), castIron()); lever.position.set(0.215, 0.052, -0.055); g.add(lever);
  const flame = new Flame({ kind: 'bunsen', height: 0.07 }); flame.position.y = 0.122; flame.on = false; g.add(flame);
  g.flame = flame; g.topY = 0.122;
  return g;
}
export function spiritLamp() {
  const g = new THREE.Group(); g.name = 'Spirit lamp';
  const v = new Vessel([[0, 0.002], [0.03, 0.002], [0.034, 0.02], [0.03, 0.045], [0.012, 0.06]], { lip: false, liquidColor: 0xe0f2fe, level: 0.03 });
  g.add(v);
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.012, 0.016, 20), brass()); cap.position.y = 0.068; g.add(cap);
  const wick = new THREE.Mesh(new THREE.CylinderGeometry(0.0028, 0.0028, 0.01, 10), new THREE.MeshStandardMaterial({ color: 0xf3efe6, roughness: 1 })); wick.position.y = 0.08; g.add(wick);
  const flame = new Flame({ kind: 'spirit', height: 0.05 }); flame.position.y = 0.084; flame.on = false; g.add(flame);
  g.flame = flame; g.topY = 0.084; return g;
}

/* ============================================================== reagents */
/**
 * Reagent bottle with printed label. kind: 'narrow' | 'wide' | 'dropper'
 * bottle.pourPoint (local) is the lip.
 */
export function reagentBottle({ title = 'Water', formula = '', sub = '', color = 0xe0f2fe, glassTint, amber = false, labelColor = '#1d4ed8', level = 0.06, hazard = false, kind = 'narrow', solid = false } = {}) {
  const g = new THREE.Group(); g.name = title;
  const R = 0.026, H = 0.085;
  const prof = [[0, 0.002], [R - 0.004, 0.002], [R, 0.008], [R, H - 0.015], [R * 0.55, H], [0.009, H + 0.006], [0.009, H + 0.018]];
  const v = new Vessel(prof, { name: title, wall: 0.0018, liquidColor: color, level: solid ? 0 : level, tint: amber ? 0x9a5b1a : glassTint, lip: true });
  if (amber) { v.glassMat.opacity = 0.55; v.glassMat.color.set(0x7a3e0a); }
  g.add(v); g.vessel = v;
  if (solid) {
    const heap = new THREE.Mesh(new THREE.CylinderGeometry(R - 0.002, R - 0.002, level, 32), powder(color)); heap.position.y = 0.002 + level / 2; g.add(heap);
  }
  const lab = new THREE.Mesh(new THREE.CylinderGeometry(R + 0.0021, R + 0.0021, 0.042, 32, 1, true, -0.75, 1.5), new THREE.MeshStandardMaterial({ map: labelTexture({ title, formula, sub, color: labelColor, hazard }), roughness: 0.85 }));
  lab.position.y = 0.038; lab.renderOrder = 5; g.add(lab);
  const stopper = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.0085, 0.02, 20), kind === 'dropper' ? rubber(0x111111) : glass({ opacity: 0.4, edge: 0.95 }));
  stopper.position.y = H + 0.024; g.add(stopper); g.stopper = stopper;
  if (kind === 'dropper') { const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.009, 16, 12), rubber(0x111111)); bulb.scale.y = 1.4; bulb.position.y = H + 0.042; stopper.add(bulb); bulb.position.y = 0.02; }
  g.lipLocal = new THREE.Vector3(0.009, H + 0.018, 0);
  return g;
}

/* ================================================================== tools */
export function thermometer({ len = 0.25, temp = 30, min = -10, max = 110 } = {}) {
  const g = new THREE.Group(); g.name = 'Thermometer';
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.0035, 0.0035, len, 16), glass({ opacity: 0.35, edge: 0.95 })); stem.position.y = len / 2; g.add(stem);
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.0045, 16, 12), new THREE.MeshPhysicalMaterial({ color: 0xc81e1e, roughness: 0.2, clearcoat: 1 })); bulb.scale.y = 1.6; bulb.position.y = 0.005; g.add(bulb);
  const colMat = new THREE.MeshStandardMaterial({ color: 0xd61f1f, roughness: 0.3, emissive: 0x400000 });
  const col = new THREE.Mesh(new THREE.CylinderGeometry(0.0011, 0.0011, 1, 8), colMat); g.add(col);
  // scale strip behind the capillary
  const scaleH = len * 0.8;
  const tex = (() => { const c = document.createElement('canvas'); c.width = 64; c.height = 1024; const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, 64, 1024); x.fillStyle = '#111'; x.font = '600 18px Arial';
    for (let t = min; t <= max; t += 2) { const y = 1024 - ((t - min) / (max - min)) * 1024; x.fillRect(0, y, t % 10 === 0 ? 30 : 16, 2); if (t % 10 === 0) x.fillText(String(t), 32, y + 6); }
    const T = new THREE.CanvasTexture(c); T.colorSpace = THREE.SRGBColorSpace; return T; })();
  const strip = new THREE.Mesh(new THREE.PlaneGeometry(0.005, scaleH), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.8 })); strip.position.set(0, 0.02 + scaleH / 2, -0.0015); g.add(strip);
  const yOf = (t) => 0.02 + ((t - min) / (max - min)) * scaleH;
  g.setTemp = (t) => { g.temp = t; const top = yOf(t); col.scale.y = Math.max(0.001, top - 0.008); col.position.y = 0.008 + col.scale.y / 2; };
  g.tweenTemp = (t, duration = 3) => { const o = { v: g.temp }; return gsap.to(o, { v: t, duration, ease: 'sine.inOut', onUpdate: () => g.setTemp(o.v) }); };
  g.setTemp(temp);
  return g;
}
export function splinter({ len = 0.14 } = {}) {
  const g = new THREE.Group(); g.name = 'Wooden splinter';
  const m = new THREE.Mesh(new THREE.BoxGeometry(0.004, len, 0.0025), wood({ base: '#d9b07a', key: 'splint' })); m.position.y = len / 2; g.add(m);
  const tip = new THREE.Mesh(new THREE.BoxGeometry(0.0042, 0.012, 0.0027), new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 1 })); tip.position.y = len - 0.006; tip.visible = false; g.add(tip);
  const flame = new Flame({ kind: 'splinter', height: 0.035 }); flame.position.y = len; flame.on = false; g.add(flame);
  g.flame = flame; g.charred = tip; g.tipLocal = new THREE.Vector3(0, len, 0); return g;
}
export function matchbox() {
  const g = new THREE.Group(); g.name = 'Matchbox';
  const tex = canvasTexture(512, 360, (g, w, h) => {
    g.fillStyle = '#c2261d'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#f6d34a'; g.fillRect(0, h * 0.1, w, h * 0.8);
    g.fillStyle = '#7a1a12'; g.font = '900 86px Arial'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText('SAFETY', w / 2, h * 0.38); g.font = '700 46px Arial'; g.fillText('MATCHES', w / 2, h * 0.62);
    g.strokeStyle = '#7a1a12'; g.lineWidth = 6; g.strokeRect(20, h * 0.14, w - 40, h * 0.72);
  }, { key: 'matchbox' });
  const side = new THREE.MeshStandardMaterial({ color: 0x5a3a2a, roughness: 1 });
  const face = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.85 });
  const box = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.016, 0.036), [side, side, face, side, side, side]);
  box.position.y = 0.008; g.add(box);
  const strike = new THREE.Mesh(new THREE.PlaneGeometry(0.046, 0.012), new THREE.MeshStandardMaterial({ color: 0x5a3a2a, roughness: 1 }));
  strike.position.set(0, 0.008, 0.0181); g.add(strike);
  return g;
}
export function tongs() {
  const g = new THREE.Group(); g.name = 'Tongs';
  for (const s of [-1, 1]) { const arm = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.003, 0.006), chrome()); arm.position.set(0.08, 0.002, s * 0.006); arm.rotation.y = s * 0.04; g.add(arm); }
  return g;
}
export function testTubeHolder() {
  const g = new THREE.Group(); g.name = 'Test tube holder';
  const handle = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.012, 0.012), wood({ base: '#8a5a32', key: 'holder' })); handle.position.x = -0.07; g.add(handle);
  const wire = new THREE.Mesh(new THREE.TorusGeometry(0.011, 0.0015, 8, 24), chrome()); wire.rotation.x = Math.PI / 2; g.add(wire);
  const arm = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.003, 0.003), chrome()); arm.position.x = -0.025; g.add(arm);
  return g;
}

/** Irregular grey granules (e.g. zinc). Returns a group with `pieces`. */
export function granules({ n = 6, color = 0x9aa3ad, size = 0.004, spread = 0.012, metallic = true } = {}) {
  const g = new THREE.Group(); g.name = 'Granules';
  const mat = metallic ? new THREE.MeshStandardMaterial({ color, metalness: 0.85, roughness: 0.45 }) : powder(color);
  g.pieces = [];
  for (let i = 0; i < n; i++) {
    const geo = new THREE.DodecahedronGeometry(size * (0.7 + Math.random() * 0.6), 0);
    const p = geo.attributes.position; for (let k = 0; k < p.count; k++) p.setXYZ(k, p.getX(k) * (0.8 + Math.random() * 0.4), p.getY(k) * (0.7 + Math.random() * 0.4), p.getZ(k) * (0.8 + Math.random() * 0.4));
    geo.computeVertexNormals();
    const m = new THREE.Mesh(geo, mat);
    m.position.set((Math.random() - 0.5) * spread, size * 0.7, (Math.random() - 0.5) * spread);
    m.rotation.set(Math.random() * 3, Math.random() * 3, Math.random() * 3);
    g.add(m); g.pieces.push(m);
  }
  return g;
}
/** A small heap of powder/crystals. */
export function powderHeap({ r = 0.012, h = 0.008, color = 0xffffff, crystals = false } = {}) {
  const g = new THREE.Group(); g.name = 'Powder';
  const geo = new THREE.ConeGeometry(r, h, 28, 4);
  const p = geo.attributes.position; for (let k = 0; k < p.count; k++) { const y = p.getY(k); if (y < h / 2 - 1e-4) p.setX(k, p.getX(k) * (0.9 + Math.random() * 0.2)); }
  geo.computeVertexNormals();
  const heapMat = crystals ? new THREE.MeshPhysicalMaterial({ color, roughness: 0.25, clearcoat: 1, transmission: 0, metalness: 0.05 }) : powder(color);
  const m = new THREE.Mesh(geo, heapMat); m.position.y = h / 2; g.add(m); g.heap = m; g.mat = heapMat;
  if (crystals) {
    for (let i = 0; i < 14; i++) {
      const c = new THREE.Mesh(new THREE.OctahedronGeometry(0.0022 + Math.random() * 0.0015, 0), heapMat);
      const a = Math.random() * 6.28, rr = Math.random() * r * 0.8; c.position.set(Math.cos(a) * rr, h * (1 - rr / r) * 0.8 + 0.001, Math.sin(a) * rr); c.rotation.set(Math.random() * 3, Math.random() * 3, 0); g.add(c);
    }
  }
  return g;
}
export function spatula() {
  const g = new THREE.Group(); g.name = 'Spatula';
  const blade = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.001, 0.01), chrome()); blade.position.x = 0.015; g.add(blade);
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.0015, 0.0015, 0.12, 8), chrome()); shaft.rotation.z = Math.PI / 2; shaft.position.x = -0.06; g.add(shaft);
  return g;
}
/** Litmus / indicator paper strip. strip.setColor(c) animates its tint. */
export function paperStrip({ color = 0x7aa2ff, len = 0.06 } = {}) {
  const g = new THREE.Group(); g.name = 'Paper strip';
  const m = new THREE.Mesh(new THREE.BoxGeometry(0.008, len, 0.0004), paper(color)); m.position.y = len / 2; g.add(m);
  g.setColor = (c, d = 1.2) => { const t = new THREE.Color(c); return gsap.to(m.material.color, { r: t.r, g: t.g, b: t.b, duration: d }); };
  return g;
}

/* ============================================================ pouring helper */
/**
 * Pour from a reagent bottle (or vessel) into a target vessel.
 * Animates: lift, move above target, tilt, stream, rising level, return.
 */
export async function pour(lab, bottle, target, { amount = 0.03, duration = 2, side = 1, color, back = true, onFlowing } = {}) {
  const home = (bottle.userData.restPos || bottle.position).clone(); const homeRot = (bottle.userData.restRot || bottle.rotation).clone();
  const mouth = target.mouthWorld();
  // Place the bottle so that, once tilted, its lip sits just above the target's mouth.
  const tilt = side * 1.72;
  const lipL = (bottle.lipLocal || new THREE.Vector3(0, 0.1, 0)).clone();
  const rotated = lipL.clone().applyEuler(new THREE.Euler(0, 0, tilt));
  const desiredLip = mouth.clone().add(new THREE.Vector3(side * 0.003, 0.028, 0));
  const baseWorld = desiredLip.sub(rotated);
  const parentInv = bottle.parent.matrixWorld.clone().invert();
  const base = baseWorld.applyMatrix4(parentInv);
  await lab.carry(bottle, [base.x, base.y, base.z], { lift: 0.04, duration: 1 });
  await lab.tween(bottle.rotation, { z: tilt, duration: 0.8, ease: 'power2.inOut' });
  const src = bottle.vessel || bottle;
  const mat = (src.liqMat || liquid(color ?? 0xdbeafe)).clone();
  if (color !== undefined) mat.color.set(color);
  const stream = new Stream(mat, 0.0016); lab.scene.add(stream); lab.track(stream);
  const lip = bottle.localToWorld((bottle.lipLocal || new THREE.Vector3(0, 0.1, 0)).clone());
  stream.set(lip, new THREE.Vector3(mouth.x, target.localToWorld(new THREE.Vector3(0, target.surfaceY, 0)).y, mouth.z));
  stream.k = 0;
  // The student pours by holding: liquid flows only while held, so the level creeps up as they pour.
  const t0 = target.level, s0 = src.level ?? 0;
  let started = false, was = false;
  await lab.hold({
    label: 'Hold to pour', seconds: Math.max(2.5, duration * 1.6),
    onTick: (p, holding) => {
      stream.k += ((holding ? 1 : 0) - stream.k) * 0.3;
      stream.visible = stream.k > 0.02;
      if (holding && !was) lab.sfx?.('pour');
      if (holding && !started) { started = true; onFlowing?.(); }
      was = holding;
      target.setLevel(t0 + amount * p);
      if (src.setLevel && s0 > 0) src.setLevel(Math.max(0.004, s0 - amount * 0.5 * p));
      stream._to.y = target.localToWorld(new THREE.Vector3(0, target.surfaceY, 0)).y;
    },
  });
  await lab.tween(stream, { k: 0, duration: 0.2 });
  lab.remove(stream); stream.geometry.dispose();
  await lab.tween(bottle.rotation, { z: homeRot.z, duration: 0.6, ease: 'power2.inOut' });
  if (back) await lab.carry(bottle, [home.x, home.y, home.z], { lift: 0.03, duration: 0.9 });
}
