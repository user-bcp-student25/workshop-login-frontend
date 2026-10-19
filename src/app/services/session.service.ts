import { Injectable } from '@angular/core';
import { User, UserSession } from '../models/auth.models';

@Injectable({ providedIn: 'root' })
export class SessionService {
  private session: UserSession | null = null;

  getToken(): string | null {
    return this.session?.token ?? null;
  }

  getUser(): User | null {
    return this.session?.user ?? null;
  }

  setSession(session: UserSession): void {
    this.session = session;
  }

  clear(): void {
    this.session = null;
  }
}