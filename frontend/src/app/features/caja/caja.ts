import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { SelectModule } from 'primeng/select';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { MessageService, ConfirmationService, SharedModule } from 'primeng/api';
import { catchError, finalize, of } from 'rxjs';

import {
  CashRegister,
  CashRegisterMovement,
  MovementType,
  OpenCashRegisterRequest,
  CloseCashRegisterRequest,
  CreateMovementRequest,
} from '../../core/interfaces/cash-register';
import { ParkingLot } from '../../core/interfaces/parking-lot';
import { CashRegisterService } from '../../core/services/cash-register.service';
import { ParkingLotService } from '../../core/services/parking-lot.service';
import { AuthService } from '../../core/services/auth.service';
import { ExchangeRateService, RateModality } from '../../core/services/exchange-rate.service';

@Component({
  selector: 'app-caja',
  standalone: true,
  imports: [
    CommonModule, FormsModule, TableModule, DialogModule, ButtonModule,
    InputTextModule, InputNumberModule, SelectModule, IconFieldModule,
    InputIconModule, ToastModule, ConfirmDialogModule, TagModule, TooltipModule,
    SharedModule, DatePipe
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './caja.html',
  styleUrl: './caja.scss',
})
export class Caja implements OnInit {
  protected Number = Number;
  private cashRegisterService = inject(CashRegisterService);
  private parkingLotService = inject(ParkingLotService);
  private authService = inject(AuthService);
  public exchangeRateService = inject(ExchangeRateService);
  private toast = inject(MessageService);
  private confirmationService = inject(ConfirmationService);

  // Core Data Signals
  activeRegister = signal<CashRegister | null>(null);
  registers = signal<CashRegister[]>([]);
  parkingLots = signal<ParkingLot[]>([]);
  loading = signal<boolean>(false);
  submitting = signal<boolean>(false);

  // Dynamic Exchange Rate from Service
  exchangeRate = computed(() => this.exchangeRateService.activeRate());

  // Filter Signals
  searchTerm = signal('');
  selectedLotId = signal<string | null>(null);
  selectedStatus = signal<string | null>(null);

  // Dialog Visibility Flags
  openDialogVisible: boolean = false;
  closeDialogVisible: boolean = false;
  movementDialogVisible: boolean = false;
  detailDialogVisible: boolean = false;

  // Selected Register for Details / Action
  selectedRegister = signal<CashRegister | null>(null);

  // Form Data
  openFormData: OpenCashRegisterRequest = {
    lotId: '',
    name: 'Caja Turno Principal',
    openingBalance: 50,
    notes: '',
  };

  closeFormData: CloseCashRegisterRequest = {
    closingBalance: 0,
    notes: '',
  };

  movementFormData: CreateMovementRequest = {
    type: 'INCOME',
    amount: 10,
    description: '',
    referenceNumber: '',
  };

  // Movement Types
  movementTypeOptions = [
    { label: 'Ingreso (Entrada)', value: 'INCOME', icon: 'pi pi-plus-circle' },
    { label: 'Egreso (Salida / Retiro)', value: 'EXPENSE', icon: 'pi pi-minus-circle' },
  ];

  statusOptions = [
    { label: 'Todos los estados', value: null },
    { label: 'Abiertas', value: 'OPEN' },
    { label: 'Cerradas', value: 'CLOSED' },
  ];

  // Computed Values
  totalRegistersCount = computed(() => this.registers().length);
  openRegistersCount = computed(() => this.registers().filter(r => r.status === 'OPEN').length);
  totalOpeningFund = computed(() => {
    return this.registers()
      .filter(r => r.status === 'OPEN')
      .reduce((acc, curr) => acc + Number(curr.openingBalance), 0);
  });

  filteredRegisters = computed(() => {
    let result = this.registers();

    const term = this.searchTerm().trim().toLowerCase();
    if (term) {
      result = result.filter(r =>
        r.name.toLowerCase().includes(term) ||
        (r.lot?.name && r.lot.name.toLowerCase().includes(term)) ||
        (r.openedBy?.firstName && r.openedBy.firstName.toLowerCase().includes(term)) ||
        (r.openedBy?.lastName && r.openedBy.lastName.toLowerCase().includes(term))
      );
    }

    if (this.selectedLotId()) {
      result = result.filter(r => r.lotId === this.selectedLotId());
    }

    if (this.selectedStatus()) {
      result = result.filter(r => r.status === this.selectedStatus());
    }

    return result;
  });

  // Dynamic Arqueo Calculation for Closing Modal
  closingArqueo = computed(() => {
    const active = this.activeRegister();
    if (!active || !active.currentSummary) return null;

    const expected = active.currentSummary.expectedBalance;
    const realCount = this.closeFormData.closingBalance || 0;
    const difference = realCount - expected;
    const exRate = this.exchangeRate();

    return {
      expectedUSD: expected,
      expectedVES: expected * exRate,
      realCountUSD: realCount,
      realCountVES: realCount * exRate,
      differenceUSD: difference,
      differenceVES: difference * exRate,
      isPerfect: Math.abs(difference) < 0.01,
      isSurplus: difference > 0.01,
      isDeficit: difference < -0.01,
    };
  });

  refreshRates(): void {
    this.exchangeRateService.fetchLiveRates(true).subscribe(() => {
      this.toast.add({ severity: 'success', summary: 'Tasas Actualizadas', detail: 'Se han consultado las APIs oficiales de BCV y Binance en tiempo real' });
    });
  }

  selectRateModality(mod: RateModality): void {
    this.exchangeRateService.setModality(mod);
  }

  ngOnInit(): void {
    this.loadParkingLots();
    this.loadActiveRegister();
    this.loadHistorial();
  }

  loadActiveRegister(lotId?: string): void {
    const targetLotId = lotId || this.selectedLotId() || undefined;
    this.cashRegisterService.getActive(targetLotId).pipe(
      catchError(() => of({ data: null }))
    ).subscribe((res: any) => {
      this.activeRegister.set(res?.data || null);
    });
  }

  loadHistorial(): void {
    this.loading.set(true);
    this.cashRegisterService.getCashRegisters({ limit: 100 }).pipe(
      catchError(() => of({ data: [] })),
      finalize(() => this.loading.set(false))
    ).subscribe((res: any) => {
      const list = res?.data || (Array.isArray(res) ? res : []);
      this.registers.set(list);
    });
  }

  loadParkingLots(): void {
    this.parkingLotService.getParkingLots({ limit: 100 }).pipe(
      catchError(() => of({ data: [] }))
    ).subscribe((res: any) => {
      const list = res?.data || (Array.isArray(res) ? res : []);
      this.parkingLots.set(list);
      if (list.length > 0 && !this.openFormData.lotId) {
        this.openFormData.lotId = list[0].id;
      }
    });
  }

  openOpenDialog(): void {
    if (this.parkingLots().length > 0 && !this.openFormData.lotId) {
      this.openFormData.lotId = this.parkingLots()[0].id;
    }
    this.openDialogVisible = true;
  }

  submitOpen(): void {
    if (!this.openFormData.lotId || !this.openFormData.name) {
      this.toast.add({ severity: 'warn', summary: 'Campos Requeridos', detail: 'Selecciona un estacionamiento e ingresa el nombre de la caja' });
      return;
    }

    this.submitting.set(true);
    this.cashRegisterService.open(this.openFormData).pipe(
      catchError(err => {
        this.submitting.set(false);
        this.toast.add({ severity: 'error', summary: 'Error al abrir caja', detail: err.error?.message || 'No se pudo abrir la caja' });
        return of(null);
      })
    ).subscribe(res => {
      this.submitting.set(false);
      if (res) {
        this.toast.add({ severity: 'success', summary: 'Caja Abierta', detail: 'Turno de caja iniciado exitosamente' });
        this.openDialogVisible = false;
        this.loadActiveRegister();
        this.loadHistorial();
      }
    });
  }

  openCloseDialog(register?: CashRegister): void {
    const target = register || this.activeRegister();
    if (!target) return;

    this.selectedRegister.set(target);
    const expected = target.currentSummary?.expectedBalance || Number(target.expectedBalance) || Number(target.openingBalance);
    this.closeFormData = {
      closingBalance: expected,
      notes: '',
    };
    this.closeDialogVisible = true;
  }

  submitClose(): void {
    const reg = this.selectedRegister() || this.activeRegister();
    if (!reg) return;

    this.submitting.set(true);
    this.cashRegisterService.close(reg.id, this.closeFormData).pipe(
      catchError(err => {
        this.submitting.set(false);
        this.toast.add({ severity: 'error', summary: 'Error al cerrar caja', detail: err.error?.message || 'No se pudo realizar el cierre' });
        return of(null);
      })
    ).subscribe(res => {
      this.submitting.set(false);
      if (res) {
        this.toast.add({ severity: 'success', summary: 'Cierre Completado', detail: 'La caja ha sido cerrada y auditada' });
        this.closeDialogVisible = false;
        this.loadActiveRegister();
        this.loadHistorial();
      }
    });
  }

  openMovementDialog(): void {
    if (!this.activeRegister()) {
      this.toast.add({ severity: 'warn', summary: 'Caja requerida', detail: 'Debes tener una caja abierta para registrar movimientos' });
      return;
    }
    this.movementFormData = {
      type: 'INCOME',
      amount: 10,
      description: '',
      referenceNumber: '',
    };
    this.movementDialogVisible = true;
  }

  submitMovement(): void {
    const active = this.activeRegister();
    if (!active) return;

    if (!this.movementFormData.amount || this.movementFormData.amount <= 0) {
      this.toast.add({ severity: 'warn', summary: 'Monto inválido', detail: 'Ingresa un monto mayor a 0' });
      return;
    }

    this.submitting.set(true);
    this.cashRegisterService.addMovement(active.id, this.movementFormData).pipe(
      catchError(err => {
        this.submitting.set(false);
        this.toast.add({ severity: 'error', summary: 'Error', detail: err.error?.message || 'No se pudo registrar el movimiento' });
        return of(null);
      })
    ).subscribe(res => {
      this.submitting.set(false);
      if (res) {
        this.toast.add({ severity: 'success', summary: 'Movimiento Registrado', detail: `${this.movementFormData.type === 'INCOME' ? 'Ingreso' : 'Egreso'} registrado con éxito` });
        this.movementDialogVisible = false;
        this.loadActiveRegister();
      }
    });
  }

  openDetailDialog(register: CashRegister): void {
    this.cashRegisterService.getCashRegister(register.id).pipe(
      catchError(() => of({ data: register }))
    ).subscribe(res => {
      this.selectedRegister.set(res.data || register);
      this.detailDialogVisible = true;
    });
  }
}
