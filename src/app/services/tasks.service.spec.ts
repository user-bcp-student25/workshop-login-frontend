import '@angular/compiler';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('axios', () => ({ default: { get: vi.fn(), post: vi.fn() } }));

import axios from 'axios';
import { AuthService } from './auth.service';
import { SessionService } from './session.service';
import { TasksService } from './tasks.service';

describe('TasksService', () => {
  beforeEach(() => vi.clearAllMocks());

  it('requests tasks for the owner with the current bearer token', async () => {
    const tasks = [{ id: 1, title: 'Task', owner: 'student', priority: '1', status: 'TODO' }];
    vi.mocked(axios.get).mockResolvedValue({ data: tasks } as never);
    const session = new SessionService();
    session.setSession({ token: 'token-1', user: { username: 'student' } });
    const service = new TasksService(session);

    await expect(service.getTasks('student')).resolves.toEqual(tasks);
    expect(axios.get).toHaveBeenCalledWith('http://localhost:8000/api/tasks?owner=student', {
      headers: { Authorization: 'Bearer token-1' }
    });
  });

  it('loads tasks using the session created by a successful login', async () => {
    const tasks = [{ id: 1, title: 'Task', owner: 'student', priority: '1', status: 'TODO' }];
    vi.mocked(axios.post).mockResolvedValue({
      data: { token: 'token-1', user: { username: 'student' } }
    } as never);
    vi.mocked(axios.get).mockResolvedValue({ data: tasks } as never);
    const session = new SessionService();
    const authService = new AuthService(session);
    const tasksService = new TasksService(session);

    await authService.login({ username: 'student', password: 'Workshop123!' });
    const loadedTasks = await tasksService.getTasks(session.getUser()!.username);

    expect(loadedTasks).toEqual(tasks);
    expect(axios.post).toHaveBeenCalledWith(
      'http://localhost:8080/auth/login',
      { username: 'student', password: 'Workshop123!', client: 'angular-workshop' },
      { timeout: 5000 }
    );
    expect(axios.get).toHaveBeenCalledWith('http://localhost:8000/api/tasks?owner=student', {
      headers: { Authorization: 'Bearer token-1' }
    });
  });

  it('encodes the owner query value', async () => {
    vi.mocked(axios.get).mockResolvedValue({ data: [] } as never);
    const session = new SessionService();
    session.setSession({ token: 'token-1', user: { username: 'student' } });

    await new TasksService(session).getTasks('a b');

    expect(axios.get).toHaveBeenCalledWith('http://localhost:8000/api/tasks?owner=a%20b', expect.any(Object));
  });

  it('uses a public error and skips the request without a token', async () => {
    const service = new TasksService(new SessionService());

    await expect(service.getTasks('student')).rejects.toThrow('No se pudo cargar el dashboard');
    expect(axios.get).not.toHaveBeenCalled();
  });

  it('returns a generic error when the tasks backend is unavailable', async () => {
    vi.mocked(axios.get).mockRejectedValue(Object.assign(new Error('connect ECONNREFUSED'), {
      code: 'ECONNREFUSED'
    }));
    const session = new SessionService();
    session.setSession({ token: 'token-1', user: { username: 'student' } });

    await expect(new TasksService(session).getTasks('student'))
      .rejects.toThrow('No se pudo cargar el dashboard');
  });

  it('returns a generic error for an invalid token without clearing the session', async () => {
    vi.mocked(axios.get).mockRejectedValue({
      response: { status: 401, data: { detail: 'invalid token' } }
    });
    const session = new SessionService();
    session.setSession({ token: 'expired-token', user: { username: 'student' } });

    await expect(new TasksService(session).getTasks('student'))
      .rejects.toThrow('No se pudo cargar el dashboard');
    expect(session.getToken()).toBe('expired-token');
    expect(session.getUser()).toEqual({ username: 'student' });
  });
});