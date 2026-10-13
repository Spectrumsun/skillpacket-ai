import { defineConfig } from 'vite';
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
const proxy = { '/api': {
  target: process.env.BACKEND_URL ?? 'http://127.0.0.1:3001',
  rewrite: (path: string) => path.replace(/^\/api/, ''),
  ...(process.env.BACKEND_API_TOKEN ? { headers: { Authorization: `Bearer ${process.env.BACKEND_API_TOKEN}` } } : {}),
} };
export default defineConfig({
  server: { port: 5173, strictPort: true, proxy },
  preview: { port: 4173, strictPort: true, proxy },
  resolve: { dedupe: ['zod'] },
  plugins: [{ name: 'offline-shell', closeBundle() {
    function files(dir: string, prefix = ''): string[] {
      return readdirSync(dir, { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? files(join(dir, entry.name), `${prefix}${entry.name}/`) : [`/${prefix}${entry.name}`]);
    }
    const urls = ['/', ...files('dist').filter(path => !['/sw.js', '/precache.json'].includes(path))];
    writeFileSync('dist/precache.json', JSON.stringify(urls));
    const hash = createHash('sha256');
    for (const url of urls.filter(url => url !== '/')) hash.update(readFileSync(join('dist', url.slice(1))));
    const version = hash.digest('hex').slice(0, 12);
    writeFileSync('dist/sw.js', readFileSync('public/sw.js', 'utf8').replace('__SHELL_VERSION__', version));
  } }],
});
