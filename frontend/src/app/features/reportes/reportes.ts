import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule, DatePipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';
import { ToastModule } from 'primeng/toast';
import { MessageModule } from 'primeng/message';
import { ProgressBarModule } from 'primeng/progressbar';
import { TabsModule } from 'primeng/tabs';
import { MessageService } from 'primeng/api';
import { catchError, of } from 'rxjs';

import { ReportsService, ReportFilter } from '../../core/services/reports.service';
import { ReportExportService } from '../../core/services/report-export.service';
import { ParkingLotService } from '../../core/services/parking-lot.service';
import { ParkingLot } from '../../core/interfaces/parking-lot';

@Component({
  selector: 'app-reportes',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    DatePipe,
    DecimalPipe,
    TableModule,
    ButtonModule,
    SelectModule,
    ToastModule,
    MessageModule,
    ProgressBarModule,
    TabsModule,
  ],
  providers: [MessageService],
  templateUrl: './reportes.html',
  styleUrl: './reportes.scss',
})
export class Reportes implements OnInit {
  protected Math = Math;
  private reportsService = inject(ReportsService);
  private exportService = inject(ReportExportService);
  private parkingLotService = inject(ParkingLotService);
  private toast = inject(MessageService);

  activeTab = signal<'revenue' | 'vehicles' | 'clients' | 'operators' | 'occupancy'>('revenue');
  loading = signal(false);

  // Filters
  parkingLots = signal<ParkingLot[]>([]);
  selectedLotId = signal<string | undefined>(undefined);
  dateRangeOption = signal<string>('30days');
  startDateStr = signal<string>('');
  endDateStr = signal<string>('');
  groupByOption = signal<'day' | 'week' | 'month'>('day');

  // Report Data
  revenueData = signal<any>(null);
  vehiclesData = signal<any>(null);
  clientsData = signal<any>(null);
  operatorsData = signal<any>(null);
  occupancyData = signal<any>(null);

  ngOnInit(): void {
    this.initDates('30days');
    this.loadParkingLots();
    this.loadAllReports();
  }

  initDates(preset: string): void {
    this.dateRangeOption.set(preset);
    const now = new Date();
    let start = new Date();
    let end = new Date();

    if (preset === 'today') {
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
    } else if (preset === 'week') {
      const day = start.getDay();
      const diff = start.getDate() - day + (day === 0 ? -6 : 1); // Adjust for Monday
      start = new Date(start.setDate(diff));
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
    } else if (preset === 'month') {
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    } else if (preset === '30days') {
      start = new Date(new Date().setDate(now.getDate() - 30));
      end.setHours(23, 59, 59, 999);
    }

    this.startDateStr.set(start.toISOString().split('T')[0]);
    this.endDateStr.set(end.toISOString().split('T')[0]);
  }

  onPresetChange(event: any): void {
    const val = event.value || event;
    if (val !== 'custom') {
      this.initDates(val);
      this.loadAllReports();
    }
  }

  loadParkingLots(): void {
    this.parkingLotService.getParkingLots().subscribe((res) => {
      if (res?.data) {
        this.parkingLots.set(res.data);
      }
    });
  }

  getFilter(): ReportFilter {
    return {
      startDate: this.startDateStr() ? new Date(this.startDateStr() + 'T00:00:00').toISOString() : undefined,
      endDate: this.endDateStr() ? new Date(this.endDateStr() + 'T23:59:59').toISOString() : undefined,
      parkingLotId: this.selectedLotId(),
      groupBy: this.groupByOption(),
    };
  }

  loadAllReports(): void {
    this.loading.set(true);
    const filter = this.getFilter();

    this.reportsService
      .getRevenueReport(filter)
      .pipe(catchError(() => of(null)))
      .subscribe((res) => {
        if (res) this.revenueData.set(res);
      });

    this.reportsService
      .getVehiclesReport(filter)
      .pipe(catchError(() => of(null)))
      .subscribe((res) => {
        if (res) this.vehiclesData.set(res);
      });

    this.reportsService
      .getClientsReport(filter)
      .pipe(catchError(() => of(null)))
      .subscribe((res) => {
        if (res) this.clientsData.set(res);
      });

    this.reportsService
      .getOperatorsReport(filter)
      .pipe(catchError(() => of(null)))
      .subscribe((res) => {
        if (res) this.operatorsData.set(res);
      });

    this.reportsService
      .getOccupancyReport(filter)
      .pipe(catchError(() => of(null)))
      .subscribe((res) => {
        if (res) this.occupancyData.set(res);
        this.loading.set(false);
      });
  }

  getActiveTabTitle(): string {
    const titles: Record<string, string> = {
      revenue: 'Ingresos y Recaudación',
      vehicles: 'Flujo de Vehículos',
      clients: 'Clientes y Abonados',
      operators: 'Rendimiento de Operadores',
      occupancy: 'Ocupación de Estacionamiento',
    };
    return titles[this.activeTab()] || 'Reporte';
  }

  getActiveTabData(): any {
    const tab = this.activeTab();
    if (tab === 'revenue') return this.revenueData();
    if (tab === 'vehicles') return this.vehiclesData();
    if (tab === 'clients') return this.clientsData();
    if (tab === 'operators') return this.operatorsData();
    if (tab === 'occupancy') return this.occupancyData();
    return null;
  }

  getSelectedLotName(): string {
    const lotId = this.selectedLotId();
    if (!lotId) return 'Todos los Estacionamientos';
    const lot = this.parkingLots().find((l) => l.id === lotId);
    return lot ? lot.name : 'Estacionamiento';
  }

  exportPdf(): void {
    const data = this.getActiveTabData();
    if (!data) {
      this.toast.add({ severity: 'warn', summary: 'Sin datos', detail: 'No hay información para exportar en este reporte.' });
      return;
    }

    const filterInfo = {
      startDate: this.startDateStr(),
      endDate: this.endDateStr(),
      lotName: this.getSelectedLotName(),
      groupBy: this.groupByOption(),
    };

    try {
      this.exportService.exportPdf(this.activeTab(), data, filterInfo);
      this.toast.add({ severity: 'success', summary: 'PDF Generado', detail: 'Reporte en PDF descargado con membrete institucional y QR.' });
    } catch (e: any) {
      this.toast.add({ severity: 'error', summary: 'Error PDF', detail: 'No se pudo generar el archivo PDF: ' + (e?.message || e) });
    }
  }

  exportWord(): void {
    const data = this.getActiveTabData();
    if (!data) {
      this.toast.add({ severity: 'warn', summary: 'Sin datos', detail: 'No hay información para exportar en este reporte.' });
      return;
    }

    const filterInfo = {
      startDate: this.startDateStr(),
      endDate: this.endDateStr(),
      lotName: this.getSelectedLotName(),
    };

    try {
      this.exportService.exportDocx(this.activeTab(), data, filterInfo);
      this.toast.add({ severity: 'success', summary: 'Word Generado', detail: 'Reporte en formato Word (.docx) descargado exitosamente.' });
    } catch (e: any) {
      this.toast.add({ severity: 'error', summary: 'Error Word', detail: 'No se pudo generar el archivo Word.' });
    }
  }

  exportExcel(): void {
    const data = this.getActiveTabData();
    if (!data) {
      this.toast.add({ severity: 'warn', summary: 'Sin datos', detail: 'No hay información para exportar en este reporte.' });
      return;
    }

    const filterInfo = {
      startDate: this.startDateStr(),
      endDate: this.endDateStr(),
      lotName: this.getSelectedLotName(),
    };

    try {
      this.exportService.exportExcel(this.activeTab(), data, filterInfo);
      this.toast.add({ severity: 'success', summary: 'Excel Generado', detail: 'Reporte en formato Excel (.xlsx) descargado exitosamente.' });
    } catch (e: any) {
      this.toast.add({ severity: 'error', summary: 'Error Excel', detail: 'No se pudo generar el archivo Excel.' });
    }
  }

  exportCsv(): void {
    const filter = this.getFilter();
    const currentTab = this.activeTab();
    this.reportsService.exportCsv(filter, currentTab).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `reporte_${currentTab}_${Date.now()}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
        this.toast.add({ severity: 'success', summary: 'Exportación Lista', detail: 'Reporte CSV generado exitosamente' });
      },
      error: () => {
        this.toast.add({ severity: 'error', summary: 'Error', detail: 'No se pudo exportar el reporte CSV.' });
      },
    });
  }

  printReport(): void {
    window.print();
  }

  getMaxTimelineAmount(): number {
    const timeline = this.revenueData()?.timeline || [];
    if (timeline.length === 0) return 1;
    return Math.max(...timeline.map((item: any) => item.amount), 1);
  }

  getMaxPeakHourCount(): number {
    const peakHours = this.vehiclesData()?.peakHours || [];
    if (peakHours.length === 0) return 1;
    return Math.max(...peakHours.map((item: any) => item.count), 1);
  }

  getPaymentMethodLabel(method: string): string {
    const labels: Record<string, string> = {
      CASH: 'Efectivo',
      CARD: 'Tarjeta Débito/Crédito',
      TRANSFER: 'Transferencia Bancaria',
      SUBSCRIPTION: 'Suscripción / Abono',
      APP: 'Pago Móvil / App',
      OTHER: 'Otro Método',
    };
    return labels[method] || method;
  }

  getVehicleTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      CAR: 'Automóvil',
      MOTORCYCLE: 'Motocicleta',
      SUV: 'Camioneta / SUV',
      TRUCK: 'Camión / Carga',
      VAN: 'Furgoneta / Van',
      BUS: 'Autobús',
      BICYCLE: 'Bicicleta',
      OTHER: 'Otro',
    };
    return labels[type] || type;
  }
}
