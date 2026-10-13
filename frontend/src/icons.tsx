import type { CSSProperties } from 'react';
type Name = 'sun' | 'moon' | 'layers' | 'home' | 'route' | 'download' | 'settings' | 'arrow' | 'chevron' | 'check' | 'wifi' | 'offline' | 'clock' | 'book' | 'plus' | 'close' | 'play' | 'pause' | 'code' | 'leaf' | 'external' | 'trash' | 'search' | 'menu';
const paths: Record<Name, React.ReactNode> = {
  sun: <><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2m-3-9-2 2M7 17l-2 2M5 5l2 2m10 10 2 2"/></>,
  moon: <path d="M20 15a9 9 0 0 1-11-11 9 9 0 1 0 11 11Z"/>,
  layers: <><path d="m12 3 9 5-9 5-9-5 9-5Z"/><path d="m3 12 9 5 9-5M3 16l9 5 9-5"/></>,
  home: <><path d="m3 10 9-7 9 7v10H3V10Z"/><path d="M9 20v-7h6v7"/></>,
  route: <><circle cx="6" cy="5" r="2"/><circle cx="18" cy="19" r="2"/><path d="M8 5h7a4 4 0 0 1 0 8H9a4 4 0 0 0 0 8h7"/></>,
  download: <><path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/></>,
  settings: <><path d="m9 3-1 3-3 1-2 3 2 3 1 3 3 2 3-1 3 1 3-2 1-3 2-3-2-3-3-1-1-3H9Z"/><circle cx="12" cy="11" r="3"/></>,
  arrow: <path d="M4 12h16m-6-6 6 6-6 6"/>, chevron: <path d="m9 5 7 7-7 7"/>, check: <path d="m5 12 4 4L19 6"/>,
  wifi: <><path d="M2 8a17 17 0 0 1 20 0M5 12a11 11 0 0 1 14 0M8 16a6 6 0 0 1 8 0"/><circle cx="12" cy="20" r=".6"/></>,
  offline: <><path d="m3 3 18 18M2 8a17 17 0 0 1 20 0M5 12a11 11 0 0 1 6-2M8 16a6 6 0 0 1 8 0"/><circle cx="12" cy="20" r=".6"/></>,
  clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>, book: <><path d="M12 5v16M3 4h4a5 5 0 0 1 5 2 5 5 0 0 1 5-2h4v15h-4a5 5 0 0 0-5 2 5 5 0 0 0-5-2H3V4Z"/></>,
  plus: <path d="M12 5v14M5 12h14"/>, close: <path d="m6 6 12 12M18 6 6 18"/>,
  play: <path d="m9 5 11 7-11 7V5Z"/>, pause: <><path d="M8 5v14M16 5v14"/></>,
  code: <path d="m8 7-5 5 5 5m8-10 5 5-5 5m-3-14-2 18"/>,
  leaf: <><path d="M20 3C8 2 3 8 5 15c7 6 16 0 15-12Z"/><path d="M3 21 16 8"/></>,
  external: <><path d="M14 3h7v7m0-7L11 13M10 3H3v18h18v-7"/></>,
  trash: <><path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7"/></>,
  search: <><circle cx="10" cy="10" r="6"/><path d="m15 15 6 6"/></>, menu: <path d="M4 6h16M4 12h16M4 18h16"/>,
};
export function Icon({ name, size = 20, style }: { name: Name; size?: number; style?: CSSProperties }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={style}>{paths[name]}</svg>;
}
