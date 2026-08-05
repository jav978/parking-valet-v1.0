import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
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
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { MessageService, ConfirmationService, SharedModule } from 'primeng/api';
import { ParkingLot, CreateParkingLotRequest } from '../../core/interfaces/parking-lot';
import { ParkingLotService } from '../../core/services/parking-lot.service';
import { AuthService } from '../../core/services/auth.service';
import { catchError, of } from 'rxjs';

@Component({
  selector: 'app-parking-lots',
  standalone: true,
  imports: [
    CommonModule, FormsModule, TableModule, DialogModule, ButtonModule,
    InputTextModule, InputNumberModule, TextareaModule, SelectModule,
    IconFieldModule, InputIconModule, MessageModule, ToastModule, ConfirmDialogModule,
    TagModule, TooltipModule, SharedModule
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './parking-lots.html',
  styleUrl: './parking-lots.scss',
})
export class ParkingLots implements OnInit {
  protected Math = Math;
  private parkingLotService = inject(ParkingLotService);
  private authService = inject(AuthService);
  private toast = inject(MessageService);
  private confirmationService = inject(ConfirmationService);

  parkingLots = signal<ParkingLot[]>([]);
  loading = signal(false);
  error = signal<string | null>(null);
  submitting = signal(false);
  total = signal(0);
  page = 1;
  limit = 10;
  sortBy = signal('createdAt');
  sortOrder = signal<'asc' | 'desc'>('desc');
  search = signal('');
  statusFilter = signal<boolean | undefined>(undefined);

  showFormDialog = false;
  showDetailDialog = false;
  isEditMode = false;
  selectedLot = signal<ParkingLot | undefined>(undefined);

  lotForm: CreateParkingLotRequest = this.initialForm();

  statusFilterOptions = [
    { label: 'Todos los estados', value: undefined },
    { label: 'Activo', value: true },
    { label: 'Inactivo', value: false },
  ];

  currencyOptions = [
    { label: 'USD ($)', value: 'USD' },
    { label: 'MXN ($)', value: 'MXN' },
    { label: 'EUR (€)', value: 'EUR' },
    { label: 'VES (Bs)', value: 'VES' },
  ];

  canCreate = computed(() =>
    this.authService.hasPermission('parking-lots.create') ||
    ['ADMIN', 'SUPERVISOR'].includes(this.authService.user()?.role ?? '')
  );

  canEdit = computed(() =>
    this.authService.hasPermission('parking-lots.update') ||
    ['ADMIN', 'SUPERVISOR'].includes(this.authService.user()?.role ?? '')
  );

  canDelete = computed(() =>
    this.authService.hasPermission('parking-lots.delete') ||
    this.authService.user()?.role === 'ADMIN'
  );

  totalCapacity = computed(() =>
    this.parkingLots().reduce((acc, lot) => acc + (lot.totalSpots || 0), 0)
  );

  totalAvailable = computed(() =>
    this.parkingLots().reduce((acc, lot) => acc + (lot.availableSpots || 0), 0)
  );

  occupancyPercentage = computed(() => {
    const cap = this.totalCapacity();
    if (!cap) return 0;
    const occ = cap - this.totalAvailable();
    return Math.min(100, Math.max(0, Math.round((occ / cap) * 100)));
  });

  ngOnInit(): void {
    this.loadParkingLots();
  }

  initialForm(): CreateParkingLotRequest {
    return {
      name: '',
      code: '',
      address: '',
      city: '',
      state: '',
      country: 'México',
      phone: '',
      email: '',
      totalSpots: 20,
      availableSpots: 20,
      openingTime: '06:00',
      closingTime: '23:00',
      is24h: false,
      isActive: true,
      hasEvCharging: false,
      hasSecurity: true,
      hasCovered: true,
      taxPercentage: 16,
      currency: 'USD',
      ticketPrefix: 'TKT',
      notes: '',
    };
  }

  loadParkingLots(): void {
    this.loading.set(true);
    this.error.set(null);

    this.parkingLotService.getParkingLots({
      page: this.page,
      limit: this.limit,
      sortBy: this.sortBy(),
      sortOrder: this.sortOrder(),
      search: this.search(),
      isActive: this.statusFilter(),
    })
    .pipe(catchError((err) => {
      this.error.set(err.error?.message || 'Error al cargar estacionamientos');
      this.loading.set(false);
      return of(null);
    }))
    .subscribe((res) => {
      if (res) {
        this.parkingLots.set(res.data);
        this.total.set(res.meta?.total ?? 0);
      }
      this.loading.set(false);
    });
  }

  openCreateDialog(): void {
    this.isEditMode = false;
    this.lotForm = this.initialForm();
    this.showFormDialog = true;
  }

  openEditDialog(lot: ParkingLot): void {
    this.isEditMode = true;
    this.selectedLot.set(lot);
    this.lotForm = {
      name: lot.name,
      code: lot.code,
      address: lot.address || '',
      city: lot.city || '',
      state: lot.state || '',
      country: lot.country || '',
      phone: lot.phone || '',
      email: lot.email || '',
      totalSpots: lot.totalSpots || 0,
      availableSpots: lot.availableSpots || 0,
      openingTime: lot.openingTime || '06:00',
      closingTime: lot.closingTime || '23:00',
      is24h: lot.is24h ?? false,
      isActive: lot.isActive ?? true,
      hasEvCharging: lot.hasEvCharging ?? false,
      hasSecurity: lot.hasSecurity ?? true,
      hasCovered: lot.hasCovered ?? true,
      taxPercentage: lot.taxPercentage ?? 16,
      currency: lot.currency || 'USD',
      ticketPrefix: lot.ticketPrefix || 'TKT',
      notes: lot.notes || '',
    };
    this.showFormDialog = true;
  }

  openDetailDialog(lot: ParkingLot): void {
    this.parkingLotService.getParkingLot(lot.id)
      .pipe(catchError(() => of(null)))
      .subscribe((res) => {
        if (res) {
          this.selectedLot.set(res.data);
          this.showDetailDialog = true;
        }
      });
  }

  saveParkingLot(): void {
    if (!this.lotForm.name || !this.lotForm.code) return;
    this.submitting.set(true);

    if (this.isEditMode && this.selectedLot()) {
      this.parkingLotService.updateParkingLot(this.selectedLot()!.id, this.lotForm)
        .pipe(catchError((err) => {
          this.error.set(err.error?.message || 'Error al actualizar estacionamiento');
          this.submitting.set(false);
          return of(null);
        }))
        .subscribe((res) => {
          if (res) {
            this.toast.add({ severity: 'success', summary: 'Estacionamiento actualizado', detail: res.data.name });
            this.showFormDialog = false;
            this.loadParkingLots();
          }
          this.submitting.set(false);
        });
    } else {
      this.parkingLotService.createParkingLot(this.lotForm)
        .pipe(catchError((err) => {
          this.error.set(err.error?.message || 'Error al crear estacionamiento');
          this.submitting.set(false);
          return of(null);
        }))
        .subscribe((res) => {
          if (res) {
            this.toast.add({ severity: 'success', summary: 'Estacionamiento creado', detail: res.data.name });
            this.showFormDialog = false;
            this.loadParkingLots();
          }
          this.submitting.set(false);
        });
    }
  }

  confirmDelete(lot: ParkingLot): void {
    this.confirmationService.confirm({
      message: `¿Eliminar la playa de estacionamiento "${lot.name}"?`,
      header: 'Confirmar eliminación',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Sí, eliminar',
      rejectLabel: 'Cancelar',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.parkingLotService.deleteParkingLot(lot.id).subscribe({
          next: () => {
            this.toast.add({ severity: 'info', summary: 'Eliminado', detail: `Estacionamiento "${lot.name}" desactivado` });
            this.loadParkingLots();
          },
          error: (err) => {
            this.toast.add({ severity: 'error', summary: 'Error', detail: err.error?.message || 'No se pudo eliminar' });
          }
        });
      }
    });
  }

  onPageChange(event: any): void {
    this.page = Math.floor(event.first / event.rows) + 1;
    this.limit = event.rows;
    this.loadParkingLots();
  }

  onSort(event: any): void {
    this.sortBy.set(event.field);
    this.sortOrder.set(event.order === 1 ? 'asc' : 'desc');
    this.loadParkingLots();
  }
}
