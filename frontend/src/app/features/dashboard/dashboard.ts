import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule, DatePipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';
import { ToastModule } from 'primeng/toast';
import { MessageModule } from 'primeng/message';
import { ProgressBarModule, ProgressBar } from 'primeng/progressbar';
import { MessageService } from 'primeng/api';
import { catchError, of } from 'rxjs';

import { DashboardService } from '../../core/services/dashboard.service';
import { DashboardStats } from '../../core/interfaces/dashboard';
import { AuthService } from '../../core/services/auth.service';
import { ExchangeRateService } from '../../core/services/exchange-rate.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    DatePipe,
    DecimalPipe,
    TableModule,
    ButtonModule,
    SelectModule,
    ToastModule,
    MessageModule,
    ProgressBarModule,
    ProgressBar,
  ],
  providers: [MessageService],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class Dashboard implements OnInit {
  protected Math = Math;
  private dashboardService = inject(DashboardService);
  private authService = inject(AuthService);
  public exchangeRateService = inject(ExchangeRateService);
  private toast = inject(MessageService);

  user = computed(() => this.authService.user());
  stats = signal<DashboardStats | null>(null);
  loading = signal(true);
  selectedLotId = signal<string | undefined>(undefined);

  ngOnInit(): void {
    this.loadStats();
  }

  loadStats(): void {
    this.loading.set(true);
    this.dashboardService
      .getStats(this.selectedLotId())
      .pipe(
        catchError((err) => {
          const errMsg = err.error?.message || 'Error al cargar estadísticas del dashboard';
          this.toast.add({ severity: 'error', summary: 'Error', detail: errMsg });
          this.loading.set(false);
          return of(null);
        })
      )
      .subscribe((res) => {
        if (res?.data) {
          this.stats.set(res.data);
        }
        this.loading.set(false);
      });
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'ACTIVE':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'COMPLETED':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'CANCELLED':
        return 'bg-red-500/10 text-red-400 border-red-500/20';
      case 'LOST':
        return 'bg-orange-500/10 text-orange-400 border-orange-500/20';
      default:
        return 'bg-surface-700 text-surface-200 border-surface-600';
    }
  }

  getStatusLabel(status: string): string {
    switch (status) {
      case 'ACTIVE':
        return 'Estacionado';
      case 'COMPLETED':
        return 'Completado';
      case 'CANCELLED':
        return 'Cancelado';
      case 'LOST':
        return 'Ticket Extraviado';
      default:
        return status;
    }
  }

  getPaymentStatusClass(paymentStatus: string): string {
    switch (paymentStatus) {
      case 'PAID':
        return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
      case 'PENDING':
        return 'bg-amber-500/15 text-amber-400 border-amber-500/30';
      case 'PARTIAL':
        return 'bg-blue-500/15 text-blue-400 border-blue-500/30';
      case 'EXEMPT':
        return 'bg-purple-500/15 text-purple-400 border-purple-500/30';
      default:
        return 'bg-surface-700 text-surface-200 border-surface-600';
    }
  }

  getPaymentStatusLabel(paymentStatus: string): string {
    switch (paymentStatus) {
      case 'PAID':
        return 'Pagado';
      case 'PENDING':
        return 'Pendiente';
      case 'PARTIAL':
        return 'Parcial';
      case 'EXEMPT':
        return 'Exento';
      default:
        return paymentStatus;
    }
  }
}
