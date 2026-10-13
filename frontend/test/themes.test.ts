import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readTheme, writeTheme, themes, THEME_KEY } from '../src/themes.ts';
test('Mix is the default for missing, invalid or unavailable preferences', () => {
  assert.equal(readTheme({ getItem: () => null }), 'mix');
  assert.equal(readTheme({ getItem: () => 'invalid' }), 'mix');
  assert.equal(readTheme({ getItem: () => { throw new Error('Unavailable'); } }), 'mix');
});
test('all three themes persist and restore without a backend', () => {
  const values = new Map<string, string>();
  const storage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); } };
  for (const theme of themes) { writeTheme(theme, storage); assert.equal(values.get(THEME_KEY), theme); assert.equal(readTheme(storage), theme); }
});
