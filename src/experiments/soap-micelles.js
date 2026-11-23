// Activity 4.12 — Cleaning action of soap: oil + water emulsion with and without soap, then a
// molecular "zoom" into the soapy water showing micelles (tails in the oil, ionic heads in the water).
import * as THREE from 'three';
import { testTube, reagentBottle, cork, pour } from '../engine/apparatus/common.js';
import { TUBE_R, tuneGlass, tubeLevel, openRack, Emulsion, Froth, stopwatch } from '../engine/apparatus/carbon.js';
import { canvasTexture } from '../engine/textures.js';

export const config = { camera: { pos: [0, 0.32, 0.6], target: [0, 0.07, 0.02] } };

export const steps = [
  'Pour about 10 mL of water into each test tube',
  'Add a few drops of cooking oil to both',
  'Add soap solution to test tube A only',
  'Cork and shake both test tubes',
  'Start the stopwatch and compare the tubes',
  'Zoom into the soapy water',
  'Rinse the micelle away with water',
];

const WATER = 0xeef3f6;
const SOAPY = 0xeceee4;
const OIL = 0xe3a91f;

/* ====================================================== molecular view */
const NB = 9, HEAD_R = 0.0058, BEAD_R = 0.0026, STEP = 0.0034;
const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _c = new THREE.Vector3(), _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _s = new THREE.Vector3();
const UP = new THREE.Vector3(0, 1, 0), XAX = new THREE.Vector3(1, 0, 0);

function fib(n, i) { // even directions on a sphere
  const y = 1 - ((i + 0.5) / n) * 2, r = Math.sqrt(1 - y * y), th = i * Math.PI * (3 - Math.sqrt(5));
  return new THREE.Vector3(Math.cos(th) * r, y, Math.sin(th) * r);
}

/** Everything seen "inside" the soapy water: oil droplet, soap molecules, water particles, flow arrow. */
function buildMicro() {
  const g = new THREE.Group(); g.name = 'Molecular view';
  // water backdrop: a big inverted sphere with a deep-teal gradient
  const bg = canvasTexture(8, 512, (c, w, h) => {
    const grd = c.createLinearGradient(0, 0, 0, h);
    grd.addColorStop(0, '#071a2c'); grd.addColorStop(0.35, '#0d4a6e'); grd.addColorStop(0.55, '#14628a'); grd.addColorStop(0.75, '#0b3a5a'); grd.addColorStop(1, '#04111e');
    c.fillStyle = grd; c.fillRect(0, 0, w, h);
  }, { key: 'micro-bg' });
  const back = new THREE.Mesh(new THREE.SphereGeometry(1.15, 48, 32), new THREE.MeshBasicMaterial({ map: bg, side: THREE.BackSide, depthWrite: false }));
  back.renderOrder = -10; back.raycast = () => {}; back.userData.noShadow = true; g.add(back);
  const glowL = new THREE.PointLight(0x9fdcff, 0.6, 1.2, 1.5); glowL.position.set(-0.2, 0.25, 0.3); g.add(glowL);

  // oil droplet
  const oilMat = new THREE.MeshPhysicalMaterial({ color: 0xf2b42a, roughness: 0.18, clearcoat: 1, transparent: true, opacity: 0.62, emissive: 0x6a3d00, emissiveIntensity: 0.35, sheen: 0.6, sheenColor: new THREE.Color(0xffe08a), depthWrite: false });
  const oil = new THREE.Mesh(new THREE.SphereGeometry(0.05, 48, 32), oilMat); oil.renderOrder = 2; g.add(oil);

  // soap molecules
  const mc = [new THREE.Vector3(0, 0, 0), new THREE.Vector3(-0.135, -0.06, -0.05), new THREE.Vector3(0.14, 0.058, -0.07)];
  const mols = [];
  const N0 = 64, NS = 18;
  for (let i = 0; i < N0; i++) { const u = fib(N0, i); mols.push({ mic: 0, rel: u.clone().multiplyScalar(0.05 + 0.0035), tdir: u.clone().negate() }); }
  for (const k of [1, 2]) for (let i = 0; i < NS; i++) { const u = fib(NS, i); mols.push({ mic: k, rel: u.clone().multiplyScalar(0.036), tdir: u.clone().negate() }); }
  mols.forEach((m) => {
    do { m.pos = new THREE.Vector3((Math.random() - 0.5) * 0.34, (Math.random() - 0.5) * 0.19, -0.09 + Math.random() * 0.15); } while (m.pos.length() < 0.075);
    m.dir = new THREE.Vector3().randomDirection();
    m.vel = new THREE.Vector3().randomDirection().multiplyScalar(0.006 + Math.random() * 0.006);
    m.spin = new THREE.Vector3().randomDirection(); m.ph = Math.random() * 10;
    m.mode = 'free'; m.p = 0;
  });
  const FEAT = 5; // the molecule the student inspects
  mols[FEAT].pos.set(-0.085, 0.035, 0.06); mols[FEAT].dir.set(1, -0.25, 0.1).normalize(); mols[FEAT].vel.set(0.0015, -0.0006, 0);

  const headMat = new THREE.MeshPhysicalMaterial({ color: 0xe0403a, roughness: 0.3, clearcoat: 0.8, emissive: 0x5a0a08, emissiveIntensity: 0.6 });
  const tailMat = new THREE.MeshStandardMaterial({ color: 0xc3ccd6, roughness: 0.5, emissive: 0x1b2836, emissiveIntensity: 0.3 });
  const heads = new THREE.InstancedMesh(new THREE.SphereGeometry(HEAD_R, 18, 12), headMat, mols.length);
  const beads = new THREE.InstancedMesh(new THREE.SphereGeometry(BEAD_R, 10, 8), tailMat, mols.length * NB);
  heads.frustumCulled = beads.frustumCulled = false; heads.raycast = beads.raycast = () => {};
  g.add(heads, beads);

  // featured molecule as real meshes (so it can be tapped, outlined and labelled)
  const feat = new THREE.Group(); feat.name = 'Soap molecule';
  const fHead = new THREE.Mesh(heads.geometry, headMat.clone()); fHead.material.emissiveIntensity = 0.9; feat.add(fHead);
  const fBeads = Array.from({ length: NB }, () => { const b = new THREE.Mesh(beads.geometry, tailMat); feat.add(b); return b; });
  g.add(feat);

  // water particles (fine dots that stream past when rinsing)
  const NW = 320;
  const wmat = new THREE.MeshBasicMaterial({ color: 0xbfe6ff, transparent: true, opacity: 0.35, depthWrite: false });
  const water = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 8, 6), wmat, NW); water.frustumCulled = false; water.raycast = () => {};
  const wp = Array.from({ length: NW }, () => ({ p: new THREE.Vector3((Math.random() - 0.5) * 0.7, (Math.random() - 0.5) * 0.34, -0.3 + Math.random() * 0.36), s: 0.0009 + Math.random() * 0.0012, ph: Math.random() * 9 }));
  g.add(water);

  // "water flow" arrow the student taps to rinse
  const arrow = new THREE.Group(); arrow.name = 'Water flow';
  const amat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, emissive: 0x0e7fb8, emissiveIntensity: 0.8, transparent: true, opacity: 0.85, roughness: 0.3 });
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.06, 16), amat); shaft.rotation.z = -Math.PI / 2; arrow.add(shaft);
  const tipM = new THREE.Mesh(new THREE.ConeGeometry(0.014, 0.026, 20), amat); tipM.rotation.z = -Math.PI / 2; tipM.position.x = 0.042; arrow.add(tipM);
  arrow.position.set(-0.15, 0.085, 0.03); arrow.visible = false; g.add(arrow);

  const state = { flow: 0, assembling: false };
  const perp = new THREE.Vector3(), perp2 = new THREE.Vector3();
  const place = (m, t, i, setHead, setBead) => {
    perp.crossVectors(m.dir, Math.abs(m.dir.y) < 0.9 ? UP : XAX).normalize(); perp2.crossVectors(m.dir, perp);
    setHead(_a.copy(m.pos));
    for (let j = 0; j < NB; j++) {
      const d = HEAD_R + 0.0016 + j * STEP, zig = (j % 2 ? 1 : -1) * 0.0011, wig = Math.sin(t * 2.4 + m.ph + j * 0.7) * 0.0009 * (j / NB);
      setBead(j, _b.copy(m.pos).addScaledVector(m.dir, d).addScaledVector(perp, zig).addScaledVector(perp2, wig));
    }
  };
  const ease = (x) => x * x * (3 - 2 * x);
  g.update = (dt, t) => {
    if (!g.visible) return;
    oil.position.copy(mc[0]);
    const k = 1 + Math.sin(t * 1.3) * 0.015; oil.scale.set(k, 1 / k, k);
    mols.forEach((m, i) => {
      if (m.mode === 'free') {
        m.pos.addScaledVector(m.vel, dt);
        for (const ax of ['x', 'y', 'z']) { const lim = ax === 'x' ? 0.18 : ax === 'y' ? 0.1 : 0.09; if (Math.abs(m.pos[ax]) > lim) m.vel[ax] = -Math.sign(m.pos[ax]) * Math.abs(m.vel[ax]); }
        if (m.pos.length() < 0.07) m.vel.add(_c.copy(m.pos).normalize().multiplyScalar(0.004));
        m.dir.applyAxisAngle(m.spin, dt * 0.35).normalize();
      } else if (m.mode === 'assemble') {
        if (m.delay > 0) { m.delay -= dt; } else {
          m.p = Math.min(1, m.p + dt / m.dur);
          const e = ease(m.p);
          const tgt = _c.copy(mc[m.mic]).add(m.rel);
          m.pos.copy(m.sp).lerp(tgt, e);
          m.pos.y += Math.sin(e * Math.PI) * 0.01;
          m.dir.copy(m.sd).lerp(m.tdir, e).normalize();
          if (m.p >= 1) m.mode = 'bound';
        }
      } else {
        const br = 1 + Math.sin(t * 1.6 + m.ph) * 0.012;
        m.pos.copy(mc[m.mic]).addScaledVector(m.rel, br); m.dir.copy(m.tdir);
      }
      if (i === FEAT) {
        place(m, t, i, (p) => fHead.position.copy(p), (j, p) => fBeads[j].position.copy(p));
        _m.makeScale(0, 0, 0); heads.setMatrixAt(i, _m); for (let j = 0; j < NB; j++) beads.setMatrixAt(i * NB + j, _m);
      } else {
        place(m, t, i, (p) => { _m.makeTranslation(p.x, p.y, p.z); heads.setMatrixAt(i, _m); }, (j, p) => { _m.makeTranslation(p.x, p.y, p.z); beads.setMatrixAt(i * NB + j, _m); });
      }
    });
    heads.instanceMatrix.needsUpdate = true; beads.instanceMatrix.needsUpdate = true;
    wp.forEach((w, i) => {
      w.p.x += (0.004 + state.flow * 0.32) * dt; w.p.y += Math.sin(t * 0.7 + w.ph) * 0.002 * dt;
      if (w.p.x > 0.36) w.p.x -= 0.72;
      const st = 1 + state.flow * 3;
      _m.compose(w.p, _q.identity(), _s.set(w.s * st, w.s, w.s)); water.setMatrixAt(i, _m);
    });
    water.instanceMatrix.needsUpdate = true;
    if (arrow.visible) { const pulse = 1 + Math.sin(t * 5) * 0.06; arrow.scale.setScalar(pulse); }
  };
  g.assemble = () => {
    mols.forEach((m, i) => {
      m.mode = 'assemble'; m.p = 0; m.sp = m.pos.clone(); m.sd = m.dir.clone();
      m.delay = m.mic === 0 ? Math.random() * 1.2 : 0.6 + Math.random() * 1.2; m.dur = 1.8 + Math.random() * 1.2;
      if (i === FEAT) { m.delay = 0.2; m.dur = 2.4; }
    });
  };
  g.oil = oil; g.mc = mc; g.feat = feat; g.fHead = fHead; g.fTail = fBeads[6]; g.arrow = arrow; g.state = state; g.featMol = mols[FEAT];
  return g;
}

/* ================================================================ run */
export default async function run({ lab, ui }) {
  /* ------------------------------------------------------------ bench */
  const rack = lab.add(openRack({ holes: 2, spacing: 0.06 }), [0, 0, -0.01]);
  const mkTube = (slot, name) => {
    const t = testTube({ r: TUBE_R, h: 0.15, liquidColor: WATER }); t.setLiquidColor(WATER, { opacity: 0.1 });
    const s = rack.slots[slot]; t.position.set(s.x, s.y, -0.01); lab.add(t); lab.pickable(t, name);
    const em = new Emulsion(t, { color: OIL, water: WATER }); em.clearOpacity = 0.1; t.add(em); lab.track(em);
    return Object.assign(t, { em });
  };
  const A = mkTube(0, 'Test tube A'), B = mkTube(1, 'Test tube B');
  const tagA = lab.tag(A, 'A', { offset: [0, 0.112, 0.012], cls: 'mono' });
  const tagB = lab.tag(B, 'B', { offset: [0, 0.112, 0.012], cls: 'mono' });

  const bottle = (opts, pos, tip, op = 0.14) => { const b = lab.add(reagentBottle({ level: 0.06, ...opts }), pos); if (op) b.vessel.setLiquidColor(opts.color, { opacity: op }); lab.pickable(b, tip); return b; };
  const water = bottle({ title: 'Water', formula: 'H₂O', sub: 'tap water', color: WATER, labelColor: '#0369a1' }, [-0.22, 0, -0.04], 'Water');
  const oil = bottle({ title: 'Cooking oil', formula: '', sub: 'vegetable oil', color: OIL, labelColor: '#a16207' }, [0.2, 0, -0.02], 'Cooking oil', 0.82);
  const soap = bottle({ title: 'Soap solution', formula: '', sub: 'soap in water', color: SOAPY, labelColor: '#15803d' }, [-0.13, 0, 0.17], 'Soap solution', 0);
  soap.vessel.setLiquidColor(SOAPY, { cloudy: 0.35 });

  const ckA = cork({ r: TUBE_R + 0.0006, h: 0.016 }), ckB = cork({ r: TUBE_R + 0.0006, h: 0.016 });
  [[ckA, -0.01], [ckB, 0.02]].forEach(([c, x]) => { c.rotation.z = Math.PI / 2; c.position.set(x, 0.0085, 0.13); lab.add(c); });

  const watch = lab.add(stopwatch(), [0.11, 0, 0.12]); watch.rotation.y = -0.3;
  lab.pickable(watch, 'Stopwatch');

  const micro = buildMicro(); micro.visible = false; lab.add(micro, [0, 5, 0]);
  const M = micro.position;

  tuneGlass(lab.scene);
  await ui.ready();

  /* ------------------------------------------- 1. water */
  ui.step(0, 'Drag the <b>water</b> bottle to test tube <b>A</b>. Pour about 10 mL into each tube.', { sub: 'Fill both tubes to the same level.' });
  await lab.waitDrop(water, A, { radius: 0.1 });
  const wHome = water.position.clone();
  await pour(lab, water, A, { amount: tubeLevel(10), duration: 1.6, side: -1, back: false });
  await pour(lab, water, B, { amount: tubeLevel(10), duration: 1.6, side: 1, back: false });
  await lab.carry(water, [wHome.x, wHome.y, wHome.z], { lift: 0.04, duration: 1 });
  lab.unpickable(water);
  ui.observe('Each test tube now holds about 10 mL of clear water.', { icon: '💧' });

  /* ------------------------------------------- 2. oil */
  ui.step(1, 'Drag the <b>cooking oil</b> to the test tubes to add a few drops to each.', { sub: 'Only a few drops are needed.' });
  await lab.waitDrop(oil, B, { radius: 0.1 });
  const oHome = oil.position.clone();
  await lab.focus({ pos: [0, 0.14, 0.3], target: [0, 0.08, -0.01] }, 1);
  await pour(lab, oil, B, { amount: 0, duration: 0.8, side: 1, back: false, onFlowing: () => B.em.layerTo(0.0032, 0.9) });
  await pour(lab, oil, A, { amount: 0, duration: 0.8, side: -1, back: false, onFlowing: () => A.em.layerTo(0.0032, 0.9) });
  await lab.carry(oil, [oHome.x, oHome.y, oHome.z], { lift: 0.04, duration: 1 });
  lab.unpickable(oil);
  await lab.focus({ pos: [0, 0.09, 0.22], target: [0, 0.065, -0.01] }, 1);
  ui.observe('The oil does not mix with water. Being lighter, it floats as a separate <b>yellow layer</b> on top of the water.', { icon: '🛢️' });

  /* ------------------------------------------- 3. soap solution into A */
  ui.step(2, 'Drag the <b>soap solution</b> to test tube <b>A</b> only.', { sub: 'Test tube B gets no soap — it is our control.' });
  await lab.home(1);
  await lab.waitDrop(soap, A, { radius: 0.12 });
  await pour(lab, soap, A, { amount: tubeLevel(12) - tubeLevel(10), duration: 1.2, side: -1 });
  lab.unpickable(soap);
  A.em.waterColor.set(SOAPY); A.em.cloudyBase = 0.12; A.em.milkK = 0.75; A.em.clearOpacity = 0.14;
  A.tintTo(SOAPY, 1, { cloudy: 0.12 });
  ui.observe('The soap solution mixes with the water in test tube A, making it slightly cloudy. The oil still floats on top.', { icon: '🧼' });

  /* ------------------------------------------- 4. cork and shake */
  ui.step(3, 'Tap a <b>test tube</b> to cork it and shake it vigorously. Do both.', { sub: 'Hold the cork firmly with your thumb while shaking.' });
  await ui.predict({
    q: 'After shaking, in which test tube will the oil stay mixed with the water (milky) for longer?',
    options: ['A — with soap', 'B — without soap', 'Both the same', 'In neither tube'],
    answer: 0,
    explain: 'Soap molecules surround tiny oil droplets and keep them spread through the water — an emulsion.',
  });
  const frothA = new Froth(A, { count: 220, size: 0.0008, height: 0.007, opacity: 0.75, extra: () => A.em.T }); A.add(frothA); lab.track(frothA);
  const shake = async (tube, ck) => {
    lab.unpickable(tube);
    const home = tube.position.clone();
    const m = tube.mouthWorld();
    await lab.carry(ck, [m.x, m.y + 0.003, m.z], { lift: 0.04, duration: 0.8, rotate: { z: 0 } });
    tube.attach(ck); lab.sfx('click');
    await lab.carry(tube, [home.x, 0.13, 0.09], { lift: 0, duration: 0.8 });
    const soapy = tube === A;
    tube.em.disperse(soapy ? { size: [0.00025, 0.0006], rise: 0 } : { size: [0.0006, 0.0014], rise: 0 });
    if (soapy) lab.tween(frothA, { amount: 1, duration: 1.4 }).catch(() => {});
    lab.sfx('pour');
    const tl = lab.timeline({ paused: true });
    tl.to(tube.rotation, { z: 0.55, duration: 0.09, yoyo: true, repeat: 13, ease: 'sine.inOut' }, 0)
      .to(tube.position, { y: 0.15, duration: 0.09, yoyo: true, repeat: 13, ease: 'sine.inOut' }, 0.045);
    await lab.play(tl);
    tube.rotation.z = 0;
    await lab.carry(tube, [home.x, home.y, home.z], { lift: 0.0, duration: 0.9 });
    lab.sfx('glass');
  };
  await lab.focus({ pos: [0, 0.2, 0.42], target: [0, 0.1, 0.03] }, 1);
  const left = [A, B];
  while (left.length) {
    const t = await lab.waitClick(left);
    left.splice(left.indexOf(t), 1);
    await shake(t, t === A ? ckA : ckB);
  }
  ui.observe('On shaking, the oil breaks up into tiny droplets and both tubes turn <b>milky</b> for a moment.', { icon: '🫨' });

  /* ------------------------------------------- 5. stopwatch: compare */
  ui.step(4, 'Tap the <b>stopwatch</b> to start timing, then watch both test tubes.', { sub: 'Is the oil layer separating out soon after you stop shaking?' });
  await lab.waitClick(watch);
  A.em.rise = 0.00022; B.em.rise = 0.012;
  await lab.focus({ pos: [0.0, 0.085, 0.24], target: [0, 0.055, -0.01] }, 1);
  const table = ui.table(['Test tube', 'Contents', 'Right after shaking', 'After 1 minute'], { title: 'Observation table' });
  let simT = 0;
  const tick = lab.onUpdate((dt) => {
    simT = Math.min(60, simT + dt * 6);
    watch.setSeconds(simT);
    ui.readout('sw', 'Time after shaking', simT.toFixed(0), { unit: ' s', color: '#0ea5e9' });
  });
  await lab.wait(4.6);
  ui.observe('In test tube B (no soap) the oil droplets rise quickly and join up — within seconds the <b>oil layer separates out again</b>.', { icon: '⬆️', highlight: true });
  await lab.wait(5.6);
  tick();
  frothA.amount = Math.min(frothA.amount, 0.7);
  ui.observe('In test tube A (with soap) the liquid <b>stays milky</b> even after a minute — the oil remains spread as tiny droplets. Soap has formed an <b>emulsion</b>.', { icon: '🥛', highlight: true });
  table.addRow(['A', 'Water + oil + soap', 'Milky', 'Still milky (emulsion)']);
  table.addRow(['B', 'Water + oil', 'Milky', 'Oil layer separated']);
  ui.clearReadout('sw');

  /* ------------------------------------------- 6. zoom into the soapy water */
  ui.step(5, 'Tap the milky test tube <b>A</b> to zoom into the soapy water.', { sub: 'We will magnify about ten million times to see the molecules.' });
  await lab.home(1);
  await lab.waitClick(A);
  lab.untag(tagA); lab.untag(tagB);
  const ctl = lab.controls, minD = ctl.minDistance, maxD = ctl.maxDistance;
  ctl.minDistance = 0.008;
  const flash = document.createElement('div');
  flash.style.cssText = 'position:absolute;inset:0;pointer-events:none;z-index:6;opacity:0;background:radial-gradient(circle at 50% 50%, rgba(240,250,255,1) 0%, rgba(150,210,240,0.96) 60%, rgba(20,80,120,0.95) 100%)';
  ui.viewport.appendChild(flash);
  const mag = { v: 1 };
  const magRo = lab.onUpdate(() => ui.readout('mag', 'Magnification', '×' + Math.round(mag.v).toLocaleString('en-IN'), { color: '#22d3ee' }));
  const aw = A.localToWorld(new THREE.Vector3(0, A.surfaceY - 0.02, 0));
  lab.tween(mag, { v: 60, duration: 1.8, ease: 'power2.in' }).catch(() => {});
  await lab.focus({ pos: [aw.x, aw.y + 0.004, aw.z + 0.035], target: [aw.x, aw.y, aw.z] }, 1.8, 'power2.in');
  lab.sfx('whoosh');
  await lab.tween(flash, { opacity: 1, duration: 0.3 });
  micro.visible = true;
  ctl.maxDistance = 1.05;
  lab.camera.position.set(M.x, M.y + 0.12, M.z + 1.0); ctl.target.copy(M); ctl.update();
  lab.tween(flash, { opacity: 0, duration: 0.7 }).catch(() => {});
  lab.tween(mag, { v: 10000000, duration: 2.2, ease: 'power3.out' }).catch(() => {});
  const microHome = { pos: [M.x, M.y + 0.05, M.z + 0.42], target: [M.x, M.y, M.z] };
  await lab.focus(microHome, 2.4, 'power2.out');
  magRo();
  const tags = [];
  tags.push(lab.tag(micro.oil, 'Oil droplet (grease)', { offset: [0, 0.066, 0], cls: 'dark' }));
  ui.observe('Magnified millions of times, the soapy water shows an <b>oil droplet</b> and many separate <b>soap molecules</b> moving about.', { icon: '🔬' });

  ui.instruct('Tap the highlighted <b>soap molecule</b> to look at it closely.', { sub: 'Each molecule has two very different ends.' });
  await lab.waitClick(micro.feat);
  const fp = micro.featMol.pos.clone().add(M);
  ctl.minDistance = 0.05;
  await lab.focus({ pos: [fp.x + 0.03, fp.y + 0.03, fp.z + 0.16], target: [fp.x + 0.012, fp.y, fp.z] }, 1.3);
  const tHead = lab.tag(micro.fHead, 'Ionic end (–COO⁻ Na⁺)<br><small>hydrophilic — attracted to water</small>', { offset: [0, 0.014, 0], cls: 'dark' });
  const tTail = lab.tag(micro.fTail, 'Long hydrocarbon tail<br><small>hydrophobic — dissolves in oil</small>', { offset: [0, -0.016, 0], cls: 'dark' });
  ui.observe('A soap molecule is the sodium salt of a long-chain carboxylic acid. Its <b>ionic end</b> is attracted to water (hydrophilic); its long <b>carbon chain</b> is repelled by water but dissolves in oil (hydrophobic).', { icon: '🧬' });
  await lab.wait(1.5);
  await ui.predict({
    q: 'When soap molecules meet the oil droplet, which end will go into the oil?',
    options: ['The ionic (charged) end', 'The hydrocarbon tail', 'Both ends', 'Neither — they avoid oil'],
    answer: 1,
    explain: 'The hydrocarbon tail dissolves in oil (like dissolves like), while the ionic end stays in the water.',
  });
  lab.untag(tHead); lab.untag(tTail);

  ui.instruct('Tap the <b>oil droplet</b> to watch what the soap molecules do.', { sub: 'Watch the tails and the heads.' });
  await lab.focus(microHome, 1.2);
  await lab.waitClick(micro.oil);
  micro.assemble();
  await lab.focus({ pos: [M.x + 0.03, M.y + 0.07, M.z + 0.36], target: [M.x, M.y, M.z] }, 3.5, 'sine.inOut');
  await lab.wait(1.2);
  lab.untag(tags.pop());
  tags.push(lab.tag(micro.oil, 'Micelle — oil trapped inside', { offset: [0, 0.074, 0], cls: 'dark' }));
  const m1 = new THREE.Object3D(); m1.position.copy(micro.mc[1]); micro.add(m1);
  tags.push(lab.tag(m1, 'Micelle (no oil)', { offset: [0, 0.05, 0], cls: 'dark' }));
  ui.observe('The soap molecules arrange themselves into a ball called a <b>micelle</b>: the hydrocarbon <b>tails stick into the oil droplet</b> and the <b>ionic heads face outwards</b> into the water.', { icon: '🔴', highlight: true });
  ui.observe('Even without oil, soap molecules in water cluster into micelles with their tails hidden inside, away from the water.', { icon: '⚪' });

  /* ------------------------------------------- 7. rinse */
  ui.step(6, 'Tap the blue <b>water-flow arrow</b> to rinse with water.', { sub: 'This is what happens when you rinse soapy clothes.' });
  micro.arrow.visible = true; lab.pickable(micro.arrow, 'Rinse with water');
  const tArrow = lab.tag(micro.arrow, 'Rinse', { offset: [0, 0.028, 0], cls: 'dark' });
  await lab.waitClick(micro.arrow);
  lab.untag(tArrow); micro.arrow.visible = false; lab.unpickable(micro.arrow);
  lab.sfx('pour');
  lab.tween(micro.state, { flow: 1, duration: 0.8 }).catch(() => {});
  tags.forEach((t) => lab.untag(t));
  const tl = lab.timeline({ paused: true });
  micro.mc.forEach((c, i) => {
    tl.to(c, { x: c.x + 0.62, duration: 4, ease: 'power1.in' }, i * 0.15);
    tl.to(c, { y: c.y + (i % 2 ? -0.02 : 0.025), duration: 2, ease: 'sine.inOut', yoyo: true, repeat: 1 }, i * 0.15);
  });
  await lab.play(tl);
  ui.observe('The outside of each micelle is ionic, so the micelles stay dispersed in water and do not clump together. Rinsing <b>washes the micelles — and the oily dirt trapped inside them — away</b>.', { icon: '🌊', highlight: true });
  await lab.wait(0.8);

  /* back to the bench */
  await lab.tween(flash, { opacity: 1, duration: 0.35 });
  micro.visible = false; micro.state.flow = 0;
  ctl.maxDistance = maxD;
  lab.camera.position.set(A.position.x + 0.02, 0.08, 0.18); ctl.target.set(A.position.x, 0.05, -0.01); ctl.update();
  ctl.minDistance = minD;
  ui.clearReadout('mag');
  lab.tween(flash, { opacity: 0, duration: 0.6 }).then(() => flash.remove()).catch(() => {});
  await lab.home(1.4);

  await ui.finish({
    equation: 'Soap: CH₃(CH₂)₁₆COO⁻ Na⁺ <small>(sodium stearate)</small><br><small>ionic head ⟶ in water  ·  hydrocarbon tail ⟶ in oil</small>',
    conclusion: 'Oil and water do not mix; shaken without soap the oil quickly separates again. With soap, the oil stays dispersed as an <b>emulsion</b>. Soap molecules have an ionic (hydrophilic) end and a long hydrocarbon (hydrophobic) tail, so they form <b>micelles</b> with the tails buried in the oily dirt and the heads in the water. The micelles stay suspended and are washed away by rinsing — this is the <b>cleansing action of soap</b>.',
    quiz: [
      { q: 'In a micelle around an oil droplet, where are the hydrocarbon tails of the soap molecules?', options: ['Pointing out into the water', 'Inside the oil droplet', 'Attached to the test tube', 'Dissolved in the air'], answer: 1, explain: 'The hydrophobic tails dissolve in the oil at the centre; the ionic heads face the water.' },
      { q: 'Why did the oil separate quickly in test tube B?', options: ['B had no soap, so nothing kept the oil droplets apart', 'B was shaken too hard', 'Oil reacts with water', 'B had more water'], answer: 0, explain: 'Without soap the oil droplets rise and merge back into a layer because oil and water do not mix.' },
      { q: 'Why do micelles not clump together and settle?', options: ['They are very heavy', 'Their outer ionic ends repel each other and are attracted to water', 'They dissolve the test tube', 'They contain air bubbles'], answer: 1, explain: 'The charged heads on the surface of every micelle keep them dispersed in water, so the dirt can be rinsed away.' },
    ],
  });
}
