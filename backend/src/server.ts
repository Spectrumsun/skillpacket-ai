import { createApp } from './app.ts';
import { Store } from './store.ts';
import { DevelopmentGenerator, processNext } from './generator.ts';
const host = process.env.HOST ?? '127.0.0.1';
const port = Number(process.env.PORT ?? 3001);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT must be between 1 and 65535');
const token = process.env.API_TOKEN;
if (!['127.0.0.1', '::1', 'localhost'].includes(host) && (!token || token.length < 24)) throw new Error('Non-loopback hosting requires an API_TOKEN of at least 24 characters');
const store = new Store(process.env.DATABASE_PATH ?? './data/skillpacket.sqlite');
const app = createApp(store, { token });
const generator = new DevelopmentGenerator();
let working = false;
const timer = setInterval(async () => {
  if (working) return;
  working = true;
  try { await processNext(store, generator); }
  catch (error) { console.error('Worker error:', error instanceof Error ? error.name : 'UnknownError'); }
  finally { working = false; }
}, 250);
app.listen(port, host, () => console.log(`SkillPacket backend listening on ${host}:${port} (development generator)`));
app.on('error', error => {
  console.error('Server failed:', error.message);
  clearInterval(timer);
  store.close();
  process.exitCode = 1;
});
let closing = false;
async function shutdown() {
  if (closing) return;
  closing = true;
  clearInterval(timer);
  await new Promise<void>(resolve => { app.close(() => resolve()); app.closeIdleConnections(); });
  while (working) await new Promise(resolve => setTimeout(resolve, 25));
  store.close();
}
process.on('SIGINT', () => { void shutdown(); });
process.on('SIGTERM', () => { void shutdown(); });
