import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { Preferences, PreferencesService } from '../services/preferences.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent {
  username = '';
  password = '';
  busy = false;
  message = '';
  preferences: Preferences;

  constructor(
    private router: Router,
    private authService: AuthService,
    private preferencesService: PreferencesService
  ) {
    this.preferences = this.preferencesService.load();
  }

  async login(): Promise<void> {
    this.message = '';
    if (this.username.trim() === '') {
      this.message = '<strong>Ingrese un usuario.</strong>';
      return;
    }
    if (this.password.trim() === '') {
      this.message = '<strong>Ingrese una contraseña.</strong>';
      return;
    }

    this.busy = true;
    try {
      await this.authService.login({
        username: this.username,
        password: this.password
      });
      this.preferencesService.save(this.preferences);
      await this.router.navigate(['/dashboard']);
    } catch {
      this.message = '<strong>No se pudo autenticar.</strong>';
    } finally {
      this.busy = false;
    }
  }
}
