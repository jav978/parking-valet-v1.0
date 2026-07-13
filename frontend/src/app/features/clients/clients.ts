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
import { DividerModule } from 'primeng/divider';
import { MessageService, ConfirmationService } from 'primeng/api';
import { ClientService } from '../../core/services/client.service';
import { Client, CreateClientRequest, UpdateClientRequest, ClientFilterParams } from '../../core/interfaces/client';
import { VehicleService } from '../../core/services/vehicle.service';
import { Vehicle, CreateVehicleRequest } from '../../core/interfaces/vehicle';
import { catchError, of } from 'rxjs';

@Component({
  selector: 'app-clients',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [
    CommonModule, FormsModule, TableModule, DialogModule, ButtonModule,
    InputTextModule, InputNumberModule, SelectModule, IconFieldModule,
    InputIconModule, MessageModule, ToastModule, ConfirmDialogModule,
    TagModule, DividerModule,
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './clients.html',
  styleUrl: './clients.scss',
})
export class Clients {
  private clientService = inject(ClientService);
  private vehicleService = inject(VehicleService);
  private toast = inject(MessageService);
  private confirmationService = inject(ConfirmationService);
  private cdr = inject(ChangeDetectorRef);


  clients = signal<Client[]>([]);
  loading = signal(false);
  error = signal<string | null>(null);
  submitting = signal(false);
  total = signal(0);
  page = 1;
  limit = 10;
  sortBy = signal('createdAt');
  sortOrder = signal<'asc' | 'desc'>('desc');
  search = signal('');
  clientTypeFilter = signal<string | undefined>(undefined);
  statusFilter = signal<boolean | undefined>(undefined);

  showFormDialog = false;
  isEditMode = false;
  selectedClientId: string | null = null;
  clientForm: CreateClientRequest = this.emptyForm();

  // Vehicle detail dialog
  showDetailDialog = false;
  selectedClient = signal<Client | null>(null);
  clientVehicles = signal<Vehicle[]>([]);
  vehiclesLoading = signal(false);

  // Add vehicle to client
  showAddVehicleDialog = false;
  vehicleForm: CreateVehicleRequest = { plateNumber: '', vehicleType: 'CAR' };

  documentTypeOptions = [
    { value: 'ID', label: 'Cédula / DNI' },
    { value: 'PASSPORT', label: 'Pasaporte' },
    { value: 'DRIVERS_LICENSE', label: 'Licencia de Conducir' },
    { value: 'OTHER', label: 'Otro' },
  ];

  clientTypeOptions = [
    { value: 'REGULAR', label: 'Regular' },
    { value: 'FREQUENT', label: 'Frecuente' },
    { value: 'VIP', label: 'VIP' },
    { value: 'CORPORATE', label: 'Corporativo' },
  ];

  statusFilterOptions = [
    { value: true, label: 'Activo' },
    { value: false, label: 'Inactivo' },
  ];

  vehicleTypeOptions = [
    { value: 'CAR', label: 'Carro' },
    { value: 'MOTORCYCLE', label: 'Moto' },
    { value: 'TRUCK', label: 'Camión' },
    { value: 'SUV', label: 'SUV' },
    { value: 'VAN', label: 'Van' },
    { value: 'BUS', label: 'Bus' },
    { value: 'OTHER', label: 'Otro' },
  ];

  constructor() { this.loadClients(); }

  emptyForm(): CreateClientRequest {
    return {
      firstName: '', lastName: '', documentType: 'ID', documentNumber: '',
      email: '', phone: '', address: '', clientType: 'REGULAR', notes: '', isActive: true,
    };
  }

  loadClients(): void {
    this.loading.set(true);
    this.error.set(null);

    const params: ClientFilterParams = {
      page: this.page, limit: this.limit,
      sortBy: this.sortBy(), sortOrder: this.sortOrder(),
    };
    if (this.search()) params.search = this.search();
    if (this.clientTypeFilter()) params.clientType = this.clientTypeFilter();
    if (this.statusFilter() !== undefined) params.isActive = this.statusFilter();

    this.clientService.getClients(params)
      .pipe(catchError(err => {
        const errMsg = err.error?.message || 'Error al cargar clientes';
        this.error.set(errMsg);
        this.toast.add({ severity: 'error', summary: 'Error', detail: errMsg });
        return of({ data: [], meta: { total: 0 } });
      }))
      .subscribe(res => {
        this.clients.set(res.data);
        this.total.set(res.meta?.total ?? 0);
        this.loading.set(false);
        this.cdr.markForCheck();
      });
  }

  onPageChange(event: any): void {
    this.page = (event.first / event.rows) + 1;
    this.limit = event.rows;
    this.loadClients();
  }

  onSort(event: any): void {
    if (event.sortField) {
      this.sortBy.set(event.sortField);
      this.sortOrder.set(event.sortOrder === 1 ? 'asc' : 'desc');
      this.loadClients();
    }
  }

  openCreateDialog(): void {
    this.isEditMode = false;
    this.selectedClientId = null;
    this.clientForm = this.emptyForm();
    this.showFormDialog = true;
  }

  openEditDialog(client: Client): void {
    this.isEditMode = true;
    this.selectedClientId = client.id;
    this.clientForm = {
      firstName: client.firstName, lastName: client.lastName,
      documentType: client.documentType, documentNumber: client.documentNumber,
      email: client.email || '', phone: client.phone || '',
      address: client.address || '', clientType: client.clientType,
      notes: client.notes || '', isActive: client.isActive,
    };
    this.showFormDialog = true;
  }

  saveClient(): void {
    if (!this.clientForm.firstName || !this.clientForm.lastName || !this.clientForm.documentNumber) {
      this.toast.add({ severity: 'warn', summary: 'Advertencia', detail: 'Complete todos los campos obligatorios.' });
      return;
    }
    this.submitting.set(true);

    if (this.isEditMode && this.selectedClientId) {
      this.clientService.updateClient(this.selectedClientId, this.clientForm)
        .pipe(catchError(err => {
          this.toast.add({ severity: 'error', summary: 'Error', detail: err.error?.message || 'Error al actualizar' });
          this.submitting.set(false);
          return of(null);
        }))
        .subscribe(res => {
          if (res) {
            this.toast.add({ severity: 'success', summary: 'Éxito', detail: 'Cliente actualizado.' });
            this.showFormDialog = false;
            this.loadClients();
          }
          this.submitting.set(false);
        });
    } else {
      this.clientService.createClient(this.clientForm)
        .pipe(catchError(err => {
          this.toast.add({ severity: 'error', summary: 'Error', detail: err.error?.message || 'Error al crear' });
          this.submitting.set(false);
          return of(null);
        }))
        .subscribe(res => {
          if (res) {
            this.toast.add({ severity: 'success', summary: 'Éxito', detail: 'Cliente creado.' });
            this.showFormDialog = false;
            this.loadClients();
          }
          this.submitting.set(false);
        });
    }
  }

  confirmDelete(client: Client): void {
    this.confirmationService.confirm({
      message: `¿Eliminar al cliente ${client.firstName} ${client.lastName}?`,
      header: 'Confirmar Eliminación',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Sí, eliminar',
      rejectLabel: 'Cancelar',
      acceptButtonStyleClass: 'p-button-danger p-button-sm',
      rejectButtonStyleClass: 'p-button-secondary p-button-sm',
      accept: () => {
        this.clientService.deleteClient(client.id).subscribe({
          next: () => {
            this.toast.add({ severity: 'success', summary: 'Eliminado', detail: 'Cliente eliminado.' });
            this.loadClients();
          },
          error: (err) => this.toast.add({ severity: 'error', summary: 'Error', detail: err.error?.message || 'Error al eliminar' }),
        });
      },
    });
  }

  // ─── Vehicle Management ─────────────────────────────────

  openDetailDialog(client: Client): void {
    this.selectedClient.set(client);
    this.loadClientVehicles(client.id);
    this.showDetailDialog = true;
  }

  loadClientVehicles(clientId: string): void {
    this.vehiclesLoading.set(true);
    this.vehicleService.getByClient(clientId)
      .pipe(catchError(() => of({ data: [], meta: { total: 0 } })))
      .subscribe(res => {
        this.clientVehicles.set(res.data);
        this.vehiclesLoading.set(false);
      });
  }

  openAddVehicleDialog(): void {
    this.vehicleForm = { plateNumber: '', vehicleType: 'CAR', brand: '', model: '', color: '', year: undefined };
    this.showAddVehicleDialog = true;
  }

  saveVehicle(): void {
    const client = this.selectedClient();
    if (!client || !this.vehicleForm.plateNumber?.trim()) return;
    this.submitting.set(true);

    this.vehicleService.createVehicle({ ...this.vehicleForm, clientId: client.id })
      .pipe(catchError(err => {
        this.toast.add({ severity: 'error', summary: 'Error', detail: err.error?.message || 'Error al crear vehículo' });
        this.submitting.set(false);
        return of(null);
      }))
      .subscribe(res => {
        if (res) {
          this.toast.add({ severity: 'success', summary: 'Vehículo agregado', detail: `Placa ${res.plateNumber}` });
          this.showAddVehicleDialog = false;
          this.loadClientVehicles(client.id);
        }
        this.submitting.set(false);
      });
  }

  removeVehicle(vehicle: Vehicle): void {
    this.confirmationService.confirm({
      message: `¿Eliminar vehículo placa <b>${vehicle.plateNumber}</b>?`,
      header: 'Confirmar',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Sí, eliminar',
      rejectLabel: 'Cancelar',
      acceptButtonStyleClass: 'p-button-danger p-button-sm',
      rejectButtonStyleClass: 'p-button-secondary p-button-sm',
      accept: () => {
        this.vehicleService.deleteVehicle(vehicle.id).subscribe({
          next: () => {
            this.toast.add({ severity: 'success', summary: 'Eliminado', detail: 'Vehículo eliminado.' });
            this.loadClientVehicles(this.selectedClient()!.id);
          },
          error: (err) => this.toast.add({ severity: 'error', summary: 'Error', detail: err.error?.message || 'Error al eliminar' }),
        });
      },
    });
  }

  // ─── Helpers ────────────────────────────────────────────

  documentLabel(type: string): string {
    return this.documentTypeOptions.find(o => o.value === type)?.label || type;
  }

  clientTypeLabel(type: string): string {
    return this.clientTypeOptions.find(o => o.value === type)?.label || type;
  }

  clientTypeClass(type: string): string {
    switch (type) {
      case 'REGULAR':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      case 'FREQUENT':
        return 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-400';
      case 'VIP':
        return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400';
      case 'CORPORATE':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400';
      default:
        return 'bg-surface-100 text-color';
    }
  }

  vehicleTypeLabel(type: string): string {
    return this.vehicleTypeOptions.find(o => o.value === type)?.label || type;
  }
}
