// Activity 9.2 — Images formed by a concave mirror (f = 15 cm) for different object positions.
// Physics: 1/v + 1/u = 1/f in real-is-positive form: 1/di = 1/f - 1/do, m = -di/do.
import * as THREE from 'three';
import { opticalBench, saddle, candle, sphericalMirror, paperScreen } from '../engine/apparatus/optics.js';
import { RayBundle } from '../engine/effects.js';
import { canvasTexture } from '../engine/textures.js';

export const config = { camera: { pos: [-0.02, 0.44, 0.64], target: [-0.02, 0.08, -0.01] }, benchWidth: 2.0 };

export const steps = [
  'Object at infinity (the Sun)',
  'Candle beyond C',
  'Candle at C',
  'Candle between C and F',
  'Candle at F',
  'Candle between F and P',
];

const F = 15;            // focal length, cm
const FLAME_H = 0.03;    // flame height, m
const OBJ_DY = 0.012;    // flame centre above axis, m
const OBJ_DZ = -0.025;   // candle placed slightly off-axis (as in a real lab)
const CARD = { w: 0.12, h: 0.12, dy: -0.02, dz: 0.04 }; // screen card centre relative to axis

export default async function run({ lab, ui }) {
  /* ------------------------------------------------------------ bench */
  const bench = lab.add(opticalBench({ length: 0.8, zeroX: 0.36 }));
  const Y0 = bench.topY + 0.1; // principal axis height

  const mSad = lab.add(saddle({ height: 0.1 }), [bench.xAt(0), bench.topY, 0]);
  const mirror = sphericalMirror({ r: 0.04, kind: 'concave' }); mSad.mount.add(mirror);
  lab.pickable(mirror, 'Concave mirror (f = 15 cm)');

  const cSad = lab.add(saddle({ height: 0.02 }), [bench.xAt(8), bench.topY, 0]);
  const plat = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.004, 24), new THREE.MeshStandardMaterial({ color: 0x3f3f46, roughness: 0.5, metalness: 0.6 }));
  cSad.mount.add(plat);
  const cnd = candle({ h: 0.07 }); cnd.position.set(0, 0, OBJ_DZ);
  // put the flame centre at Y0 + OBJ_DY
  cnd.position.y = (Y0 + OBJ_DY) - (bench.topY + 0.02) - cnd.flameCenterY;
  cSad.mount.add(cnd); cnd.flame.on = false;
  cSad.visible = false;

  const sSad = lab.add(saddle({ height: Y0 + CARD.dy - bench.topY - 0.004 }), [bench.xAt(60), bench.topY, 0]);
  const screen = paperScreen({ w: CARD.w, h: CARD.h, face: '+x' });
  screen.position.set(0, 0.004, CARD.dz); screen.rotation.y = -0.25; sSad.mount.add(screen);
  lab.pickable(sSad, 'Screen — drag along the bench');

  // markers for F and C (revealed after step 1)
  const marker = (cm, text, color) => {
    const m = new THREE.Mesh(new THREE.ConeGeometry(0.005, 0.014, 12), new THREE.MeshStandardMaterial({ color, roughness: 0.4 }));
    m.rotation.x = Math.PI; m.position.set(bench.xAt(cm), bench.topY + 0.012, 0.055); m.visible = false; lab.add(m);
    m.tagObj = null; m.show = () => { m.visible = true; m.tagObj = lab.tag(m, text, { offset: [0, 0.02, 0], cls: 'mono' }); };
    return m;
  };
  const mF = marker(F, 'F (15 cm)', 0xf59e0b), mC = marker(2 * F, 'C (30 cm)', 0xef4444);

  const rays = new RayBundle({ width: 0.0009, intensity: 2.4 }); lab.scene.add(rays);
  let showRays = false;

  // Virtual image seen inside the mirror (only for object between F and P)
  const virtTex = canvasTexture(256, 256, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    g.save(); g.beginPath(); g.arc(w / 2, h / 2, w / 2, 0, Math.PI * 2); g.clip();
    const grd = g.createRadialGradient(w / 2, h * 0.4, 4, w / 2, h * 0.45, h * 0.5);
    grd.addColorStop(0, 'rgba(255,250,220,1)'); grd.addColorStop(0.4, 'rgba(255,200,90,.9)'); grd.addColorStop(1, 'rgba(255,120,30,0)');
    g.fillStyle = grd; g.beginPath(); g.moveTo(w / 2, h * 0.02); g.bezierCurveTo(w * 0.95, h * 0.45, w * 0.8, h * 0.85, w / 2, h * 0.9); g.bezierCurveTo(w * 0.2, h * 0.85, w * 0.05, h * 0.45, w / 2, h * 0.02); g.fill();
    g.fillStyle = 'rgba(255,246,225,.75)'; g.fillRect(w * 0.3, h * 0.88, w * 0.4, h * 0.2);
    g.restore();
  }, { key: 'virt' });
  const virt = new THREE.Mesh(new THREE.CircleGeometry(0.039, 48), new THREE.MeshBasicMaterial({ map: virtTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0 }));
  virt.rotation.y = -Math.PI / 2; virt.position.set(-0.0045, 0, 0); mirror.add(virt);

  /* ------------------------------------------------------------ optics */
  let mode = 'sun';
  const dist = (sad) => bench.cmAt(sad.position.x);
  const state = { di: F, m: 0, defocus: 99, sharp: false };
  const mirrorX = bench.xAt(0);

  function compute() {
    const ds = dist(sSad);
    let di, m, kind = 'flame';
    if (mode === 'sun') { di = F; m = 0; kind = 'spot'; }
    else {
      const d0 = dist(cSad);
      const inv = 1 / F - 1 / d0;
      di = Math.abs(inv) < 1e-4 ? Infinity : 1 / inv;
      m = -di / d0;
    }
    state.di = di; state.m = m;
    if (!Number.isFinite(di) || di < 0) {
      // No real image: the screen only gets a broad, faint patch of light
      state.defocus = 99; state.sharp = false;
      screen.showImage({ kind: 'spot', height: 0.1, blur: 18, brightness: mode === 'sun' ? 0 : 0.25 });
      return;
    }
    const defocus = Math.abs(ds - di); state.defocus = defocus;
    const A = 8; // mirror aperture, cm
    const coc = (A * defocus) / di / 100; // circle of confusion on the card, m
    const px = 256 / CARD.w;
    const hImg = mode === 'sun' ? 0.003 : FLAME_H * Math.abs(m);
    const dy = (mode === 'sun' ? 0 : m * OBJ_DY) - CARD.dy;
    const dz = (mode === 'sun' ? 0 : m * OBJ_DZ) - CARD.dz;
    const blurPx = Math.min(40, (coc * px) / 2);
    const bright = 1 / (1 + (coc / Math.max(hImg, 0.004)) ** 2 * 0.6);
    screen.showImage({ kind, dy, dz, height: hImg + coc * 0.6, blur: blurPx, brightness: Math.max(0.12, bright), upright: false });
    state.sharp = defocus <= 0.75;
  }

  function drawRays() {
    if (!showRays) { rays.draw([]); return; }
    const lines = [];
    const rimPts = [0, 1, 2, 3, 4, 5].map((k) => { const a = (k / 6) * Math.PI * 2; return new THREE.Vector3(mirrorX - 0.001, Y0 + Math.cos(a) * 0.03, Math.sin(a) * 0.03); });
    if (mode === 'sun') {
      const fp = new THREE.Vector3(bench.xAt(F), Y0, 0);
      rimPts.concat([new THREE.Vector3(mirrorX - 0.001, Y0, 0)]).forEach((p) => {
        lines.push({ pts: [new THREE.Vector3(-0.5, p.y, p.z), p, fp], color: 0xfff3c4, intensity: 2 });
      });
    } else {
      const O = new THREE.Vector3(cSad.position.x, Y0 + OBJ_DY, OBJ_DZ);
      if (Number.isFinite(state.di) && state.di > 0) {
        const I = new THREE.Vector3(bench.xAt(state.di), Y0 + state.m * OBJ_DY, state.m * OBJ_DZ);
        rimPts.forEach((p) => lines.push({ pts: [O, p, I], color: 0xffb347, intensity: 2.2 }));
      } else if (Number.isFinite(state.di)) {
        const I = new THREE.Vector3(bench.xAt(state.di), Y0 + state.m * OBJ_DY, state.m * OBJ_DZ); // behind mirror
        rimPts.forEach((p) => { const dir = p.clone().sub(I).normalize(); lines.push({ pts: [O, p, p.clone().addScaledVector(dir, 0.35)], color: 0xffb347, intensity: 2.2 }); lines.push({ pts: [p, I], color: 0xffb347, intensity: 0.8, opacity: 0.35 }); });
      } else {
        rimPts.forEach((p) => lines.push({ pts: [O, p, new THREE.Vector3(p.x - 0.6, p.y, p.z)], color: 0xffb347, intensity: 2.2 }));
      }
    }
    rays.draw(lines);
  }

  function readouts() {
    if (mode !== 'sun') ui.readout('u', 'Candle from mirror', dist(cSad).toFixed(1), { unit: 'cm', color: '#f59e0b' });
    ui.readout('s', 'Screen from mirror', dist(sSad).toFixed(1), { unit: 'cm', color: '#38bdf8' });
    const q = state.defocus <= 0.75 ? 'Sharp ✓' : state.defocus < 3 ? 'Almost…' : state.defocus < 99 ? 'Blurred' : 'No image';
    ui.readout('q', 'Image on screen', q, { color: state.defocus <= 0.75 ? '#22c55e' : '#94a3b8' });
  }
  lab.onUpdate(() => { compute(); drawRays(); readouts(); });

  const minX = bench.xAt(78), maxX = bench.xAt(4);
  lab.slider(sSad, { axis: 'x', min: minX, max: maxX, step: 0.005, label: 'Screen — drag along the bench' });
  let candleSlider = null;
  const enableCandle = () => { candleSlider ||= lab.slider(cSad, { axis: 'x', min: bench.xAt(75), max: bench.xAt(4), step: 0.005, label: 'Candle — drag along the bench' }); };
  const slideTo = (sad, cm) => {
    sad.userData.moving = true;
    return lab.tween(sad.position, { x: bench.xAt(cm), duration: 1.2, ease: 'power2.inOut', onComplete: () => { sad.userData.moving = false; } });
  };
  const dragging = () => !!lab.drag || cSad.userData.moving || sSad.userData.moving;

  ui.control({ type: 'toggle', label: 'Show light rays', value: false, onChange: (v) => { showRays = v; } });
  const table = ui.table(['Object position', 'u (cm)', 'v (cm)', 'Image']);

  await ui.ready();

  /* ------------------------------------------------- 1. object at infinity */
  ui.step(0, 'Tap the <b>concave mirror</b> to turn it towards the Sun shining through the window.');
  await lab.waitClick(mirror);
  showRays = true; lab.sfx('whoosh');
  ui.instruct('Sunlight is now falling on the mirror. Drag the <b>screen</b> along the bench until the bright spot is as small and sharp as possible.', { sub: 'Watch the "Image on screen" meter at the top right.' });
  await lab.focus({ pos: [0.32, 0.22, 0.38], target: [0.16, 0.11, 0.02] }, 1.4);
  await lab.waitUntil(() => state.sharp && !dragging(), { auto: () => slideTo(sSad, F) });
  lab.sfx('success');
  table.addRow(['At infinity (Sun)', '∞', dist(sSad).toFixed(1), 'Point-sized, real, inverted']);
  ui.observe('Sunlight converges to a tiny, very bright spot 15 cm from the mirror. This point is the <b>principal focus F</b>, so f = 15 cm and C (= 2f) is at 30 cm.', { icon: '☀️', highlight: true });
  mF.show(); mC.show(); showRays = false;

  /* -------------------------------------------- common: candle step */
  mode = 'candle'; cSad.visible = true; cnd.flame.on = true;
  ui.instruct('Your teacher dims the room lights so the candle’s image is easy to see.');
  await lab.dimLights(0.22); enableCandle(); lab.pickable(cSad, 'Candle — drag along the bench');
  await lab.home(1.2);

  async function realImageStep(i, text, inRange, autoCm, label, nature) {
    ui.step(i, text, { sub: 'Drag the candle stand along the bench. Then move the screen to focus the flame.' });
    await lab.waitUntil(() => inRange(dist(cSad)) && !dragging(), { auto: () => slideTo(cSad, autoCm) });
    lab.sfx('drop');
    ui.instruct(`Candle placed at <b>${dist(cSad).toFixed(1)} cm</b>. Now slide the <b>screen</b> until the flame’s image is sharp.`);
    await lab.waitUntil(() => state.sharp && !dragging(), { auto: () => slideTo(sSad, Math.round(state.di * 2) / 2) });
    lab.sfx('success');
    const sz = Math.abs(state.m);
    const size = Math.abs(sz - 1) < 0.08 ? 'same size' : sz < 1 ? 'diminished' : 'enlarged';
    table.addRow([label, dist(cSad).toFixed(1), dist(sSad).toFixed(1), `Real, inverted, ${size}`]);
    await lab.focus({ pos: [sSad.position.x + 0.16, Y0 + 0.05, 0.2], target: [sSad.position.x, Y0 - 0.01, CARD.dz] }, 1.1);
    ui.observe(nature, { icon: '🕯️', highlight: true });
    await lab.wait(1.5);
    await lab.home(1);
  }

  /* --------------------------------------------- 2. beyond C */
  await realImageStep(1, 'Place the <b>candle beyond C</b> — more than 30 cm from the mirror.', (d) => d > 32, 45, 'Beyond C',
    'Image is formed <b>between F and C</b>. It is <b>real, inverted and diminished</b> (smaller than the flame).');

  /* --------------------------------------------- 3. at C */
  await realImageStep(2, 'Now place the candle exactly <b>at C</b> (30 cm).', (d) => Math.abs(d - 30) <= 0.5, 30, 'At C',
    'Image is formed <b>at C</b> itself. It is <b>real, inverted and the same size</b> as the flame.');

  /* --------------------------------------------- 4. between C and F */
  ui.step(3, 'Next you will put the candle between C and F.');
  await ui.predict({ q: 'If the candle is between C and F, the image on the screen will be…', options: ['Smaller than the flame', 'The same size', 'Bigger than the flame', 'There will be no image'], answer: 2, explain: 'The image forms beyond C and is enlarged.' });
  await realImageStep(3, 'Place the candle <b>between C and F</b> (between 15 cm and 30 cm).', (d) => d > 16 && d < 29, 22, 'Between C and F',
    'Image is formed <b>beyond C</b>, far from the mirror. It is <b>real, inverted and enlarged</b>.');

  /* --------------------------------------------- 5. at F */
  ui.step(4, 'Place the candle exactly <b>at F</b> (15 cm). Then try to find the image with the screen.');
  await lab.waitUntil(() => Math.abs(dist(cSad) - F) <= 0.5 && !dragging(), { auto: () => slideTo(cSad, F) });
  ui.instruct('Move the screen all along the bench. Can you get a sharp image anywhere?', { sub: 'Turn on “Show light rays” to see why.' });
  showRays = true;
  let btnDone = false;
  const btn = ui.control({ type: 'button', label: 'I can’t get a sharp image', primary: true, onClick: () => { btnDone = true; } });
  await lab.waitUntil(() => btnDone, { auto: () => { btnDone = true; } });
  btn.remove();
  table.addRow(['At F', F.toFixed(1), '∞', 'Real, inverted, highly enlarged (at infinity)']);
  ui.observe('The reflected rays come out <b>parallel</b>, so they never meet — the image is formed <b>at infinity</b>. No sharp image appears on the screen.', { icon: '♾️', highlight: true });
  await lab.wait(1);
  showRays = false;

  /* --------------------------------------------- 6. between F and P */
  ui.step(5, 'Finally, place the candle <b>between F and P</b> (closer than 15 cm).');
  await lab.waitUntil(() => dist(cSad) < 14 && dist(cSad) > 4 && !dragging(), { auto: () => slideTo(cSad, 10) });
  ui.instruct('No image forms on the screen. <b>Tap the mirror</b> and look into it from behind the candle.');
  await lab.waitClick(mirror);
  const mx = mirrorX;
  await lab.focus({ pos: [cSad.position.x - 0.12, Y0 + 0.02, 0.07], target: [mx, Y0, 0] }, 1.6);
  lab.tween(virt.material, { opacity: 1, duration: 1.2 }).catch(() => {});
  await lab.wait(1.6);
  table.addRow(['Between F and P', dist(cSad).toFixed(1), `${Math.abs(state.di).toFixed(1)} (behind mirror)`, 'Virtual, erect, enlarged']);
  ui.observe('A large, <b>upright</b> image of the flame is seen <b>inside the mirror</b>, behind it. It is <b>virtual, erect and enlarged</b> — it cannot be caught on a screen.', { icon: '🪞', highlight: true });
  await lab.wait(2);
  await lab.home(1.2);
  lab.tween(virt.material, { opacity: 0, duration: 0.6 }).catch(() => {});
  ui.clearControls();

  await ui.finish({
    equation: '1/v + 1/u = 1/f &nbsp;·&nbsp; m = −v/u &nbsp;·&nbsp; f = 15 cm',
    conclusion: 'A concave mirror forms <b>real, inverted</b> images that can be caught on a screen when the object is beyond F; the image moves away and grows as the object comes closer to F. At F the image is at infinity. Between F and P the image is <b>virtual, erect and enlarged</b> — that is why concave mirrors are used as shaving and dentist’s mirrors.',
    quiz: [
      { q: 'Where must an object be placed to get a real image of the same size from a concave mirror?', options: ['At F', 'At C', 'Between F and P', 'At infinity'], answer: 1, explain: 'At C the image forms at C and is the same size.' },
      { q: 'A dentist uses a concave mirror to see an enlarged, upright image of a tooth. The tooth is…', options: ['Beyond C', 'At C', 'Between F and P', 'At F'], answer: 2, explain: 'Only between F and P is the image virtual, erect and enlarged.' },
      { q: 'Sunlight focused by a concave mirror makes a bright spot 15 cm away. The radius of curvature is…', options: ['7.5 cm', '15 cm', '30 cm', '45 cm'], answer: 2, explain: 'R = 2f = 30 cm.' },
    ],
  });
}
