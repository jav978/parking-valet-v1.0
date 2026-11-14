import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { FluidModule } from 'primeng/fluid';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message';
import { DialogModule } from 'primeng/dialog';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, FluidModule, InputTextModule, PasswordModule, ButtonModule, MessageModule, DialogModule],
  templateUrl: './login.html',
  styleUrl: './login.scss'
})
export class Login {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);

  loading = signal(false);
  error = signal<string | null>(null);
  showActiveSessionDialog = signal(false);

  form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]]
  });

  onSubmit(forceLogin = false): void {
    if (this.form.invalid) return;

    this.loading.set(true);
    this.error.set(null);

    const payload = { ...this.form.getRawValue(), forceLogin };

    this.authService.login(payload).subscribe({
      next: () => this.router.navigate(['/dashboard']),
      error: (err) => {
        this.loading.set(false);
        const errorMsg = err.error?.message || '';
        if (err.status === 409 || errorMsg.includes('ACTIVE_SESSION_EXISTS')) {
          this.showActiveSessionDialog.set(true);
        } else {
          this.error.set(errorMsg || 'Error al iniciar sesión. Verifica tus credenciales.');
        }
      }
    });
  }

  confirmForceLogin(): void {
    this.showActiveSessionDialog.set(false);
    this.onSubmit(true);
  }
}
