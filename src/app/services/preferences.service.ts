import { Injectable } from '@angular/core';
import merge from 'lodash/merge';

export interface Preferences {
  theme: string;
  showTips: boolean;
  compact: boolean;
}

const DEFAULT_PREFERENCES: Preferences = {
  theme: 'light',
  showTips: true,
  compact: false
};

@Injectable({ providedIn: 'root' })
export class PreferencesService {
  private readonly storageKey = 'workshop_preferences';

  load(): Preferences {
    try {
      const saved: unknown = JSON.parse(localStorage.getItem(this.storageKey) || '{}');
      return merge({ ...DEFAULT_PREFERENCES }, saved) as Preferences;
    } catch {
      return { ...DEFAULT_PREFERENCES };
    }
  }

  save(preferences: Preferences): void {
    localStorage.setItem(this.storageKey, JSON.stringify(preferences));
  }
}