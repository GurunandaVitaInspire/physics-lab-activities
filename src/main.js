import './styles.css';
import { renderHome } from './pages/home.js';

// Pages other than home are loaded on demand, so the first screen does not wait for three.js.
const pages = {
  lesson: () => import('./pages/lesson.js').then((m) => m.renderLesson),
  lab: () => import('./pages/experiment.js').then((m) => m.renderExperiment),
  play: () => import('./pages/play.js').then((m) => m.renderPlay),
};

const app = document.getElementById('app');
let cleanup = null;
let seq = 0;

async function route() {
  const my = ++seq;
  try { cleanup?.(); } catch (e) { console.error(e); }
  cleanup = null;
  const [page, arg] = location.hash.replace(/^#\/?/, '').split('/');
  window.scrollTo(0, 0);
  document.body.className = '';
  const render = pages[page] && arg ? await pages[page]() : renderHome;
  if (my !== seq) return; // the user navigated again while this page was loading
  const done = await render(app, arg);
  if (my === seq) cleanup = done; else done?.();
}

window.addEventListener('hashchange', route);
route();

// Warm the 3D engine while the student is still reading the home page, so the first lab opens without a
// download wait. Skipped when the user asked to save data or the connection is very slow (2G): there it is
// fetched on demand, and the service worker keeps it for every later visit.
const conn = navigator.connection;
const lean = conn && (conn.saveData || /(^|-)2g$/.test(conn.effectiveType || ''));
const idle = window.requestIdleCallback || ((f) => setTimeout(f, 1500));
window.addEventListener('load', () => idle(async () => {
  if (!lean) await Promise.allSettled([pages.lab(), pages.lesson()]);
  // Offline support in production builds (the dev server must not be cached). Registered after the warm-up
  // so its offline download reuses the files the browser just fetched instead of downloading them twice.
  if (import.meta.env.PROD && 'serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => {});
}, { timeout: 4000 }));
