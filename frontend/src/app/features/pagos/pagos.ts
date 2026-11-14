import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { SelectModule } from 'primeng/select';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { MessageModule } from 'primeng/message';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { MessageService, SharedModule } from 'primeng/api';
import { catchError, of, tap } from 'rxjs';

import {
  Payment,
  CreatePaymentRequest,
  PaymentFilterParams,
  PAYMENT_METHOD_LABELS,
} from '../../core/interfaces/payment';
import { PaymentService } from '../../core/services/payment.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-pagos',
  standalone: true,
  imports: [
    CommonModule, FormsModule, TableModule, DialogModule, ButtonModule,
    InputTextModule, InputNumberModule, SelectModule,
    IconFieldModule, InputIconModule, MessageModule, ToastModule, TooltipModule,
    SharedModule
  ],
  providers: [MessageService],
  templateUrl: './pagos.html',
  styleUrl: './pagos.scss',
})
export class Pagos implements OnInit {
  protected Number = Number;
  private paymentService = inject(PaymentService);
  private authService = inject(AuthService);
  private toast = inject(MessageService);

  payments = signal<Payment[]>([]);
  loading = signal(false);
  total = signal(0);
  limit = signal(20);
  offset = signal(0);

  showCreateDialog = false;
  showDetailDialog = false;
  selectedPayment = signal<Payment | undefined>(undefined);

  createData: CreatePaymentRequest = {
    ticketId: '',
    paymentMethod: 'CASH',
    amount: 0,
  };

  filter: PaymentFilterParams = {};
  searchTerm = '';

  paymentMethods = Object.entries(PAYMENT_METHOD_LABELS).map(([value, label]) => ({ value, label }));

  canCreatePayment = computed(() =>
    this.authService.hasPermission('payments.create') ||
    ['ADMIN', 'SUPERVISOR', 'CASHIER'].includes(this.authService.user()?.role ?? '')
  );

  canDeletePayment = computed(() =>
    this.authService.hasPermission('payments.delete') ||
    ['ADMIN', 'SUPERVISOR'].includes(this.authService.user()?.role ?? '')
  );

  ngOnInit() {
    this.loadPayments();
  }

  loadPayments() {
    this.loading.set(true);
    this.paymentService.getPayments({
      ...this.filter,
      limit: this.limit(),
      offset: this.offset(),
    }).pipe(
      tap(response => {
        this.payments.set(response.data.data);
        this.total.set(response.data.total);
        this.loading.set(false);
      }),
      catchError(err => {
        this.toast.add({ severity: 'error', summary: 'Error', detail: 'Error al cargar pagos' });
        this.loading.set(false);
        return of(null);
      })
    ).subscribe();
  }

  onSearch() {
    this.filter = { ...this.filter, ticketNumber: this.searchTerm };
    this.offset.set(0);
    this.loadPayments();
  }

  clearFilters() {
    this.filter = {};
    this.searchTerm = '';
    this.offset.set(0);
    this.loadPayments();
  }

  onPageChange(event: any) {
    this.limit.set(event.rows);
    this.offset.set(event.first);
    this.loadPayments();
  }

  openCreateDialog() {
    this.createData = { ticketId: '', paymentMethod: 'CASH', amount: 0 };
    this.showCreateDialog = true;
  }

  openDetailDialog(payment: Payment) {
    this.selectedPayment.set(payment);
    this.showDetailDialog = true;
  }

  createPayment() {
    if (!this.createData.ticketId || this.createData.amount <= 0) {
      this.toast.add({ severity: 'warn', summary: 'Campos requeridos', detail: 'Ingrese ID del ticket y monto' });
      return;
    }

    if (!confirm(`Registrar pago de $${this.createData.amount.toFixed(2)}?`)) {
      return;
    }

    this.paymentService.create(this.createData).pipe(
      tap(() => {
        this.toast.add({ severity: 'success', summary: 'Éxito', detail: 'Pago registrado' });
        this.showCreateDialog = false;
        this.loadPayments();
      }),
      catchError(err => {
        this.toast.add({ severity: 'error', summary: 'Error', detail: err.error?.message || 'Error al registrar pago' });
        return of(null);
      })
    ).subscribe();
  }

  deletePayment(payment: Payment) {
    if (!confirm(`Anular este pago de $${Number(payment.amount).toFixed(2)}?`)) {
      return;
    }

    this.paymentService.delete(payment.id).pipe(
      tap(() => {
        this.toast.add({ severity: 'success', summary: 'Éxito', detail: 'Pago anulado' });
        this.loadPayments();
      }),
      catchError(err => {
        this.toast.add({ severity: 'error', summary: 'Error', detail: err.error?.message || 'Error al anular' });
        return of(null);
      })
    ).subscribe();
  }

  getPaymentMethodLabel(method: string): string {
    return PAYMENT_METHOD_LABELS[method as keyof typeof PAYMENT_METHOD_LABELS] || method;
  }
}
