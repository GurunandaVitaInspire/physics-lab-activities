// Physically-based materials shared by all apparatus.
import * as THREE from 'three';
import { woodTexture } from './textures.js';

export const quality = {
  // 'high' uses real transmission for liquids/lenses; 'low' falls back to alpha blending.
  level: (() => {
    try {
      const q = new URLSearchParams(location.search).get('q');
      if (q) return q;
      const mem = navigator.deviceMemory || 4;
      const cores = navigator.hardwareConcurrency || 4;
      const mobile = /Android|iPhone|iPad/i.test(navigator.userAgent);
      return (mem <= 2 || cores <= 2 || (mobile && mem <= 3)) ? 'low' : 'high';
    } catch { return 'high'; }
  })(),
};

/**
 * Laboratory borosilicate glass. Alpha rises at grazing angles (Fresnel), which is what
 * makes real glassware read as glass: clear in the middle, bright at the edges.
 */
export function glass({ tint = 0xffffff, opacity = 0.1, edge = 0.55, roughness = 0.03 } = {}) {
  const m = new THREE.MeshPhysicalMaterial({
    // Glass has almost no diffuse colour: a dark base keeps it from lighting up as a milky white film.
    color: new THREE.Color(tint).multiplyScalar(0.18), metalness: 0, roughness, transparent: true, opacity,
    clearcoat: 1, clearcoatRoughness: 0.02, ior: 1.5, specularIntensity: 1,
    envMapIntensity: 2.2, side: THREE.DoubleSide, depthWrite: false,
  });
  m.userData.isGlass = true;
  m.onBeforeCompile = (s) => {
    s.uniforms.uEdge = { value: edge };
    s.fragmentShader = s.fragmentShader
      .replace('void main() {', 'uniform float uEdge;\nvoid main() {')
      .replace('#include <opaque_fragment>', `#include <opaque_fragment>
        float fres = pow(1.0 - abs(dot(normalize(vViewPosition), normalize(normal))), 2.5);
        gl_FragColor.a = clamp(mix(gl_FragColor.a, uEdge, fres), 0.0, 1.0);
        gl_FragColor.rgb += vec3(0.03) * fres;`);
  };
  m.customProgramCacheKey = () => 'glass' + edge;
  return m;
}

/** Thick optical glass (lenses, prisms, slabs). */
export function opticalGlass({ tint = 0xe8f6ff } = {}) {
  if (quality.level === 'high') {
    return new THREE.MeshPhysicalMaterial({
      color: tint, metalness: 0, roughness: 0.02, transmission: 1, thickness: 0.02, ior: 1.52,
      clearcoat: 1, clearcoatRoughness: 0.01, envMapIntensity: 1.5, attenuationColor: new THREE.Color(0xd8f0ff), attenuationDistance: 0.5,
      specularIntensity: 1, side: THREE.DoubleSide,
    });
  }
  return glass({ tint, opacity: 0.25, edge: 0.9 });
}

/**
 * A liquid. `cloudy` 0 = clear solution, 1 = opaque suspension (milky lime water, precipitate).
 */
export function liquid(color = 0xdbeafe, { cloudy = 0, opacity } = {}) {
  const c = new THREE.Color(color);
  if (opacity === undefined) { const chroma = Math.max(c.r, c.g, c.b) - Math.min(c.r, c.g, c.b); opacity = THREE.MathUtils.lerp(0.14, 0.82, Math.min(1, chroma * 1.4)); }
  const m = new THREE.MeshPhysicalMaterial({
    color: c, roughness: 0.06, metalness: 0, transparent: true, opacity: THREE.MathUtils.lerp(opacity, 0.97, cloudy),
    ior: 1.33, clearcoat: 1, clearcoatRoughness: 0.05, envMapIntensity: 1.2, depthWrite: false,
    sheen: cloudy * 0.6, sheenColor: c,
  });
  m.userData.isLiquid = true; m.userData.baseOpacity = opacity;
  return m;
}

export function metal({ color = 0xb8bcc2, roughness = 0.28, metalness = 1 } = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness, envMapIntensity: 1.2 });
}
export const chrome = () => metal({ color: 0xe6e8ea, roughness: 0.12 });
export const brass = () => metal({ color: 0xc9a227, roughness: 0.3 });
export const copper = () => metal({ color: 0xc46a3a, roughness: 0.32 });
export const castIron = () => new THREE.MeshStandardMaterial({ color: 0x2b2e33, roughness: 0.6, metalness: 0.7 });

export function plastic(color = 0x222222, roughness = 0.45) {
  return new THREE.MeshPhysicalMaterial({ color, roughness, metalness: 0, clearcoat: 0.4, clearcoatRoughness: 0.4 });
}
export function rubber(color = 0x8a2b1b) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.85, metalness: 0 });
}
export function wood({ base, dark, key, repeat } = {}) {
  const map = woodTexture({ base, dark, key: key || 'wood' + (base || ''), repeat });
  return new THREE.MeshStandardMaterial({ map, roughness: 0.62, metalness: 0 });
}
export function paper(color = 0xf6f3ea) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.92, metalness: 0 });
}
export function powder(color = 0xffffff) {
  return new THREE.MeshStandardMaterial({ color, roughness: 1, metalness: 0 });
}
export function emissive(color = 0xffaa33, intensity = 3) {
  return new THREE.MeshStandardMaterial({ color: 0x000000, emissive: color, emissiveIntensity: intensity, roughness: 1 });
}
/** Glowing additive material for light rays and flames (works with bloom). */
export function glow(color = 0xff3333, intensity = 2.5, opacity = 1) {
  const c = new THREE.Color(color).multiplyScalar(intensity);
  return new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
}
export function mirrorMat() {
  return new THREE.MeshStandardMaterial({ color: 0xf2f4f7, metalness: 1, roughness: 0.03, envMapIntensity: 2 });
}
