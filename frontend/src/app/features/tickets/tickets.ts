import { Component, inject, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
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
import { MessageService } from 'primeng/api';
import { Ticket, CreateTicketRequest, CloseTicketRequest, TicketFilterParams } from '../../core/interfaces/ticket';
import { ApiResponse } from '../../core/interfaces/api-response';
import { catchError, of } from 'rxjs';

interface ParkingLot { id: string; name: string; code: string; }
interface ParkingSpot { id: string; spotNumber: string; floor: string; label: string; }
interface Rate { id: string; name: string; baseAmount: number; }

@Component({
  selector: 'app-tickets',
  standalone: true,
  imports: [
    FormsModule, DatePipe, TableModule, DialogModule, ButtonModule,
    InputTextModule, InputNumberModule, TextareaModule, SelectModule,
    IconFieldModule, InputIconModule, MessageModule, ToastModule,
  ],
  providers: [MessageService],
  templateUrl: './tickets.html',
  styleUrl: './tickets.scss',
})
export class Tickets {
  private http = inject(HttpClient);
  private toast = inject(MessageService);
  private api = '/api/tickets';

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
  selectedTicket = signal<Ticket | undefined>(undefined);

  createData: CreateTicketRequest = { lotId: '', plateNumber: '' };
  closeData: CloseTicketRequest = {};

  lots = signal<ParkingLot[]>([]);
  availableSpots = signal<ParkingSpot[]>([]);
  rates = signal<Rate[]>([]);

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
      .subscribe(res => {
        if (res) {
          this.toast.add({ severity: 'success', summary: 'Ticket creado', detail: `#${res.data.ticketNumber}` });
          this.showCreateDialog = false;
          this.createData = { lotId: '', plateNumber: '' };
          this.loadTickets();
        }
        this.submitting.set(false);
      });
  }

  openCloseDialog(ticket: Ticket): void {
    this.selectedTicket.set(ticket);
    this.closeData = {};
    this.showCloseDialog = true;
  }

  closeTicket(): void {
    const ticket = this.selectedTicket();
    if (!ticket) return;
    this.submitting.set(true);

    this.http.patch<ApiResponse<Ticket>>(`${this.api}/${ticket.id}/close`, this.closeData)
      .pipe(catchError(err => {
        this.error.set(err.error?.message || 'Error al cerrar ticket');
        this.submitting.set(false);
        return of(null);
      }))
      .subscribe(res => {
        if (res) {
          this.toast.add({ severity: 'success', summary: 'Ticket cerrado', detail: `#${ticket.ticketNumber}` });
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
      .subscribe(res => {
        if (res) {
          this.selectedTicket.set(res.data);
          this.showDetailDialog = true;
        }
      });
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
