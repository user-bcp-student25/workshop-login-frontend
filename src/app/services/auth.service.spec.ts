import '@angular/compiler';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('axios', () => ({ default: { post: vi.fn() } }));

import axios from 'axios';
import { AuthService } from './auth.service';
import { SessionService } from './session.service';

describe('AuthService', () => {
  beforeEach(() => vi.clearAllMocks());

  it('posts the expected login contract and stores the returned session', async () => {
    vi.mocked(axios.post).mockResolvedValue({
      data: { token: 'token-1', user: { username: 'student' } }
    } as never);
    const session = new SessionService();
    const service = new AuthService(session);

    await service.login({ username: 'student', password: 'Workshop123!' });

    expect(axios.post).toHaveBeenCalledWith(
      'http://localhost:8080/auth/login',
      { username: 'student', password: 'Workshop123!', client: 'angular-workshop' },
      { timeout: 5000 }
    );
    expect(session.getToken()).toBe('token-1');
    expect(session.getUser()).toEqual({ username: 'student' });
  });

  it('does not set a session and returns a public error for an invalid response', async () => {
    vi.mocked(axios.post).mockResolvedValue({ data: { user: { username: 'student' } } } as never);
    const session = new SessionService();
    const service = new AuthService(session);

    await expect(service.login({ username: 'student', password: 'bad' }))
      .rejects.toThrow('No se pudo autenticar. Verifica tus credenciales.');
    expect(session.getToken()).toBeNull();
  });

  it('does not expose backend error details', async () => {
    vi.mocked(axios.post).mockRejectedValue(new Error('private backend detail'));
    const service = new AuthService(new SessionService());

    await expect(service.login({ username: 'student', password: 'bad' }))
      .rejects.toThrow('No se pudo autenticar. Verifica tus credenciales.');
  });
});