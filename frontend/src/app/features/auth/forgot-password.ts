import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { FluidModule } from 'primeng/fluid';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, FluidModule, InputTextModule, ButtonModule, MessageModule],
  templateUrl: './forgot-password.html',
  styleUrl: './forgot-password.scss'
})
export class ForgotPassword {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);

  loading = signal(false);
  error = signal<string | null>(null);
  successMessage = signal<string | null>(null);

  form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]]
  });

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.error.set(null);
    this.successMessage.set(null);

    this.authService.forgotPassword(this.form.controls.email.value).subscribe({
      next: (res) => {
        this.loading.set(false);
        this.successMessage.set(res.data?.message || 'Si el correo electrónico está registrado, recibirás un enlace de recuperación.');
        this.form.reset();
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err.error?.message || 'Error al procesar la solicitud. Intenta de nuevo.');
      }
    });
  }
}
