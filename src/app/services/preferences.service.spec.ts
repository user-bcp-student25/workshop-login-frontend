import '@angular/compiler';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PreferencesService } from './preferences.service';

const values = new Map<string, string>();
const storage = {
  getItem: (key: string) => values.get(key) ?? null,
  setItem: (key: string, value: string) => values.set(key, value),
  removeItem: (key: string) => values.delete(key),
  clear: () => values.clear()
};

describe('PreferencesService', () => {
  beforeEach(() => {
    values.clear();
    vi.stubGlobal('localStorage', storage);
  });

  afterEach(() => vi.unstubAllGlobals());

  it('loads defaults and merges saved preferences', () => {
    storage.setItem('workshop_preferences', JSON.stringify({ compact: true }));

    expect(new PreferencesService().load()).toEqual({
      theme: 'light',
      showTips: true,
      compact: true
    });
  });

  it('falls back to defaults for invalid saved JSON', () => {
    storage.setItem('workshop_preferences', '{invalid');

    expect(new PreferencesService().load()).toEqual({
      theme: 'light',
      showTips: true,
      compact: false
    });
  });

  it('saves preferences under the existing key', () => {
    const preferences = { theme: 'dark', showTips: false, compact: true };

    new PreferencesService().save(preferences);

    expect(storage.getItem('workshop_preferences')).toBe(JSON.stringify(preferences));
  });
});