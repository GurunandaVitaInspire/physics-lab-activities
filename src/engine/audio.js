// Synthesised sound effects (no audio files), ambient lab hum, and voice narration.
let ctx = null;
const state = { sound: load('ssl.sound', true), voice: load('ssl.voice', true) };
function load(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : v === '1'; } catch { return d; } }
function save(k, v) { try { localStorage.setItem(k, v ? '1' : '0'); } catch { /* storage unavailable */ } }

function ac() {
  if (!ctx) { try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch { return null; } }
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  return ctx;
}
function noiseBuffer(c, sec = 1) {
  const b = c.createBuffer(1, c.sampleRate * sec, c.sampleRate);
  const d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; return b;
}
function env(g, c, a = 0.005, peak = 0.3, d = 0.2, t0 = c.currentTime) {
  g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(peak, t0 + a); g.gain.exponentialRampToValueAtTime(0.0001, t0 + a + d);
}
function tone(freq, { type = 'sine', dur = 0.15, vol = 0.15, at = 0, slide } = {}) {
  const c = ac(); if (!c) return; const t0 = c.currentTime + at;
  const o = c.createOscillator(), g = c.createGain(); o.type = type; o.frequency.setValueAtTime(freq, t0);
  if (slide) o.frequency.exponentialRampToValueAtTime(slide, t0 + dur);
  env(g, c, 0.005, vol, dur, t0); o.connect(g).connect(c.destination); o.start(t0); o.stop(t0 + dur + 0.05);
}
function noise({ dur = 0.3, vol = 0.1, freq = 1200, q = 0.8, type = 'bandpass', at = 0 } = {}) {
  const c = ac(); if (!c) return; const t0 = c.currentTime + at;
  const s = c.createBufferSource(); s.buffer = noiseBuffer(c, dur + 0.1);
  const f = c.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
  const g = c.createGain(); env(g, c, 0.01, vol, dur, t0); s.connect(f).connect(g).connect(c.destination); s.start(t0); s.stop(t0 + dur + 0.1);
}

const sounds = {
  click: () => tone(880, { type: 'triangle', dur: 0.06, vol: 0.08 }),
  drop: () => { tone(420, { type: 'sine', dur: 0.08, vol: 0.12 }); tone(1600, { type: 'sine', dur: 0.12, vol: 0.05, at: 0.02 }); },
  glass: () => { tone(2400, { dur: 0.4, vol: 0.05 }); tone(3600, { dur: 0.3, vol: 0.03, at: 0.01 }); },
  pour: () => noise({ dur: 1.6, vol: 0.06, freq: 900, q: 0.6 }),
  fizz: () => { for (let i = 0; i < 10; i++) noise({ dur: 0.08, vol: 0.03, freq: 3000 + Math.random() * 3000, q: 4, at: i * 0.09 }); },
  pop: () => { noise({ dur: 0.12, vol: 0.35, freq: 600, q: 0.7, type: 'lowpass' }); tone(180, { dur: 0.15, vol: 0.25, slide: 60 }); },
  strike: () => { noise({ dur: 0.25, vol: 0.12, freq: 2500, q: 0.5 }); noise({ dur: 0.6, vol: 0.05, freq: 500, q: 0.5, at: 0.15 }); },
  whoosh: () => noise({ dur: 0.7, vol: 0.12, freq: 400, q: 0.4 }),
  hiss: () => noise({ dur: 1.2, vol: 0.05, freq: 5000, q: 0.5 }),
  switch: () => { tone(200, { type: 'square', dur: 0.03, vol: 0.06 }); noise({ dur: 0.04, vol: 0.1, freq: 3000 }); },
  success: () => { [523, 659, 784, 1047].forEach((f, i) => tone(f, { type: 'triangle', dur: 0.25, vol: 0.09, at: i * 0.09 })); },
  step: () => { tone(660, { type: 'sine', dur: 0.12, vol: 0.07 }); tone(990, { type: 'sine', dur: 0.18, vol: 0.06, at: 0.08 }); },
  wrong: () => { tone(220, { type: 'sawtooth', dur: 0.18, vol: 0.05 }); tone(180, { type: 'sawtooth', dur: 0.2, vol: 0.05, at: 0.12 }); },
  tick: () => tone(1500, { type: 'square', dur: 0.015, vol: 0.03 }),
  hum: () => tone(100, { type: 'sine', dur: 0.8, vol: 0.05 }),
};

export function sfx(name) { if (!state.sound) return; try { sounds[name]?.(); } catch { /* ignore */ } }
export function setSound(v) { state.sound = v; save('ssl.sound', v); if (!v) stopSpeech(); }
export function soundOn() { return state.sound; }
export function setVoice(v) { state.voice = v; save('ssl.voice', v); if (!v) stopSpeech(); }
export function voiceOn() { return state.voice; }
export function unlockAudio() { ac(); }

let voice = null;
function pickVoice() {
  if (voice || !('speechSynthesis' in window)) return voice;
  const vs = speechSynthesis.getVoices();
  voice = vs.find((v) => /en-IN/i.test(v.lang)) || vs.find((v) => /en-GB/i.test(v.lang)) || vs.find((v) => /^en/i.test(v.lang)) || null;
  return voice;
}
if ('speechSynthesis' in window) speechSynthesis.onvoiceschanged = () => { voice = null; pickVoice(); };

export function speak(text) {
  if (!state.voice || !state.sound || !('speechSynthesis' in window) || !text) return;
  try {
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text.replace(/<[^>]+>/g, '').replace(/→/g, 'gives'));
    const v = pickVoice(); if (v) u.voice = v;
    u.rate = 0.98; u.pitch = 1.02; u.volume = 0.9;
    speechSynthesis.speak(u);
  } catch { /* ignore */ }
}
export function stopSpeech() { try { speechSynthesis.cancel(); } catch { /* ignore */ } }
