import '@angular/compiler';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { LoginComponent } from './login.component';

function createRouter() {
  return { navigate: vi.fn().mockResolvedValue(true) };
}

function createLogin() {
  const router = createRouter();
  const authService = { login: vi.fn().mockResolvedValue(undefined) };
  const preferencesService = {
    load: vi.fn().mockReturnValue({ theme: 'light', showTips: true, compact: false }),
    save: vi.fn()
  };
  const component = new LoginComponent(router as never, authService as never, preferencesService as never);
  return { component, router, authService, preferencesService };
}

describe('LoginComponent characterization', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('delegates login, saves preferences and navigates on success', async () => {
    const { component, router, authService, preferencesService } = createLogin();
    component.username = 'student';
    component.password = 'Workshop123!';

    await component.login();

    expect(authService.login).toHaveBeenCalledWith({ username: 'student', password: 'Workshop123!' });
    expect(preferencesService.save).toHaveBeenCalledWith(component.preferences);
    expect(router.navigate).toHaveBeenCalledWith(['/dashboard']);
    expect(component.busy).toBe(false);
  });

  it('does not request login when the username or password is blank', async () => {
    const { component, authService } = createLogin();
    component.username = '   ';
    component.password = 'secret';

    await component.login();

    expect(authService.login).not.toHaveBeenCalled();
    expect(component.message).toBe('Ingrese un usuario.');
    expect(component.message).not.toContain('<');

    component.username = 'student';
    component.password = '   ';

    await component.login();

    expect(authService.login).not.toHaveBeenCalled();
    expect(component.message).toBe('Ingrese una contraseña.');
    expect(component.message).not.toContain('<');
  });

  it('does not save preferences or navigate when authentication fails', async () => {
    const { component, router, authService, preferencesService } = createLogin();
    component.username = 'student';
    component.password = 'Workshop123!';
    authService.login.mockRejectedValue(new Error('No se pudo autenticar. Verifica tus credenciales.'));

    await component.login();

    expect(preferencesService.save).not.toHaveBeenCalled();
    expect(router.navigate).not.toHaveBeenCalled();
    expect(component.message).toBe('No se pudo autenticar.');
    expect(component.message).not.toContain('<');
    expect(component.busy).toBe(false);
  });

  it('does not expose authentication error details', async () => {
    const { component, authService } = createLogin();
    component.username = 'student';
    component.password = 'Workshop123!';
    authService.login.mockRejectedValue(new Error('private backend detail'));

    await component.login();

    expect(component.message).toBe('No se pudo autenticar.');
    expect(component.message).not.toContain('private backend detail');
    expect(component.busy).toBe(false);
  });
});