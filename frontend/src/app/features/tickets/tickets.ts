import { Component, inject, signal, computed } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { TableModule } from 'primeng/table';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { TextareaModule } from 'primeng/textarea';
import { SelectModule } from 'primeng/select';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { MessageModule } from 'primeng/message';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { CheckboxModule } from 'primeng/checkbox';
import { MessageService, SharedModule } from 'primeng/api';
import { catchError, of } from 'rxjs';
import * as QRCode from 'qrcode';

import { Ticket, CreateTicketRequest, CloseTicketRequest, TicketFilterParams, TicketQuote } from '../../core/interfaces/ticket';
import { ApiResponse } from '../../core/interfaces/api-response';
import { AuthService } from '../../core/services/auth.service';
import { ExchangeRateService } from '../../core/services/exchange-rate.service';
import { ReportExportService } from '../../core/services/report-export.service';
import { CameraCapture } from '../../shared/components/camera-capture/camera-capture';

interface ParkingLot { id: string; name: string; code: string; taxPercentage?: number; }
interface ParkingSpot { id: string; spotNumber: string; floor: string; label: string; }
interface Rate { id: string; name: string; baseAmount?: number; }

@Component({
  selector: 'app-tickets',
  standalone: true,
  imports: [
    FormsModule, DatePipe, DecimalPipe, TableModule, DialogModule, ButtonModule,
    InputTextModule, InputNumberModule, TextareaModule, SelectModule,
    IconFieldModule, InputIconModule, MessageModule, ToastModule, TooltipModule, CheckboxModule,
    SharedModule, CameraCapture
  ],
  providers: [MessageService],
  templateUrl: './tickets.html',
  styleUrl: './tickets.scss',
})
export class Tickets {
  protected Number = Number;
  protected Math = Math;
  private http = inject(HttpClient);
  private toast = inject(MessageService);
  private authService = inject(AuthService);
  public exchangeRateService = inject(ExchangeRateService);
  private reportExportService = inject(ReportExportService);
  private api = '/api/tickets';

  canCreateTicket = computed(() => this.authService.hasPermission('tickets.create') || ['ADMIN', 'SUPERVISOR', 'CASHIER', 'OPERATOR'].includes(this.authService.user()?.role ?? ''));
  canCloseTicket = computed(() => this.authService.hasPermission('tickets.close') || ['ADMIN', 'SUPERVISOR', 'CASHIER'].includes(this.authService.user()?.role ?? ''));
  canCancelTicket = computed(() => this.authService.hasPermission('tickets.cancel') || ['ADMIN', 'SUPERVISOR'].includes(this.authService.user()?.role ?? ''));

  tickets = signal<Ticket[]>([]);
  loading = signal(false);
  error = signal<string | null>(null);
  submitting = signal(false);
  total = signal(0);
  page = 1;
  limit = 10;
  sortBy = signal('entryTime');
  sortOrder = signal<'asc' | 'desc'>('desc');
  search = signal('');
  statusFilter = signal<string | undefined>(undefined);
  paymentFilter = signal<string | undefined>(undefined);

  showCreateDialog = false;
  showCloseDialog = false;
  showDetailDialog = false;
  showPrintDialog = false;

  selectedTicket = signal<Ticket | undefined>(undefined);
  qrDataUrl = signal<string>('');

  createData: CreateTicketRequest = { lotId: '', plateNumber: '', photos: [] };
  closeData: CloseTicketRequest = {
    isLostTicket: false,
    baseAmount: 0,
    discountAmount: 0,
    penaltyAmount: 0,
    photos: [],
  };

  lots = signal<ParkingLot[]>([]);
  availableSpots = signal<ParkingSpot[]>([]);
  allLotSpots = signal<any[]>([]);
  rates = signal<Rate[]>([]);

  // Dynamic Plate Lookup & Warning Signals
  lookupLoading = signal(false);
  activeTicketWarning = signal<any | null>(null);
  foundVehicle = signal<any | null>(null);
  foundClient = signal<any | null>(null);
  selectedSpotFloor = signal<string | number>('ALL');

  isPlateBlocked = computed(() => !!this.activeTicketWarning());

  spotFloors = computed(() => {
    const spots = this.allLotSpots();
    const floors = new Set<string>();
    spots.forEach(s => {
      const label = s.floor !== undefined && s.floor !== null ? (s.floor < 0 ? `Sótano ${Math.abs(s.floor)}` : `Piso ${s.floor}`) : 'Nivel Principal';
      floors.add(label);
    });
    return Array.from(floors);
  });

  filteredSpotsForMap = computed(() => {
    const spots = this.allLotSpots();
    const selectedFloor = this.selectedSpotFloor();
    if (selectedFloor === 'ALL') return spots;
    return spots.filter(s => {
      const label = s.floor !== undefined && s.floor !== null ? (s.floor < 0 ? `Sótano ${Math.abs(s.floor)}` : `Piso ${s.floor}`) : 'Nivel Principal';
      return label === selectedFloor;
    });
  });

  entryPhotosOfSelected = computed(() => {
    const t = this.selectedTicket();
    if (!t || !t.photos) return [];
    return t.photos.filter((p) => p.stage === 'ENTRY');
  });

  exitPhotosOfSelected = computed(() => {
    const t = this.selectedTicket();
    if (!t || !t.photos) return [];
    return t.photos.filter((p) => p.stage === 'EXIT');
  });

  statusOptions = [
    { value: 'ACTIVE', label: 'Activo' },
    { value: 'COMPLETED', label: 'Completado' },
    { value: 'CANCELLED', label: 'Cancelado' },
  ];

  paymentStatusOptions = [
    { value: 'PENDING', label: 'Pendiente' },
    { value: 'PAID', label: 'Pagado' },
    { value: 'REFUNDED', label: 'Reembolsado' },
  ];

  // Quote calculado por el SERVIDOR (fuente única de verdad del cobro)
  quote = signal<TicketQuote | null>(null);
  quoteLoading = signal(false);

  // Pago integrado "Cobrar y Salir"
  payNow = true;
  paymentMethod: 'CASH' | 'CARD' | 'TRANSFER' | 'APP' | 'OTHER' = 'CASH';
  paymentReference = '';

  paymentMethodOptions = [
    { value: 'CASH', label: 'Efectivo' },
    { value: 'CARD', label: 'Tarjeta' },
    { value: 'TRANSFER', label: 'Transferencia' },
    { value: 'APP', label: 'App / Pago Móvil' },
    { value: 'OTHER', label: 'Otro' },
  ];

  // Desglose de Cálculo Final (alimentado por el quote del servidor)
  closeCalculatedTotal = computed(() => {
    const q = this.quote();
    const base = q?.breakdown.subtotal ?? this.closeData.baseAmount ?? 0;
    const discount = this.closeData.discountAmount || 0;
    const isLost = this.closeData.isLostTicket || false;

    // Recargo del 30% sobre el monto base si es ticket perdido
    const penalty = isLost ? Number((base * 0.30).toFixed(2)) : 0;
    const taxable = base - discount + penalty;

    const taxRatePercent = q?.taxRatePercent ?? 16;
    const taxRate = taxRatePercent / 100;
    const tax = Number((taxable * taxRate).toFixed(2));
    const totalUSD = Number((taxable + tax).toFixed(2));
    const exRate = this.exchangeRateService.activeRate();

    return {
      base,
      discount,
      isLost,
      penalty,
      tax,
      taxRatePercent,
      totalUSD,
      totalVES: Number((totalUSD * exRate).toFixed(2)),
    };
  });

  constructor() {
    this.loadTickets();
    this.loadLots();
    this.loadRates();
  }

  loadTickets(): void {
    this.loading.set(true);
    this.error.set(null);

    const params: TicketFilterParams = {
      page: this.page,
      limit: this.limit,
      sortBy: this.sortBy(),
      sortOrder: this.sortOrder(),
    };

    if (this.search()) params.search = this.search();
    if (this.statusFilter()) params.status = this.statusFilter();
    if (this.paymentFilter()) params.paymentStatus = this.paymentFilter();

    this.http.get<ApiResponse<Ticket[]>>(this.api, { params: params as any })
      .pipe(catchError(err => {
        this.error.set(err.error?.message || 'Error al cargar tickets');
        this.loading.set(false);
        return of(null);
      }))
      .subscribe(res => {
        if (res) {
          this.tickets.set(res.data);
          this.total.set(res.meta?.total ?? 0);
        }
        this.loading.set(false);
      });
  }

  loadLots(): void {
    this.http.get<ApiResponse<ParkingLot[]>>('/api/parking-lots')
      .pipe(catchError(() => of(null)))
      .subscribe(res => {
        if (res) {
          this.lots.set(res.data);
          if (res.data.length > 0 && !this.createData.lotId) {
            this.createData.lotId = res.data[0].id;
            this.onLotChange();
          }
        }
      });
  }

  loadRates(): void {
    this.http.get<ApiResponse<Rate[]>>('/api/rates')
      .pipe(catchError(() => of(null)))
      .subscribe(res => {
        if (res) this.rates.set(res.data);
      });
  }

  onLotChange(): void {
    if (!this.createData.lotId) {
      this.availableSpots.set([]);
      this.allLotSpots.set([]);
      return;
    }

    this.http.get<ApiResponse<any[]>>(`/api/parking-spots?lotId=${this.createData.lotId}`)
      .pipe(catchError(() => of(null)))
      .subscribe(res => {
        if (res && res.data) {
          this.allLotSpots.set(res.data);
          const avail = res.data
            .filter((s: any) => s.status === 'AVAILABLE')
            .map((s: any) => ({
              ...s,
              label: `${s.spotNumber}${s.floor !== undefined ? ` (${s.floor < 0 ? 'Sótano ' + Math.abs(s.floor) : 'Piso ' + s.floor})` : ''}`
            }));
          this.availableSpots.set(avail);
        }
      });
  }

  onPlateInput(): void {
    const raw = this.createData.plateNumber || '';
    const plate = raw.trim().toUpperCase();
    this.createData.plateNumber = plate;

    if (plate.length < 3) {
      this.activeTicketWarning.set(null);
      this.foundVehicle.set(null);
      this.foundClient.set(null);
      return;
    }

    this.lookupLoading.set(true);
    this.http.get<ApiResponse<any>>(`/api/tickets/lookup-plate?plateNumber=${encodeURIComponent(plate)}`)
      .pipe(catchError(() => of(null)))
      .subscribe(res => {
        this.lookupLoading.set(false);
        if (res && res.data) {
          this.activeTicketWarning.set(res.data.activeTicket || null);
          this.foundVehicle.set(res.data.vehicle || null);
          this.foundClient.set(res.data.client || null);

          if (res.data.vehicle) {
            this.createData.vehicleId = res.data.vehicle.id;
          } else {
            this.createData.vehicleId = undefined;
          }

          if (res.data.client) {
            this.createData.clientId = res.data.client.id;
          } else {
            this.createData.clientId = undefined;
          }
        }
      });
  }

  autoAssignNextSpot(): void {
    const avail = this.allLotSpots().filter(s => s.status === 'AVAILABLE');
    if (avail.length === 0) {
      this.toast.add({ severity: 'warn', summary: 'Sin Puestos Libres', detail: 'No hay puestos disponibles en este estacionamiento.' });
      return;
    }
    const nextSpot = avail[0];
    this.createData.spotId = nextSpot.id;
    this.toast.add({ severity: 'success', summary: 'Puesto Auto-Asignado', detail: `Se asignó el Puesto ${nextSpot.spotNumber}` });
  }

  toggleSpotSelection(spot: any): void {
    if (spot.status === 'OCCUPIED') {
      this.toast.add({ severity: 'info', summary: 'Puesto Ocupado', detail: `El puesto ${spot.spotNumber} está ocupado actualmente.` });
      return;
    }
    if (this.createData.spotId === spot.id) {
      this.createData.spotId = undefined;
    } else {
      this.createData.spotId = spot.id;
      this.toast.add({ severity: 'success', summary: 'Puesto Seleccionado', detail: `Puesto #${spot.spotNumber} asignado.` });
    }
  }

  openCreateModal(): void {
    this.createData = { lotId: this.lots().length > 0 ? this.lots()[0].id : '', plateNumber: '', photos: [] };
    this.activeTicketWarning.set(null);
    this.foundVehicle.set(null);
    this.foundClient.set(null);
    this.showCreateDialog = true;
    if (this.createData.lotId) {
      this.onLotChange();
    }
  }

  createTicket(): void {
    if (!this.createData.lotId || !this.createData.plateNumber) return;
    this.submitting.set(true);

    this.http.post<ApiResponse<Ticket>>(this.api, this.createData)
      .pipe(catchError(err => {
        this.error.set(err.error?.message || 'Error al crear ticket');
        this.submitting.set(false);
        return of(null);
      }))
      .subscribe(async res => {
        if (res) {
          this.toast.add({ severity: 'success', summary: 'Ticket Creado', detail: `#${res.data.ticketNumber}` });
          this.showCreateDialog = false;
          this.createData = { lotId: '', plateNumber: '', photos: [] };
          this.loadTickets();
          // Abrir automáticamente vista previa / impresión con QR Code
          this.printTicket(res.data);
        }
        this.submitting.set(false);
      });
  }

  openCloseDialog(ticket: Ticket): void {
    this.selectedTicket.set(ticket);

    // Esquema de tarifa: el asignado al ticket o el primero activo como inicial
    const rateId = ticket.rateId || (this.rates().length > 0 ? this.rates()[0].id : undefined);
    this.closeData = {
      rateId,
      baseAmount: 0,
      discountAmount: 0,
      isLostTicket: false,
      penaltyAmount: 0,
      notes: '',
      photos: [],
    };
    this.payNow = true;
    this.paymentMethod = 'CASH';
    this.paymentReference = '';
    this.showCloseDialog = true;
    // El monto lo calcula el SERVIDOR; solo mostramos su desglose.
    this.loadQuote(ticket.id);
  }

  loadQuote(ticketId: string): void {
    this.quoteLoading.set(true);
    const params: Record<string, string> = {};
    if (this.closeData.rateId) params['rateId'] = this.closeData.rateId;

    this.http.get<ApiResponse<TicketQuote>>(`${this.api}/${ticketId}/quote`, { params })
      .pipe(catchError(err => {
        this.toast.add({
          severity: 'error',
          summary: 'No se pudo calcular la tarifa',
          detail: err.error?.message || 'Error al consultar el cobro en el servidor',
        });
        this.quoteLoading.set(false);
        return of(null);
      }))
      .subscribe(res => {
        if (res) {
          this.quote.set(res.data);
          // El monto base SIEMPRE viene del servidor; el operador no lo escribe.
          this.closeData.baseAmount = res.data.breakdown.subtotal;
        }
        this.quoteLoading.set(false);
      });
  }

  /** Al cambiar el esquema de tarifa se recalcula en el servidor. */
  onRateChange(): void {
    const ticket = this.selectedTicket();
    if (!ticket) return;
    this.loadQuote(ticket.id);
  }

  onLostTicketToggle(): void {
    const calc = this.closeCalculatedTotal();
    this.closeData.penaltyAmount = calc.penalty;
  }

  closeTicket(): void {
    const ticket = this.selectedTicket();
    if (!ticket) return;
    const calc = this.closeCalculatedTotal();

    const payload: CloseTicketRequest = {
      ...this.closeData,
      penaltyAmount: calc.penalty,
    };

    // Pago integrado en la misma transacción del cierre ("Cobrar y Salir")
    if (this.payNow) {
      payload.payment = {
        paymentMethod: this.paymentMethod,
        amount: calc.totalUSD,
        referenceNumber: this.paymentReference.trim() || undefined,
      };
    }

    this.submitting.set(true);
    this.http.patch<ApiResponse<Ticket>>(`${this.api}/${ticket.id}/close`, payload)
      .pipe(catchError(err => {
        this.error.set(err.error?.message || 'Error al procesar cobro y salida');
        this.toast.add({ severity: 'error', summary: 'Error al cerrar', detail: err.error?.message || 'Error al procesar cobro y salida' });
        this.submitting.set(false);
        return of(null);
      }))
      .subscribe(res => {
        if (res) {
          const paid = !!payload.payment;
          this.toast.add({
            severity: 'success',
            summary: payload.isLostTicket ? 'Ticket Perdido Procesado (+30% recargo)' : (paid ? 'Cobrado y Salida Completada' : 'Salida Completada (Pago Pendiente)'),
            detail: `Ticket #${ticket.ticketNumber} · Total: $${calc.totalUSD.toFixed(2)}${paid ? ' · Pago: ' + this.paymentMethod : ''}`
          });
          this.showCloseDialog = false;
          this.loadTickets();
        }
        this.submitting.set(false);
      });
  }

  cancelTicket(ticket: Ticket): void {
    if (!confirm(`¿Cancelar ticket ${ticket.ticketNumber}?`)) return;
    this.submitting.set(true);

    this.http.patch<ApiResponse<Ticket>>(`${this.api}/${ticket.id}/cancel`, {})
      .pipe(catchError(err => {
        this.error.set(err.error?.message || 'Error al cancelar ticket');
        this.submitting.set(false);
        return of(null);
      }))
      .subscribe(res => {
        if (res) {
          this.toast.add({ severity: 'info', summary: 'Ticket cancelado', detail: `#${ticket.ticketNumber}` });
          this.loadTickets();
        }
        this.submitting.set(false);
      });
  }

  viewTicket(ticket: Ticket): void {
    this.http.get<ApiResponse<Ticket>>(`${this.api}/${ticket.id}`)
      .pipe(catchError(() => of(null)))
      .subscribe(async res => {
        if (res) {
          const t = res.data;
          this.selectedTicket.set(t);
          await this.generateQrCodeForTicket(t);
          this.showDetailDialog = true;
        }
      });
  }

  async printTicket(ticket: Ticket): Promise<void> {
    this.selectedTicket.set(ticket);
    await this.generateQrCodeForTicket(ticket);
    this.showPrintDialog = true;
  }

  private async generateQrCodeForTicket(ticket: Ticket): Promise<void> {
    const payload = JSON.stringify({
      tkt: ticket.ticketNumber,
      plate: ticket.plateNumber,
      spot: ticket.spot?.spotNumber || 'N/A',
      entry: ticket.entryTime,
      client: ticket.client ? `${ticket.client.firstName} ${ticket.client.lastName} (${ticket.client.documentNumber || ''})` : 'Cliente General',
      lot: ticket.lot?.name || 'Estacionamiento',
    });

    try {
      const url = await QRCode.toDataURL(payload, { width: 220, margin: 1 });
      this.qrDataUrl.set(url);
    } catch (e) {
      console.error('Error generating QR code', e);
      this.qrDataUrl.set('');
    }
  }

  triggerBrowserPrint(): void {
    window.print();
  }

  onPageChange(event: any): void {
    this.page = Math.floor(event.first / event.rows) + 1;
    this.limit = event.rows;
    this.loadTickets();
  }

  onSort(event: any): void {
    this.sortBy.set(event.field);
    this.sortOrder.set(event.order === 1 ? 'asc' : 'desc');
    this.loadTickets();
  }

  statusLabel(status: string): string {
    const map: Record<string, string> = { ACTIVE: 'Activo', COMPLETED: 'Completado', CANCELLED: 'Cancelado' };
    return map[status] || status;
  }

  paymentLabel(status: string): string {
    const map: Record<string, string> = { PENDING: 'Pendiente', PAID: 'Pagado', REFUNDED: 'Reembolsado' };
    return map[status] || status;
  }

  exportInvoice(ticket: Ticket): void {
    try {
      this.reportExportService.exportTicketInvoice(ticket);
      this.toast.add({ severity: 'success', summary: 'Factura PDF', detail: 'Comprobante de factura descargado exitosamente.' });
    } catch (e: any) {
      this.toast.add({ severity: 'error', summary: 'Error', detail: 'No se pudo generar la factura PDF.' });
    }
  }
}
