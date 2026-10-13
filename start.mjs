import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
const root = dirname(fileURLToPath(import.meta.url));
const backendDir = join(root, 'backend');
const frontendDir = join(root, 'frontend');
for (const dir of [backendDir, frontendDir]) {
  if (!existsSync(join(dir, 'node_modules'))) throw new Error(`Install dependencies first: run npm ci in ${dir}`);
}
const dev = process.argv.includes('--dev');
const backendPort = process.env.SKILLPACKET_BACKEND_PORT ?? '3101';
const children = new Set();
let stopping = false;
function run(args, cwd, env = {}) {
  const child = spawn(process.execPath, args, { cwd, env: { ...process.env, ...env }, stdio: 'inherit' });
  children.add(child);
  child.once('exit', () => children.delete(child));
  child.once('error', error => { console.error(error.message); shutdown(1); });
  return child;
}
function shutdown(code = 0) {
  if (stopping) return;
  stopping = true;
  process.exitCode = code;
  for (const child of children) child.kill('SIGTERM');
}
process.on('SIGINT', () => shutdown());
process.on('SIGTERM', () => shutdown());
async function check(args) {
  const child = run(args, frontendDir);
  const code = await new Promise(resolve => child.once('exit', resolve));
  if (code !== 0) throw new Error('Frontend build failed.');
}
if (!dev) {
  await check(['node_modules/typescript/bin/tsc', '--noEmit']);
  await check(['node_modules/vite/bin/vite.js', 'build']);
}
if (!stopping) {
  const backend = run(['--experimental-strip-types', 'src/server.ts'], backendDir, { PORT: backendPort, HOST: '127.0.0.1' });
  const frontend = run(['node_modules/vite/bin/vite.js', ...(dev ? [] : ['preview']), '--host', '127.0.0.1'], frontendDir, {
    BACKEND_URL: `http://127.0.0.1:${backendPort}`,
    ...(process.env.API_TOKEN ? { BACKEND_API_TOKEN: process.env.API_TOKEN } : {}),
  });
  for (const child of [backend, frontend]) child.once('exit', code => { if (!stopping) shutdown(code || 0); });
}
