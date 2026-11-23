// Live 3D establishing shot for the home page: a slowly drifting camera over a working bench.
import * as THREE from 'three';
import { Lab } from '../engine/Lab.js';
import { conicalFlask, bunsenBurner, tripod, beaker, testTube, testTubeStand, reagentBottle } from '../engine/apparatus/common.js';
import { glass, paper } from '../engine/materials.js';
import { RayBundle } from '../engine/effects.js';

export function buildHero(el) {
  const lab = new Lab(el, { room: 'dark', camera: { pos: [0.1, 0.3, 0.62], target: [0.05, 0.1, 0] } });
  lab.controls.enabled = false;
  lab.bloom.strength = 0.5; lab.bloom.threshold = 0.95; lab.bloom.radius = 0.3;
  lab.renderer.domElement.style.cursor = 'default';

  // Bunsen heating a flask of copper sulphate solution
  const burner = lab.add(bunsenBurner(), [-0.2, 0, 0.0]);
  burner.flame.on = true;
  const tri = lab.add(tripod({ h: 0.17 }), [-0.2, 0, 0.0]);
  const flask = lab.add(conicalFlask(), [-0.2, tri.topY, 0.0]);
  flask.setLiquidColor(0x1560c9, { opacity: 0.88 }); flask.setLevel(0.05);
  flask.addBubbles({ rate: 30, spread: 0.03, size: 0.0022, speed: 0.05 });

  // Beaker with yellow lead iodide precipitate settling
  const b = lab.add(beaker(), [0.09, 0, 0.13]); b.setLiquidColor(0xf2d04c, { cloudy: 0.3 }); b.setLevel(0.05);
  const p = b.addPrecipitate({ color: 0xffcc00, count: 500 }); p.form({ layerHeight: 0.006 });

  // Rack of coloured solutions
  const stand = lab.add(testTubeStand({ holes: 4 }), [0.02, 0, -0.14]);
  const cols = [0x7e22ce, 0x16a34a, 0xdc2626, 0x0284c7];
  stand.slots.forEach((s, i) => { const t = testTube({ level: 0.06 + i * 0.012 }); t.setLiquidColor(cols[i]); t.position.set(stand.position.x + s.x, 0.012, stand.position.z); lab.add(t); });
  lab.add(reagentBottle({ title: 'Copper sulphate', formula: 'CuSO₄', color: 0x1f6fd6, labelColor: '#1d4ed8' }), [-0.38, 0, -0.12]);
  lab.add(reagentBottle({ title: 'Hydrochloric acid', formula: 'HCl', sub: 'dilute', color: 0xeef6ff, labelColor: '#b91c1c', hazard: true }), [-0.31, 0, -0.17]);

  // Prism standing on the bench, splitting a white beam into a spectrum on a card
  const s = 0.06, H = 0.045;
  const tri2 = new THREE.Shape(); tri2.moveTo(-s / 2, 0); tri2.lineTo(s / 2, 0); tri2.lineTo(0, -s * 0.866); tri2.closePath();
  const geo = new THREE.ExtrudeGeometry(tri2, { depth: H, bevelEnabled: false }); geo.rotateX(-Math.PI / 2);
  const prism = new THREE.Mesh(geo, glass({ opacity: 0.22, edge: 0.8, tint: 0xdff3ff })); prism.position.set(0.22, 0, 0.05); prism.rotation.y = 0.2; lab.add(prism);
  const card = new THREE.Mesh(new THREE.BoxGeometry(0.003, 0.09, 0.14), paper(0xf5f3ec)); card.position.set(0.42, 0.045, 0.16); card.rotation.y = -0.5; lab.add(card);
  const rays = new RayBundle({ width: 0.0008, intensity: 1.1 }); lab.scene.add(rays);
  const y = 0.022;
  const entry = new THREE.Vector3(0.205, y, 0.035), exit = new THREE.Vector3(0.24, y, 0.045);
  const spectrum = [0xff1f1f, 0xff7a00, 0xffe600, 0x22dd44, 0x1f8bff, 0x3b3bff, 0x9b30ff];
  const lines = [{ pts: [new THREE.Vector3(0.02, y, -0.06), entry], color: 0xffffff, intensity: 1.2 }, { pts: [entry, exit], color: 0xffffff, intensity: 0.6, opacity: 0.4 }];
  spectrum.forEach((c, i) => lines.push({ pts: [exit, new THREE.Vector3(0.405 - i * 0.004, y + 0.004 * (i - 3), 0.115 + i * 0.012)], color: c, intensity: 1.15 }));
  rays.draw(lines);

  // Slow camera drift (motion lives in the world, not in fades)
  lab.onUpdate((dt, t) => {
    const a = -0.15 + Math.sin(t * 0.1) * 0.28;
    lab.camera.position.set(-0.02 + Math.sin(a) * 0.8, 0.36 + Math.sin(t * 0.17) * 0.02, Math.cos(a) * 0.8);
    lab.controls.target.set(-0.06, 0.1, 0);
  });
  return lab;
}
