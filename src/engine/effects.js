// Animated effects: flames, bubbles, fumes, precipitate, pour streams, drops, sparkles.
// Every effect is an Object3D with update(dt, t, camera). Lab calls update for everything added via lab.add().
import * as THREE from 'three';
import { smokeSprite, radialSprite } from './textures.js';

const tmpM = new THREE.Matrix4();
const tmpQ = new THREE.Quaternion();
const tmpS = new THREE.Vector3();
const tmpP = new THREE.Vector3();

/* ------------------------------------------------------------------ flame */
const flameVert = /* glsl */`
  varying vec2 vUv;
  void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`;
const flameFrag = /* glsl */`
  uniform float uTime; uniform float uIntensity; uniform vec3 uOuter; uniform vec3 uInner; uniform float uKind;
  varying vec2 vUv;
  float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
  float noise(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
    return mix(mix(hash(i),hash(i+vec2(1,0)),f.x), mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x), f.y); }
  void main(){
    vec2 uv = vUv; float y = uv.y;
    float n = noise(vec2(uv.x*4.0, y*3.0 - uTime*4.0)) - 0.5;
    float x = (uv.x - 0.5) * 2.0 + n * 0.25 * y;
    // teardrop width profile
    float w = uKind < 0.5 ? (sin(pow(y,0.6)*3.14159) * (1.0 - y*0.55)) : (pow(1.0 - y, 0.9) * smoothstep(0.0, 0.15, y));
    float d = abs(x) / max(w, 0.001);
    float body = smoothstep(1.0, 0.55, d) * smoothstep(1.0, 0.85, y);
    float core = smoothstep(0.6, 0.0, d) * smoothstep(0.75, 0.05, y);
    vec3 col = mix(uOuter, uInner, core);
    if (uKind < 0.5) col += vec3(0.25,0.35,1.0) * smoothstep(0.2, 0.0, y) * body; // blue base of candle flame
    float a = body * uIntensity;
    if (a < 0.01) discard;
    gl_FragColor = vec4(col * (1.3 + core) * uIntensity, a);
  }`;

/**
 * kind 'candle' (yellow teardrop) | 'bunsen' (blue cone) | 'spirit' (pale blue-yellow) | 'splinter'
 */
export class Flame extends THREE.Group {
  constructor({ kind = 'candle', height = 0.06, width } = {}) {
    super();
    const presets = {
      candle: { outer: [1.0, 0.55, 0.12], inner: [1.0, 0.95, 0.7], k: 0, w: 0.4 },
      splinter: { outer: [1.0, 0.45, 0.08], inner: [1.0, 0.9, 0.5], k: 0, w: 0.45 },
      bunsen: { outer: [0.25, 0.45, 1.0], inner: [0.6, 0.95, 1.0], k: 1, w: 0.28 },
      spirit: { outer: [0.35, 0.5, 1.0], inner: [1.0, 0.85, 0.5], k: 1, w: 0.35 },
    };
    const p = presets[kind] || presets.candle;
    this.mat = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 }, uIntensity: { value: 1 }, uOuter: { value: new THREE.Vector3(...p.outer) }, uInner: { value: new THREE.Vector3(...p.inner) }, uKind: { value: p.k } },
      vertexShader: flameVert, fragmentShader: flameFrag, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, toneMapped: false,
    });
    const w = width || height * p.w;
    const geo = new THREE.PlaneGeometry(w, height); geo.translate(0, height / 2, 0);
    this.plane = new THREE.Mesh(geo, this.mat);
    this.plane.renderOrder = 10;
    this.add(this.plane);
    this.light = new THREE.PointLight(kind === 'bunsen' ? 0x6688ff : 0xffa040, kind === 'bunsen' ? 0.02 : 0.06, 0.8, 2);
    this.light.position.y = height * 0.5;
    this.light.userData.base = this.light.intensity;
    this.add(this.light);
    this.intensity = 1; this._target = 1; this.raycast = () => {};
    this.plane.raycast = () => {};
  }
  set on(v) { this._target = v ? 1 : 0; }
  get on() { return this._target > 0; }
  update(dt, t, camera) {
    this.intensity += (this._target - this.intensity) * Math.min(1, dt * 6);
    this.mat.uniforms.uTime.value = t;
    this.mat.uniforms.uIntensity.value = this.intensity * (0.92 + Math.sin(t * 23) * 0.04 + Math.sin(t * 37) * 0.04);
    this.light.intensity = this.intensity * this.light.userData.base;
    this.visible = this.intensity > 0.01;
    // Flames always burn upward in world space, then billboard around Y towards the camera.
    if (this.parent) { this.parent.getWorldQuaternion(tmpQ); this.quaternion.copy(tmpQ).invert(); }
    if (camera) {
      this.getWorldPosition(tmpP);
      this.plane.rotation.y = Math.atan2(camera.position.x - tmpP.x, camera.position.z - tmpP.z);
    }
  }
}

/* ---------------------------------------------------------------- bubbles */
/**
 * Bubbles rising through a liquid. Set `rate` (bubbles/sec). Move the source with `source` (local coords)
 * and the surface with `surfaceY`.
 */
export class Bubbles extends THREE.Group {
  constructor({ count = 160, radius = 0.012, bottomY = 0, surfaceY = 0.08, spread = 0.008, size = 0.0018, rate = 0, color = 0xffffff, speed = 0.06, sources = null } = {}) {
    super();
    this.cfg = { radius, bottomY, surfaceY, spread, size, speed };
    this.rate = rate; this.sources = sources; this._acc = 0;
    const geo = new THREE.SphereGeometry(1, 10, 8);
    const mat = new THREE.MeshPhysicalMaterial({ color, roughness: 0, transparent: true, opacity: 0.55, clearcoat: 1, envMapIntensity: 3, depthWrite: false });
    this.mesh = new THREE.InstancedMesh(geo, mat, count);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.frustumCulled = false; this.mesh.raycast = () => {};
    this.add(this.mesh);
    this.p = Array.from({ length: count }, () => ({ alive: false, x: 0, y: 0, z: 0, s: 0, v: 0, ph: 0 }));
    this.mesh.count = count;
    this._hideAll();
  }
  get surfaceY() { return this.cfg.surfaceY; }
  set surfaceY(v) { this.cfg.surfaceY = v; }
  _hideAll() { tmpM.makeScale(0, 0, 0); for (let i = 0; i < this.p.length; i++) this.mesh.setMatrixAt(i, tmpM); this.mesh.instanceMatrix.needsUpdate = true; }
  burst(n = 20) { for (let i = 0; i < n; i++) this._spawn(); }
  _spawn() {
    const b = this.p.find((q) => !q.alive); if (!b) return;
    const c = this.cfg;
    let sx = 0, sz = 0, sy = c.bottomY;
    if (this.sources && this.sources.length) { const s = this.sources[(Math.random() * this.sources.length) | 0]; sx = s.x; sy = s.y; sz = s.z; }
    const a = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random()) * c.spread;
    b.x = sx + Math.cos(a) * r; b.z = sz + Math.sin(a) * r; b.y = sy;
    b.s = c.size * (0.5 + Math.random()); b.v = c.speed * (0.7 + Math.random() * 0.6); b.ph = Math.random() * 10; b.alive = true;
  }
  update(dt, t) {
    if (this.rate > 0) { this._acc += this.rate * dt; while (this._acc >= 1) { this._spawn(); this._acc -= 1; } }
    const c = this.cfg; let any = false;
    for (let i = 0; i < this.p.length; i++) {
      const b = this.p[i];
      if (!b.alive) { tmpM.makeScale(0, 0, 0); this.mesh.setMatrixAt(i, tmpM); continue; }
      any = true;
      b.v += dt * 0.05; b.y += b.v * dt; b.s *= 1 + dt * 0.25;
      const wob = Math.sin(t * 9 + b.ph) * 0.0012;
      let x = b.x + wob, z = b.z;
      const rr = Math.hypot(x, z), lim = c.radius - b.s;
      if (rr > lim && rr > 0) { x *= lim / rr; z *= lim / rr; }
      if (b.y >= c.surfaceY) { b.alive = false; tmpM.makeScale(0, 0, 0); }
      else tmpM.compose(tmpP.set(x, b.y, z), tmpQ.identity(), tmpS.setScalar(b.s));
      this.mesh.setMatrixAt(i, tmpM);
    }
    if (any || this.rate > 0) this.mesh.instanceMatrix.needsUpdate = true;
  }
}

/* ------------------------------------------------------------ fumes/smoke */
export class Fumes extends THREE.Group {
  constructor({ color = 0xffffff, count = 60, rate = 0, size = 0.05, rise = 0.12, spread = 0.01, opacity = 0.5, grow = 2.5, life = 3, drift = [0.01, 0] } = {}) {
    super();
    this.cfg = { size, rise, spread, opacity, grow, life, drift };
    this.rate = rate; this._acc = 0;
    const tex = smokeSprite();
    this.parts = [];
    for (let i = 0; i < count; i++) {
      const m = new THREE.SpriteMaterial({ map: tex, color, transparent: true, opacity: 0, depthWrite: false });
      const s = new THREE.Sprite(m); s.visible = false; s.raycast = () => {};
      s.userData = { age: 0, alive: false, rot: 0 };
      this.add(s); this.parts.push(s);
    }
  }
  setColor(c) { this.parts.forEach((p) => p.material.color.set(c)); }
  _spawn() {
    const s = this.parts.find((p) => !p.userData.alive); if (!s) return;
    const c = this.cfg;
    s.position.set((Math.random() - 0.5) * c.spread * 2, 0, (Math.random() - 0.5) * c.spread * 2);
    s.userData.age = 0; s.userData.alive = true; s.userData.vx = (Math.random() - 0.5) * 0.02 + c.drift[0]; s.userData.vz = (Math.random() - 0.5) * 0.02 + c.drift[1];
    s.material.rotation = Math.random() * 6.28; s.visible = true;
  }
  update(dt) {
    if (this.rate > 0) { this._acc += this.rate * dt; while (this._acc >= 1) { this._spawn(); this._acc -= 1; } }
    const c = this.cfg;
    for (const s of this.parts) {
      const u = s.userData; if (!u.alive) continue;
      u.age += dt; const k = u.age / c.life;
      if (k >= 1) { u.alive = false; s.visible = false; continue; }
      s.position.y += c.rise * dt * (1 - k * 0.5);
      s.position.x += u.vx * dt; s.position.z += u.vz * dt;
      const sc = c.size * (1 + k * c.grow); s.scale.set(sc, sc, sc);
      s.material.opacity = c.opacity * Math.sin(Math.min(1, k * 1.2) * Math.PI) ;
      s.material.rotation += dt * 0.3;
    }
  }
}

/* ----------------------------------------------------------- precipitate */
/**
 * Insoluble solid forming inside a solution. Call form() — particles cloud through the liquid,
 * swirl, then settle into a layer at the bottom.
 */
export class Precipitate extends THREE.Group {
  constructor({ color = 0xffd400, count = 700, radius = 0.011, bottomY = 0.004, topY = 0.06, size = 0.0011 } = {}) {
    super();
    this.cfg = { radius, bottomY, topY, size };
    const geo = new THREE.IcosahedronGeometry(1, 0);
    const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.8, emissive: color, emissiveIntensity: 0.15 });
    this.mesh = new THREE.InstancedMesh(geo, mat, count);
    this.mesh.frustumCulled = false; this.mesh.raycast = () => {};
    this.add(this.mesh);
    this.p = Array.from({ length: count }, () => ({ x: 0, y: 0, z: 0, vy: 0, a: 0, settled: false, on: false, delay: 0 }));
    this.settleRate = 0.012; this._t = 0;
    this.layer = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.96, radius * 0.7, 1, 24), new THREE.MeshStandardMaterial({ color, roughness: 0.95 }));
    this.layer.scale.y = 0.0001; this.layer.position.y = bottomY; this.layer.raycast = () => {};
    this.add(this.layer);
    this.layerTarget = 0;
    tmpM.makeScale(0, 0, 0); for (let i = 0; i < count; i++) this.mesh.setMatrixAt(i, tmpM);
  }
  /** start forming; `at` = local y where reagent enters (cloud spreads from there) */
  form({ at, layerHeight = 0.006, duration = 6 } = {}) {
    const c = this.cfg; const y0 = at ?? c.topY;
    this.p.forEach((q, i) => {
      const a = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random()) * c.radius * 0.9;
      q.x = Math.cos(a) * r; q.z = Math.sin(a) * r; q.y = y0 - Math.random() * (y0 - c.bottomY) * 0.5;
      q.vy = 0; q.a = a; q.settled = false; q.on = true; q.delay = Math.random() * 0.8;
    });
    this.layerTarget = layerHeight; this.duration = duration;
  }
  update(dt, t) {
    const c = this.cfg;
    for (let i = 0; i < this.p.length; i++) {
      const q = this.p[i]; if (!q.on) continue;
      if (q.delay > 0) { q.delay -= dt; tmpM.makeScale(0, 0, 0); this.mesh.setMatrixAt(i, tmpM); continue; }
      if (!q.settled) {
        q.a += dt * 0.6; const swirl = 0.004 * dt;
        q.x += Math.cos(q.a) * swirl; q.z += Math.sin(q.a) * swirl;
        q.y -= this.settleRate * dt * (0.5 + (i % 7) / 7);
        const rr = Math.hypot(q.x, q.z), lim = c.radius * 0.92; if (rr > lim) { q.x *= lim / rr; q.z *= lim / rr; }
        const floor = c.bottomY + this.layer.scale.y;
        if (q.y <= floor) { q.y = floor; q.settled = true; }
      }
      tmpM.compose(tmpP.set(q.x, q.y, q.z), tmpQ.setFromAxisAngle(tmpS.set(0, 1, 0), i), tmpS.setScalar(c.size * (0.6 + (i % 5) * 0.15)));
      this.mesh.setMatrixAt(i, tmpM);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
    if (this.layer.scale.y < this.layerTarget) {
      const settled = this.p.filter((q) => q.settled).length / this.p.length;
      this.layer.scale.y = Math.max(0.0001, this.layerTarget * settled);
      this.layer.position.y = c.bottomY + this.layer.scale.y / 2;
    }
  }
}

/* ---------------------------------------------------------------- stream */
/** Liquid stream between two world points (used while pouring). */
export class Stream extends THREE.Mesh {
  constructor(material, radius = 0.0018) {
    const geo = new THREE.CylinderGeometry(radius * 0.7, radius, 1, 10, 1, true);
    geo.translate(0, -0.5, 0);
    super(geo, material);
    this.visible = false; this.raycast = () => {};
    this._from = new THREE.Vector3(); this._to = new THREE.Vector3(); this.k = 0;
  }
  set(from, to) { this._from.copy(from); this._to.copy(to); }
  update(dt, t) {
    if (!this.visible) return;
    const len = this._from.distanceTo(this._to) * this.k;
    this.position.copy(this._from);
    const dir = tmpP.subVectors(this._to, this._from).normalize();
    this.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), dir);
    this.scale.set(1 + Math.sin(t * 40) * 0.08, Math.max(0.0001, len), 1 + Math.cos(t * 33) * 0.08);
  }
}

/* -------------------------------------------------------------- sparkles */
export class Sparkles extends THREE.Group {
  constructor({ color = 0xffe08a, count = 40 } = {}) {
    super();
    const tex = radialSprite({ inner: 'rgba(255,255,255,1)', outer: 'rgba(255,255,255,0)' });
    this.parts = Array.from({ length: count }, () => {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, color, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0 }));
      s.visible = false; s.raycast = () => {}; this.add(s); s.userData = { age: 0, life: 1, alive: false, v: new THREE.Vector3() }; return s;
    });
  }
  emit(n = 20, spread = 0.03) {
    for (let i = 0; i < n; i++) {
      const s = this.parts.find((p) => !p.userData.alive); if (!s) return;
      s.position.set(0, 0, 0); s.userData.v.set((Math.random() - 0.5) * spread * 4, Math.random() * spread * 4, (Math.random() - 0.5) * spread * 4);
      s.userData.age = 0; s.userData.life = 0.5 + Math.random() * 0.6; s.userData.alive = true; s.visible = true;
    }
  }
  update(dt) {
    for (const s of this.parts) {
      const u = s.userData; if (!u.alive) continue; u.age += dt;
      const k = u.age / u.life; if (k >= 1) { u.alive = false; s.visible = false; continue; }
      s.position.addScaledVector(u.v, dt); u.v.y -= dt * 0.05;
      const sc = 0.012 * (1 - k); s.scale.set(sc, sc, sc); s.material.opacity = 1 - k;
    }
  }
}

/* ------------------------------------------------------------ light beam */
/** A glowing ray segment from a to b (world or local). Use for optics. */
export function beam(a, b, { color = 0xff2a2a, width = 0.0016, intensity = 2.2, opacity = 0.95 } = {}) {
  const mat = new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(intensity), transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
  const geo = new THREE.CylinderGeometry(width, width, 1, 8, 1, true); geo.translate(0, 0.5, 0); geo.rotateX(Math.PI / 2);
  const m = new THREE.Mesh(geo, mat); m.raycast = () => {};
  m.setEnds = (p, q) => {
    m.position.copy(p); m.lookAt(q); m.scale.set(1, 1, Math.max(1e-4, p.distanceTo(q)));
  };
  // lookAt needs world space; caller should add to scene root or a non-rotated group.
  m.setEnds(a, b);
  return m;
}

/** Group of beams you can rebuild every frame from a list of polylines. */
export class RayBundle extends THREE.Group {
  constructor({ width = 0.0015, intensity = 2.2 } = {}) { super(); this.pool = []; this.width = width; this.intensity = intensity; }
  /** lines: [{ pts:[Vector3...], color, dashed? , opacity }] */
  draw(lines) {
    let k = 0;
    for (const L of lines) {
      for (let i = 0; i < L.pts.length - 1; i++) {
        let m = this.pool[k];
        if (!m) { m = beam(new THREE.Vector3(), new THREE.Vector3(0, 0, 1), { width: this.width, intensity: this.intensity }); this.pool.push(m); this.add(m); }
        m.visible = true;
        m.material.color.set(L.color ?? 0xff2a2a).multiplyScalar(L.intensity ?? this.intensity);
        m.material.opacity = L.opacity ?? 0.95;
        m.setEnds(L.pts[i], L.pts[i + 1]);
        k++;
      }
    }
    for (; k < this.pool.length; k++) this.pool[k].visible = false;
  }
}
