// Offline-first service worker.
// - On install it downloads the whole app (HTML, CSS, every JS chunk incl. three.js and all 22 labs), so after
//   the first visit every lab opens instantly and works with no internet at all.
// - Images are cached as they are seen and refreshed in the background.
// - The page itself is fetched from the network with a short timeout and falls back to the cached copy,
//   so a slow or dropped connection never leaves the student staring at a blank screen.
// The build (vite.config.js) fills in VERSION and PRECACHE; in dev this file is never registered.
const VERSION = '__VERSION__';
const PRECACHE = self.__PRECACHE || [];
const CORE = `ssl-core-${VERSION}`;
const MEDIA = 'ssl-media-v1';
const FONTS = 'ssl-fonts-v1';

self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    const c = await caches.open(CORE);
    await c.add(new Request('/', { cache: 'reload' })).catch(() => {});
    // On "save data" or 2G only the page shell is stored up front; everything else is kept as it is used.
    const conn = self.navigator.connection;
    const lean = conn && (conn.saveData || /(^|-)2g$/.test(conn.effectiveType || ''));
    // One file at a time is gentler on a weak connection than 60 parallel requests. Hashed files are taken
    // from the browser's HTTP cache when the page already downloaded them.
    if (!lean) for (const url of PRECACHE) { try { if (!(await c.match(url))) await c.add(url); } catch { /* cached on use */ } }
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const keep = new Set([CORE, MEDIA, FONTS]);
    for (const k of await caches.keys()) if (!keep.has(k)) await caches.delete(k);
    await self.clients.claim();
  })());
});

const timeout = (ms) => new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), ms));

async function page(req) {
  const c = await caches.open(CORE);
  const cached = await c.match('/');
  const net = fetch(req).then((res) => { if (res.ok) c.put('/', res.clone()); return res; });
  if (!cached) return net;
  // slow network: show the cached app after 2.5 s and let the fresh copy update the cache for next time
  return Promise.race([net, timeout(2500)]).catch(() => cached);
}

async function cacheFirst(req, name) {
  const c = await caches.open(name);
  const hit = await caches.match(req);
  if (hit) return hit;
  const res = await fetch(req);
  if (res.ok || res.type === 'opaque') c.put(req, res.clone());
  return res;
}

async function staleWhileRevalidate(req, name) {
  const c = await caches.open(name);
  const hit = await caches.match(req); // may have been precached at install
  const net = fetch(req).then((res) => { if (res.ok) c.put(req, res.clone()); return res; }).catch(() => hit);
  return hit || net;
}

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (/fonts\.(googleapis|gstatic)\.com$/.test(url.hostname)) { e.respondWith(cacheFirst(req, FONTS)); return; }
  if (url.origin !== self.location.origin) return;
  if (req.mode === 'navigate') { e.respondWith(page(req)); return; }
  if (url.pathname.startsWith('/assets/')) { e.respondWith(cacheFirst(req, CORE)); return; } // hashed = immutable
  if (/\.(webp|jpg|png|svg|webmanifest)$/.test(url.pathname)) { e.respondWith(staleWhileRevalidate(req, MEDIA)); return; }
});
