import { parsePacket } from './model.ts';
import type { Packet, Progress } from './model.ts';
let connection: Promise<IDBDatabase> | undefined;
function database(): Promise<IDBDatabase> {
  if (!connection) connection = new Promise((resolve, reject) => {
    const open = indexedDB.open('skillpacket', 1);
    open.onupgradeneeded = () => {
      for (const name of ['packets', 'settings', 'progress']) open.result.createObjectStore(name);
    };
    open.onsuccess = () => { open.result.onversionchange = () => { open.result.close(); connection = undefined; }; resolve(open.result); };
    open.onerror = () => { connection = undefined; reject(open.error ?? new Error('Local storage is unavailable.')); };
    open.onblocked = () => { connection = undefined; reject(new Error('Close other SkillPacket tabs to update local storage.')); };
  });
  return connection;
}
async function transaction<T>(name: string, mode: IDBTransactionMode, execute: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await database();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(name, mode);
    const request = execute(tx.objectStore(name));
    tx.oncomplete = () => resolve(request.result);
    tx.onabort = () => reject(tx.error ?? request.error ?? new Error('Could not save to this device.'));
    tx.onerror = () => { /* onabort rejects after the transaction fails. */ };
  });
}
export const localStore = {
  async packets(): Promise<Packet[]> { return (await transaction<unknown[]>('packets', 'readonly', store => store.getAll())).map(parsePacket); },
  async savePacket(value: unknown) { const packet = parsePacket(value); await transaction('packets', 'readwrite', store => store.put(packet, packet.id)); return packet; },
  async removePacket(id: string) { await transaction('packets', 'readwrite', store => store.delete(id)); await transaction('progress', 'readwrite', store => store.delete(id)); },
  async setting<T>(key: string): Promise<T | undefined> { return await transaction('settings', 'readonly', store => store.get(key)) as T | undefined; },
  async setSetting(key: string, value: unknown) { await transaction('settings', 'readwrite', store => store.put(value, key)); },
  async progress(id: string): Promise<Progress | undefined> { return await transaction('progress', 'readonly', store => store.get(id)) as Progress | undefined; },
  async saveProgress(value: Progress) { await transaction('progress', 'readwrite', store => store.put(value, value.packetId)); },
  async allProgress(): Promise<Progress[]> { return await transaction('progress', 'readonly', store => store.getAll()) as Progress[]; },
};
export async function requestPersistentStorage(): Promise<boolean> {
  try { return navigator.storage?.persist ? await navigator.storage.persist() : false; }
  catch { return false; }
}
