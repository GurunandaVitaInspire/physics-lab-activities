// Apparatus used only by the chemistry experiments in lessons 1–3 (lead iodide, heating lead nitrate,
// copper sulphate crystals, rusting, iron nail in copper sulphate). Units: metres, bench top y = 0.
import * as THREE from 'three';
import gsap from 'gsap';
import { glass, metal, chrome, wood, powder, paper, liquid } from '../materials.js';
import { canvasTexture } from '../textures.js';
import { Stream } from '../effects.js';

/* ------------------------------------------------------------ helpers */
function rng(seed) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

/**
 * Blotchy greyscale mask (0..0.97) used as an alphaMap with alphaTest, so a coating can "grow"
 * patch by patch: lowering alphaTest from 1 towards 0 reveals more and more of it.
 */
function blotchTexture(seed = 1, { blobs = 70, w = 256, h = 512 } = {}) {
  return canvasTexture(w, h, (g) => {
    const r = rng(seed);
    g.fillStyle = '#000'; g.fillRect(0, 0, w, h);
    g.globalCompositeOperation = 'lighter';
    for (let i = 0; i < blobs; i++) {
      const x = r() * w, y = r() * h, rad = 14 + r() * 46, a = 0.16 + r() * 0.22;
      for (const dx of [-w, 0, w]) {
        const grd = g.createRadialGradient(x + dx, y, 0, x + dx, y, rad);
        grd.addColorStop(0, `rgba(255,255,255,${a})`); grd.addColorStop(1, 'rgba(255,255,255,0)');
        g.fillStyle = grd; g.beginPath(); g.arc(x + dx, y, rad, 0, Math.PI * 2); g.fill();
      }
    }
    g.globalCompositeOperation = 'source-over';
    // normalise + speckle so the edges of each patch look granular
    const img = g.getImageData(0, 0, w, h), d = img.data;
    let mx = 1; for (let i = 0; i < d.length; i += 4) mx = Math.max(mx, d[i]);
    for (let i = 0; i < d.length; i += 4) {
      const v = Math.min(247, Math.max(0, (d[i] / mx) * 235 + (r() - 0.5) * 40));
      d[i] = d[i + 1] = d[i + 2] = v; d[i + 3] = 255;
    }
    g.putImageData(img, 0, 0);
  }, { key: 'blotch' + seed, srgb: false, repeat: [1, 1] });
}

/** Mottled colour texture (rust, copper deposit, sandpaper grit). */
export function mottleTexture(base, dark, light, seed = 3, { w = 256, h = 256, n = 2600, size = 3 } = {}) {
  return canvasTexture(w, h, (g) => {
    const r = rng(seed);
    g.fillStyle = base; g.fillRect(0, 0, w, h);
    for (let i = 0; i < n; i++) {
      g.fillStyle = r() < 0.5 ? dark : light; g.globalAlpha = 0.25 + r() * 0.5;
      const s = size * (0.4 + r());
      g.fillRect(r() * w, r() * h, s, s);
    }
    g.globalAlpha = 1;
  }, { key: `mottle${base}${dark}${seed}`, repeat: [1, 1] });
}

/**
 * Thin test-tube walls look frosted with the default glass (most of a narrow tube is seen at grazing
 * angles). Swap in a clearer glass so coloured contents read true.
 */
export function clearGlass(vessel, { opacity = 0.05, edge = 0.32, tint = 0xc9d2da } = {}) {
  const m = glass({ opacity, edge, tint });
  m.side = THREE.FrontSide; // the lathe already has inner + outer walls; double-siding doubles the haze
  vessel.body.material = m; vessel.glassMat = m;
  return vessel;
}

/* ================================================================ iron nail */
/**
 * Iron nail standing on its tip (origin = tip, +y towards the head).
 * nail.mat               – the iron (tween colour/roughness to show cleaning)
 * nail.coat({...})       – adds a growing surface layer (rust, copper) → { mesh, mat, set(k) }  k: 0 none … 1 full
 */
export function ironNail({ len = 0.05, r = 0.0013, headR = 0.0029, headH = 0.0011, tip = 0.006, color = 0x8f9399, roughness = 0.34 } = {}) {
  const g = new THREE.Group(); g.name = 'Iron nail';
  const prof = [
    [0, 0], [r * 0.35, tip * 0.35], [r, tip], [r, len - headH - 0.0012], [r * 1.25, len - headH],
    [headR, len - headH], [headR, len - 0.0003], [headR - 0.0003, len], [0, len],
  ];
  g.profile = prof; g.len = len; g.r = r; g.headR = headR;
  const pts = prof.map(([x, y]) => new THREE.Vector2(x, y));
  g.mat = metal({ color, roughness });
  const body = new THREE.Mesh(new THREE.LatheGeometry(pts, 20), g.mat);
  g.add(body); g.body = body;
  let seed = 7;
  g.coat = ({ color: c = 0x8b3d18, map, bump = 0, roughness: rr = 0.95, metalness = 0.05, top = len + 1, grow = 0.00022, seed: sd } = {}) => {
    const cut = prof.filter(([, y]) => y <= top).map(([x, y]) => new THREE.Vector2(x + grow, y));
    if (top < len) cut.push(new THREE.Vector2(r + grow, top));
    const mat = new THREE.MeshStandardMaterial({ color: c, map: map || null, roughness: rr, metalness, alphaMap: blotchTexture(sd ?? seed++), alphaTest: 0.999 });
    if (bump && map) { mat.bumpMap = map; mat.bumpScale = bump; }
    const mesh = new THREE.Mesh(new THREE.LatheGeometry(cut, 20), mat);
    g.add(mesh);
    const api = { mesh, mat, k: 0, set(k) { api.k = k; mat.alphaTest = Math.max(0.004, 1 - k); mesh.visible = k > 0.003; } };
    api.set(0);
    return api;
  };
  return g;
}

/* ============================================================ thread */
/** A cotton thread segment. seg.setEnds(a, b) in its parent's space. */
export function threadSeg({ r = 0.00035, color = 0xf3efe4 } = {}) {
  const geo = new THREE.CylinderGeometry(r, r, 1, 6, 1, true); geo.translate(0, 0.5, 0);
  const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color, roughness: 1 }));
  m.name = 'Thread'; m.raycast = () => {};
  const up = new THREE.Vector3(0, 1, 0), d = new THREE.Vector3();
  m.setEnds = (a, b) => {
    d.subVectors(b, a); const L = Math.max(1e-5, d.length());
    m.position.copy(a); m.quaternion.setFromUnitVectors(up, d.normalize()); m.scale.set(1, L, 1);
  };
  return m;
}

/* ============================================================ sandpaper */
export function sandpaper({ w = 0.06, d = 0.04 } = {}) {
  const g = new THREE.Group(); g.name = 'Sandpaper';
  const grit = mottleTexture('#a8834f', '#6e5130', '#d9c39a', 11, { n: 9000, size: 2 });
  const back = paper(0xeadfc8);
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, 0.0009, d), [back, back, new THREE.MeshStandardMaterial({ map: grit, roughness: 1 }), back, back, back]);
  m.position.y = 0.00045; g.add(m);
  return g;
}

/* ===================================================== test-tube holder */
/**
 * Wire test-tube holder that grips a tube of outer radius r. Origin = centre of the grip ring
 * (ring lies in the XZ plane). `holder.arm` (wire + wooden handle) points along −x and can be tilted.
 */
export function tubeHolder({ r = 0.0142 } = {}) {
  const g = new THREE.Group(); g.name = 'Test tube holder';
  const wire = chrome();
  for (const y of [-0.004, 0.004]) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(r + 0.0012, 0.0011, 8, 28), wire);
    ring.rotation.x = Math.PI / 2; ring.position.y = y; g.add(ring);
  }
  const arm = new THREE.Group(); g.add(arm); g.arm = arm;
  for (const z of [-0.0035, 0.0035]) {
    const w = new THREE.Mesh(new THREE.CylinderGeometry(0.0011, 0.0011, 0.05, 8), wire);
    w.rotation.z = Math.PI / 2; w.position.set(-r - 0.025, 0, z); arm.add(w);
  }
  const spring = new THREE.Mesh(new THREE.TorusGeometry(0.004, 0.0009, 6, 14), wire);
  spring.position.set(-r - 0.03, 0.002, 0); arm.add(spring);
  const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.0055, 0.0065, 0.1, 16), wood({ base: '#8a5a32', key: 'holder2' }));
  handle.rotation.z = Math.PI / 2; handle.position.x = -r - 0.1; arm.add(handle);
  return g;
}

/* ===================================================== boiling-tube rack */
export function boilingTubeRack({ holes = 2, spacing = 0.05 } = {}) {
  const g = new THREE.Group(); g.name = 'Boiling tube stand';
  const w = holes * spacing + 0.02;
  const mat = wood({ base: '#9b6a3c', key: 'rack' });
  const base = new THREE.Mesh(new THREE.BoxGeometry(w, 0.012, 0.065), mat); base.position.y = 0.006; g.add(base);
  for (const yy of [0.06, 0.1]) {
    const shape = new THREE.Shape(); shape.moveTo(-w / 2, -0.0325); shape.lineTo(w / 2, -0.0325); shape.lineTo(w / 2, 0.0325); shape.lineTo(-w / 2, 0.0325); shape.closePath();
    for (let i = 0; i < holes; i++) { const h = new THREE.Path(); h.absarc(-w / 2 + 0.01 + spacing * (i + 0.5), 0, 0.0158, 0, Math.PI * 2, true); shape.holes.push(h); }
    const plate = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: 0.008, bevelEnabled: false, curveSegments: 24 }), mat);
    plate.rotation.x = -Math.PI / 2; plate.position.y = yy; g.add(plate);
  }
  for (const sx of [-1, 1]) { const leg = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.11, 0.065), mat); leg.position.set(sx * (w / 2 - 0.005), 0.055, 0); g.add(leg); }
  g.slots = Array.from({ length: holes }, (_, i) => new THREE.Vector3(-w / 2 + 0.01 + spacing * (i + 0.5), 0.013, 0));
  return g;
}

/* ===================================================== solids in a vessel */
/**
 * A bed of powder / crystals that follows the inside shape of a Vessel (round or flat bottom).
 * bed.setHeight(h), bed.mat (tween its colour). Option `crystals` scatters glinting crystal pieces on top.
 */
export function sediment(vessel, { color = 0xffffff, height = 0.01, crystals = 0, dome = 0.0025, rough = 1, mat, seed = 5 } = {}) {
  const g = new THREE.Group(); g.name = 'Solid';
  g.mat = mat || (crystals ? new THREE.MeshPhysicalMaterial({ color, roughness: 0.35, clearcoat: 0.7, clearcoatRoughness: 0.2, metalness: 0 }) : powder(color));
  if (!crystals && !mat) g.mat.roughness = rough;
  const mesh = new THREE.Mesh(new THREE.BufferGeometry(), g.mat); g.add(mesh); g.mesh = mesh;
  mesh.renderOrder = 2;
  const pieces = new THREE.Group(); g.add(pieces); g.pieces = pieces;
  const r = rng(seed);
  g.height = 0;
  g.setHeight = (h) => {
    g.height = h;
    mesh.geometry.dispose();
    if (h < 0.0005) { mesh.visible = false; mesh.geometry = new THREE.BufferGeometry(); pieces.visible = false; return; }
    mesh.visible = true; pieces.visible = true;
    const b = vessel.bottomY, top = b + h, s = vessel.wall * 0.3 + 0.0002;
    const pts = [new THREE.Vector2(0, b + 0.0003)];
    for (const p of vessel.profile) if (p.y > b && p.y < top) pts.push(new THREE.Vector2(Math.max(0, p.x - s), p.y));
    const rt = Math.max(0, vessel.radiusAt(top) - s);
    pts.push(new THREE.Vector2(rt, top));
    const d = Math.min(dome, h * 0.6);
    for (let i = 1; i <= 4; i++) { const k = i / 4; pts.push(new THREE.Vector2(rt * (1 - k), top + d * Math.sin(k * Math.PI / 2))); }
    mesh.geometry = new THREE.LatheGeometry(pts, 32);
    pieces.children.forEach((p) => { const q = Math.min(1, Math.hypot(p.position.x, p.position.z) / Math.max(rt, 1e-4)); p.position.y = top + d * (1 - q * q) + p.userData.lift; });
  };
  if (crystals) {
    const R = vessel.radiusAt(vessel.bottomY + Math.max(height, 0.012)) - 0.001;
    for (let i = 0; i < crystals; i++) {
      const c = new THREE.Mesh(new THREE.OctahedronGeometry(0.0014 + r() * 0.0012, 0), g.mat);
      const a = r() * 6.283, rr = Math.sqrt(r()) * R * 0.85;
      c.position.set(Math.cos(a) * rr, 0, Math.sin(a) * rr); c.userData.lift = 0.0004 + r() * 0.0008;
      c.scale.set(1, 0.7 + r() * 0.5, 0.8 + r() * 0.4);
      c.rotation.set(r() * 3, r() * 3, r() * 3); pieces.add(c);
    }
  }
  g.setHeight(height);
  vessel.add(g);
  return g;
}

/** A flat layer of a second liquid (e.g. oil) floating on the vessel's liquid. layer.setThickness(t) */
export function liquidLayer(vessel, { color = 0xe2b52e, opacity = 0.72 } = {}) {
  const mat = liquid(color, { opacity }); mat.depthWrite = false;
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 1, 32), mat);
  mesh.renderOrder = 2; mesh.visible = false; mesh.raycast = () => {};
  vessel.add(mesh);
  mesh.thickness = 0;
  mesh.setThickness = (t) => {
    mesh.thickness = t; mesh.visible = t > 0.0003;
    const y0 = vessel.surfaceY, rr = vessel.radiusAt(y0 + t / 2) - 0.0003;
    mesh.scale.set(rr, Math.max(t, 1e-4), rr); mesh.position.y = y0 + t / 2;
  };
  return mesh;
}

/** Translucent coloured gas filling the inside of a vessel (e.g. brown NO₂). gas.material.opacity to fade. */
export function gasFill(vessel, { color = 0x9a4416, from = 0.01, to } = {}) {
  const top = to ?? vessel.rimY - 0.004;
  const pts = [];
  for (const p of vessel.profile) if (p.y >= from && p.y <= top) pts.push(new THREE.Vector2(Math.max(0, p.x - 0.0006), p.y));
  pts.unshift(new THREE.Vector2(0, from), new THREE.Vector2(vessel.radiusAt(from) - 0.0006, from)); pts.push(new THREE.Vector2(vessel.radiusAt(top) - 0.0006, top)); pts.push(new THREE.Vector2(0, top));
  const mat = new THREE.MeshStandardMaterial({ color, roughness: 1, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide });
  const m = new THREE.Mesh(new THREE.LatheGeometry(pts, 28), mat); m.renderOrder = 2; m.raycast = () => {};
  vessel.add(m); return m;
}

/** Condensed water droplets on the inside wall of a vessel. drops.set(k) 0..1 grows them in. */
export function wallDroplets(vessel, { count = 70, yMin = 0.08, yMax = 0.14, size = 0.0011, seed = 9 } = {}) {
  const mat = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0, transparent: true, opacity: 0.55, clearcoat: 1, envMapIntensity: 2.6, depthWrite: false });
  const geo = new THREE.SphereGeometry(1, 10, 8);
  const im = new THREE.InstancedMesh(geo, mat, count); im.renderOrder = 4; im.raycast = () => {}; im.frustumCulled = false;
  const r = rng(seed), m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3();
  const data = Array.from({ length: count }, () => {
    const y = yMin + r() * (yMax - yMin), a = r() * Math.PI * 2;
    return { y, a, sz: size * (0.45 + r() * 0.9), on: r() * 0.75 };
  });
  im.set = (k) => {
    data.forEach((d, i) => {
      const t = THREE.MathUtils.clamp((k - d.on) / 0.25, 0, 1);
      const rr = vessel.radiusAt(d.y) - d.sz * 0.35;
      p.set(Math.cos(d.a) * rr, d.y, Math.sin(d.a) * rr);
      q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), -d.a);
      s.set(d.sz * 0.45 * t, d.sz * 1.15 * t, d.sz * t);
      m4.compose(p, q, s.x < 1e-6 ? s.setScalar(0) : s); im.setMatrixAt(i, m4);
    });
    im.instanceMatrix.needsUpdate = true;
  };
  im.set(0);
  vessel.add(im);
  return im;
}

/* ===================================================== fume cupboard */
/** Fume cupboard shell (back, sides, top, raised sash) that the bench work sits inside. Front edge at +d/2. */
export function fumeCupboard({ w = 0.78, h = 0.66, d = 0.5, color = 0x6b7279 } = {}) {
  const g = new THREE.Group(); g.name = 'Fume cupboard';
  // grey phenolic-resin lining (chemical resistant)
  const panel = new THREE.MeshStandardMaterial({ color, roughness: 0.6, metalness: 0 });
  const frame = metal({ color: 0xb7bcc2, roughness: 0.35 });
  const add = (geo, mat, x, y, z) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.userData.noShadow = true; m.raycast = () => {}; g.add(m); return m; };
  add(new THREE.BoxGeometry(w, h, 0.012), panel, 0, h / 2, -d / 2);
  for (const s of [-1, 1]) {
    add(new THREE.BoxGeometry(0.014, h, d), panel, s * w / 2, h / 2, 0);
    add(new THREE.BoxGeometry(0.03, h, 0.03), frame, s * (w / 2 - 0.004), h / 2, d / 2);
  }
  add(new THREE.BoxGeometry(w + 0.03, 0.04, d + 0.02), panel, 0, h + 0.02, 0);
  // baffle slots at the back (air is drawn out through them)
  for (let i = 0; i < 3; i++) add(new THREE.BoxGeometry(w * 0.8, 0.008, 0.004), new THREE.MeshStandardMaterial({ color: 0x3f4448, roughness: 0.8 }), 0, 0.08 + i * 0.22, -d / 2 + 0.008);
  // raised glass sash
  const sashY = h - 0.12;
  add(new THREE.BoxGeometry(w - 0.02, 0.2, 0.006), glass({ opacity: 0.12, edge: 0.6 }), 0, sashY + 0.1, d / 2 + 0.02);
  add(new THREE.BoxGeometry(w - 0.02, 0.022, 0.02), frame, 0, sashY, d / 2 + 0.02);
  // light strip under the top
  add(new THREE.BoxGeometry(w * 0.7, 0.006, 0.04), new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfff8e8, emissiveIntensity: 0.6 }), 0, h - 0.004, 0);
  // warning label
  const tex = canvasTexture(512, 96, (c, W, H) => {
    c.fillStyle = '#fde047'; c.fillRect(0, 0, W, H); c.fillStyle = '#111'; c.font = '800 44px Arial'; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText('FUME CUPBOARD  ·  FAN ON', W / 2, H / 2 + 2);
  }, { key: 'fumeLabel' });
  add(new THREE.PlaneGeometry(0.22, 0.041), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.8 }), 0, h * 0.78, -d / 2 + 0.007);
  return g;
}

/* ===================================================== pouring between vessels */
/**
 * Like common.pour(), but empties the source (a test tube or bottle) down to `drainTo`.
 * src.lipLocal (local Vector3) marks the pouring edge.
 */
export async function pourInto(lab, src, target, { amount = 0.02, duration = 2, side = 1, drainTo = 0, tilt = 1.72, onFlowing } = {}) {
  const home = src.position.clone(); const homeRot = src.rotation.clone();
  const mouth = target.mouthWorld();
  const tl = side * tilt;
  const lipL = (src.lipLocal || new THREE.Vector3(0, 0.1, 0)).clone();
  const rotated = lipL.clone().applyEuler(new THREE.Euler(0, 0, tl));
  const desiredLip = mouth.clone().add(new THREE.Vector3(side * 0.003, 0.026, 0));
  const base = desiredLip.sub(rotated).applyMatrix4(src.parent.matrixWorld.clone().invert());
  await lab.carry(src, [base.x, base.y, base.z], { lift: 0.04, duration: 1 });
  const v = src.vessel || src;
  await lab.tween(src.rotation, { z: tl, duration: 0.8, ease: 'power2.inOut' });
  const mat = v.liqMat.clone(); mat.opacity = Math.max(0.35, mat.opacity);
  const stream = new Stream(mat, 0.0013); lab.scene.add(stream); lab.track(stream);
  const lip = src.localToWorld(lipL.clone());
  const surf = () => target.localToWorld(new THREE.Vector3(0, target.surfaceY, 0)).y;
  stream.set(lip, new THREE.Vector3(mouth.x, surf(), mouth.z));
  stream.visible = true; stream.k = 0;
  lab.sfx?.('pour');
  await lab.tween(stream, { k: 1, duration: 0.25 });
  onFlowing?.();
  const lvl = target.fill(target.level + amount, duration);
  const dr = v.setLevel ? v.fill(drainTo, duration * 0.9) : null;
  const upd = lab.onUpdate(() => { stream._to.y = surf(); });
  await lab.wait(duration);
  lvl.kill?.(); dr?.kill?.(); upd();
  await lab.tween(stream, { k: 0, duration: 0.2 });
  lab.remove(stream); stream.geometry.dispose();
  await lab.tween(src.rotation, { z: homeRot.z, duration: 0.6, ease: 'power2.inOut' });
  await lab.carry(src, [home.x, home.y, home.z], { lift: 0.03, duration: 0.9 });
}

/** A single falling drop of liquid from world point a to world y = yEnd. */
export async function fallingDrop(lab, from, yEnd, { color = 0xdbeafe, size = 0.0016 } = {}) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(size, 12, 10), liquid(color, { opacity: 0.8 }));
  m.scale.set(1, 1.3, 1); m.position.copy(from); lab.scene.add(m);
  const t = Math.sqrt(Math.max(0.002, (from.y - yEnd)) * 2 / 9.8) * 1.6;
  await lab.tween(m.position, { y: yEnd, duration: Math.max(0.18, t), ease: 'power2.in' });
  lab.scene.remove(m); m.geometry.dispose();
}

/* ===================================================== spatula work */
/**
 * Take a spatula-full of solid from a reagent bottle: the stopper comes off, the spatula dips in and
 * comes out carrying `heap` (a child of the spatula, hidden until now), then the stopper goes back.
 */
export async function scoopFrom(lab, spat, bottle, heap) {
  const st = bottle.stopper, stHome = st.position.clone();
  await lab.tween(st.position, { y: stHome.y + 0.03, duration: 0.35, ease: 'power2.out' });
  await lab.tween(st.position, { x: stHome.x + 0.05, y: 0.012 - 0.002, duration: 0.5, ease: 'power2.inOut' });
  st.rotation.z = Math.PI / 2;
  const mouth = bottle.localToWorld(new THREE.Vector3(0, 0.106, 0));
  const ang = -1.32, dir = new THREE.Vector3(Math.cos(ang), Math.sin(ang), 0);
  const O = mouth.clone().addScaledVector(dir, -0.03).add(new THREE.Vector3(0, 0.006, 0));
  await lab.carry(spat, [O.x, O.y, O.z], { lift: 0.08, duration: 1.1, rotate: { z: ang, y: 0 } });
  await lab.tween(spat.position, { x: O.x + dir.x * 0.036, y: O.y + dir.y * 0.036, duration: 0.5, ease: 'power2.inOut' });
  lab.sfx?.('tick'); await lab.wait(0.25);
  heap.visible = true;
  await lab.tween(spat.position, { x: O.x, y: O.y + 0.01, duration: 0.5, ease: 'power2.inOut' });
  await lab.tween(spat.rotation, { z: 0, duration: 0.45, ease: 'power2.inOut' });
  st.rotation.z = 0;
  lab.tween(st.position, { x: stHome.x, y: stHome.y, duration: 0.6, ease: 'power2.inOut' }).catch(() => {});
}

/** Tip the solid on the spatula into a vessel; `onLand(k)` is called as it piles up (k 0→1). */
export async function tipInto(lab, spat, heap, vessel, { onLand, duration = 1.2, home } = {}) {
  const mouth = vessel.mouthWorld();
  await lab.carry(spat, [mouth.x - 0.02, mouth.y + 0.014, mouth.z], { lift: 0.04, duration: 1 });
  await lab.tween(spat.rotation, { z: -0.6, duration: 0.45, ease: 'power2.in' });
  lab.scene.attach(heap);
  const land = vessel.localToWorld(new THREE.Vector3(0, vessel.bottomY + 0.01, 0));
  const o = { k: 0 };
  const tl = lab.timeline();
  tl.to(heap.position, { x: mouth.x, z: mouth.z, y: mouth.y - 0.01, duration: 0.3, ease: 'power1.in' }, 0);
  tl.to(heap.position, { y: land.y, duration: 0.4, ease: 'power2.in' }, 0.3);
  tl.to(heap.scale, { x: 0.4, y: 0.4, z: 0.4, duration: 0.6 }, 0.1);
  tl.to(o, { k: 1, duration, ease: 'power1.out', onUpdate: () => onLand?.(o.k) }, 0.45);
  lab.sfx?.('drop');
  await lab.play(tl);
  heap.visible = false;
  await lab.tween(spat.rotation, { z: 0, duration: 0.35 });
  if (home) await lab.carry(spat, home, { lift: 0.03, duration: 0.9 });
}

/** World-space pose that holds a tube (origin at its bottom) in the upper part of a burner flame. */
export function heatPose(burner, { tiltZ = 0.5, tiltX = -0.3, height = 0.16 } = {}) {
  const p = burner.getWorldPosition(new THREE.Vector3());
  return { pos: [p.x - 0.002, height, p.z], rot: { x: tiltX, y: 0, z: tiltZ } };
}

/**
 * In ?auto mode ui.ready() resolves while the intro camera dolly is still running, and that dolly then
 * overrides an early lab.focus(). Call this before the first camera move of a step to stop it.
 */
export function stopCameraMoves(lab) {
  gsap.killTweensOf(lab.camera.position); gsap.killTweensOf(lab.controls.target);
}

/** Lerp a THREE.Color across a list of stops (k 0..1). */
export function colorRamp(stops, k, out = new THREE.Color()) {
  const n = stops.length - 1; const x = THREE.MathUtils.clamp(k, 0, 1) * n; const i = Math.min(n - 1, Math.floor(x));
  return out.copy(new THREE.Color(stops[i])).lerp(new THREE.Color(stops[i + 1]), x - i);
}


