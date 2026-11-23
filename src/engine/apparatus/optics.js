// Optics apparatus: optical bench with metre scale, candle, mirror/lens holders, paper screen with a live image.
import * as THREE from 'three';
import { wood, metal, chrome, castIron, mirrorMat, opticalGlass, paper, plastic } from '../materials.js';
import { rulerTexture, canvasTexture } from '../textures.js';
import { Flame } from '../effects.js';

/**
 * Optical bench: a wooden bed with a metre scale along +x.
 * bench.xAt(cm) -> world-local x of a scale reading. Readings increase towards -x from `zeroX` (the mirror/lens end)
 * when `reverse` is true, which matches how students measure distance from the mirror.
 */
export function opticalBench({ length = 0.8, zeroX = 0.36, reverse = true } = {}) {
  const g = new THREE.Group(); g.name = 'Optical bench';
  const bed = new THREE.Mesh(new THREE.BoxGeometry(length + 0.06, 0.03, 0.12), wood({ base: '#7b4a26', key: 'benchbed' }));
  bed.position.set(zeroX - length / 2, 0.015, 0); g.add(bed);
  const cm = Math.round(length * 100);
  const scale = new THREE.Mesh(new THREE.PlaneGeometry(length, 0.035), new THREE.MeshStandardMaterial({ map: rulerTexture({ cm, w: 4096, h: 180, fromRight: false }), roughness: 0.7 }));
  scale.rotation.x = -Math.PI / 2; scale.position.set(zeroX - length / 2, 0.0302, 0.038);
  if (reverse) scale.rotation.z = Math.PI; // 0 cm at the mirror end
  g.add(scale);
  for (const z of [-0.025, 0.012]) {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(length + 0.04, 0.006, 0.006), chrome()); rail.position.set(zeroX - length / 2, 0.033, z); g.add(rail);
  }
  for (const sx of [zeroX + 0.02, zeroX - length - 0.02]) {
    const foot = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.012, 0.16), castIron()); foot.position.set(sx, 0.006, 0); g.add(foot);
  }
  g.zeroX = zeroX; g.length = length; g.topY = 0.036;
  g.xAt = (cmReading) => zeroX - cmReading / 100;
  g.cmAt = (x) => (zeroX - x) * 100;
  return g;
}

/** Saddle (sliding upright) that sits on the bench; things are mounted on `saddle.mount` at `height`. */
export function saddle({ height = 0.12, z = 0 } = {}) {
  const g = new THREE.Group(); g.name = 'Upright';
  const base = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.016, 0.07), castIron()); base.position.y = 0.008; g.add(base);
  const pointer = new THREE.Mesh(new THREE.ConeGeometry(0.004, 0.01, 3), metal({ color: 0xd61f1f, roughness: 0.4, metalness: 0.2 }));
  pointer.rotation.x = Math.PI / 2; pointer.position.set(0, 0.004, 0.038); g.add(pointer);
  const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, height, 12), chrome()); rod.position.set(0, height / 2, z * 0); g.add(rod);
  g.mount = new THREE.Group(); g.mount.position.set(0, height, 0); g.add(g.mount);
  return g;
}

export function candle({ h = 0.07, r = 0.009 } = {}) {
  const g = new THREE.Group(); g.name = 'Candle';
  const wax = new THREE.MeshPhysicalMaterial({ color: 0xfdf6e3, roughness: 0.55, transmission: 0, sheen: 0.4, sheenColor: new THREE.Color(0xfff2cc) });
  const body = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 28), wax); body.position.y = h / 2; g.add(body);
  const drip = new THREE.Mesh(new THREE.TorusGeometry(r * 0.9, 0.0018, 8, 24), wax); drip.rotation.x = Math.PI / 2; drip.position.y = h - 0.001; g.add(drip);
  const wick = new THREE.Mesh(new THREE.CylinderGeometry(0.0008, 0.0008, 0.007, 6), new THREE.MeshStandardMaterial({ color: 0x111111 })); wick.position.y = h + 0.0035; g.add(wick);
  const flame = new Flame({ kind: 'candle', height: 0.03 }); flame.position.y = h + 0.003; g.add(flame);
  const holder = new THREE.Mesh(new THREE.CylinderGeometry(r * 1.8, r * 2.2, 0.008, 28), metal({ color: 0xb08d57, roughness: 0.35 })); holder.position.y = -0.004; g.add(holder);
  g.flame = flame; g.flameCenterY = h + 0.003 + 0.012; g.flameTipY = h + 0.033;
  return g;
}

/** Spherical mirror on a ring holder. Reflecting face points to -x. kind 'concave' | 'convex' */
export function sphericalMirror({ r = 0.04, kind = 'concave', depth = 0.004 } = {}) {
  const g = new THREE.Group(); g.name = kind === 'concave' ? 'Concave mirror' : 'Convex mirror';
  const sgn = kind === 'concave' ? 1 : -1;
  const pts = [];
  for (let i = 0; i <= 24; i++) { const rr = (i / 24) * r; pts.push(new THREE.Vector2(rr, sgn * depth * (rr / r) ** 2)); }
  const geo = new THREE.LatheGeometry(pts, 64);
  geo.rotateZ(Math.PI / 2); // lathe axis y -> -x : concave edges curl towards -x (the object side)
  const mat = mirrorMat(); mat.side = THREE.DoubleSide;
  const face = new THREE.Mesh(geo, mat); g.add(face);
  const back = new THREE.Mesh(new THREE.CylinderGeometry(r + 0.002, r + 0.002, 0.004, 48), plastic(0x1f2937, 0.5));
  back.rotation.z = Math.PI / 2; back.position.x = 0.004; g.add(back);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(r + 0.002, 0.0025, 10, 48), chrome()); ring.rotation.y = Math.PI / 2; ring.position.x = 0.002; g.add(ring);
  const fork = new THREE.Mesh(new THREE.BoxGeometry(0.006, r * 1.1, 0.004), chrome()); fork.position.set(0.006, -r * 0.6 - 0.004, 0); g.add(fork);
  g.face = face; g.radius = r;
  return g;
}

/** Thin lens (biconvex or biconcave) in a ring holder, optical axis along x. */
export function thinLens({ r = 0.04, kind = 'convex', thick = 0.009 } = {}) {
  const g = new THREE.Group(); g.name = kind === 'convex' ? 'Convex lens' : 'Concave lens';
  const half = (rr) => { const s = 1 - (rr / r) ** 2; return kind === 'convex' ? 0.0007 + (thick / 2) * s : 0.0009 + (thick / 2) * (1 - s); };
  const pts = [];
  for (let i = 0; i <= 24; i++) { const rr = (i / 24) * r; pts.push(new THREE.Vector2(rr, half(rr))); }
  for (let i = 24; i >= 0; i--) { const rr = (i / 24) * r; pts.push(new THREE.Vector2(rr, -half(rr))); }
  const geo = new THREE.LatheGeometry(pts, 64);
  geo.rotateZ(Math.PI / 2);
  const lens = new THREE.Mesh(geo, opticalGlass()); g.add(lens);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(r + 0.002, 0.0025, 10, 48), chrome()); ring.rotation.y = Math.PI / 2; g.add(ring);
  const fork = new THREE.Mesh(new THREE.BoxGeometry(0.004, r * 1.1, 0.004), chrome()); fork.position.set(0, -r * 0.6 - 0.004, 0); g.add(fork);
  g.lens = lens; g.radius = r;
  return g;
}

/**
 * White paper screen on a holder. The image of a bright object is painted onto it with blur that depends on focus.
 * screen.showImage({ dy, dz, height, blur, brightness, kind:'flame'|'spot', upright }) — offsets/height in metres on the card.
 * `face` is the side that receives light: '+x' (light arrives travelling towards -x, e.g. from a mirror at larger x) or '-x'.
 */
export function paperScreen({ w = 0.08, h = 0.08, face = '+x' } = {}) {
  const g = new THREE.Group(); g.name = 'Screen';
  const W = 256, H = 256;
  const base = document.createElement('canvas'); base.width = W; base.height = H;
  const glowC = document.createElement('canvas'); glowC.width = W; glowC.height = H;
  const bg = base.getContext('2d'), gg = glowC.getContext('2d');
  const paperFill = () => { bg.fillStyle = '#f7f5ee'; bg.fillRect(0, 0, W, H); for (let i = 0; i < 600; i++) { bg.fillStyle = `rgba(120,110,90,${Math.random() * 0.05})`; bg.fillRect(Math.random() * W, Math.random() * H, 2, 1); } };
  paperFill();
  const mapT = new THREE.CanvasTexture(base); mapT.colorSpace = THREE.SRGBColorSpace;
  const glowT = new THREE.CanvasTexture(glowC); glowT.colorSpace = THREE.SRGBColorSpace;
  const mat = new THREE.MeshStandardMaterial({ map: mapT, emissive: 0xffffff, emissiveMap: glowT, emissiveIntensity: 1.6, roughness: 0.95 });
  const P = paper(0xe9e5da);
  // BoxGeometry material order: +x, -x, +y, -y, +z, -z
  const card = new THREE.Mesh(new THREE.BoxGeometry(0.002, h, w), face === '+x' ? [mat, P, P, P, P, P] : [P, mat, P, P, P, P]);
  g.add(card);
  const frame = new THREE.Mesh(new THREE.BoxGeometry(0.004, h + 0.006, 0.004), metal({ color: 0x334155, roughness: 0.4 })); frame.position.set(0, 0, w / 2 + 0.002); g.add(frame);
  const frame2 = frame.clone(); frame2.position.z = -w / 2 - 0.002; g.add(frame2);
  const clip = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.01, 0.02), chrome()); clip.position.set(0, -h / 2 - 0.004, 0); g.add(clip);

  // Pre-render a flame sprite used for the image
  const flame = canvasTexture(128, 256, (c, cw, ch) => {
    const grd = c.createRadialGradient(cw / 2, ch * 0.62, 2, cw / 2, ch * 0.55, ch * 0.5);
    grd.addColorStop(0, 'rgba(255,252,230,1)'); grd.addColorStop(0.35, 'rgba(255,214,120,0.95)'); grd.addColorStop(0.7, 'rgba(255,140,40,0.6)'); grd.addColorStop(1, 'rgba(255,100,20,0)');
    c.fillStyle = grd; c.beginPath(); c.moveTo(cw / 2, ch * 0.04);
    c.bezierCurveTo(cw * 0.95, ch * 0.5, cw * 0.85, ch * 0.92, cw / 2, ch * 0.95);
    c.bezierCurveTo(cw * 0.15, ch * 0.92, cw * 0.05, ch * 0.5, cw / 2, ch * 0.04); c.fill();
  }, { key: 'flameImg' }).image;

  g.showImage = ({ dy = 0, dz = 0, height = 0.03, blur = 0, brightness = 1, kind = 'flame', upright = false, candleBody = true } = {}) => {
    gg.clearRect(0, 0, W, H); gg.fillStyle = '#000'; gg.fillRect(0, 0, W, H);
    // card coords: z across (u), y up (v). Canvas x maps to -z when the face looks at -x.
    const px = W / w;
    const cx = W / 2 + (face === '+x' ? -dz : dz) * px, cy = H / 2 - dy * px;
    const hh = Math.max(2, height * px), ww = hh * 0.5;
    gg.save(); gg.filter = blur > 0.3 ? `blur(${blur.toFixed(1)}px)` : 'none'; gg.globalAlpha = Math.min(1, brightness);
    gg.translate(cx, cy); if (!upright) gg.scale(1, -1);
    if (kind === 'spot') {
      const r = Math.max(1.5, hh / 2);
      const grd = gg.createRadialGradient(0, 0, 0, 0, 0, r); grd.addColorStop(0, 'rgba(255,255,240,1)'); grd.addColorStop(0.5, 'rgba(255,240,200,0.9)'); grd.addColorStop(1, 'rgba(255,220,150,0)');
      gg.fillStyle = grd; gg.beginPath(); gg.arc(0, 0, r, 0, Math.PI * 2); gg.fill();
    } else {
      gg.drawImage(flame, -ww / 2, -hh / 2, ww, hh);
      // the candle itself, faintly lit by its own flame, appears in the image too
      if (candleBody) { gg.globalAlpha = Math.min(1, brightness) * 0.28; gg.fillStyle = '#fff3d6'; gg.fillRect(-ww * 0.55, hh * 0.45, ww * 1.1, hh * 1.3); }
    }
    gg.restore();
    glowT.needsUpdate = true;
  };
  g.clearImage = () => { gg.fillStyle = '#000'; gg.fillRect(0, 0, W, H); glowT.needsUpdate = true; };
  g.clearImage();
  g.card = card; g.cardW = w; g.cardH = h;
  return g;
}
