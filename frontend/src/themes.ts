export const themes = ['mix', 'dark', 'light'] as const;
export type Theme = typeof themes[number];
export const THEME_KEY = 'skillpacket-theme';
export function isTheme(value: unknown): value is Theme { return themes.some(theme => theme === value); }
export function readTheme(storage?: Pick<Storage, 'getItem'>): Theme {
  try {
    const saved = (storage ?? globalThis.localStorage)?.getItem(THEME_KEY);
    if (isTheme(saved)) return saved;
  } catch { /* Keep the original appearance when storage is unavailable. */ }
  return 'mix';
}
export function writeTheme(theme: Theme, storage?: Pick<Storage, 'setItem'>) {
  (storage ?? globalThis.localStorage).setItem(THEME_KEY, theme);
}
