import '@angular/compiler';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SessionService } from './session.service';

afterEach(() => vi.unstubAllGlobals());

describe('SessionService', () => {
  it('starts without a token or user', () => {
    const session = new SessionService();

    expect(session.getToken()).toBeNull();
    expect(session.getUser()).toBeNull();
  });

  it('keeps the session in memory and clears it', () => {
    const session = new SessionService();
    const user = { username: 'student', displayName: 'Student' };
    session.setSession({ token: 'token-1', user });

    expect(session.getToken()).toBe('token-1');
    expect(session.getUser()).toEqual(user);

    session.clear();

    expect(session.getToken()).toBeNull();
    expect(session.getUser()).toBeNull();
  });

  it('does not persist session data to localStorage', () => {
    const setItem = vi.fn();
    const removeItem = vi.fn();
    vi.stubGlobal('localStorage', { setItem, removeItem });
    const session = new SessionService();

    session.setSession({ token: 'token-1', user: { username: 'student' } });
    session.clear();

    expect(setItem).not.toHaveBeenCalled();
    expect(removeItem).not.toHaveBeenCalled();
  });
});