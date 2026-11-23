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

// Offline support in production builds (the dev server must not be cached).
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}));
}
