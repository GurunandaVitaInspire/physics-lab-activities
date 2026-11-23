import { defineConfig } from 'vite';
import fs from 'node:fs';
import path from 'node:path';

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

export default defineConfig({
  plugins: [qaShots()],
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
