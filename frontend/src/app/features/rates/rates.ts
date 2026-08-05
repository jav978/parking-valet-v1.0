import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
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

import { Rate, SpotType, RateType, CreateRateRequest, UpdateRateRequest } from '../../core/interfaces/rate';
import { ParkingLot } from '../../core/interfaces/parking-lot';
import { RateService } from '../../core/services/rate.service';
import { ParkingLotService } from '../../core/services/parking-lot.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-rates',
  standalone: true,
  imports: [
    CommonModule, FormsModule, TableModule, DialogModule, ButtonModule,
    InputTextModule, InputNumberModule, SelectModule, IconFieldModule,
    InputIconModule, ToastModule, ConfirmDialogModule, TagModule, TooltipModule,
    SharedModule, CurrencyPipe
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './rates.html',
  styleUrl: './rates.scss',
})
export class Rates implements OnInit {
  protected Number = Number;
  private rateService = inject(RateService);
  private parkingLotService = inject(ParkingLotService);
  private authService = inject(AuthService);
  private toast = inject(MessageService);
  private confirmationService = inject(ConfirmationService);

  // Core Data Signals
  rates = signal<Rate[]>([]);
  parkingLots = signal<ParkingLot[]>([]);
  spotTypes = signal<SpotType[]>([]);
  loading = signal<boolean>(false);
  submitting = signal<boolean>(false);

  // Multi-Currency State
  exchangeRate = signal<number>(68.50); // Tasa de Cambio USD -> VES
  displayCurrency = signal<'BOTH' | 'USD' | 'VES'>('BOTH');
  rateDialogRateInput: number = 68.50;

  // Filters
  searchTerm = signal('');
  selectedLotId = signal<string | null>(null);
  selectedSpotTypeId = signal<string | null>(null);
  selectedRateType = signal<RateType | null>(null);
  activeStatusFilter = signal<boolean | null>(null);

  // Dialog Visibility Flags (Standard mutable booleans for PrimeNG [(visible)])
  dialogVisible: boolean = false;
  isEditMode: boolean = false;
  editingId: string | null = null;

  rateConfigDialogVisible: boolean = false;
  simulatorVisible: boolean = false;

  // Simulator State
  simRateId: string | null = null;
  simHours: number = 2;
  simMinutes: number = 30;
  simCustomDiscount: number = 0;

  // Constants & Dropdown Options
  rateTypeOptions: { label: string; value: RateType; icon: string }[] = [
    { label: 'Por Hora', value: 'HOURLY', icon: 'pi pi-clock' },
    { label: 'Por Fracción', value: 'FRACTIONAL', icon: 'pi pi-percentage' },
    { label: 'Nocturna', value: 'NIGHTLY', icon: 'pi pi-moon' },
    { label: 'Mensual', value: 'MONTHLY', icon: 'pi pi-calendar' },
    { label: 'Tarifa Fija', value: 'FLAT', icon: 'pi pi-tag' },
    { label: 'Especial', value: 'SPECIAL', icon: 'pi pi-star' },
  ];

  currencyDisplayOptions = [
    { label: 'Dólares ($) y Bolívares (Bs.)', value: 'BOTH' },
    { label: 'Solo Dólares ($)', value: 'USD' },
    { label: 'Solo Bolívares (Bs.)', value: 'VES' },
  ];

  statusOptions = [
    { label: 'Todos los estados', value: null },
    { label: 'Activas', value: true },
    { label: 'Inactivas', value: false },
  ];

  formData: CreateRateRequest = this.getEmptyForm();

  // Computed Statistics
  totalRatesCount = computed(() => this.rates().length);
  activeRatesCount = computed(() => this.rates().filter(r => r.isActive).length);
  avgHourlyRateUSD = computed(() => {
    const hourlyRates = this.rates().filter(r => r.rateType === 'HOURLY' && r.isActive);
    if (hourlyRates.length === 0) return 0;
    const sum = hourlyRates.reduce((acc, curr) => acc + Number(curr.baseAmount), 0);
    return sum / hourlyRates.length;
  });
  avgHourlyRateVES = computed(() => this.avgHourlyRateUSD() * this.exchangeRate());
  configuredLotsCount = computed(() => new Set(this.rates().map(r => r.lotId)).size);

  // Filtered List
  filteredRates = computed(() => {
    let result = this.rates();

    const term = this.searchTerm().trim().toLowerCase();
    if (term) {
      result = result.filter(r =>
        r.name.toLowerCase().includes(term) ||
        (r.lot?.name && r.lot.name.toLowerCase().includes(term)) ||
        (r.spotType?.name && r.spotType.name.toLowerCase().includes(term))
      );
    }

    if (this.selectedLotId()) {
      result = result.filter(r => r.lotId === this.selectedLotId());
    }

    if (this.selectedSpotTypeId()) {
      result = result.filter(r => r.spotTypeId === this.selectedSpotTypeId());
    }

    if (this.selectedRateType()) {
      result = result.filter(r => r.rateType === this.selectedRateType());
    }

    if (this.activeStatusFilter() !== null) {
      result = result.filter(r => r.isActive === this.activeStatusFilter());
    }

    return result;
  });

  // Multi-Currency Simulator Calculation
  simResult = computed(() => {
    const rateId = this.simRateId;
    if (!rateId) return null;

    const rate = this.rates().find(r => r.id === rateId);
    if (!rate) return null;

    const hours = this.simHours || 0;
    const minutes = this.simMinutes || 0;
    const totalMinutes = (hours * 60) + minutes;
    const exRate = this.exchangeRate();

    let baseCostUSD = 0;
    let details = '';

    const baseAmt = Number(rate.baseAmount) || 0;

    switch (rate.rateType) {
      case 'HOURLY': {
        const billedHours = Math.ceil(totalMinutes / 60) || 1;
        baseCostUSD = billedHours * baseAmt;
        details = `${billedHours} hora(s) × $${baseAmt.toFixed(2)}`;
        break;
      }
      case 'FRACTIONAL': {
        const fracMins = rate.fractionalMinutes || 15;
        const fracRate = Number(rate.fractionalRate) || (baseAmt / 4);
        if (totalMinutes <= 60) {
          baseCostUSD = baseAmt;
          details = `1a hora base: $${baseAmt.toFixed(2)}`;
        } else {
          const extraMins = totalMinutes - 60;
          const extraFracs = Math.ceil(extraMins / fracMins);
          baseCostUSD = baseAmt + (extraFracs * fracRate);
          details = `Base (1h): $${baseAmt.toFixed(2)} + ${extraFracs} fracc (${fracMins}m) × $${fracRate.toFixed(2)}`;
        }
        break;
      }
      case 'NIGHTLY': {
        baseCostUSD = Number(rate.nightRate) || baseAmt;
        details = `Tarifa Plana Nocturna`;
        break;
      }
      case 'MONTHLY': {
        baseCostUSD = Number(rate.monthlyRate) || baseAmt;
        details = `Pase Mensual Fijo`;
        break;
      }
      case 'FLAT':
      case 'SPECIAL':
      default: {
        baseCostUSD = baseAmt;
        details = `Tarifa Plana / Especial`;
        break;
      }
    }

    // Apply Daily Max Cap if configured
    let capped = false;
    if (rate.dailyMax && Number(rate.dailyMax) > 0 && baseCostUSD > Number(rate.dailyMax)) {
      baseCostUSD = Number(rate.dailyMax);
      capped = true;
      details += ` (Limitado a Máx. Diario $${Number(rate.dailyMax).toFixed(2)})`;
    }

    // Discount
    const discountUSD = this.simCustomDiscount || 0;
    const subtotalAfterDiscountUSD = Math.max(0, baseCostUSD - discountUSD);

    // Tax calculation (16% standard VAT / IVA)
    const taxPct = 16;
    const taxAmountUSD = (subtotalAfterDiscountUSD * taxPct) / 100;
    const totalAmountUSD = subtotalAfterDiscountUSD + taxAmountUSD;

    // Conversión a Bolívares (VES)
    const baseCostVES = baseCostUSD * exRate;
    const discountVES = discountUSD * exRate;
    const taxAmountVES = taxAmountUSD * exRate;
    const totalAmountVES = totalAmountUSD * exRate;

    return {
      rate,
      totalMinutes,
      hoursFormatted: `${hours}h ${minutes}m`,
      baseCostUSD,
      baseCostVES,
      discountUSD,
      discountVES,
      capped,
      taxPct,
      taxAmountUSD,
      taxAmountVES,
      totalAmountUSD,
      totalAmountVES,
      exchangeRate: exRate,
      details
    };
  });

  // Permissions (Always accessible for UI control)
  canCreate = computed(() => true);
  canEdit = computed(() => true);
  canDelete = computed(() => true);

  ngOnInit(): void {
    this.loadRates();
    this.loadParkingLots();
    this.loadSpotTypes();
  }

  loadRates(): void {
    this.loading.set(true);
    this.rateService.getRates({ limit: 100 }).pipe(
      catchError(err => {
        this.toast.add({ severity: 'error', summary: 'Error', detail: err.error?.message || 'No se pudieron cargar las tarifas' });
        return of({ data: [] });
      }),
      finalize(() => this.loading.set(false))
    ).subscribe((res: any) => {
      const list = res?.data || (Array.isArray(res) ? res : []);
      this.rates.set(list);
    });
  }

  loadParkingLots(): void {
    this.parkingLotService.getParkingLots({ limit: 100 }).pipe(
      catchError(() => of({ data: [] }))
    ).subscribe((res: any) => {
      const list = res?.data || (Array.isArray(res) ? res : []);
      this.parkingLots.set(list);
    });
  }

  loadSpotTypes(): void {
    this.rateService.getSpotTypes().pipe(
      catchError(() => of([]))
    ).subscribe((res: any) => {
      const list = res?.data || (Array.isArray(res) ? res : []);
      this.spotTypes.set(list);
    });
  }

  openRateConfigDialog(): void {
    this.rateDialogRateInput = this.exchangeRate();
    this.rateConfigDialogVisible = true;
  }

  saveExchangeRate(): void {
    const val = this.rateDialogRateInput;
    if (val && val > 0) {
      this.exchangeRate.set(val);
      this.rateConfigDialogVisible = false;
      this.toast.add({
        severity: 'success',
        summary: 'Tasa Actualizada',
        detail: `La tasa de cambio se actualizó a ${val.toFixed(2)} Bs/$`
      });
    }
  }

  getEmptyForm(): CreateRateRequest {
    return {
      lotId: '',
      spotTypeId: '',
      name: '',
      rateType: 'HOURLY',
      baseAmount: 30,
      fractionalMinutes: 15,
      fractionalRate: 10,
      dailyMax: 200,
      isActive: true,
    };
  }

  openCreateDialog(): void {
    this.formData = this.getEmptyForm();

    if (this.parkingLots().length > 0) {
      this.formData.lotId = this.parkingLots()[0].id;
    }
    if (this.spotTypes().length > 0) {
      this.formData.spotTypeId = this.spotTypes()[0].id;
    }

    this.isEditMode = false;
    this.editingId = null;
    this.dialogVisible = true;
  }

  openEditDialog(rate: Rate): void {
    this.formData = {
      lotId: rate.lotId,
      spotTypeId: rate.spotTypeId,
      name: rate.name,
      rateType: rate.rateType,
      baseAmount: Number(rate.baseAmount),
      fractionalMinutes: rate.fractionalMinutes ?? undefined,
      fractionalRate: rate.fractionalRate ? Number(rate.fractionalRate) : undefined,
      dailyMax: rate.dailyMax ? Number(rate.dailyMax) : undefined,
      nightRate: rate.nightRate ? Number(rate.nightRate) : undefined,
      monthlyRate: rate.monthlyRate ? Number(rate.monthlyRate) : undefined,
      isActive: rate.isActive,
      effectiveFrom: rate.effectiveFrom ? rate.effectiveFrom.substring(0, 10) : undefined,
      effectiveTo: rate.effectiveTo ? rate.effectiveTo.substring(0, 10) : undefined,
    };

    this.isEditMode = true;
    this.editingId = rate.id;
    this.dialogVisible = true;
  }

  saveRate(): void {
    if (!this.formData.lotId || !this.formData.spotTypeId || !this.formData.name || !this.formData.baseAmount) {
      this.toast.add({ severity: 'warn', summary: 'Campos requeridos', detail: 'Por favor completa todos los campos obligatorios' });
      return;
    }

    this.submitting.set(true);

    if (this.isEditMode && this.editingId) {
      const updateData: UpdateRateRequest = { ...this.formData };
      this.rateService.updateRate(this.editingId, updateData).pipe(
        catchError(err => {
          this.submitting.set(false);
          this.toast.add({ severity: 'error', summary: 'Error al actualizar', detail: err.error?.message || 'Error guardando tarifa' });
          return of(null);
        })
      ).subscribe(res => {
        this.submitting.set(false);
        if (res) {
          this.toast.add({ severity: 'success', summary: 'Tarifa Actualizada', detail: 'La tarifa se modificó correctamente' });
          this.dialogVisible = false;
          this.loadRates();
        }
      });
    } else {
      this.rateService.createRate(this.formData).pipe(
        catchError(err => {
          this.submitting.set(false);
          this.toast.add({ severity: 'error', summary: 'Error al crear', detail: err.error?.message || 'Error registrando tarifa' });
          return of(null);
        })
      ).subscribe(res => {
        this.submitting.set(false);
        if (res) {
          this.toast.add({ severity: 'success', summary: 'Tarifa Creada', detail: 'La nueva tarifa ha sido registrada' });
          this.dialogVisible = false;
          this.loadRates();
        }
      });
    }
  }

  toggleStatus(rate: Rate): void {
    const newStatus = !rate.isActive;
    this.rateService.updateRate(rate.id, { isActive: newStatus }).pipe(
      catchError(err => {
        this.toast.add({ severity: 'error', summary: 'Error', detail: 'No se pudo cambiar el estado de la tarifa' });
        return of(null);
      })
    ).subscribe(res => {
      if (res) {
        this.toast.add({
          severity: 'info',
          summary: 'Estado cambiado',
          detail: `Tarifa "${rate.name}" ahora está ${newStatus ? 'Activa' : 'Inactiva'}`
        });
        this.loadRates();
      }
    });
  }

  confirmDelete(rate: Rate): void {
    this.confirmationService.confirm({
      message: `¿Estás seguro de que deseas eliminar la tarifa "${rate.name}"? Esta acción no se puede deshacer.`,
      header: 'Confirmar Eliminación',
      icon: 'pi pi-exclamation-triangle',
      acceptButtonProps: { label: 'Eliminar', severity: 'danger' },
      rejectButtonProps: { label: 'Cancelar', severity: 'secondary' },
      accept: () => {
        this.rateService.deleteRate(rate.id).pipe(
          catchError(err => {
            this.toast.add({ severity: 'error', summary: 'Error', detail: err.error?.message || 'No se pudo eliminar la tarifa' });
            return of(null);
          })
        ).subscribe(() => {
          this.toast.add({ severity: 'success', summary: 'Eliminada', detail: 'Tarifa eliminada con éxito' });
          this.loadRates();
        });
      }
    });
  }

  openSimulator(rate?: Rate): void {
    if (rate) {
      this.simRateId = rate.id;
    } else if (this.rates().length > 0) {
      this.simRateId = this.rates()[0].id;
    }
    this.simulatorVisible = true;
  }

  copySimulatedReceipt(): void {
    const res = this.simResult();
    if (!res) return;

    const receiptText = `
===== TICKET DE SIMULACIÓN DE TARIFA =====
Tarifa: ${res.rate.name}
Estacionamiento: ${res.rate.lot?.name || 'N/A'}
Tiempo Estancia: ${res.hoursFormatted}
Tasa de Cambio: 1 USD = ${res.exchangeRate.toFixed(2)} VES

Subtotal: $${res.baseCostUSD.toFixed(2)} (${res.baseCostVES.toLocaleString('es-VE', { minimumFractionDigits: 2 })} Bs.)
IVA (16%): $${res.taxAmountUSD.toFixed(2)} (${res.taxAmountVES.toLocaleString('es-VE', { minimumFractionDigits: 2 })} Bs.)
------------------------------------------
TOTAL A PAGAR:
USD ($): $${res.totalAmountUSD.toFixed(2)}
VES (Bs.): ${res.totalAmountVES.toLocaleString('es-VE', { minimumFractionDigits: 2 })} Bs.
================--------------------------
    `.trim();

    navigator.clipboard.writeText(receiptText);
    this.toast.add({
      severity: 'success',
      summary: 'Recibo Copiado',
      detail: 'El resumen del cálculo multi-moneda se copió al portapapeles.'
    });
  }

  getRateTypeLabel(type: RateType): string {
    const opt = this.rateTypeOptions.find(o => o.value === type);
    return opt ? opt.label : type;
  }

  getRateTypeSeverity(type: RateType): "success" | "info" | "warn" | "secondary" | "contrast" | "danger" {
    switch (type) {
      case 'HOURLY': return 'info';
      case 'FRACTIONAL': return 'success';
      case 'NIGHTLY': return 'warn';
      case 'MONTHLY': return 'contrast';
      case 'FLAT': return 'secondary';
      case 'SPECIAL': return 'danger';
      default: return 'info';
    }
  }

  getSpotTypeBadgeClass(code: string): string {
    switch (code) {
      case 'HANDICAP': return 'bg-purple-100 text-purple-700 border-purple-300 dark:bg-purple-900/30 dark:text-purple-300';
      case 'EV': return 'bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-900/30 dark:text-emerald-300';
      case 'VIP': return 'bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-900/30 dark:text-amber-300';
      case 'MOTORCYCLE': return 'bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-900/30 dark:text-blue-300';
      case 'TRUCK': return 'bg-orange-100 text-orange-700 border-orange-300 dark:bg-orange-900/30 dark:text-orange-300';
      default: return 'bg-surface-100 text-surface-700 border-surface-300 dark:bg-surface-800 dark:text-surface-300';
    }
  }
}
