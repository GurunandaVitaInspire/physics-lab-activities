// Per-student progress (stars per experiment) kept in this browser only.
const KEY = 'ssl.progress.v1';
export function loadProgress() { try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch { return {}; } }
export function saveProgress(id, stars) {
  try { const p = loadProgress(); p[id] = Math.max(p[id] || 0, stars); localStorage.setItem(KEY, JSON.stringify(p)); } catch { /* storage unavailable */ }
}
export function starsFor(id) { return loadProgress()[id] || 0; }
