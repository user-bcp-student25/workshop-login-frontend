import '@angular/compiler';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('axios', () => ({ default: { get: vi.fn() } }));

import axios from 'axios';
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

  it('does not expose backend error details', async () => {
    vi.mocked(axios.get).mockRejectedValue(new Error('private backend detail'));
    const session = new SessionService();
    session.setSession({ token: 'token-1', user: { username: 'student' } });

    await expect(new TasksService(session).getTasks('student'))
      .rejects.toThrow('No se pudo cargar el dashboard');
  });
});