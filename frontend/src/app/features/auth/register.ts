import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { FluidModule } from 'primeng/fluid';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message';
import { AuthService } from '../../core/services/auth.service';

function passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
  const password = control.get('password')?.value;
  const confirmPassword = control.get('confirmPassword')?.value;
  if (password && confirmPassword && password !== confirmPassword) {
    return { passwordMismatch: true };
  }
  return null;
}

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, FluidModule, InputTextModule, PasswordModule, ButtonModule, MessageModule],
  templateUrl: './register.html',
  styleUrl: './register.scss'
})
export class Register {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);

  loading = signal(false);
  error = signal<string | null>(null);
  successMessage = signal<string | null>(null);

  form = this.fb.nonNullable.group(
    {
      firstName: ['', [Validators.required, Validators.minLength(2)]],
      lastName: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      phone: [''],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]]
    },
    { validators: passwordMatchValidator }
  );

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.error.set(null);
    this.successMessage.set(null);

    const val = this.form.getRawValue();

    this.authService.register({
      firstName: val.firstName,
      lastName: val.lastName,
      email: val.email,
      phone: val.phone || undefined,
      password: val.password
    }).subscribe({
      next: () => {
        this.loading.set(false);
        this.successMessage.set('¡Registro exitoso! Redirigiendo a tu panel...');
        setTimeout(() => {
          this.router.navigate(['/dashboard']);
        }, 1500);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err.error?.message || 'Error al registrar la cuenta. Intenta de nuevo.');
      }
    });
  }
}
