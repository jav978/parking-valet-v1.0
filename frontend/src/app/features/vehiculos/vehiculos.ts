import { Component, inject, signal, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
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
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { TagModule } from 'primeng/tag';
import { MessageService, ConfirmationService } from 'primeng/api';
import { VehicleService } from '../../core/services/vehicle.service';
import { Vehicle, CreateVehicleRequest, UpdateVehicleRequest, VehicleFilterParams } from '../../core/interfaces/vehicle';
import { catchError, of } from 'rxjs';

@Component({
  selector: 'app-vehiculos',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [
    CommonModule, FormsModule, TableModule, DialogModule, ButtonModule,
    InputTextModule, InputNumberModule, SelectModule, IconFieldModule,
    InputIconModule, MessageModule, ToastModule, ConfirmDialogModule, TagModule,
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './vehiculos.html',
  styleUrl: './vehiculos.scss',
})
export class Vehiculos {
  private vehicleService = inject(VehicleService);
  private toast = inject(MessageService);
  private confirmationService = inject(ConfirmationService);
  private cdr = inject(ChangeDetectorRef);

  vehicles = signal<Vehicle[]>([]);
  loading = signal(false);
  error = signal<string | null>(null);
  submitting = signal(false);
  total = signal(0);
  page = 1;
  limit = 10;
  sortBy = signal('createdAt');
  sortOrder = signal<'asc' | 'desc'>('desc');
  search = signal('');
  vehicleTypeFilter = signal<string | undefined>(undefined);

  showFormDialog = false;
  isEditMode = false;
  selectedVehicleId: string | null = null;
  vehicleForm: CreateVehicleRequest = this.emptyForm();

  vehicleTypeOptions = [
    { value: 'CAR', label: 'Carro' },
    { value: 'MOTORCYCLE', label: 'Moto' },
    { value: 'TRUCK', label: 'Camión' },
    { value: 'SUV', label: 'SUV' },
    { value: 'VAN', label: 'Van' },
    { value: 'BUS', label: 'Bus' },
    { value: 'BICYCLE', label: 'Bicicleta' },
    { value: 'OTHER', label: 'Otro' },
  ];

  constructor() { console.log('🟢 Vehiculos constructor'); this.loadVehicles(); }

  emptyForm(): CreateVehicleRequest {
    return { plateNumber: '', brand: '', model: '', color: '', vehicleType: 'CAR', year: undefined };
  }

  loadVehicles(): void {
    this.loading.set(true);
    this.error.set(null);

    const params: VehicleFilterParams = {
      page: this.page, limit: this.limit,
      sortBy: this.sortBy(), sortOrder: this.sortOrder(),
    };
    if (this.search()) params.search = this.search();
    if (this.vehicleTypeFilter()) params.vehicleType = this.vehicleTypeFilter();

    this.vehicleService.getVehicles(params)
      .pipe(catchError(err => {
        const errMsg = err.error?.message || 'Error al cargar vehículos';
        this.error.set(errMsg);
        this.toast.add({ severity: 'error', summary: 'Error', detail: errMsg });
        return of({ data: [], meta: { total: 0 } });
      }))
      .subscribe(res => {
        console.log('🟢 Vehiculos subscribe:', res.data.length, 'items');
        this.vehicles.set(res.data);
        this.total.set(res.meta?.total ?? 0);
        this.loading.set(false);
        this.cdr.markForCheck();
      });
  }

  onPageChange(event: any): void {
    this.page = (event.first / event.rows) + 1;
    this.limit = event.rows;
    this.loadVehicles();
  }

  onSort(event: any): void {
    if (event.sortField) {
      this.sortBy.set(event.sortField);
      this.sortOrder.set(event.sortOrder === 1 ? 'asc' : 'desc');
      this.loadVehicles();
    }
  }

  openCreateDialog(): void {
    this.isEditMode = false;
    this.selectedVehicleId = null;
    this.vehicleForm = this.emptyForm();
    this.showFormDialog = true;
  }

  openEditDialog(vehicle: Vehicle): void {
    this.isEditMode = true;
    this.selectedVehicleId = vehicle.id;
    this.vehicleForm = {
      plateNumber: vehicle.plateNumber,
      brand: vehicle.brand || '',
      model: vehicle.model || '',
      year: vehicle.year,
      color: vehicle.color || '',
      vehicleType: vehicle.vehicleType,
      clientId: vehicle.clientId,
    };
    this.showFormDialog = true;
  }

  saveVehicle(): void {
    if (!this.vehicleForm.plateNumber?.trim()) {
      this.toast.add({ severity: 'warn', summary: 'Advertencia', detail: 'La placa es obligatoria.' });
      return;
    }
    this.submitting.set(true);

    if (this.isEditMode && this.selectedVehicleId) {
      this.vehicleService.updateVehicle(this.selectedVehicleId, this.vehicleForm)
        .pipe(catchError(err => {
          this.toast.add({ severity: 'error', summary: 'Error', detail: err.error?.message || 'Error al actualizar' });
          this.submitting.set(false);
          return of(null);
        }))
        .subscribe(res => {
          if (res) {
            this.toast.add({ severity: 'success', summary: 'Éxito', detail: 'Vehículo actualizado correctamente.' });
            this.showFormDialog = false;
            this.loadVehicles();
          }
          this.submitting.set(false);
        });
    } else {
      this.vehicleService.createVehicle(this.vehicleForm)
        .pipe(catchError(err => {
          this.toast.add({ severity: 'error', summary: 'Error', detail: err.error?.message || 'Error al crear' });
          this.submitting.set(false);
          return of(null);
        }))
        .subscribe(res => {
          if (res) {
            this.toast.add({ severity: 'success', summary: 'Éxito', detail: 'Vehículo creado correctamente.' });
            this.showFormDialog = false;
            this.loadVehicles();
          }
          this.submitting.set(false);
        });
    }
  }

  confirmDelete(vehicle: Vehicle): void {
    this.confirmationService.confirm({
      message: `¿Está seguro de eliminar el vehículo con placa <b>${vehicle.plateNumber}</b>?`,
      header: 'Confirmar Eliminación',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Sí, eliminar',
      rejectLabel: 'Cancelar',
      acceptButtonStyleClass: 'p-button-danger p-button-sm',
      rejectButtonStyleClass: 'p-button-secondary p-button-sm',
      accept: () => {
        this.vehicleService.deleteVehicle(vehicle.id).subscribe({
          next: () => {
            this.toast.add({ severity: 'success', summary: 'Eliminado', detail: 'Vehículo eliminado correctamente.' });
            this.loadVehicles();
          },
          error: (err) => this.toast.add({
            severity: 'error', summary: 'Error', detail: err.error?.message || 'Error al eliminar',
          }),
        });
      },
    });
  }

  vehicleTypeLabel(type: string): string {
    return this.vehicleTypeOptions.find(o => o.value === type)?.label || type;
  }

  getSeverity(type: string): 'info' | 'warn' | 'success' | 'secondary' | undefined {
    const map: Record<string, 'info' | 'warn' | 'success' | 'secondary'> = {
      CAR: 'info', MOTORCYCLE: 'warn', TRUCK: 'success',
      SUV: 'secondary', VAN: 'info', BUS: 'warn', BICYCLE: 'success', OTHER: 'secondary',
    };
    return map[type];
  }
}
