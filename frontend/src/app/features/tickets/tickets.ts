import { Component, inject, signal, computed } from '@angular/core';
import { DatePipe, CurrencyPipe, DecimalPipe } from '@angular/common';
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

import { Ticket, CreateTicketRequest, CloseTicketRequest, TicketFilterParams } from '../../core/interfaces/ticket';
import { ApiResponse } from '../../core/interfaces/api-response';
import { AuthService } from '../../core/services/auth.service';
import { ExchangeRateService } from '../../core/services/exchange-rate.service';
import { CameraCapture } from '../../shared/components/camera-capture/camera-capture';

interface ParkingLot { id: string; name: string; code: string; taxPercentage?: number; }
interface ParkingSpot { id: string; spotNumber: string; floor: string; label: string; }
interface Rate { id: string; name: string; baseAmount?: number; }

@Component({
  selector: 'app-tickets',
  standalone: true,
  imports: [
    FormsModule, DatePipe, CurrencyPipe, DecimalPipe, TableModule, DialogModule, ButtonModule,
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
  private http = inject(HttpClient);
  private toast = inject(MessageService);
  private authService = inject(AuthService);
  public exchangeRateService = inject(ExchangeRateService);
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
  rates = signal<Rate[]>([]);

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

  // Dynamic Lost Ticket Calculation
  closeCalculatedTotal = computed(() => {
    const base = this.closeData.baseAmount || 0;
    const discount = this.closeData.discountAmount || 0;
    const isLost = this.closeData.isLostTicket || false;

    // Recargo del 30% sobre el monto base si es ticket perdido
    const penalty = isLost ? Number((base * 0.30).toFixed(2)) : 0;
    const taxable = base - discount + penalty;

    const t = this.selectedTicket();
    const taxRate = t?.lot ? (Number((t.lot as any).taxPercentage || 16) / 100) : 0.16;
    const tax = Number((taxable * taxRate).toFixed(2));
    const totalUSD = Number((taxable + tax).toFixed(2));
    const exRate = this.exchangeRateService.activeRate();

    return {
      base,
      discount,
      isLost,
      penalty,
      tax,
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
        if (res) this.lots.set(res.data);
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
    if (!this.createData.lotId) { this.availableSpots.set([]); return; }
    this.http.get<ApiResponse<ParkingSpot[]>>(`/api/parking-spots?lotId=${this.createData.lotId}&status=AVAILABLE`)
      .pipe(catchError(() => of(null)))
      .subscribe(res => {
        if (res) {
          this.availableSpots.set(res.data.map(s => ({ ...s, label: `${s.spotNumber}${s.floor ? ` (Piso ${s.floor})` : ''}` })));
        }
      });
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

    // Estimación inicial del monto base
    const base = ticket.baseAmount || (ticket.rate as any)?.baseAmount || 5;
    this.closeData = {
      rateId: ticket.rateId || (this.rates().length > 0 ? this.rates()[0].id : undefined),
      baseAmount: base,
      discountAmount: 0,
      isLostTicket: false,
      penaltyAmount: 0,
      notes: '',
      photos: [],
    };
    this.showCloseDialog = true;
  }

  onLostTicketToggle(): void {
    const calc = this.closeCalculatedTotal();
    this.closeData.penaltyAmount = calc.penalty;
  }

  closeTicket(): void {
    const ticket = this.selectedTicket();
    if (!ticket) return;
    this.submitting.set(true);

    const payload: CloseTicketRequest = {
      ...this.closeData,
      penaltyAmount: this.closeCalculatedTotal().penalty,
    };

    this.http.patch<ApiResponse<Ticket>>(`${this.api}/${ticket.id}/close`, payload)
      .pipe(catchError(err => {
        this.error.set(err.error?.message || 'Error al procesar cobro y salida');
        this.submitting.set(false);
        return of(null);
      }))
      .subscribe(res => {
        if (res) {
          this.toast.add({
            severity: 'success',
            summary: payload.isLostTicket ? 'Ticket Perdido Procesado (+30% recargo)' : 'Cobro y Salida Completada',
            detail: `Ticket #${ticket.ticketNumber} cerrado exitosamente`
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
}
