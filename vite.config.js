import { defineConfig } from 'vite';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

// Dev-only QA helper: the page can POST a PNG (data URL) to /__shot?name=x and it is saved to .qa/x.png.
function qaShots() {
  return {
    name: 'qa-shots',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/__shot', (req, res) => {
        if (req.method !== 'POST') { res.statusCode = 405; return res.end(); }
        const name = (new URL(req.url, 'http://x').searchParams.get('name') || 'shot').replace(/[^a-z0-9_-]/gi, '_');
        let body = '';
        req.on('data', (c) => { body += c; });
        req.on('end', () => {
          const dir = path.resolve('.qa');
          fs.mkdirSync(dir, { recursive: true });
          const b64 = body.replace(/^data:image\/\w+;base64,/, '');
          fs.writeFileSync(path.join(dir, name + '.png'), Buffer.from(b64, 'base64'));
          res.end('ok');
        });
      });
    },
  };
}

// Build-only: give the service worker the full list of files to download for offline use, and a version
// derived from their names (hashed), so each deploy replaces the old cache.
function swPrecache() {
  let outDir = 'dist';
  return {
    name: 'sw-precache',
    apply: 'build',
    configResolved(c) { outDir = c.build.outDir; },
    closeBundle() {
      const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]);
      const files = walk(outDir).map((f) => '/' + path.relative(outDir, f).split(path.sep).join('/'))
        .filter((f) => !/^\/(sw\.js|index\.html|vercel\.json)$/.test(f) && !f.endsWith('.map'));
      // app code first (needed to open a lab), pictures after
      files.sort((a, b) => (a.startsWith('/assets/') ? 0 : 1) - (b.startsWith('/assets/') ? 0 : 1));
      const version = crypto.createHash('sha1').update(files.join('|')).digest('hex').slice(0, 10);
      const swPath = path.join(outDir, 'sw.js');
      const src = fs.readFileSync(swPath, 'utf8').replace('__VERSION__', version);
      fs.writeFileSync(swPath, `self.__PRECACHE=${JSON.stringify(files)};\n${src}`);
    },
  };
}

export default defineConfig({
  plugins: [qaShots(), swPrecache()],
  // No hot reload: several QA runs share this server and a reload would cut them off. Refresh to see changes.
  server: { hmr: false },
  build: {
    target: 'es2020',
    cssCodeSplit: true,
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      output: {
        // Stable vendor chunks: they rarely change, so browsers/CDN keep them cached across deploys.
        manualChunks(id) {
          if (id.includes('node_modules/three/examples')) return 'three-extras';
          if (id.includes('node_modules/three')) return 'three';
          if (id.includes('node_modules/gsap')) return 'gsap';
        },
      },
    },
  },
});
