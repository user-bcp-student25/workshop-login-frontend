import { Injectable } from '@angular/core';
import axios from 'axios';
import { environment } from '../../environments/environment';
import { LoginCredentials, LoginRequest, LoginResponse } from '../models/auth.models';
import { SessionService } from './session.service';

@Injectable({ providedIn: 'root' })
export class AuthService {
  constructor(private session: SessionService) {}

  async login(credentials: LoginCredentials): Promise<void> {
    try {
      const request: LoginRequest = { ...credentials, client: environment.loginClientId };
      const response = await axios.post<LoginResponse>(environment.authUrl, request, {
        timeout: environment.authTimeoutMs
      });
      const login = response.data;
      if (!login?.token || !login.user) {
        throw new Error('Invalid login response');
      }
      this.session.setSession({ token: login.token, user: login.user });
    } catch {
      throw new Error('No se pudo autenticar. Verifica tus credenciales.');
    }
  }
}