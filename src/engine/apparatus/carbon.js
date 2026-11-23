// Apparatus and effects for Lesson 4 — Carbon and its Compounds.
// Units are metres; the bench top is y = 0; every factory returns a Group whose origin is its base.
import * as THREE from 'three';
import gsap from 'gsap';
import { glass, liquid, wood, powder } from '../materials.js';
import { tripod, bunsenBurner, beaker, thermometer, retortStand, cork } from './common.js';
import { Fumes } from '../effects.js';
import { canvasTexture } from '../textures.js';

/** Inner radius of the test tubes used in this lesson (outer Ø ≈ 1.74 cm, 15 cm long). */
export const TUBE_R = 0.0075;

/** Liquid height (m) of `ml` millilitres in a round-bottomed tube of inner radius r. */
export function tubeLevel(ml, r = TUBE_R) {
  const V = ml * 1e-6, Vh = (2 / 3) * Math.PI * r ** 3;
  if (V >= Vh) return r + (V - Vh) / (Math.PI * r * r);
  let lo = 0, hi = r; // spherical cap V = πh²(3r − h)/3
  for (let i = 0; i < 32; i++) { const h = (lo + hi) / 2; if ((Math.PI * h * h * (3 * r - h)) / 3 < V) lo = h; else hi = h; }
  return (lo + hi) / 2;
}

/**
 * The shared glass() material is white, so it picks up diffuse light and veils coloured liquids
 * behind it with a milky haze. Real glass has (almost) no diffuse colour — keep only the
 * reflections. Call once after the bench is built (and for glassware created later).
 */
export function tuneGlass(root, color = 0x0b1014) {
  root.traverse((o) => {
    const mats = o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : [];
    mats.forEach((m) => { if (m.userData?.isGlass && !m.userData.tuned) { m.color.set(color); m.userData.tuned = true; } });
  });
}

/* ================================================================ racks */
/** Open test-tube rack: a single holed top plate on two end posts, so the liquids stay visible. */
export function openRack({ holes = 3, spacing = 0.04, plateY = 0.095 } = {}) {
  const g = new THREE.Group(); g.name = 'Test tube rack';
  const w = holes * spacing + 0.026, d = 0.055;
  const mat = wood({ base: '#a87444', dark: '#5a3418', key: 'rack-open' });
  const base = new THREE.Mesh(new THREE.BoxGeometry(w, 0.012, d), mat); base.position.y = 0.006; g.add(base);
  const shape = new THREE.Shape();
  shape.moveTo(-w / 2, -d / 2); shape.lineTo(w / 2, -d / 2); shape.lineTo(w / 2, d / 2); shape.lineTo(-w / 2, d / 2); shape.closePath();
  const xs = Array.from({ length: holes }, (_, i) => (i - (holes - 1) / 2) * spacing);
  for (const x of xs) { const h = new THREE.Path(); h.absarc(x, 0, 0.0105, 0, Math.PI * 2, true); shape.holes.push(h); }
  const plate = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: 0.008, bevelEnabled: false, curveSegments: 24 }), mat);
  plate.rotation.x = -Math.PI / 2; plate.position.y = plateY; g.add(plate);
  for (const s of [-1, 1]) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.012, plateY - 0.004, d), mat);
    post.position.set(s * (w / 2 - 0.006), 0.012 + (plateY - 0.012) / 2, 0); g.add(post);
  }
  // shallow sockets in the base so tubes sit in place
  const sockMat = new THREE.MeshStandardMaterial({ color: 0x3b2414, roughness: 0.9 });
  for (const x of xs) { const s = new THREE.Mesh(new THREE.CylinderGeometry(0.0085, 0.0085, 0.0012, 24), sockMat); s.position.set(x, 0.0118, 0); g.add(s); }
  g.slots = xs.map((x) => new THREE.Vector3(x, 0.012, 0));
  g.plateTop = plateY + 0.008;
  return g;
}

/* ============================================================ water bath */
/**
 * Beaker of water on a tripod + gauze over a Bunsen burner, with a thermometer leaning in it and
 * (optionally) a retort stand whose clamp holds a test tube upright in the bath.
 * g.tubeBase  -> local position where a clamped tube's base sits.
 */
export function waterBath({ tripodH = 0.165, beakerR = 0.034, beakerH = 0.09, water = 0.056, temp = 30, stand = true } = {}) {
  const g = new THREE.Group(); g.name = 'Water bath';
  const burner = bunsenBurner(); burner.flame.scale.setScalar(0.62); g.add(burner);
  const tri = tripod({ h: tripodH }); tri.rotation.y = -Math.PI / 2; g.add(tri);
  const bk = beaker({ r: beakerR, h: beakerH, capacity: 250, liquidColor: 0xe4f1fa, level: water });
  bk.setLiquidColor(0xe4f1fa, { opacity: 0.1 }); // (Vessel.clarity over-estimates opacity for pale tints)
  bk.name = 'Water bath'; bk.position.y = tri.topY; g.add(bk);
  const th = thermometer({ len: 0.2, temp });
  th.position.set(0.021, tri.topY + 0.0045, -0.011); th.rotation.z = -0.07; g.add(th);
  const steam = new Fumes({ color: 0xffffff, count: 40, rate: 0, size: 0.028, rise: 0.05, spread: 0.018, opacity: 0.16, life: 3.2, drift: [0.004, 0] });
  steam.position.y = tri.topY + beakerH - 0.004; g.add(steam);
  g.burner = burner; g.tripod = tri; g.beaker = bk; g.thermo = th; g.steam = steam;
  g.tubeBase = new THREE.Vector3(0, tri.topY + 0.0015 + 0.007, 0);
  g.waterTopY = tri.topY + 0.0015 + water;
  if (stand) {
    const clampY = g.tubeBase.y + 0.108;
    const rs = retortStand({ height: 0.46, clampY, armLen: 0.24 });
    rs.position.set(0, 0, -0.16); g.add(rs); g.stand = rs;
  }
  return g;
}

/* ============================================================== hands */
/** A right hand in a blue nitrile glove with a white lab-coat cuff. Palm down, fingers towards -z. */
export function gloveHand({ color = 0x7eaee3 } = {}) {
  const g = new THREE.Group(); g.name = 'Gloved hand';
  const mat = new THREE.MeshPhysicalMaterial({ color, roughness: 0.5, clearcoat: 0.35, clearcoatRoughness: 0.4, sheen: 0.5, sheenColor: new THREE.Color(0xdbeafe) });
  const palm = new THREE.Mesh(new THREE.SphereGeometry(1, 28, 18), mat); palm.scale.set(0.039, 0.013, 0.046); g.add(palm);
  const fingers = [[-0.026, 0.05], [-0.0088, 0.058], [0.0088, 0.055], [0.026, 0.044]];
  fingers.forEach(([x, len], i) => {
    const f = new THREE.Mesh(new THREE.CapsuleGeometry(0.0082 - i * 0.0004, len, 6, 14), mat);
    f.rotation.x = Math.PI / 2 - 0.12; f.position.set(x * 1.02, -0.003, -0.036 - len / 2); g.add(f);
  });
  const thumb = new THREE.Mesh(new THREE.CapsuleGeometry(0.0095, 0.04, 6, 14), mat);
  thumb.rotation.set(Math.PI / 2, 0, 0); thumb.rotation.y = 0.75; thumb.position.set(-0.046, -0.004, -0.012); g.add(thumb);
  const cuff = new THREE.Mesh(new THREE.CylinderGeometry(0.031, 0.033, 0.05, 28), mat); cuff.rotation.x = Math.PI / 2; cuff.scale.set(1, 1, 0.55); cuff.position.z = 0.058; g.add(cuff);
  const sleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.046, 0.16, 28), new THREE.MeshStandardMaterial({ color: 0xd9dce1, roughness: 0.9 }));
  sleeve.rotation.x = Math.PI / 2; sleeve.scale.set(1, 1, 0.7); sleeve.position.z = 0.16; g.add(sleeve);
  return g;
}

/* =================================================== cork + delivery tube */
/**
 * Cork that fits a test tube, with a bent glass delivery tube: up from the cork, across by `dx`,
 * then down `depth` below the cork centre. Origin = cork centre. g.tipLocal = open end.
 */
export function corkDelivery({ r = TUBE_R, dx = 0.07, rise = 0.045, depth = 0.13, bend = 0.012, inner = 0.014 } = {}) {
  const g = new THREE.Group(); g.name = 'Cork with delivery tube';
  const ck = cork({ r: r + 0.0006, h: 0.016 }); g.add(ck); g.cork = ck;
  const s = Math.sign(dx) || 1;
  const P = (x, y) => new THREE.Vector3(x, y, 0);
  const path = new THREE.CurvePath();
  path.add(new THREE.LineCurve3(P(0, -inner), P(0, rise - bend)));
  path.add(new THREE.QuadraticBezierCurve3(P(0, rise - bend), P(0, rise), P(bend * s, rise)));
  path.add(new THREE.LineCurve3(P(bend * s, rise), P(dx - bend * s, rise)));
  path.add(new THREE.QuadraticBezierCurve3(P(dx - bend * s, rise), P(dx, rise), P(dx, rise - bend)));
  path.add(new THREE.LineCurve3(P(dx, rise - bend), P(dx, -depth)));
  const tube = new THREE.Mesh(new THREE.TubeGeometry(path, 220, 0.0024, 12, false), glass({ opacity: 0.3, edge: 0.92 }));
  tube.renderOrder = 3; g.add(tube); g.tube = tube;
  g.tipLocal = P(dx, -depth); g.path = path;
  return g;
}

/* =============================================================== stopwatch */
/** Mechanical stopwatch lying face-up on the bench. g.setSeconds(s) moves the sweep hand. */
export function stopwatch() {
  const g = new THREE.Group(); g.name = 'Stopwatch';
  const steel = new THREE.MeshStandardMaterial({ color: 0xa4a9b0, metalness: 1, roughness: 0.3 });
  const caseM = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.027, 0.012, 48), steel); caseM.position.y = 0.006; g.add(caseM);
  const face = canvasTexture(512, 512, (c, w) => {
    c.fillStyle = '#fbfaf6'; c.beginPath(); c.arc(w / 2, w / 2, w / 2, 0, Math.PI * 2); c.fill();
    c.strokeStyle = '#111'; c.fillStyle = '#111'; c.textAlign = 'center'; c.textBaseline = 'middle';
    for (let i = 0; i < 60; i++) {
      const a = (i / 60) * Math.PI * 2 - Math.PI / 2, r1 = w * 0.46, r0 = i % 5 ? w * 0.43 : w * 0.39;
      c.lineWidth = i % 5 ? 3 : 7; c.beginPath(); c.moveTo(w / 2 + Math.cos(a) * r0, w / 2 + Math.sin(a) * r0); c.lineTo(w / 2 + Math.cos(a) * r1, w / 2 + Math.sin(a) * r1); c.stroke();
      if (i % 5 === 0) { c.font = '700 40px Arial'; c.fillText(String(i || 60), w / 2 + Math.cos(a) * w * 0.31, w / 2 + Math.sin(a) * w * 0.31); }
    }
    c.font = '600 26px Arial'; c.fillStyle = '#b91c1c'; c.fillText('SECONDS', w / 2, w * 0.66);
  }, { key: 'stopwatch-face' });
  const dial = new THREE.Mesh(new THREE.CircleGeometry(0.0235, 48), new THREE.MeshStandardMaterial({ map: face, color: 0xb8b8b4, roughness: 0.75 }));
  dial.rotation.x = -Math.PI / 2; dial.position.y = 0.0121; g.add(dial);
  const crystal = new THREE.Mesh(new THREE.SphereGeometry(0.024, 32, 8, 0, Math.PI * 2, 0, 0.5), glass({ opacity: 0.12, edge: 0.6 }));
  crystal.scale.y = 0.35; crystal.position.y = 0.0105; g.add(crystal);
  const hand = new THREE.Group(); hand.position.y = 0.0128; g.add(hand);
  const needle = new THREE.Mesh(new THREE.BoxGeometry(0.0009, 0.0006, 0.021), new THREE.MeshStandardMaterial({ color: 0xc81e1e, roughness: 0.4 }));
  needle.position.z = -0.0075; hand.add(needle);
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.0015, 0.0015, 0.001, 16), new THREE.MeshStandardMaterial({ color: 0x111111 })); hand.add(hub);
  const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.0035, 0.0035, 0.008, 16), steel); crown.rotation.x = Math.PI / 2; crown.position.set(0, 0.006, -0.03); g.add(crown);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.0055, 0.0012, 8, 20), steel); ring.rotation.x = Math.PI / 2; ring.position.set(0, 0.006, -0.039); g.add(ring);
  g.setSeconds = (s) => { hand.rotation.y = -((s % 60) / 60) * Math.PI * 2; };
  g.setSeconds(0);
  return g;
}

/* ================================================================ effects */
/**
 * Oil in a test tube of water: a floating layer that can be shaken into droplets (an emulsion).
 * Add as a child of the vessel. `rise` = how fast droplets float back up (fast without soap,
 * very slow with soap). The vessel's liquid turns milky while droplets are dispersed.
 */
export class Emulsion extends THREE.Group {
  constructor(vessel, { color = 0xe8b02a, count = 320, water = 0xeaf4fb, milky = 0xf3ead0 } = {}) {
    super();
    this.v = vessel; this.T = 0; this.total = 0; this.rise = 0.012; this.milkK = 0.55;
    this.waterColor = new THREE.Color(water); this.milky = new THREE.Color(milky); this.cloudyBase = 0;
    const lm = liquid(color, { opacity: 0.8 }); lm.color.set(color);
    this.layer = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 1, 40), lm);
    this.layer.renderOrder = 2; this.layer.visible = false; this.layer.raycast = () => {}; this.layer.userData.noShadow = true;
    this.add(this.layer);
    const dm = new THREE.MeshPhysicalMaterial({ color, roughness: 0.15, clearcoat: 1, transparent: true, opacity: 0.92, emissive: color, emissiveIntensity: 0.12, depthWrite: false });
    this.drops = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 10, 8), dm, count);
    this.drops.frustumCulled = false; this.drops.raycast = () => {}; this.drops.renderOrder = 2; this.drops.userData.noShadow = true;
    this.add(this.drops);
    this.p = Array.from({ length: count }, () => ({ alive: false, x: 0, y: 0, z: 0, s: 0, ph: 0, k: 1 }));
    this.n0 = 0; this.alive = 0; this._lastF = -1;
    const m = new THREE.Matrix4().makeScale(0, 0, 0); for (let i = 0; i < count; i++) this.drops.setMatrixAt(i, m);
  }
  /** Animate the floating oil layer to thickness T (m). */
  layerTo(T, duration = 0.8) { this.total = T; return gsap.to(this, { T, duration, ease: 'power1.out' }); }
  /** Break the layer into droplets spread through the water. */
  disperse({ size = [0.0004, 0.001], rise = this.rise, fraction = 1 } = {}) {
    const v = this.v, top = v.surfaceY - 0.002, bot = v.bottomY + 0.003;
    const n = Math.round(this.p.length * fraction);
    this.p.forEach((q, i) => {
      q.alive = i < n;
      const y = bot + Math.random() * (top - bot), lim = Math.max(0.0005, v.radiusAt(y) * 0.86);
      const a = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random()) * lim;
      q.x = Math.cos(a) * r; q.z = Math.sin(a) * r; q.y = y;
      q.s = size[0] + Math.random() * (size[1] - size[0]); q.ph = Math.random() * 20; q.k = 0.6 + Math.random() * 0.8;
    });
    this.n0 = n; this.alive = n; this.rise = rise; this.T = 0; this._lastF = -1;
  }
  get dispersed() { return this.n0 ? this.alive / this.n0 : 0; }
  update(dt, t) {
    const v = this.v, surf = v.surfaceY;
    if (this.n0) {
      let alive = 0;
      for (let i = 0; i < this.p.length; i++) {
        const q = this.p[i];
        if (!q.alive) { _m.makeScale(0, 0, 0); this.drops.setMatrixAt(i, _m); continue; }
        // bigger droplets rise faster (Stokes)
        q.y += this.rise * q.k * (q.s / 0.0008) * dt;
        const lim = Math.max(0.0004, v.radiusAt(q.y) * 0.88 - q.s);
        let x = q.x + Math.sin(t * 2.1 + q.ph) * 0.0004, z = q.z + Math.cos(t * 1.7 + q.ph) * 0.0004;
        const rr = Math.hypot(x, z); if (rr > lim) { x *= lim / rr; z *= lim / rr; }
        if (q.y >= surf - q.s) { q.alive = false; _m.makeScale(0, 0, 0); }
        else { alive++; _m.compose(_p.set(x, q.y, z), _q.identity(), _s.setScalar(q.s)); }
        this.drops.setMatrixAt(i, _m);
      }
      this.alive = alive;
      this.T = this.total * (1 - alive / this.n0);
      this.drops.instanceMatrix.needsUpdate = true;
      const f = alive / this.n0;
      if (Math.abs(f - this._lastF) > 0.004) {
        this._lastF = f;
        const c = this.waterColor.clone().lerp(this.milky, Math.min(1, f * 1.4));
        const cloudy = this.cloudyBase + f * this.milkK;
        v.setLiquidColor(c, { cloudy, opacity: this.clearOpacity === undefined ? undefined : THREE.MathUtils.lerp(this.clearOpacity, 0.97, Math.min(1, cloudy)) });
      }
      if (alive === 0) this.n0 = 0;
    }
    this.layer.visible = this.T > 0.00015;
    if (this.layer.visible) {
      const r = Math.max(0.001, v.radiusAt(surf) - 0.0003);
      this.layer.scale.set(r, this.T, r); this.layer.position.y = surf + this.T / 2 - 0.0006;
    }
  }
}

/** A cap of small foam bubbles floating on a liquid surface. `amount` 0..1 (tweenable). */
export class Froth extends THREE.Group {
  constructor(vessel, { count = 110, size = 0.0011, color = 0xffffff, opacity = 0.7, height = 0.006, extra = () => 0 } = {}) {
    super();
    this.v = vessel; this.amount = 0; this.cfg = { size, height }; this.extra = extra;
    const mat = new THREE.MeshPhysicalMaterial({ color, roughness: 0.1, clearcoat: 1, transparent: true, opacity, depthWrite: false, envMapIntensity: 2 });
    this.mesh = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 10, 8), mat, count);
    this.mesh.frustumCulled = false; this.mesh.raycast = () => {}; this.mesh.renderOrder = 2; this.mesh.userData.noShadow = true;
    this.add(this.mesh);
    this.p = Array.from({ length: count }, (_, i) => ({ a: Math.random() * Math.PI * 2, r: Math.sqrt(Math.random()), h: Math.random(), s: 0.5 + Math.random() * 0.9, ph: Math.random() * 9, k: i / count }));
  }
  update(dt, t) {
    const v = this.v, base = v.surfaceY + (this.extra() || 0), R = Math.max(0.001, v.radiusAt(base) - 0.0004);
    for (let i = 0; i < this.p.length; i++) {
      const q = this.p[i];
      if (q.k >= this.amount || !v.liquidMesh.visible) { _m.makeScale(0, 0, 0); this.mesh.setMatrixAt(i, _m); continue; }
      const s = this.cfg.size * q.s * (1 + Math.sin(t * 6 + q.ph) * 0.08);
      const r = q.r * (R - s);
      _m.compose(_p.set(Math.cos(q.a) * r, base + q.h * this.cfg.height * this.amount + s * 0.3, Math.sin(q.a) * r), _q.identity(), _s.setScalar(s));
      this.mesh.setMatrixAt(i, _m);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
  }
}

/**
 * One drop of liquid falls from a world point into a vessel, then spreads as a coloured plume
 * that sinks and fades. Resolves after the plume is gone. (lab is used for tweens/tracking.)
 */
export async function dropInto(lab, fromWorld, vessel, { color = 0x5b0f6e, fall = 0.28, plume = true, plumeTime = 1.4, onSplash } = {}) {
  const mat = liquid(color, { opacity: 0.92 }); mat.color.set(color);
  const drop = new THREE.Mesh(new THREE.SphereGeometry(0.0016, 14, 10), mat);
  drop.scale.set(1, 1.35, 1); drop.position.copy(fromWorld); drop.position.y -= 0.002; drop.renderOrder = 4;
  lab.scene.add(drop);
  const surfW = vessel.localToWorld(new THREE.Vector3(0, vessel.surfaceY, 0));
  await lab.tween(drop.position, { x: surfW.x, z: surfW.z, y: surfW.y + 0.001, duration: fall, ease: 'power2.in' });
  lab.scene.remove(drop); drop.geometry.dispose();
  lab.sfx?.('drop');
  onSplash?.();
  if (!plume) { mat.dispose(); return; }
  const pm = mat.clone(); pm.opacity = 0.75; pm.depthWrite = false;
  const blob = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 12), pm);
  blob.renderOrder = 2; blob.position.set(0, vessel.surfaceY - 0.002, 0); blob.scale.set(0.0016, 0.0016, 0.0016);
  vessel.add(blob);
  const r = vessel.radiusAt(vessel.surfaceY) * 0.85, depth = Math.max(0.002, vessel.level * 0.55);
  const tl = lab.timeline({ paused: true });
  tl.to(blob.scale, { x: r, z: r, y: depth * 0.6, duration: plumeTime * 0.6, ease: 'power2.out' }, 0);
  tl.to(blob.position, { y: vessel.surfaceY - depth * 0.6, duration: plumeTime, ease: 'sine.inOut' }, 0);
  tl.to(pm, { opacity: 0, duration: plumeTime * 0.7, ease: 'power1.in' }, plumeTime * 0.3);
  await lab.play(tl);
  vessel.remove(blob); blob.geometry.dispose(); pm.dispose(); mat.dispose();
}

/** Small white powder heap on a spatula blade (positioned for common.spatula()). */
export function bladeHeap({ color = 0xffffff } = {}) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), powder(color));
  m.scale.set(0.0095, 0.0035, 0.0042); m.position.set(0.017, 0.0005, 0); m.name = 'Powder';
  return m;
}

const _m = new THREE.Matrix4(), _p = new THREE.Vector3(), _q = new THREE.Quaternion(), _s = new THREE.Vector3();
