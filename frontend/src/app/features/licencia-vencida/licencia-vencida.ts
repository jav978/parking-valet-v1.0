import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { LicenseService, LicenseStatusResponse } from '../../core/services/license.service';

@Component({
  selector: 'app-licencia-vencida',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    InputTextModule,
    MessageModule,
    ToastModule
  ],
  providers: [MessageService],
  templateUrl: './licencia-vencida.html'
})
export class LicenciaVencida implements OnInit {
  private licenseService = inject(LicenseService);
  private messageService = inject(MessageService);
  private router = inject(Router);

  status = signal<LicenseStatusResponse | null>(null);
  licenseKeyInput = signal<string>('');
  loading = signal<boolean>(false);
  errorMsg = signal<string | null>(null);

  ngOnInit(): void {
    this.checkStatus();
  }

  checkStatus(): void {
    this.licenseService.getStatus().subscribe({
      next: (res) => {
        this.status.set(res);
        // If system is active or inactive, redirect back to dashboard
        if (!res.isSubscriptionActive || res.status === 'ACTIVE' || res.status === 'WARNING') {
          this.router.navigate(['/dashboard']);
        }
      },
      error: (err) => console.error('Error fetching license status:', err)
    });
  }

  onSubmitKey(): void {
    const key = this.licenseKeyInput().trim();
    if (!key) {
      this.errorMsg.set('Por favor ingrese su clave de licencia VALET-XXXX-YYYY-ZZZZ');
      return;
    }

    this.loading.set(true);
    this.errorMsg.set(null);

    this.licenseService.activateLicense(key).subscribe({
      next: (res) => {
        this.loading.set(false);
        this.messageService.add({
          severity: 'success',
          summary: '¡Licencia Activada!',
          detail: res.message || 'El sistema ha sido desbloqueado exitosamente.'
        });
        setTimeout(() => this.router.navigate(['/dashboard']), 1200);
      },
      error: (err) => {
        this.loading.set(false);
        this.errorMsg.set(err.error?.message || 'Error al validar la clave de licencia.');
      }
    });
  }
}
