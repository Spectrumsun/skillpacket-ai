import { useCallback, useEffect, useState } from 'react';
import { themes, readTheme, writeTheme, THEME_KEY } from './themes.ts';
import type { Theme } from './themes.ts';
import { Icon } from './icons.tsx';
export function useAppearance(onError?: (message: string) => void) {
  const [theme, setTheme] = useState<Theme>(() => readTheme());
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#101a15' : theme === 'light' ? '#ffffff' : '#17241e');
  }, [theme]);
  useEffect(() => {
    const changed = (event: StorageEvent) => { if (event.key === THEME_KEY) setTheme(readTheme()); };
    window.addEventListener('storage', changed); return () => window.removeEventListener('storage', changed);
  }, []);
  const changeTheme = useCallback((next: Theme) => {
    setTheme(next);
    try { writeTheme(next); } catch { onError?.('Theme applied for this session. This browser could not save the preference.'); }
  }, [onError]);
  return { theme, changeTheme };
}
export function ThemeSwitcher({theme,changeTheme}:{theme:Theme;changeTheme(theme:Theme):void}) {
  return <div className="theme-switcher" role="group" aria-label="Color theme">{themes.map(option => <button key={option} className={theme === option ? 'selected' : ''} aria-label={`${option[0].toUpperCase() + option.slice(1)} theme`} title={`${option[0].toUpperCase() + option.slice(1)} theme`} aria-pressed={theme === option} onClick={() => changeTheme(option)}><Icon name={option === 'mix' ? 'layers' : option === 'dark' ? 'moon' : 'sun'} size={14}/><span>{option[0].toUpperCase() + option.slice(1)}</span></button>)}</div>;
}
