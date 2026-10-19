import '@angular/compiler';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DashboardComponent } from './dashboard.component';

function createDashboard(token: string | null = 'token-1', user: { username: string } | null = token ? { username: 'student' } : null) {
  const router = { navigate: vi.fn().mockResolvedValue(true) };
  const cdr = { detectChanges: vi.fn() };
  const zone = { run: vi.fn((callback: () => void) => callback()) };
  const session = {
    getToken: vi.fn().mockReturnValue(token),
    getUser: vi.fn().mockReturnValue(user),
    clear: vi.fn()
  };
  const tasksService = { getTasks: vi.fn() };
  const component = new DashboardComponent(
    router as never,
    cdr as never,
    zone as never,
    session as never,
    tasksService as never
  );
  return { component, router, cdr, zone, session, tasksService };
}

describe('DashboardComponent characterization', () => {
  beforeEach(() => vi.clearAllMocks());

  it('redirects to login without a token and does not request tasks', async () => {
    const { component, router, tasksService } = createDashboard(null);

    await component.ngOnInit();

    expect(router.navigate).toHaveBeenCalledWith(['/login']);
    expect(tasksService.getTasks).not.toHaveBeenCalled();
  });

  it('redirects to login when the session has no user', async () => {
    const { component, router, tasksService } = createDashboard('token-1', null);

    await component.ngOnInit();

    expect(router.navigate).toHaveBeenCalledWith(['/login']);
    expect(tasksService.getTasks).not.toHaveBeenCalled();
  });

  it('requests tasks with the owner query and bearer token, then filters and sorts', async () => {
    const tasks = [
      { id: 1, title: 'Priority 1 task', status: 'TODO', priority: '1', owner: 'student' },
      { id: 2, title: 'Archived task', status: 'ARCHIVED', priority: '3', owner: 'student' },
      { id: 3, title: 'Priority 2 task', status: 'IN_PROGRESS', priority: '2', owner: 'student' }
    ];
    const { component, cdr, zone, tasksService } = createDashboard();
    tasksService.getTasks.mockResolvedValue(tasks);

    await component.ngOnInit();

    expect(tasksService.getTasks).toHaveBeenCalledWith('student');
    expect(component.visibleTasks.map((task) => task.title)).toEqual(['Priority 2 task', 'Priority 1 task']);
    expect(component.visibleTasks[0].label).toBe('2 · STUDENT');
    expect(component.loading).toBe(false);
    expect(zone.run).toHaveBeenCalled();
    expect(cdr.detectChanges).toHaveBeenCalled();
  });

  it('shows a generic error and stays on the dashboard when the task request fails', async () => {
    const { component, cdr, router, session, tasksService } = createDashboard();
    tasksService.getTasks.mockRejectedValue(new Error('No se pudo cargar el dashboard'));

    await component.ngOnInit();

    expect(component.error).toBe('No se pudo cargar el dashboard');
    expect(component.loading).toBe(false);
    expect(cdr.detectChanges).toHaveBeenCalled();
    expect(router.navigate).not.toHaveBeenCalled();
    expect(session.clear).not.toHaveBeenCalled();
  });

  it('clears session and navigates without requesting tasks', async () => {
    const { component, router, session, tasksService } = createDashboard();

    await component.logout();

    expect(session.clear).toHaveBeenCalledOnce();
    expect(router.navigate).toHaveBeenCalledWith(['/login']);
    expect(tasksService.getTasks).not.toHaveBeenCalled();
  });
});