import { Injectable } from '@angular/core';
import axios from 'axios';
import { environment } from '../../environments/environment';
import { Task } from '../models/task.model';
import { SessionService } from './session.service';

@Injectable({ providedIn: 'root' })
export class TasksService {
  constructor(private session: SessionService) {}

  async getTasks(owner: string): Promise<Task[]> {
    const token = this.session.getToken();
    if (!token) {
      throw new Error('No se pudo cargar el dashboard');
    }

    try {
      const url = `${environment.tasksUrl}?owner=${encodeURIComponent(owner)}`;
      const response = await axios.get<Task[]>(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data;
    } catch {
      throw new Error('No se pudo cargar el dashboard');
    }
  }
}