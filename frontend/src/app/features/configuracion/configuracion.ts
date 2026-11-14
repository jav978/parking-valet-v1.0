import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule, InputNumber } from 'primeng/inputnumber';
import { TextareaModule } from 'primeng/textarea';
import { SelectModule } from 'primeng/select';
import { CheckboxModule } from 'primeng/checkbox';
import { TableModule } from 'primeng/table';
import { DialogModule } from 'primeng/dialog';
import { ToastModule } from 'primeng/toast';
import { MessageModule } from 'primeng/message';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { TooltipModule } from 'primeng/tooltip';
import { MessageService, ConfirmationService } from 'primeng/api';
import { catchError, of } from 'rxjs';

import { SettingService, PrinterConfigItem } from '../../core/services/setting.service';
import { ExchangeRateService } from '../../core/services/exchange-rate.service';
import { LicenseService, LicenseStatusResponse } from '../../core/services/license.service';

@Component({
  selector: 'app-configuracion',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    InputTextModule,
    InputNumberModule,
    InputNumber,
    TextareaModule,
    SelectModule,
    CheckboxModule,
    TableModule,
    DialogModule,
    ToastModule,
    MessageModule,
    ConfirmDialogModule,
    TooltipModule,
    DatePipe
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './configuracion.html',
  styleUrl: './configuracion.scss',
})
export class Configuracion implements OnInit {
  private settingService = inject(SettingService);
  public exchangeRateService = inject(ExchangeRateService);
  private toast = inject(MessageService);
  private confirmationService = inject(ConfirmationService);

  activeTab = signal<'general' | 'operacion' | 'tasas' | 'impresoras' | 'licencia'>('general');
  loading = signal(false);
  saving = signal(false);

  // Licencia
  private licenseService = inject(LicenseService);
  licenseStatus = signal<LicenseStatusResponse | null>(null);
  licenseKey = '';
  licenseLoading = signal(false);
  licenseActivating = signal(false);

  // Formulario General / Empresa
  companyForm = {
    companyName: 'Parking Valet System C.A.',
    taxId: 'J-12345678-9',
    phone: '+58 212 555-0199',
    email: 'contacto@parkingvalet.com',
    address: 'Av. Principal de las Mercedes, Torre Empresarial, Piso 1',
    ticketHeader: '¡Bienvenidos a Parking Valet System!',
    ticketFooter: 'Gracias por su preferencia. Conserve este ticket para retirar su vehículo.',
    gracePeriodMinutes: 15,
    taxPercentage: 16,
  };

  // Impresoras
  printers = signal<PrinterConfigItem[]>([]);
  showPrinterDialog = false;
  editingPrinterId: string | null = null;
  printerForm: PrinterConfigItem = {
    lotId: '',
    name: '',
    interfaceType: 'NETWORK',
    ipAddress: '192.168.1.100',
    port: 9100,
    paperWidth: 'MM_80',
    charactersPerLine: 42,
    isDefault: true,
  };

  interfaceOptions = [
    { label: 'Red Ethernet / IP', value: 'NETWORK' },
    { label: 'USB Directo', value: 'USB' },
    { label: 'Puerto Serie (COM)', value: 'SERIAL' },
    { label: 'Bluetooth', value: 'BLUETOOTH' },
  ];

  paperWidthOptions = [
    { label: '80 mm (Estándar POS)', value: 'MM_80' },
    { label: '58 mm (Compacto)', value: 'MM_58' },
  ];

  private route = inject(ActivatedRoute);

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      if (params['tab']) {
        this.activeTab.set(params['tab'] as any);
      }
    });
    this.loadSettings();
    this.loadPrinters();
    this.loadLicenseInfo();
  }

  loadLicenseInfo(): void {
    this.licenseLoading.set(true);
    this.licenseService.getStatus().subscribe({
      next: (status) => {
        this.licenseStatus.set(status);
        this.licenseLoading.set(false);
      },
      error: () => this.licenseLoading.set(false),
    });
  }

  activateLicenseKey(): void {
    if (!this.licenseKey.trim()) return;
    this.licenseActivating.set(true);
    this.licenseService.activateLicense(this.licenseKey).subscribe({
      next: (res) => {
        this.toast.add({ severity: 'success', summary: '¡Éxito!', detail: res.message || 'Licencia activada correctamente.' });
        this.licenseKey = '';
        this.loadLicenseInfo();
        this.licenseActivating.set(false);
      },
      error: (err) => {
        this.toast.add({ severity: 'error', summary: 'Error', detail: err?.error?.message || 'Clave de licencia inválida.' });
        this.licenseActivating.set(false);
      },
    });
  }

  setTab(tab: 'general' | 'operacion' | 'tasas' | 'impresoras' | 'licencia'): void {
    this.activeTab.set(tab);
  }

  loadSettings(): void {
    this.loading.set(true);
    this.settingService
      .getSettings()
      .pipe(
        catchError(() => {
          this.toast.add({ severity: 'error', summary: 'Error', detail: 'Error al cargar configuraciones' });
          this.loading.set(false);
          return of(null);
        })
      )
      .subscribe((res) => {
        if (res?.data?.settings) {
          const s = res.data.settings;
          const getVal = (key: string, field?: string) => {
            const v = s[key];
            if (!v) return undefined;
            if (typeof v === 'string' || typeof v === 'number') return v;
            if (field && v[field] !== undefined) return v[field];
            return v;
          };

          this.companyForm = {
            companyName: getVal('company.name', 'name') || getVal('companyName') || this.companyForm.companyName,
            taxId: getVal('company.tax_id', 'taxId') || getVal('taxId') || this.companyForm.taxId,
            phone: getVal('company.phone', 'phone') || getVal('phone') || this.companyForm.phone,
            email: getVal('company.email', 'email') || getVal('email') || this.companyForm.email,
            address: getVal('company.address', 'address') || getVal('address') || this.companyForm.address,
            ticketHeader: getVal('ticketHeader') || this.companyForm.ticketHeader,
            ticketFooter: getVal('ticketFooter') || this.companyForm.ticketFooter,
            gracePeriodMinutes: getVal('gracePeriodMinutes') ?? this.companyForm.gracePeriodMinutes,
            taxPercentage: getVal('company.tax_percentage', 'percentage') ?? getVal('taxPercentage') ?? this.companyForm.taxPercentage,
          };
        }
        this.loading.set(false);
      });
  }

  saveCompanySettings(): void {
    this.saving.set(true);

    const payload = {
      companyName: this.companyForm.companyName,
      'company.name': { name: this.companyForm.companyName },
      taxId: this.companyForm.taxId,
      phone: this.companyForm.phone,
      'company.phone': { phone: this.companyForm.phone },
      email: this.companyForm.email,
      'company.email': { email: this.companyForm.email },
      address: this.companyForm.address,
      'company.address': { address: this.companyForm.address },
      ticketHeader: this.companyForm.ticketHeader,
      ticketFooter: this.companyForm.ticketFooter,
      gracePeriodMinutes: this.companyForm.gracePeriodMinutes,
      taxPercentage: this.companyForm.taxPercentage,
      'company.tax_percentage': { percentage: this.companyForm.taxPercentage },
    };

    this.settingService
      .updateSettings(payload)
      .pipe(
        catchError((err) => {
          const errMsg = err.error?.message || 'Error al guardar configuraciones';
          this.toast.add({ severity: 'error', summary: 'Error', detail: errMsg });
          this.saving.set(false);
          return of(null);
        })
      )
      .subscribe((res) => {
        if (res) {
          this.toast.add({ severity: 'success', summary: 'Éxito', detail: 'Configuración guardada correctamente' });
        }
        this.saving.set(false);
      });
  }

  loadPrinters(): void {
    this.settingService
      .getPrinters()
      .pipe(
        catchError(() => of({ data: [] }))
      )
      .subscribe((res) => {
        if (res?.data) {
          this.printers.set(res.data);
        }
      });
  }

  openCreatePrinterDialog(): void {
    this.editingPrinterId = null;
    this.printerForm = {
      lotId: 'b3da922c-bbd7-42f6-b922-7b3d1f3194c8', // default lot
      name: '',
      interfaceType: 'NETWORK',
      ipAddress: '192.168.1.200',
      port: 9100,
      paperWidth: 'MM_80',
      charactersPerLine: 42,
      isDefault: this.printers().length === 0,
    };
    this.showPrinterDialog = true;
  }

  openEditPrinterDialog(printer: PrinterConfigItem): void {
    this.editingPrinterId = printer.id || null;
    this.printerForm = { ...printer };
    this.showPrinterDialog = true;
  }

  savePrinter(): void {
    if (!this.printerForm.name) return;

    if (this.editingPrinterId) {
      this.settingService
        .updatePrinter(this.editingPrinterId, this.printerForm)
        .pipe(
          catchError(() => {
            this.toast.add({ severity: 'error', summary: 'Error', detail: 'Error al actualizar impresora' });
            return of(null);
          })
        )
        .subscribe((res) => {
          if (res) {
            this.toast.add({ severity: 'success', summary: 'Éxito', detail: 'Impresora actualizada' });
            this.showPrinterDialog = false;
            this.loadPrinters();
          }
        });
    } else {
      this.settingService
        .createPrinter(this.printerForm)
        .pipe(
          catchError(() => {
            this.toast.add({ severity: 'error', summary: 'Error', detail: 'Error al registrar impresora' });
            return of(null);
          })
        )
        .subscribe((res) => {
          if (res) {
            this.toast.add({ severity: 'success', summary: 'Éxito', detail: 'Impresora agregada correctamente' });
            this.showPrinterDialog = false;
            this.loadPrinters();
          }
        });
    }
  }

  deletePrinter(printer: PrinterConfigItem): void {
    if (!printer.id) return;
    this.confirmationService.confirm({
      message: `¿Estás seguro de desactivar la impresora "${printer.name}"?`,
      header: 'Confirmar Eliminación',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Sí, eliminar',
      rejectLabel: 'Cancelar',
      acceptButtonProps: { severity: 'danger', label: 'Eliminar' },
      rejectButtonProps: { severity: 'secondary', outlined: true, label: 'Cancelar' },
      accept: () => {
        this.settingService
          .deletePrinter(printer.id!)
          .pipe(catchError(() => of(null)))
          .subscribe((res) => {
            if (res) {
              this.toast.add({ severity: 'success', summary: 'Éxito', detail: 'Impresora eliminada' });
              this.loadPrinters();
            }
          });
      },
    });
  }

  testPrinter(printer: PrinterConfigItem): void {
    this.toast.add({
      severity: 'info',
      summary: 'Prueba de Impresión',
      detail: `Enviando ticket de prueba a ${printer.name} (${printer.ipAddress || printer.devicePath || 'Local'})...`,
    });
  }
}
