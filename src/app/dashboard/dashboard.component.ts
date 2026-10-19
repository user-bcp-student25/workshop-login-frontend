import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, NgZone, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { User } from '../models/auth.models';
import { Task } from '../models/task.model';
import { SessionService } from '../services/session.service';
import { TasksService } from '../services/tasks.service';
import { formatTaskLabel } from '../utils/legacy-format';

const STATUS_LABELS: Record<string, string> = {
  TODO: 'Por hacer',
  IN_PROGRESS: 'En progreso',
  DONE: 'Completado',
  RESUELTO: 'Resuelto',
  COMPLETED: 'Completado'
};

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent implements OnInit {
  tasks: Task[] = [];
  visibleTasks: Task[] = [];
  user: User = { username: '' };
  loading = true;
  error = '';

  constructor(
    private router: Router,
    private cdr: ChangeDetectorRef,
    private zone: NgZone,
    private session: SessionService,
    private tasksService: TasksService
  ) {}

  statusLabel(status: string): string {
    return STATUS_LABELS[(status || '').toUpperCase()] || status;
  }

  async ngOnInit(): Promise<void> {
    const token = this.session.getToken();
    const user = this.session.getUser();
    if (!token || !user) {
      await this.router.navigate(['/login']);
      return;
    }
    this.user = user;

    try {
      const tasks = await this.tasksService.getTasks(user.username);
      const visibleTasks = tasks
        .filter((task) => task.status !== 'ARCHIVED')
        .map((task) => ({ ...task, label: formatTaskLabel(task) }))
        .sort((first, second) => comparePriorityDescending(first.priority, second.priority));
      // La carga puede resolverse fuera de la zona de Angular; reentramos para
      // actualizar la vista de forma consistente.
      this.zone.run(() => {
        this.tasks = tasks;
        this.visibleTasks = visibleTasks;
        this.loading = false;
        this.cdr.detectChanges();
      });
    } catch (error: unknown) {
      this.zone.run(() => {
        this.error = error instanceof Error ? error.message : 'No se pudo cargar el dashboard';
        this.loading = false;
        this.cdr.detectChanges();
      });
    }
  }

  async logout(): Promise<void> {
    this.session.clear();
    await this.router.navigate(['/login']);
  }
}

function comparePriorityDescending(first: string | number | undefined, second: string | number | undefined): number {
  if (typeof first === 'string' && typeof second === 'string') {
    return first > second ? -1 : first < second ? 1 : 0;
  }
  return Number(second ?? 0) - Number(first ?? 0);
}
