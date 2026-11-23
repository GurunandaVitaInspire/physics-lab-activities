// The 3D laboratory: renderer, room, bench, camera, interaction primitives.
// Experiments script it with async/await: `await lab.waitClick(obj)`, `await lab.waitDrop(item, target)`.
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutlinePass } from 'three/examples/jsm/postprocessing/OutlinePass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { CSS2DRenderer, CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import gsap from 'gsap';
import { quality, wood, plastic, metal } from './materials.js';
import { epoxyTexture, epoxyRoughness, tileTexture, floorTexture, canvasTexture } from './textures.js';

// Dev/QA switches: ?test drives a virtual clock (window.__labTest.advance), ?auto simulates the student.
// Development only: in production builds both are the constant `false`, so the QA code is stripped out.
export const TEST = import.meta.env.DEV && new URLSearchParams(location.search).has('test');
export const AUTO = import.meta.env.DEV && new URLSearchParams(location.search).has('auto');
if (TEST) gsap.ticker.remove(gsap.updateRoot);

export class LabAborted extends Error { constructor() { super('lab aborted'); this.name = 'LabAborted'; } }

const _v = new THREE.Vector3();
const _v2 = new THREE.Vector3();
/** World bounds of an object's visible solid meshes (skips effects such as bubbles, fumes or sprites). */
function solidBox(o) {
  const b = new THREE.Box3(); o.updateWorldMatrix(true, true);
  const walk = (n) => {
    if (!n.visible) return;
    if (n.isMesh && !n.isInstancedMesh && n.geometry && n.raycast === THREE.Mesh.prototype.raycast) {
      if (!n.geometry.boundingBox) n.geometry.computeBoundingBox();
      const gb = n.geometry.boundingBox.clone().applyMatrix4(n.matrixWorld);
      if (gb.max.y - gb.min.y < 0.6) b.union(gb);
    }
    n.children.forEach(walk);
  };
  walk(o); return b;
}

export class Lab {
  /**
   * @param {HTMLElement} container
   * @param {object} opts { room: 'lab'|'dark', bench: 'epoxy'|'wood'|'none', camera: {pos:[..], target:[..]}, showcase }
   */
  constructor(container, opts = {}) {
    this.container = container;
    this.opts = opts;
    this.alive = true;
    this.updaters = new Set();
    this.interactive = new Set();
    this.waiters = new Set();
    this.hintTargets = [];
    this.clock = new THREE.Clock();
    this.time = 0;
    this.gsapCtx = gsap.context(() => {});

    const w = container.clientWidth || 800, h = container.clientHeight || 600;
    const r = this.renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance', preserveDrawingBuffer: false });
    r.setPixelRatio(Math.min(window.devicePixelRatio || 1, quality.level === 'high' ? 1.5 : 1));
    r.setSize(w, h);
    r.outputColorSpace = THREE.SRGBColorSpace;
    r.toneMapping = THREE.ACESFilmicToneMapping;
    r.toneMappingExposure = 1.0;
    r.shadowMap.enabled = true;
    r.shadowMap.type = THREE.PCFSoftShadowMap;
    r.domElement.className = 'lab-canvas';
    container.appendChild(r.domElement);

    this.labels = new CSS2DRenderer();
    this.labels.setSize(w, h);
    this.labels.domElement.className = 'lab-labels';
    container.appendChild(this.labels.domElement);

    const scene = this.scene = new THREE.Scene();
    const dark = opts.room === 'dark';
    scene.background = new THREE.Color(dark ? 0x07090d : 0xc9ced6);
    const pmrem = new THREE.PMREMGenerator(r);
    this.envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = this.envTex;
    scene.environmentIntensity = dark ? 0.25 : 0.75;
    pmrem.dispose();

    const cam = this.camera = new THREE.PerspectiveCamera(opts.fov || 36, w / h, 0.01, 50);
    const cp = opts.camera?.pos || [0, 0.42, 0.78];
    const ct = opts.camera?.target || [0, 0.08, 0];
    cam.position.set(...cp);
    this.homeView = { pos: new THREE.Vector3(...cp), target: new THREE.Vector3(...ct) };

    const ctl = this.controls = new OrbitControls(cam, r.domElement);
    ctl.target.set(...ct);
    ctl.enableDamping = true; ctl.dampingFactor = 0.08;
    ctl.minDistance = opts.minDistance ?? 0.18; ctl.maxDistance = opts.maxDistance ?? 2.2;
    ctl.maxPolarAngle = Math.PI * 0.47; ctl.minPolarAngle = 0.15;
    ctl.minAzimuthAngle = -Math.PI * 0.42; ctl.maxAzimuthAngle = Math.PI * 0.42;
    ctl.enablePan = true; ctl.screenSpacePanning = true; ctl.panSpeed = 0.6; ctl.rotateSpeed = 0.55; ctl.zoomSpeed = 0.8;
    ctl.update();

    this._buildLights(dark);
    if (opts.bench !== 'none') this._buildRoom(dark);

    // Post-processing
    const rt = new THREE.WebGLRenderTarget(w, h, { type: THREE.HalfFloatType, samples: quality.level === 'high' ? 4 : 2 });
    const comp = this.composer = new EffectComposer(r, rt);
    comp.setPixelRatio(r.getPixelRatio());
    comp.setSize(w, h);
    comp.addPass(new RenderPass(scene, cam));
    const outline = this.outline = new OutlinePass(new THREE.Vector2(w, h), scene, cam);
    outline.edgeStrength = 4; outline.edgeGlow = 0.6; outline.edgeThickness = 1.6; outline.pulsePeriod = 0;
    outline.visibleEdgeColor.set(0x38bdf8); outline.hiddenEdgeColor.set(0x0c4a6e); outline.enabled = false;
    comp.addPass(outline);
    this.bloom = new UnrealBloomPass(new THREE.Vector2(w / 2, h / 2), dark ? 0.8 : 0.4, 0.4, dark ? 0.85 : 1.35);
    if (quality.level === 'high' || dark) comp.addPass(this.bloom);
    comp.addPass(new OutputPass());

    // Interaction
    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();
    this.hovered = null;
    this.drag = null;
    this.tooltip = document.createElement('div');
    this.tooltip.className = 'lab-tooltip';
    container.appendChild(this.tooltip);
    this._bind();

    this._ro = new ResizeObserver(() => this.resize());
    this._ro.observe(container);
    this._loop = this._loop.bind(this);
    r.setAnimationLoop(this._loop);
    if (TEST) {
      window.__labTest = {
        lab: this,
        /** Fast-forward `sec` seconds at a fixed step, interleaving promise resolution. */
        advance: async (sec, fps = 30) => {
          const steps = Math.ceil(sec * fps);
          for (let i = 0; i < steps && this.alive; i++) {
            this._gt = (this._gt || gsap.ticker.time) + 1 / fps;
            gsap.updateRoot(this._gt);
            this.tick(1 / fps);
            if (i % 3 === 0) await new Promise((r) => setTimeout(r, 0));
          }
          this.composer.render(); this.labels.render(this.scene, this.camera);
        },
        /** Render now and save the 3D view (plus HUD text summary) to .qa/<name>.png via the dev server. */
        shot: async (name = 'shot') => {
          this.composer.render();
          const url = this.renderer.domElement.toDataURL('image/png');
          await fetch('/__shot?name=' + encodeURIComponent(name), { method: 'POST', body: url });
          return { banner: document.querySelector('.banner-text')?.textContent, readouts: [...document.querySelectorAll('.ro')].map((e) => e.textContent) };
        },
      };
    }
  }

  /* ----------------------------------------------------------- scene */
  _buildLights(dark) {
    const s = this.scene;
    this.hemi = new THREE.HemisphereLight(0xf4f7ff, 0x3a3226, dark ? 0.08 : 0.55);
    s.add(this.hemi);
    const key = this.keyLight = new THREE.DirectionalLight(0xfff4e6, dark ? 0.15 : 2.0);
    key.position.set(-0.9, 1.8, 1.1);
    key.castShadow = true;
    key.shadow.mapSize.set(quality.level === 'high' ? 2048 : 1024, quality.level === 'high' ? 2048 : 1024);
    const sc = key.shadow.camera; sc.left = -0.9; sc.right = 0.9; sc.top = 0.9; sc.bottom = -0.6; sc.near = 0.5; sc.far = 4;
    key.shadow.bias = -0.0004; key.shadow.normalBias = 0.01; key.shadow.radius = 4;
    s.add(key);
    const fill = this.fillLight = new THREE.DirectionalLight(0xdbe8ff, dark ? 0.05 : 0.6);
    fill.position.set(1.2, 0.8, 0.6); s.add(fill);
    const rim = new THREE.DirectionalLight(0xffffff, dark ? 0.05 : 0.5);
    rim.position.set(0.2, 1.0, -1.4); s.add(rim);
  }

  _buildRoom(dark) {
    const g = this.room = new THREE.Group();
    const benchW = this.opts.benchWidth || 1.8, benchD = 0.85, topT = 0.03, benchH = 0.9;
    // Bench top — black epoxy resin (typical school lab) or wood
    const topMat = this.opts.bench === 'wood'
      ? wood({ base: '#8a5a32', key: 'benchwood', repeat: [2, 1] })
      : new THREE.MeshStandardMaterial({ map: epoxyTexture(), roughnessMap: epoxyRoughness(), roughness: 0.85, metalness: 0, color: 0xffffff, envMapIntensity: 0.35 });
    const top = new THREE.Mesh(new THREE.BoxGeometry(benchW, topT, benchD), topMat);
    top.position.set(0, -topT / 2, -0.12); top.receiveShadow = true; g.add(top);
    this.benchTop = top;
    // Cabinet below
    const cab = wood({ base: '#6d4527', key: 'cab' });
    const body = new THREE.Mesh(new THREE.BoxGeometry(benchW - 0.04, benchH - topT, benchD - 0.06), cab);
    body.position.set(0, -topT - (benchH - topT) / 2, -0.12); g.add(body);
    for (let i = 0; i < 4; i++) {
      const door = new THREE.Mesh(new THREE.BoxGeometry((benchW - 0.1) / 4 - 0.01, benchH - 0.12, 0.01), wood({ base: '#7b4e2c', key: 'door' }));
      door.position.set(-benchW / 2 + 0.05 + ((benchW - 0.1) / 4) * (i + 0.5), -benchH / 2 - 0.02, -0.12 + benchD / 2 - 0.025); g.add(door);
      const knob = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.02, 12), metal({ color: 0xaaaaaa }));
      knob.rotation.x = Math.PI / 2; knob.position.set(door.position.x + (i % 2 ? -1 : 1) * 0.15, -0.12, door.position.z + 0.012); g.add(knob);
    }
    // Floor
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(14, 14), new THREE.MeshStandardMaterial({ map: floorTexture(), roughness: 0.8 }));
    floor.rotation.x = -Math.PI / 2; floor.position.y = -benchH; floor.receiveShadow = true; g.add(floor);
    // Back wall: glazed tiles to 1.2 m, painted above
    const wallZ = -1.0;
    const tiles = new THREE.Mesh(new THREE.PlaneGeometry(14, 1.6), new THREE.MeshStandardMaterial({ map: tileTexture({ repeat: [28, 3.2] }), roughness: 0.4, metalness: 0, envMapIntensity: 0.35, color: 0xd9dde2 }));
    tiles.position.set(0, -benchH + 0.8, wallZ); g.add(tiles);
    const paint = new THREE.Mesh(new THREE.PlaneGeometry(14, 3), new THREE.MeshStandardMaterial({ color: dark ? 0x1b2030 : 0xe8e4da, roughness: 0.95 }));
    paint.position.set(0, -benchH + 1.6 + 1.5, wallZ); g.add(paint);
    // Shelf with reagent bottles (background dressing)
    const shelf = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.025, 0.2), wood({ base: '#8a5a32', key: 'shelf' }));
    shelf.position.set(0.1, 0.55, wallZ + 0.1); shelf.castShadow = true; g.add(shelf);
    const colors = [0x8a4b16, 0x3b6e2a, 0x1e3a8a, 0x7f1d1d, 0x8a4b16, 0xe5e7eb, 0x8a4b16, 0x0e7490, 0x8a4b16, 0x6b21a8];
    colors.forEach((c, i) => {
      const hgt = 0.12 + (i % 3) * 0.025;
      const b = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, hgt, 20), new THREE.MeshPhysicalMaterial({ color: c, roughness: 0.15, transparent: true, opacity: 0.85, clearcoat: 1 }));
      b.position.set(-0.55 + i * 0.13, 0.5625 + hgt / 2, wallZ + 0.1); g.add(b);
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.02, 0.025, 16), plastic(0x111111));
      cap.position.set(b.position.x, 0.5625 + hgt + 0.0125, b.position.z); g.add(cap);
      const lab = new THREE.Mesh(new THREE.PlaneGeometry(0.045, 0.04), new THREE.MeshStandardMaterial({ color: 0xf5f0e1, roughness: 0.9 }));
      lab.position.set(b.position.x, 0.5625 + hgt * 0.45, b.position.z + 0.0305); g.add(lab);
    });
    // Periodic-table style chart on the wall (procedural)
    const chart = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.5), new THREE.MeshStandardMaterial({ map: this._chartTexture(), roughness: 0.9 }));
    chart.position.set(-0.05, 1.0, wallZ + 0.002); g.add(chart);
    // Window light on the left wall
    const win = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 1.2), new THREE.MeshBasicMaterial({ color: dark ? 0x10131a : 0xdfe8f2 }));
    win.position.set(-2.2, 0.6, -0.4); win.rotation.y = Math.PI / 2; g.add(win);
    const lwall = new THREE.Mesh(new THREE.PlaneGeometry(6, 4), new THREE.MeshStandardMaterial({ color: dark ? 0x141821 : 0xd9d5cb, roughness: 0.95 }));
    lwall.position.set(-2.21, 0.6, 0); lwall.rotation.y = Math.PI / 2; g.add(lwall);
    g.traverse((o) => { if (o.isMesh) { o.receiveShadow = true; o.userData.noPick = true; } });
    this.scene.add(g);
  }

  _chartTexture() {
    return canvasTexture(1024, 576, (g, w, h) => {
      g.fillStyle = '#fdfcf7'; g.fillRect(0, 0, w, h);
      g.fillStyle = '#0f172a'; g.font = '800 40px "Segoe UI", Arial'; g.textAlign = 'center';
      g.fillText('PERIODIC TABLE OF ELEMENTS', w / 2, 52);
      const cols = 18, cw = (w - 60) / cols, ch = 52;
      const fam = ['#fca5a5', '#fdba74', '#fde68a', '#bbf7d0', '#a5f3fc', '#c7d2fe', '#f5d0fe'];
      const layout = [[1, 18], [1, 2, 13, 14, 15, 16, 17, 18], [1, 2, 13, 14, 15, 16, 17, 18]];
      for (let r = 0; r < 7; r++) for (let c = 1; c <= cols; c++) {
        if (r < 3 && !layout[r].includes(c)) continue;
        g.fillStyle = fam[(c + r) % fam.length]; g.fillRect(30 + (c - 1) * cw + 2, 80 + r * ch + 2, cw - 4, ch - 4);
      }
      g.fillStyle = '#334155'; g.font = '600 18px "Segoe UI", Arial';
      g.fillText('Safety first · Wear goggles · Never taste chemicals', w / 2, h - 24);
    }, { key: 'chart' });
  }

  /* --------------------------------------------------------- objects */
  /** Add an object (or several). Objects with update() are ticked every frame. */
  add(obj, pos) {
    if (pos) obj.position.set(pos[0], pos[1], pos[2]);
    this.scene.add(obj);
    this._registerUpdaters(obj);
    obj.traverse((o) => {
      if (o.isMesh && !o.material?.userData?.isGlass && !o.material?.transparent && !o.userData.noShadow) { o.castShadow = true; o.receiveShadow = true; }
    });
    return obj;
  }
  _registerUpdaters(obj) { obj.traverse((o) => { if (typeof o.update === 'function') this.updaters.add(o); }); }
  /** Register children added after lab.add (e.g. effects attached later). */
  track(obj) { this._registerUpdaters(obj); return obj; }
  remove(obj) { obj.parent?.remove(obj); obj.traverse((o) => { this.updaters.delete(o); this.interactive.delete(o); }); }
  onUpdate(fn) { const h = { update: fn }; this.updaters.add(h); return () => this.updaters.delete(h); }

  /** Make an object pickable. label shows as tooltip on hover. */
  pickable(obj, label) {
    obj.userData.pickLabel = label || obj.userData.pickLabel || obj.name;
    this.interactive.add(obj);
    return obj;
  }
  unpickable(obj) { this.interactive.delete(obj); }

  /** A floating HTML label attached to an object. */
  tag(obj, text, { offset = [0, 0.05, 0], cls = '' } = {}) {
    const el = document.createElement('div');
    el.className = 'lab-tag ' + cls; el.innerHTML = text;
    const o = new CSS2DObject(el); o.position.set(...offset);
    obj.add(o);
    o.setText = (t) => { el.innerHTML = t; };
    o.el = el;
    return o;
  }
  untag(tagObj) { if (!tagObj) return; tagObj.parent?.remove(tagObj); tagObj.el?.remove(); }

  /* -------------------------------------------------------- camera */
  /** Smooth camera move. view = { pos:[x,y,z], target:[x,y,z] } */
  focus(view, duration = 1.4, ease = 'power2.inOut') {
    const pos = Array.isArray(view.pos) ? new THREE.Vector3(...view.pos) : view.pos;
    const tgt = Array.isArray(view.target) ? new THREE.Vector3(...view.target) : view.target;
    // A new camera move replaces any move still running (e.g. the intro dolly); the replaced one resolves at once.
    if (this._camMove) { this._camMove.tl.kill(); this._camMove.res(); this._camMove = null; }
    return this._promise((res) => {
      const move = { res };
      const tl = gsap.timeline({ onComplete: () => { if (this._camMove === move) this._camMove = null; res(); } });
      move.tl = tl; this._camMove = move;
      tl.to(this.camera.position, { x: pos.x, y: pos.y, z: pos.z, duration, ease }, 0);
      tl.to(this.controls.target, { x: tgt.x, y: tgt.y, z: tgt.z, duration, ease }, 0);
      this.gsapCtx.add(() => tl);
    });
  }
  /** Look at an object from the front at a distance that frames it. */
  focusOn(obj, { dist = 0.35, height = 0.12, side = 0, duration = 1.2, offset = [0, 0, 0] } = {}) {
    obj.updateWorldMatrix(true, true);
    const box = new THREE.Box3().setFromObject(obj);
    const c = box.getCenter(new THREE.Vector3()).add(_v2.set(...offset));
    return this.focus({ pos: [c.x + side, c.y + height, c.z + dist], target: [c.x, c.y, c.z] }, duration);
  }
  home(duration = 1.2) { return this.focus({ pos: this.homeView.pos, target: this.homeView.target }, duration); }
  setHome(view) { this.homeView = { pos: new THREE.Vector3(...view.pos), target: new THREE.Vector3(...view.target) }; }

  /** Dim (0..1) the room lights, e.g. for optics work with a candle. 1 = normal lab lighting. */
  dimLights(level = 0.25, duration = 1.5) {
    const L = (this._lightBase ||= { hemi: this.hemi.intensity, key: this.keyLight.intensity, fill: this.fillLight.intensity, env: this.scene.environmentIntensity });
    const tl = this.timeline();
    tl.to(this.hemi, { intensity: L.hemi * level, duration }, 0);
    tl.to(this.keyLight, { intensity: L.key * level, duration }, 0);
    tl.to(this.fillLight, { intensity: L.fill * level, duration }, 0);
    tl.to(this.scene, { environmentIntensity: L.env * Math.max(level, 0.15), duration }, 0);
    return this.play(tl);
  }

  /* ------------------------------------------------------ animation */
  /** gsap tween as a promise; killed automatically when the lab is disposed. */
  tween(target, vars) {
    return this._promise((res) => {
      const t = gsap.to(target, { ...vars, onComplete: () => { vars.onComplete?.(); res(); } });
      this.gsapCtx.add(() => t);
    });
  }
  timeline(vars = {}) { const tl = gsap.timeline(vars); this.gsapCtx.add(() => tl); return tl; }
  play(tl) { return this._promise((res) => { tl.eventCallback('onComplete', res); this.gsapCtx.add(() => tl); tl.play(); }); }
  /** Wait in lab time (pauses with the lab, fast-forwards in test mode). */
  wait(sec) {
    return this._promise((res) => {
      const job = { at: this.time + sec, res };
      this._timers.add(job);
      return () => this._timers.delete(job);
    });
  }
  /**
   * Wait until predicate() is true (checked every frame). In ?auto mode `auto()` is called once to
   * simulate what the student would do (e.g. move a slider to the right spot).
   */
  waitUntil(predicate, { auto } = {}) {
    return this._promise((res) => {
      const job = { predicate, res };
      this._conds.add(job);
      // Only simulate the student if the condition is still unmet (it may already be true).
      if (AUTO && auto) this.wait(0.5).then(() => { if (this._conds.has(job)) auto(); }).catch(() => {});
      return () => this._conds.delete(job);
    });
  }

  /** Move an object along a smooth arc to a world position (lift, carry, lower). */
  carry(obj, to, { lift = 0.08, duration = 1.1, rotate } = {}) {
    const from = obj.position.clone();
    const top = Math.max(from.y, to[1]) + lift;
    const tl = this.timeline({ paused: true });
    tl.to(obj.position, { y: top, duration: duration * 0.3, ease: 'power2.out' });
    tl.to(obj.position, { x: to[0], z: to[2], duration: duration * 0.45, ease: 'power1.inOut' }, '>-0.05');
    if (rotate) tl.to(obj.rotation, { ...rotate, duration: duration * 0.45, ease: 'power1.inOut' }, '<');
    tl.to(obj.position, { y: to[1], duration: duration * 0.3, ease: 'power2.inOut' });
    return this.play(tl);
  }

  /* ------------------------------------------------------ waiting */
  _promise(executor) {
    return new Promise((resolve, reject) => {
      if (!this.alive) return reject(new LabAborted());
      const w = { reject, cleanup: null };
      this.waiters.add(w);
      const done = (v) => { this.waiters.delete(w); w.cleanup?.(); resolve(v); };
      w.cleanup = executor(done, reject) || null;
    });
  }

  /** Highlight targets and wait for the student to click one. Resolves with the clicked object. */
  waitClick(targets, { hint = true } = {}) {
    const list = Array.isArray(targets) ? targets : [targets];
    list.forEach((t) => this.pickable(t));
    if (hint) this.setHint(list);
    return this._promise((res) => {
      const h = (obj) => { if (list.includes(obj)) { this.setHint([]); this.sfx?.('click'); res(obj); return true; } return false; };
      this._clickHandlers.add(h);
      list.forEach((t) => this._clickTargets.add(t));
      if (AUTO) this.wait(0.4).then(() => h(list[0])).catch(() => {});
      return () => { this._clickHandlers.delete(h); list.forEach((t) => this._clickTargets.delete(t)); };
    });
  }

  /**
   * Forgiving taps: small or moving targets (a thin molecule, a wire end) are hard to hit exactly, and a
   * bigger object in front can swallow the tap. Returns the waiting target whose on-screen size, plus a
   * finger-sized margin, contains the tap point.
   */
  _nearTarget(clientX, clientY) {
    const el = this.renderer.domElement, r = el.getBoundingClientRect();
    let best = null, bestD = Infinity;
    for (const t of this._clickTargets) {
      if (!t.visible) continue;
      const b = new THREE.Box3().setFromObject(t);
      if (b.isEmpty()) continue;
      const sph = b.getBoundingSphere(new THREE.Sphere());
      const c = sph.center.clone().project(this.camera);
      if (c.z > 1) continue;
      const edge = sph.center.clone().addScaledVector(_v.set(1, 0, 0).applyQuaternion(this.camera.quaternion), sph.radius).project(this.camera);
      const sx = (c.x + 1) / 2 * r.width + r.left, sy = (1 - c.y) / 2 * r.height + r.top;
      const rad = Math.abs(edge.x - c.x) / 2 * r.width;
      const d = Math.hypot(clientX - sx, clientY - sy);
      if (d < Math.max(rad, 12) + 30 && d < bestD) { best = t; bestD = d; }
    }
    return best;
  }

  /**
   * Student must DRAG `item` onto `target` (a tap only shows which way to drag). Resolves when dropped
   * close enough; the experiment then animates the final placement itself.
   */
  waitDrop(item, target, { radius = 0.12, hint = true } = {}) {
    this.pickable(item);
    // Where the item rests before the student picks it up: helpers send it back here when the task is done.
    item.userData.restPos = item.position.clone();
    item.userData.restRot = item.rotation.clone();
    if (hint) this.setHint([item]);
    return this._promise((res) => {
      const zone = this._dropZone(item, target, radius);
      const rec = { item, target, radius, zone, done: (how) => { this.setHint([]); zone.dispose(); res(how); } };
      this._dropJobs.add(rec);
      // QA: behave like a real student — carry the item over the target and let go there.
      if (AUTO) this.wait(0.4).then(() => {
        if (!this._dropJobs.has(rec)) return;
        const tp = target.getWorldPosition(new THREE.Vector3());
        const ip = item.getWorldPosition(new THREE.Vector3());
        const top = target.mouthWorld ? target.mouthWorld().y : solidBox(target).max.y;
        const under = Math.max(0, ip.y - solidBox(item).min.y);
        const y = Number.isFinite(top) && top < ip.y + 0.4 ? Math.max(ip.y + 0.06, top + under + 0.015) : ip.y + 0.06;
        const local = item.parent.worldToLocal(new THREE.Vector3(tp.x, y, tp.z));
        item.position.copy(local);
        rec.done('drag');
      }).catch(() => {});
      return () => { this._dropJobs.delete(rec); zone.dispose(); };
    });
  }

  /**
   * Visual guide for a drag-and-drop step: a pulsing ring on the bench where the item goes, a short label,
   * and a trail of moving dots from the item to the ring. The ring turns solid when the item is close enough.
   */
  _dropZone(item, target, radius) {
    const g = new THREE.Group();
    const tp = target.getWorldPosition(new THREE.Vector3());
    const r = THREE.MathUtils.clamp(radius * 0.45, 0.025, 0.06);
    g.position.set(tp.x, tp.y + 0.003, tp.z);
    const mk = (inner, outer, opacity) => {
      const m = new THREE.Mesh(new THREE.RingGeometry(inner, outer, 48), new THREE.MeshBasicMaterial({ color: 0x22c55e, transparent: true, opacity, depthTest: false, depthWrite: false, side: THREE.DoubleSide, toneMapped: false }));
      m.rotation.x = -Math.PI / 2; m.renderOrder = 20; m.raycast = () => {}; g.add(m); return m;
    };
    const ring = mk(r * 0.82, r, 0.95);
    const fill = mk(0.0001, r * 0.82, 0.16);
    const pulse = mk(r * 0.9, r, 0.6);
    const N = 14, pos = new Float32Array(N * 3);
    const dotsGeo = new THREE.BufferGeometry(); dotsGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const dots = new THREE.Points(dotsGeo, new THREE.PointsMaterial({ color: 0x16a34a, size: 7, sizeAttenuation: false, transparent: true, opacity: 0.9, depthTest: false, depthWrite: false }));
    dots.renderOrder = 21; dots.frustumCulled = false; dots.raycast = () => {};
    this.scene.add(g); this.scene.add(dots);
    let what = (item.userData.pickLabel || item.name || 'it').replace(/ \u2014.*$/, '').replace(/ —.*$/, '').replace(/^the /i, '');
    if (what.length > 28) what = 'it';
    const idle = `Drop <b>${what}</b> here`;
    const tag = this.tag(g, idle, { offset: [0, 0.035, 0], cls: 'drop' });
    const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
    let near = false, lastNear = null;
    const upd = this.onUpdate((dt, t) => {
      const k = (t * 1.4) % 1;
      pulse.scale.setScalar(1 + k * 0.9); pulse.material.opacity = 0.6 * (1 - k);
      item.getWorldPosition(a); b.copy(g.position);
      const d = Math.hypot(a.x - b.x, a.z - b.z);
      near = !!(this.drag && this.drag.obj === item) && d < radius * 1.4;
      fill.material.opacity = near ? 0.45 : 0.16 + Math.sin(t * 4) * 0.05;
      if (near !== lastNear) {
        lastNear = near;
        ring.material.color.set(near ? 0x15803d : 0x22c55e);
        tag.setText(near ? 'Release to place ✓' : idle);
        tag.el.classList.toggle('ok', near);
      }
      const show = d > r * 1.2;
      dots.visible = show;
      if (show) {
        const lift = Math.min(0.12, 0.04 + d * 0.35);
        c.set((a.x + b.x) / 2, Math.max(a.y, b.y) + lift, (a.z + b.z) / 2);
        for (let i = 0; i < N; i++) {
          const u = (i + (t * 1.2) % 1) / N, v = 1 - u;
          pos[i * 3] = v * v * a.x + 2 * v * u * c.x + u * u * b.x;
          pos[i * 3 + 1] = v * v * a.y + 2 * v * u * c.y + u * u * b.y;
          pos[i * 3 + 2] = v * v * a.z + 2 * v * u * c.z + u * u * b.z;
        }
        dotsGeo.attributes.position.needsUpdate = true;
      }
    });
    let gone = false;
    return {
      get near() { return near; },
      dispose: () => {
        if (gone) return; gone = true;
        upd(); this.untag(tag); this.scene.remove(g); this.scene.remove(dots);
        g.traverse((o) => { o.geometry?.dispose(); o.material?.dispose(); }); dotsGeo.dispose(); dots.material.dispose();
      },
    };
  }

  /** A tap on something that must be dragged: lean it towards its target and say so. */
  _nudge(item, target) {
    const a = item.getWorldPosition(new THREE.Vector3()), b = target.getWorldPosition(new THREE.Vector3());
    const dir = b.sub(a).setY(0); const len = dir.length();
    if (len > 1e-4) dir.multiplyScalar(Math.min(0.03, len * 0.25) / len);
    const p0 = item.position.clone();
    const tl = this.timeline();
    tl.to(item.position, { x: p0.x + dir.x, y: p0.y + 0.015, z: p0.z + dir.z, duration: 0.25, ease: 'power2.out' })
      .to(item.position, { x: p0.x, y: p0.y, z: p0.z, duration: 0.35, ease: 'power2.in' });
    // "Zinc granules" -> "zinc granules", but keep formulae/acronyms such as "HCl" or "KMnO₄"
    const nice = (t) => { t = t.replace(/^the /i, ''); return /^[A-Z][a-z]/.test(t) ? t[0].toLowerCase() + t.slice(1) : t; };
    const what = nice(item.userData.pickLabel || item.name || 'it');
    const where = nice(target.userData.pickLabel || target.name || 'glowing apparatus');
    this.ui?.toast?.(`Hold and drag the ${what} along the green dots`, 'info', 2600);
    this.sfx?.('tick');
  }

  /**
   * Press-and-hold process: progress advances only while the student holds the HOLD button (or Space),
   * and pauses when they let go. Resolves after `seconds` of total holding. onTick(progress, holding) every frame.
   */
  hold({ label = 'Hold', seconds = 3, onTick } = {}) {
    const btn = this.ui?.holdButton?.(label);
    if (btn && !AUTO) this.ui?.toast?.('Press and hold the button to keep going — let go to pause', 'info', 3200);
    let t = 0;
    return this._promise((res) => {
      const job = {
        update: (dt) => {
          const holding = AUTO || !!btn?.held;
          if (holding) t += dt;
          const p = Math.min(1, t / seconds);
          btn?.set(p, holding);
          onTick?.(p, holding);
          if (p >= 1) { this.updaters.delete(job); btn?.remove(); res(); }
        },
      };
      this.updaters.add(job);
      return () => { this.updaters.delete(job); btn?.remove(); };
    });
  }

  /**
   * Let the student slide an object along an axis (world space). Returns a function that stops it.
   * onChange(value) receives the coordinate along the axis.
   */
  slider(obj, { axis = 'x', min, max, step = 0, onChange, onEnd, label } = {}) {
    this.pickable(obj, label);
    const job = { obj, axis, min, max, step, onChange, onEnd };
    this._axisJobs.add(job);
    return () => { this._axisJobs.delete(job); };
  }

  setHint(list) {
    this.hintTargets = list || [];
    this._refreshOutline();
  }
  _refreshOutline() {
    const sel = [...this.hintTargets];
    if (this.hovered && !sel.includes(this.hovered)) sel.push(this.hovered);
    this.outline.selectedObjects = sel;
    this.outline.enabled = sel.length > 0;
  }

  /* ------------------------------------------------- pointer events */
  _bind() {
    this._clickHandlers = new Set();
    this._clickTargets = new Set();
    this._timers = new Set();
    this._conds = new Set();
    this._dropJobs = new Set();
    this._axisJobs = new Set();
    const el = this.renderer.domElement;
    const toNdc = (e) => {
      const r = el.getBoundingClientRect();
      this.pointer.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      return r;
    };
    let downAt = null;
    this._onDown = (e) => {
      toNdc(e);
      const hit = this._pick();
      downAt = { x: e.clientX, y: e.clientY, hit, t: performance.now() };
      if (!hit) return;
      // Start a drag if the hit object has a drop job or axis job
      const drop = [...this._dropJobs].find((j) => j.item === hit);
      const axis = [...this._axisJobs].find((j) => j.obj === hit);
      if (drop || axis) {
        this.controls.enabled = false;
        const planeY = hit.getWorldPosition(_v).y;
        // Carry height: high enough that the item's bottom clears the top of its target (a test tube in a
        // rack, a flask on a tripod) instead of sliding through it.
        let liftY = planeY + 0.06;
        if (drop) {
          const under = Math.max(0, planeY - solidBox(hit).min.y);
          const top = drop.target.mouthWorld ? drop.target.mouthWorld().y : solidBox(drop.target).max.y;
          if (Number.isFinite(top) && top < planeY + 0.4) liftY = Math.max(liftY, top + under + 0.015);
        }
        this.drag = { obj: hit, drop, axis, planeY, liftY, start: hit.position.clone(), moved: false, startWorld: _v.clone() };
        el.setPointerCapture?.(e.pointerId);
      }
    };
    this._onMove = (e) => {
      toNdc(e);
      const d = this.drag;
      if (d) {
        const dist = downAt ? Math.hypot(e.clientX - downAt.x, e.clientY - downAt.y) : 0;
        if (dist > 4) d.moved = true;
        if (!d.moved) return;
        if (d.drop) {
          const p = this._planePoint(d.liftY);
          if (p) {
            const parentInv = d.obj.parent.matrixWorld.clone().invert();
            const local = p.clone().applyMatrix4(parentInv);
            d.obj.position.copy(local);
            const tgt = d.drop.target.getWorldPosition(_v2);
            const near = Math.hypot(p.x - tgt.x, p.z - tgt.z) < d.drop.radius * 1.4;
            this.outline.selectedObjects = near ? [d.obj, d.drop.target] : [d.obj]; this.outline.enabled = true;
          }
        } else if (d.axis) {
          const j = d.axis;
          const p = this._planePoint(d.planeY, j.axis === 'y' ? 'z' : 'y', d.startWorld);
          if (p) {
            let v = p[j.axis];
            const parentInv = d.obj.parent.matrixWorld.clone().invert();
            const local = p.clone().applyMatrix4(parentInv);
            v = local[j.axis];
            if (j.step) v = Math.round(v / j.step) * j.step;
            v = Math.min(j.max, Math.max(j.min, v));
            d.obj.position[j.axis] = v;
            j.onChange?.(v);
          }
        }
        return;
      }
      const hit = this._pick();
      if (hit !== this.hovered) {
        this.hovered = hit;
        el.style.cursor = hit ? 'pointer' : 'grab';
        this._refreshOutline();
      }
      if (hit && hit.userData.pickLabel) {
        const r = el.getBoundingClientRect();
        this.tooltip.textContent = hit.userData.pickLabel;
        this.tooltip.style.transform = `translate(${e.clientX - r.left + 14}px, ${e.clientY - r.top + 10}px)`;
        this.tooltip.classList.add('show');
      } else this.tooltip.classList.remove('show');
    };
    this._onUp = (e) => {
      const d = this.drag; this.drag = null; this.controls.enabled = true;
      const wasClick = downAt && Math.hypot(e.clientX - downAt.x, e.clientY - downAt.y) < 6 && performance.now() - downAt.t < 600;
      if (d) {
        if (d.drop) {
          if (!d.moved) { this._nudge(d.obj, d.drop.target); return; }
          const p = d.obj.getWorldPosition(_v);
          const tgt = d.drop.target.getWorldPosition(_v2);
          if (Math.hypot(p.x - tgt.x, p.z - tgt.z) < d.drop.radius * 1.4) { this.sfx?.('drop'); d.drop.done('drag'); }
          else { this.tween(d.obj.position, { x: d.start.x, y: d.start.y, z: d.start.z, duration: 0.4, ease: 'power2.out' }).catch(() => {}); this.sfx?.('tick'); this.ui?.toast?.('Almost! Follow the green dots and let go inside the green circle', 'info', 2600); }
          this._refreshOutline();
          return;
        }
        if (d.axis) { d.axis.onEnd?.(d.obj.position[d.axis.axis]); if (d.moved) return; }
      }
      if (wasClick) {
        let handled = false;
        if (downAt.hit) for (const h of [...this._clickHandlers]) if (h(downAt.hit)) { handled = true; break; }
        if (!handled && this._clickTargets.size) {
          const near = this._nearTarget(e.clientX, e.clientY);
          if (near) for (const h of [...this._clickHandlers]) if (h(near)) { handled = true; break; }
          if (!handled) {
            const t = [...this._clickTargets].find((o) => o.visible);
            const name = t ? (t.userData.pickLabel || t.name || 'highlighted object') : 'highlighted object';
            const wrong = downAt.hit && downAt.hit !== t ? `That's the ${(downAt.hit.userData.pickLabel || downAt.hit.name || 'wrong object').toLowerCase()}. ` : '';
            this.ui?.toast?.(`${wrong}Tap the glowing ${name.toLowerCase()} first`, 'info', 2600);
          }
        }
      }
      downAt = null;
    };
    el.addEventListener('pointerdown', this._onDown);
    el.addEventListener('pointermove', this._onMove);
    el.addEventListener('pointerup', this._onUp);
    el.addEventListener('pointerleave', () => this.tooltip.classList.remove('show'));
    el.style.touchAction = 'none';
  }

  _planePoint(y, kind = 'y', through) {
    this.raycaster.setFromCamera(this.pointer, this.camera);
    let plane;
    if (kind === 'y') plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -y);
    else { // vertical plane facing camera through point
      const n = new THREE.Vector3().subVectors(this.camera.position, through); n.y = 0; n.normalize();
      plane = new THREE.Plane().setFromNormalAndCoplanarPoint(n, through);
    }
    const out = new THREE.Vector3();
    return this.raycaster.ray.intersectPlane(plane, out) ? out : null;
  }

  _pick() {
    if (!this.interactive.size) return null;
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const objs = [...this.interactive];
    const hits = this.raycaster.intersectObjects(objs, true);
    for (const h of hits) {
      let o = h.object;
      while (o && !this.interactive.has(o)) o = o.parent;
      if (o && o.visible !== false) return o;
    }
    return null;
  }

  /* ---------------------------------------------------------- loop */
  _loop() {
    if (!this.alive) return;
    const dt = Math.min(0.05, this.clock.getDelta());
    if (TEST) { this.composer.render(); this.labels.render(this.scene, this.camera); return; }
    this.tick(dt);
    this._adapt(dt);
    this.composer.render();
    this.labels.render(this.scene, this.camera);
  }

  /** Advance the simulation by dt seconds (lab clock, effects, timers, conditions). */
  tick(dt) {
    this.time += dt;
    for (const u of this.updaters) {
      try { u.update(dt, this.time, this.camera); } catch (err) { console.error(err); this.updaters.delete(u); }
    }
    for (const j of [...this._timers]) if (this.time >= j.at) { this._timers.delete(j); j.res(); }
    for (const j of [...this._conds]) { let ok = false; try { ok = j.predicate(); } catch (e) { console.error(e); } if (ok) { this._conds.delete(j); j.res(); } }
    this.controls.update();
  }

  /** Drop render resolution on slow GPUs (school tablets), raise it back when there is headroom. */
  _adapt(dt) {
    const a = (this._ad ||= { t: 0, n: 0, scale: 1 });
    a.t += dt; a.n++;
    if (a.t < 2) return;
    const fps = a.n / a.t; a.t = 0; a.n = 0;
    const base = Math.min(window.devicePixelRatio || 1, quality.level === 'high' ? 1.5 : 1);
    let s = a.scale;
    if (fps < 30 && s > 0.6) s -= 0.15; else if (fps > 55 && s < 1) s += 0.1;
    if (s !== a.scale) { a.scale = s; this.renderer.setPixelRatio(base * s); this.composer.setPixelRatio(base * s); this.resize(); }
  }

  resize() {
    const w = this.container.clientWidth, h = this.container.clientHeight;
    if (!w || !h) return;
    this.camera.aspect = w / h;
    // Experiments are framed for a ~1.5:1 view. On narrower screens widen the vertical FOV so the same
    // width of bench stays visible (capped so phones in portrait do not get a fish-eye look).
    const base = this._baseFov ??= this.camera.fov, designAspect = 1.5;
    if (w / h < designAspect) {
      const hHalf = Math.atan(Math.tan(THREE.MathUtils.degToRad(base) / 2) * designAspect);
      this.camera.fov = Math.min(62, THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(hHalf) / (w / h))));
    } else this.camera.fov = base;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h); this.composer.setSize(w, h); this.labels.setSize(w, h);
    this.outline.setSize(w, h); this.bloom.setSize(w, h);
  }

  dispose() {
    this.alive = false;
    for (const w of this.waiters) { w.cleanup?.(); w.reject(new LabAborted()); }
    this.waiters.clear();
    this.gsapCtx.revert();
    this.renderer.setAnimationLoop(null);
    this._ro.disconnect();
    this.controls.dispose();
    this.scene.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
      if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => { m.map?.dispose?.(); m.dispose?.(); });
    });
    this.composer.dispose?.();
    this.renderer.dispose();
    this.renderer.forceContextLoss?.();
    this.container.innerHTML = '';
  }
}
