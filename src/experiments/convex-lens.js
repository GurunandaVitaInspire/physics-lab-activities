// Activity 9.8 — Images formed by a convex lens (f = 15 cm) for different object positions.
// Physics (NCERT sign convention, light travels +x): 1/v − 1/u = 1/f, m = h′/h = v/u. Object on the left ⇒ u < 0.
import * as THREE from 'three';
import { saddle, candle, thinLens } from '../engine/apparatus/optics.js';
import { RayBundle } from '../engine/effects.js';
import { opticalBench2, liveScreen, candleSprite, outdoorSprite, windowView, freeCam, CANDLE_ANCHOR, CANDLE_SPRITE_H } from '../engine/apparatus/optics2.js';

export const config = { camera: { pos: [0.08, 0.42, 0.66], target: [0.08, 0.1, 0.0] }, benchWidth: 2.0 };

export const steps = [
  'Object at infinity (a distant tree)',
  'Candle beyond 2F₁',
  'Candle at 2F₁',
  'Candle between F₁ and 2F₁',
  'Candle at F₁',
  'Candle between F₁ and the lens',
];

const F = 15;             // focal length, cm
const LENS_CM = 40;       // lens sits on the 40 cm mark of the bench
const FLAME_H = 0.03;     // m
const OBJ_DY = 0.012;     // flame centre above the principal axis, m
const AP = 8;             // lens aperture (diameter), cm
const CARD = 0.12;

export default async function run({ lab, ui }) {
  /* ------------------------------------------------------------ bench */
  const bench = lab.add(opticalBench2({ length: 1.0, cx: 0.1 }));
  const Y0 = bench.topY + 0.1;
  lab.add(windowView());

  const lSad = lab.add(saddle({ height: 0.1 }), [bench.xAt(LENS_CM), bench.topY, 0]);
  const lens = thinLens({ r: 0.04, kind: 'convex' }); lSad.mount.add(lens);
  if (lens.lens.material.isMeshPhysicalMaterial) lens.lens.material.thickness = 0.009; // shared material assumes 1.2 m thickness
  lab.pickable(lens, 'Convex lens (f = 15 cm)');
  const lensX = bench.xAt(LENS_CM);

  const cSad = lab.add(saddle({ height: 0.02 }), [bench.xAt(12), bench.topY, 0]);
  const plat = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.004, 24), new THREE.MeshStandardMaterial({ color: 0x3f3f46, roughness: 0.5, metalness: 0.6 }));
  cSad.mount.add(plat);
  const cnd = candle({ h: 0.07 });
  cnd.position.y = (Y0 + OBJ_DY) - (bench.topY + 0.02) - cnd.flameCenterY;
  cSad.mount.add(cnd); cnd.flame.on = false; cSad.visible = false;

  const sSad = lab.add(saddle({ height: Y0 - bench.topY - CARD / 2 - 0.004 }), [bench.xAt(80), bench.topY, 0]);
  const screen = liveScreen({ w: CARD, h: CARD });
  screen.position.set(0, CARD / 2 + 0.004, 0); screen.rotation.y = -Math.PI / 2 + 0.35; sSad.mount.add(screen);
  lab.pickable(sSad, 'Screen — drag along the bench');

  const flameImg = candleSprite(), treeImg = outdoorSprite();

  const marker = (cm, text, color) => {
    const m = new THREE.Mesh(new THREE.ConeGeometry(0.005, 0.014, 12), new THREE.MeshStandardMaterial({ color, roughness: 0.4 }));
    m.rotation.x = Math.PI; m.position.set(bench.xAt(cm), bench.topY + 0.012, 0.055); m.visible = false; lab.add(m);
    m.show = () => { m.visible = true; lab.tag(m, text, { offset: [0, 0.02, 0], cls: 'mono' }); };
    return m;
  };
  const marks = [marker(LENS_CM - F, 'F₁', 0xf59e0b), marker(LENS_CM - 2 * F, '2F₁', 0xef4444), marker(LENS_CM + F, 'F₂', 0xf59e0b), marker(LENS_CM + 2 * F, '2F₂', 0xef4444)];

  const rays = new RayBundle({ width: 0.0009, intensity: 2.4 }); lab.scene.add(rays);
  let showRays = false;

  // Virtual image seen through the lens from the screen side (painted on the lens disc)
  const vc = document.createElement('canvas'); vc.width = 256; vc.height = 256;
  const vTex = new THREE.CanvasTexture(vc); vTex.colorSpace = THREE.SRGBColorSpace;
  const virt = new THREE.Mesh(new THREE.CircleGeometry(0.039, 48), new THREE.MeshBasicMaterial({ map: vTex, transparent: true, depthWrite: false, opacity: 0, toneMapped: false }));
  virt.rotation.y = Math.PI / 2; virt.position.x = 0.0075; virt.renderOrder = 12; lens.add(virt);

  /* ------------------------------------------------------------ optics */
  let mode = 'far';
  const u = () => LENS_CM - bench.cmAt(cSad.position.x);       // object distance (magnitude), cm
  const sDist = () => bench.cmAt(sSad.position.x) - LENS_CM;   // screen distance from lens, cm
  const st = { v: F, m: 0, defocus: 99, sharp: false };

  function compute() {
    let v, m;
    if (mode === 'far') { v = F; m = 0; }
    else {
      const U = -u();                       // NCERT: object on the left ⇒ u negative
      const inv = 1 / F + 1 / U;            // 1/v = 1/f + 1/u
      v = Math.abs(inv) < 1e-4 ? Infinity : 1 / inv;
      m = v / U;
    }
    st.v = v; st.m = m;
    screen.clear();
    if (!Number.isFinite(v) || v < 0) {
      st.defocus = 99; st.sharp = false;
      if (mode !== 'far') screen.disc({ r: 0.05, color: 'rgba(255,214,150,1)', alpha: 0.18, blur: 14, soft: 0.8 });
      screen.commit(); return;
    }
    const ds = sDist(), defocus = Math.abs(ds - v); st.defocus = defocus;
    const coc = (AP * defocus) / v / 100;  // blur circle on the card, m
    const blur = Math.min(40, (coc * screen.px) / 2);
    const I = new THREE.Vector3(lensX + v / 100, Y0 + (mode === 'far' ? 0 : m * OBJ_DY), 0);
    screen.updateWorldMatrix(true, false);
    const c = screen.projectAlong(I, new THREE.Vector3(1, 0, 0));
    if (mode === 'far') {
      const w = 0.042, bright = 1 / (1 + (coc / 0.01) ** 2);
      screen.sprite(treeImg, { x: c.x, y: c.y, h: (w * 3) / 4 + coc * 0.5, w: w + coc * 0.5, blur, alpha: 0.35 + 0.55 * bright, rot180: true });
    } else {
      const hImg = FLAME_H * Math.abs(m);
      const bright = 1 / (1 + (coc / Math.max(hImg, 0.004)) ** 2 * 0.6);
      screen.sprite(flameImg, { x: c.x, y: c.y, h: CANDLE_SPRITE_H * Math.abs(m) + coc * 0.6, blur, alpha: Math.max(0.12, bright), rot180: true, anchor: CANDLE_ANCHOR });
    }
    screen.commit();
    st.sharp = defocus <= 0.75;
  }

  function drawRays() {
    if (!showRays) { rays.draw([]); return; }
    const L = [];
    const rim = [0, 1, 2, 3, 4, 5].map((k) => { const a = (k / 6) * Math.PI * 2; return new THREE.Vector3(lensX, Y0 + Math.cos(a) * 0.03, Math.sin(a) * 0.03); });
    const sx = sSad.position.x;
    if (mode === 'far') {
      const f2 = new THREE.Vector3(lensX + F / 100, Y0, 0);
      rim.forEach((p) => { const end = f2.clone().add(f2.clone().sub(p).multiplyScalar(Math.max(0, (sx - f2.x) / (f2.x - lensX)))); L.push({ pts: [new THREE.Vector3(lensX - 0.45, p.y, p.z), p, f2, end], color: 0xfff3c4, intensity: 2 }); });
    } else {
      const O = new THREE.Vector3(cSad.position.x, Y0 + OBJ_DY, 0);
      if (Number.isFinite(st.v) && st.v > 0) {
        const I = new THREE.Vector3(lensX + st.v / 100, Y0 + st.m * OBJ_DY, 0);
        rim.forEach((p) => { const k = Math.max(0, (sx - I.x) / (I.x - lensX)); L.push({ pts: [O, p, I, I.clone().add(I.clone().sub(p).multiplyScalar(k))], color: 0xffb347, intensity: 2.2 }); });
      } else if (Number.isFinite(st.v)) {
        const I = new THREE.Vector3(lensX + st.v / 100, Y0 + st.m * OBJ_DY, 0);
        rim.forEach((p) => { const d = p.clone().sub(I).normalize(); L.push({ pts: [O, p, p.clone().addScaledVector(d, 0.35)], color: 0xffb347, intensity: 2.2 }); L.push({ pts: [I, p], color: 0xffb347, intensity: 0.8, opacity: 0.3 }); });
      } else {
        rim.forEach((p) => L.push({ pts: [O, p, new THREE.Vector3(p.x + 0.55, p.y, p.z)], color: 0xffb347, intensity: 2.2 }));
      }
    }
    rays.draw(L);
  }

  function readouts() {
    if (mode !== 'far') ui.readout('u', 'Object distance u', (-u()).toFixed(1), { unit: 'cm', color: '#f59e0b' });
    ui.readout('s', 'Screen from lens', `+${sDist().toFixed(1)}`, { unit: 'cm', color: '#38bdf8' });
    const q = st.defocus <= 0.75 ? 'Sharp ✓' : st.defocus < 3 ? 'Almost…' : st.defocus < 99 ? 'Blurred' : 'No image';
    ui.readout('q', 'Image on screen', q, { color: st.defocus <= 0.75 ? '#22c55e' : '#94a3b8' });
  }
  lab.onUpdate(() => { compute(); drawRays(); readouts(); });

  lab.slider(sSad, { axis: 'x', min: bench.xAt(LENS_CM + 3), max: bench.xAt(98), step: 0.0025, label: 'Screen — drag along the bench' });
  let candleSlider = null;
  const enableCandle = () => { candleSlider ||= lab.slider(cSad, { axis: 'x', min: bench.xAt(2), max: bench.xAt(LENS_CM - 4), step: 0.0025, label: 'Candle — drag along the bench' }); };
  const slideTo = (sad, cm) => { sad.userData.moving = true; return lab.tween(sad.position, { x: bench.xAt(cm), duration: 1.2, ease: 'power2.inOut', onComplete: () => { sad.userData.moving = false; } }); };
  const busy = () => !!lab.drag || cSad.userData.moving || sSad.userData.moving;
  // lab.waitUntil fires `auto` even when the condition is already met, so only act if it is still needed
  const until = (cond, act) => lab.waitUntil(cond, { auto: () => { if (!cond()) act(); } });

  ui.control({ type: 'toggle', label: 'Show light rays', value: false, onChange: (v) => { showRays = v; } });
  const table = ui.table(['Candle position', 'u (cm)', 'v (cm)', 'm = v/u', 'Image']);

  await ui.ready();

  /* ------------------------------------------- 1. object at infinity */
  ui.step(0, 'Tap the <b>convex lens</b> to point it at the tree outside the window.', { sub: 'Never look at the Sun through a lens — it can damage your eyes.' });
  await lab.waitClick(lens);
  lab.dimLights(0.45).catch(() => {});
  showRays = true; lab.sfx('whoosh');
  ui.instruct('Light from the distant tree passes through the lens. Drag the <b>screen</b> along the bench until a <b>sharp picture of the tree</b> appears on it.', { sub: 'Watch the “Image on screen” meter.' });
  await lab.focus({ pos: [-0.05, 0.24, 0.5], target: [0.22, 0.12, 0.0] }, 1.4);
  await until(() => st.sharp && !busy(), () => slideTo(sSad, LENS_CM + F));
  lab.sfx('success');
  await lab.focus({ pos: [sSad.position.x - 0.14, Y0 + 0.03, 0.17], target: [sSad.position.x, Y0, 0] }, 1.2);
  table.addRow(['At infinity (tree)', '−∞', `+${sDist().toFixed(1)}`, '→ 0', 'Real, inverted, highly diminished (at F₂)']);
  ui.observe(`A tiny, sharp, <b>upside-down</b> picture of the tree forms ${sDist().toFixed(1)} cm behind the lens. Parallel rays from a distant object meet at the <b>principal focus F₂</b>, so f = +15 cm.`, { icon: '🌳', highlight: true });
  await lab.wait(1.5);
  marks.forEach((m) => m.show()); showRays = false;

  /* -------------------------------------------- candle steps */
  mode = 'candle'; cSad.visible = true; cnd.flame.on = true;
  ui.instruct('Your teacher darkens the room and lights a candle on the left of the lens.');
  await lab.dimLights(0.2); enableCandle(); lab.pickable(cSad, 'Candle — drag along the bench');
  await lab.home(1.2);

  async function realStep(i, text, inRange, autoCm, label, obs, extraSub = '') {
    ui.step(i, text, { sub: `Drag the candle along the bench (read u on the meter). Then move the screen to focus the flame. ${extraSub}` });
    await until(() => inRange(u()) && !busy(), () => slideTo(cSad, LENS_CM - autoCm));
    lab.sfx('drop');
    ui.instruct(`Candle at u = <b>−${u().toFixed(1)} cm</b>. Now slide the <b>screen</b> until the flame’s image is sharp.`);
    await until(() => st.sharp && !busy(), () => slideTo(sSad, LENS_CM + Math.round(st.v * 10) / 10));
    lab.sfx('success');
    const mm = st.m, size = Math.abs(Math.abs(mm) - 1) < 0.06 ? 'same size' : Math.abs(mm) < 1 ? 'diminished' : 'enlarged';
    const vv = sDist();
    table.addRow([label, `−${u().toFixed(1)}`, `+${vv.toFixed(1)}`, (vv / -u()).toFixed(2), `Real, inverted, ${size}`]);
    await lab.focus({ pos: [sSad.position.x - 0.13, Y0 + 0.04, 0.2], target: [sSad.position.x, Y0, 0] }, 1.1);
    ui.observe(obs, { icon: '🕯️', highlight: true });
    await lab.wait(1.5);
    await lab.home(1);
  }

  await realStep(1, 'Place the <b>candle beyond 2F₁</b> — more than 30 cm from the lens.', (d) => d > 31 && d <= 38, 36, 'Beyond 2F₁',
    'The image forms <b>between F₂ and 2F₂</b> on the other side. It is <b>real, inverted and diminished</b>.');
  await realStep(2, 'Now place the candle exactly <b>at 2F₁</b> (30 cm from the lens).', (d) => Math.abs(d - 30) <= 0.5, 30, 'At 2F₁',
    'The image forms <b>at 2F₂</b> (30 cm behind the lens). It is <b>real, inverted and the same size</b> as the flame.');

  ui.step(3, 'Next the candle goes between F₁ and 2F₁.');
  await ui.predict({ q: 'With the candle between F₁ and 2F₁, the image on the screen will be…', options: ['smaller than the flame', 'the same size', 'larger than the flame', 'there will be no image'], answer: 2, explain: 'The image forms beyond 2F₂ and is enlarged — this is how a projector works.' });
  let warned = false;
  const tooNear = lab.onUpdate(() => { if (!warned && !busy() && u() > 15.5 && u() < 20.5) { warned = true; ui.toast('The image is now beyond the end of the bench — keep the candle 21–29 cm from the lens.', 'info'); } });
  await realStep(3, 'Place the candle <b>between F₁ and 2F₁</b>, about 21–29 cm from the lens.', (d) => d >= 21 && d <= 29, 22.5, 'Between F₁ and 2F₁',
    'The image forms <b>beyond 2F₂</b>, far from the lens. It is <b>real, inverted and enlarged</b>.');
  tooNear();

  /* ------------------------------------------------------ 5. at F1 */
  ui.step(4, 'Place the candle exactly <b>at F₁</b> (15 cm from the lens). Then look for its image with the screen.');
  await until(() => Math.abs(u() - F) <= 0.5 && !busy(), () => slideTo(cSad, LENS_CM - F));
  showRays = true;
  ui.instruct('Move the screen all along the bench. Is there a sharp image anywhere?', { sub: '“Show light rays” is on so you can see why.' });
  let gaveUp = false;
  const b = ui.control({ type: 'button', label: 'No sharp image anywhere', primary: true, onClick: () => { gaveUp = true; } });
  await lab.waitUntil(() => gaveUp, { auto: () => { slideTo(sSad, 95).then(() => { gaveUp = true; }); } });
  b.remove();
  table.addRow(['At F₁', `−${u().toFixed(1)}`, '∞', '∞', 'Real, inverted, highly enlarged (at infinity)']);
  ui.observe('The refracted rays come out <b>parallel</b> to each other, so they never meet — the image is at <b>infinity</b>. Only a broad patch of light reaches the screen.', { icon: '♾️', highlight: true });
  await lab.wait(1); showRays = false;

  /* ---------------------------------------------- 6. between F1 and O */
  ui.step(5, 'Place the candle <b>between F₁ and the lens</b> (closer than 15 cm).');
  await until(() => u() < 14 && u() > 5 && !busy(), () => slideTo(cSad, LENS_CM - 10));
  ui.instruct('No image forms on the screen at any position. Tap the <b>screen</b> to take it off the bench.');
  await lab.waitClick(sSad);
  await lab.carry(sSad, [bench.xAt(90), 0, 0.2], { lift: 0.06, duration: 1.1 });
  ui.instruct('Now tap the <b>lens</b> and look through it from the right-hand side, towards the candle.');
  await lab.waitClick(lens);
  const U = -u(), v = 1 / (1 / F + 1 / U), m = v / U;     // v < 0: virtual image on the candle side
  const D = 22;                                           // eye 22 cm to the right of the lens
  const k = D / (D + Math.abs(v));                        // projection of the image onto the lens plane
  const g = vc.getContext('2d'); g.clearRect(0, 0, 256, 256);
  g.save(); g.beginPath(); g.arc(128, 128, 126, 0, Math.PI * 2); g.clip();
  // what the eye sees through the magnifier: the dark room, magnified and slightly blurred, lit by the candle
  const bgG = g.createRadialGradient(128, 150, 10, 128, 140, 150);
  bgG.addColorStop(0, '#5a3f22'); bgG.addColorStop(0.5, '#2a1e14'); bgG.addColorStop(1, '#100c09');
  g.fillStyle = bgG; g.fillRect(0, 0, 256, 256);
  g.globalCompositeOperation = 'lighter';
  const ppm = 256 / 0.078, hh = CANDLE_SPRITE_H * m * k * ppm, ww = (hh * flameImg.width) / flameImg.height;
  const cy = 128 - m * OBJ_DY * k * ppm;
  g.drawImage(flameImg, 128 - ww * CANDLE_ANCHOR[0], cy - hh * CANDLE_ANCHOR[1], ww, hh);
  g.restore(); vTex.needsUpdate = true;
  const restore = freeCam(lab);
  await lab.focus({ pos: [lensX + D / 100, Y0 + 0.006, 0.0], target: [lensX, Y0 + 0.004, 0] }, 1.6);
  lab.tween(virt.material, { opacity: 1, duration: 1.2 }).catch(() => {});
  await lab.wait(2);
  table.addRow(['Between F₁ and O', `−${u().toFixed(1)}`, `${v.toFixed(1)} (same side)`, `+${m.toFixed(2)}`, 'Virtual, erect, enlarged']);
  ui.observe(`Through the lens you see a large, <b>upright</b> flame. The image is <b>virtual, erect and enlarged</b> (v = ${v.toFixed(0)} cm, m = +${m.toFixed(1)}) on the same side as the candle — the lens is acting as a <b>magnifying glass</b>.`, { icon: '🔍', highlight: true });
  await lab.wait(2);
  lab.tween(virt.material, { opacity: 0, duration: 0.6 }).catch(() => {});
  await lab.home(1.2);
  restore();
  ui.clearControls();

  await ui.finish({
    equation: '1/v − 1/u = 1/f &nbsp;·&nbsp; m = v/u &nbsp;·&nbsp; f = +15 cm',
    conclusion: 'A convex lens forms <b>real, inverted</b> images on the other side of the lens whenever the object is beyond F₁; as the object moves closer to F₁ the image moves farther away and grows. With the object at F₁ the image is at infinity. Between F₁ and the lens the image is <b>virtual, erect and enlarged</b> — which is why a convex lens is used as a magnifying glass.',
    quiz: [
      { q: 'An object is 30 cm in front of a convex lens of focal length 15 cm. Where is the image?', options: ['15 cm behind the lens', '30 cm behind the lens', '60 cm behind the lens', '30 cm in front of the lens'], answer: 1, explain: '1/v = 1/f + 1/u = 1/15 − 1/30 = 1/30, so v = +30 cm (at 2F₂, same size, inverted).' },
      { q: 'For a convex lens the magnification is −0.5. The image is…', options: ['virtual and erect', 'real, inverted and half the size', 'real, erect and enlarged', 'at infinity'], answer: 1, explain: 'A negative m means a real, inverted image; |m| = 0.5 means half the size.' },
      { q: 'To use a convex lens as a magnifying glass, the object must be placed…', options: ['beyond 2F₁', 'at 2F₁', 'between F₁ and 2F₁', 'between F₁ and the lens'], answer: 3, explain: 'Only between F₁ and the optical centre does the lens give a virtual, erect, enlarged image.' },
    ],
  });
}
