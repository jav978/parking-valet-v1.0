import { Injectable } from '@angular/core';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

export interface CompanyHeaderInfo {
  name?: string;
  taxId?: string;
  phone?: string;
  email?: string;
  address?: string;
}

@Injectable({
  providedIn: 'root',
})
export class ReportExportService {
  private defaultCompany: CompanyHeaderInfo = {
    name: 'Parking Valet System C.A.',
    taxId: 'RIF: J-12345678-9',
    phone: '+58 212 555-0199',
    email: 'contacto@parkingvalet.com',
    address: 'Av. Principal de las Mercedes, Torre Empresarial, Piso 1',
  };

  /**
   * Genera y descarga un PDF vectorial profesional con membrete corporativo,
   * metadatos de filtro, resumen KPI, tabla estilizada y pie de página.
   */
  exportPdf(
    reportType: 'revenue' | 'vehicles' | 'clients' | 'operators' | 'occupancy',
    data: any,
    filterInfo: { startDate?: string; endDate?: string; lotName?: string; groupBy?: string },
    companyInfo?: CompanyHeaderInfo
  ): void {
    const company = { ...this.defaultCompany, ...companyInfo };
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // ─── 1. BANNER Y MEMBRETE CORPORATIVO ─────────────────────────
    // Barra superior decorativa
    doc.setFillColor(15, 118, 110); // Teal corporativo
    doc.rect(0, 0, pageWidth, 6, 'F');

    // Nombre de la empresa
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(15, 23, 42); // slate-900
    doc.text(company.name!, 14, 16);

    // Datos fiscales
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139); // slate-500
    doc.text(`${company.taxId}  |  Tel: ${company.phone}  |  ${company.email}`, 14, 21);
    doc.text(company.address!, 14, 25.5);

    // Línea divisoria de membrete
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.5);
    doc.line(14, 28, pageWidth - 14, 28);

    // ─── 2. TÍTULO Y METADATOS DEL REPORTE ────────────────────────
    const reportTitles: Record<string, string> = {
      revenue: 'REPORTE EJECUTIVO DE INGRESOS Y RECAUDACIÓN',
      vehicles: 'REPORTE DE FLUJO DE VEHÍCULOS Y HORAS PICO',
      clients: 'REPORTE DE CLIENTES Y ABONADOS FRECUENTES',
      operators: 'REPORTE DE RENDIMIENTO DE OPERADORES Y CAJAS',
      occupancy: 'REPORTE DE OCUPACIÓN DE ESTACIONAMIENTO',
    };

    const title = reportTitles[reportType] || 'REPORTE DE SISTEMA';

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(15, 118, 110);
    doc.text(title, 14, 35);

    // Bloque de metadatos (Filtros)
    doc.setFillColor(248, 250, 252); // slate-50
    doc.roundedRect(14, 38, pageWidth - 28, 14, 2, 2, 'F');
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.3);
    doc.roundedRect(14, 38, pageWidth - 28, 14, 2, 2, 'D');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(51, 65, 85);

    const startText = filterInfo.startDate ? new Date(filterInfo.startDate).toLocaleDateString('es-ES') : 'Inicio';
    const endText = filterInfo.endDate ? new Date(filterInfo.endDate).toLocaleDateString('es-ES') : 'Actualidad';
    const lotText = filterInfo.lotName || 'Todos los Estacionamientos';
    const nowText = new Date().toLocaleString('es-ES');

    doc.text(`Rango de Fechas: ${startText} - ${endText}`, 18, 43.5);
    doc.text(`Estacionamiento: ${lotText}`, 18, 48.5);
    doc.text(`Emisión: ${nowText}`, pageWidth / 2 + 10, 43.5);
    doc.text(`Agrupación: ${filterInfo.groupBy === 'month' ? 'Mensual' : filterInfo.groupBy === 'week' ? 'Semanal' : 'Diario'}`, pageWidth / 2 + 10, 48.5);

    let startY = 57;

    // ─── 3. RESUMEN KPI Y TABLAS SEGÚN TIPO ───────────────────────
    if (reportType === 'revenue') {
      this.buildRevenuePdfSection(doc, data, startY);
    } else if (reportType === 'vehicles') {
      this.buildVehiclesPdfSection(doc, data, startY);
    } else if (reportType === 'clients') {
      this.buildClientsPdfSection(doc, data, startY);
    } else if (reportType === 'operators') {
      this.buildOperatorsPdfSection(doc, data, startY);
    } else if (reportType === 'occupancy') {
      this.buildOccupancyPdfSection(doc, data, startY);
    }

    // ─── 4. PIE DE PÁGINA DINÁMICO (PÁGINA X DE Y) ─────────────────
    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.4);
      doc.line(14, pageHeight - 12, pageWidth - 14, pageHeight - 12);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184); // slate-400
      doc.text('Parking Valet System - Documento confidencial de uso interno', 14, pageHeight - 7);
      doc.text(`Página ${i} de ${pageCount}`, pageWidth - 14, pageHeight - 7, { align: 'right' });
    }

    doc.save(`reporte_${reportType}_${Date.now()}.pdf`);
  }

  // ─── CONSTRUCTORES DE SECCIONES PDF ─────────────────────────────

  private buildRevenuePdfSection(doc: jsPDF, data: any, startY: number): void {
    const totalRev = data?.totalRevenue ?? 0;
    const totalTrans = data?.totalTransactions ?? 0;
    const avgTrans = data?.averageTransaction ?? 0;

    // Tarjetas KPI
    this.drawKpiCard(doc, 14, startY, 55, 14, 'TOTAL RECAUDADO', `$${totalRev.toFixed(2)}`, [15, 118, 110]);
    this.drawKpiCard(doc, 75, startY, 55, 14, 'TOTAL TRANSACCIONES', `${totalTrans}`, [59, 130, 246]);
    this.drawKpiCard(doc, 136, startY, 60, 14, 'PROMEDIO POR TICKET', `$${avgTrans.toFixed(2)}`, [168, 85, 247]);

    startY += 19;

    // Tabla 1: Recaudación por Método de Pago
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(30, 41, 59);
    doc.text('DESGLOSE POR MÉTODO DE PAGO', 14, startY);
    startY += 3;

    const methodRows = (data?.byPaymentMethod || []).map((item: any) => [
      this.getPaymentMethodLabel(item.method),
      item.count.toString(),
      `$${Number(item.total).toFixed(2)}`,
      `${totalRev > 0 ? ((item.total / totalRev) * 100).toFixed(1) : 0}%`,
    ]);

    autoTable(doc, {
      startY,
      head: [['Método de Pago', 'Transacciones', 'Monto Total', 'Porcentaje']],
      body: methodRows,
      theme: 'grid',
      headStyles: { fillColor: [15, 118, 110], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8.5 },
      bodyStyles: { fontSize: 8, textColor: [51, 65, 85] },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      columnStyles: {
        0: { cellWidth: 60 },
        1: { halign: 'center', cellWidth: 35 },
        2: { halign: 'right', cellWidth: 45 },
        3: { halign: 'right', cellWidth: 40 },
      },
      foot: [['TOTALES', totalTrans.toString(), `$${totalRev.toFixed(2)}`, '100%']],
      footStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontStyle: 'bold', fontSize: 8.5 },
    });

    startY = (doc as any).lastAutoTable.finalY + 8;

    // Tabla 2: Cronología de Ingresos
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(30, 41, 59);
    doc.text('CRONOLOGÍA DE INGRESOS POR PERIODO', 14, startY);
    startY += 3;

    const timelineRows = (data?.timeline || []).map((item: any) => [
      item.label,
      item.count.toString(),
      `$${Number(item.amount).toFixed(2)}`,
    ]);

    autoTable(doc, {
      startY,
      head: [['Periodo / Fecha', 'Tickets Cobrados', 'Monto Recaudado']],
      body: timelineRows,
      theme: 'grid',
      headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8.5 },
      bodyStyles: { fontSize: 8, textColor: [51, 65, 85] },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      columnStyles: {
        0: { cellWidth: 70 },
        1: { halign: 'center', cellWidth: 50 },
        2: { halign: 'right', cellWidth: 60 },
      },
    });
  }

  private buildVehiclesPdfSection(doc: jsPDF, data: any, startY: number): void {
    const totalVeh = data?.totalVehicles ?? 0;
    const totalEntries = data?.totalEntries ?? 0;

    this.drawKpiCard(doc, 14, startY, 85, 14, 'TOTAL VEHÍCULOS REGISTRADOS', `${totalVeh}`, [15, 118, 110]);
    this.drawKpiCard(doc, 105, startY, 90, 14, 'TOTAL ENTRADAS PROCESADAS', `${totalEntries}`, [59, 130, 246]);

    startY += 19;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.text('DISTRIBUCIÓN POR TIPO DE VEHÍCULO', 14, startY);
    startY += 3;

    const typeRows = (data?.byType || []).map((item: any) => [
      this.getVehicleTypeLabel(item.type),
      item.count.toString(),
      `${totalVeh > 0 ? ((item.count / totalVeh) * 100).toFixed(1) : 0}%`,
    ]);

    autoTable(doc, {
      startY,
      head: [['Tipo de Vehículo', 'Cantidad Registrada', 'Porcentaje del Total']],
      body: typeRows,
      theme: 'grid',
      headStyles: { fillColor: [15, 118, 110], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8.5 },
      bodyStyles: { fontSize: 8 },
      alternateRowStyles: { fillColor: [248, 250, 252] },
    });

    startY = (doc as any).lastAutoTable.finalY + 8;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.text('ANÁLISIS DE HORAS PICO ENTRADA/SALIDA', 14, startY);
    startY += 3;

    const peakRows = (data?.peakHours || []).map((item: any) => [
      `${String(item.hour).padStart(2, '0')}:00 - ${String(item.hour).padStart(2, '0')}:59`,
      item.count.toString(),
    ]);

    autoTable(doc, {
      startY,
      head: [['Franja Horaria', 'Flujo de Vehículos']],
      body: peakRows,
      theme: 'grid',
      headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8.5 },
      bodyStyles: { fontSize: 8 },
    });
  }

  private buildClientsPdfSection(doc: jsPDF, data: any, startY: number): void {
    const totalClients = data?.totalClients ?? 0;
    const activeSubs = data?.activeSubscriptions ?? 0;

    this.drawKpiCard(doc, 14, startY, 85, 14, 'TOTAL CLIENTES REGISTRADOS', `${totalClients}`, [15, 118, 110]);
    this.drawKpiCard(doc, 105, startY, 90, 14, 'SUSCRIPCIONES ACTIVAS', `${activeSubs}`, [168, 85, 247]);

    startY += 19;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.text('TOP CLIENTES FRECUENTES CON MAYOR ACTIVIDAD', 14, startY);
    startY += 3;

    const rows = (data?.topClients || []).map((c: any) => [
      `${c.firstName || ''} ${c.lastName || ''}`.trim() || 'Sin Nombre',
      c.email || 'N/A',
      c.phone || 'N/A',
      (c.ticketsCount || 0).toString(),
      `$${Number(c.totalSpent || 0).toFixed(2)}`,
    ]);

    autoTable(doc, {
      startY,
      head: [['Cliente', 'Correo Electrónico', 'Teléfono', 'Visitas', 'Total Gastado']],
      body: rows,
      theme: 'grid',
      headStyles: { fillColor: [15, 118, 110], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8.5 },
      bodyStyles: { fontSize: 8 },
      columnStyles: {
        3: { halign: 'center' },
        4: { halign: 'right' },
      },
    });
  }

  private buildOperatorsPdfSection(doc: jsPDF, data: any, startY: number): void {
    const totalOps = (data?.operators || []).length;
    this.drawKpiCard(doc, 14, startY, 180, 14, 'OPERADORES REGISTRADOS EN EL PERIODO', `${totalOps}`, [15, 118, 110]);

    startY += 19;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.text('RESUMEN DE RENDIMIENTO Y COBROS POR OPERADOR', 14, startY);
    startY += 3;

    const rows = (data?.operators || []).map((op: any) => [
      op.name || 'Desconocido',
      op.role || 'Operador',
      (op.processedTickets || 0).toString(),
      `$${Number(op.totalCollected || 0).toFixed(2)}`,
    ]);

    autoTable(doc, {
      startY,
      head: [['Operador / Cajero', 'Rol', 'Tickets Procesados', 'Monto Total Recaudado']],
      body: rows,
      theme: 'grid',
      headStyles: { fillColor: [15, 118, 110], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8.5 },
      bodyStyles: { fontSize: 8 },
      columnStyles: {
        2: { halign: 'center' },
        3: { halign: 'right' },
      },
    });
  }

  private buildOccupancyPdfSection(doc: jsPDF, data: any, startY: number): void {
    const totalSpots = data?.totalSpots ?? 0;
    const occupied = data?.occupiedSpots ?? 0;
    const rate = data?.occupancyRate ?? 0;

    this.drawKpiCard(doc, 14, startY, 55, 14, 'TOTAL PUESTOS', `${totalSpots}`, [30, 41, 59]);
    this.drawKpiCard(doc, 75, startY, 55, 14, 'PUESTOS OCUPADOS', `${occupied}`, [239, 68, 68]);
    this.drawKpiCard(doc, 136, startY, 60, 14, 'TASA OCUPACIÓN', `${rate.toFixed(1)}%`, [15, 118, 110]);

    startY += 19;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.text('DETALLE DE OCUPACIÓN POR ZONA / PUESTO', 14, startY);
    startY += 3;

    const rows = (data?.spots || []).map((s: any) => [
      s.spotNumber || 'S/N',
      s.zone || 'General',
      s.isOccupied ? 'OCUPADO' : 'LIBRE',
      s.vehiclePlate || '-',
    ]);

    autoTable(doc, {
      startY,
      head: [['Número de Puesto', 'Zona', 'Estado Actual', 'Placa Vehículo']],
      body: rows,
      theme: 'grid',
      headStyles: { fillColor: [15, 118, 110], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8.5 },
      bodyStyles: { fontSize: 8 },
    });
  }

  // ─── EXPORTACIÓN A EXCEL (.XLSX) ──────────────────────────────

  exportExcel(
    reportType: 'revenue' | 'vehicles' | 'clients' | 'operators' | 'occupancy',
    data: any,
    filterInfo: { startDate?: string; endDate?: string; lotName?: string }
  ): void {
    const wb = XLSX.utils.book_new();
    const sheetData: any[][] = [];

    // Encabezado
    sheetData.push(['PARKING VALET SYSTEM C.A.']);
    sheetData.push([`REPORTE DE ${reportType.toUpperCase()}`]);
    sheetData.push([`Fechas: ${filterInfo.startDate || 'Inicio'} a ${filterInfo.endDate || 'Actual'}`]);
    sheetData.push([`Estacionamiento: ${filterInfo.lotName || 'Todos'}`]);
    sheetData.push([]); // Espacio

    if (reportType === 'revenue') {
      sheetData.push(['RESUMEN DE INGRESOS']);
      sheetData.push(['Total Recaudado', data?.totalRevenue || 0]);
      sheetData.push(['Total Transacciones', data?.totalTransactions || 0]);
      sheetData.push(['Promedio por Ticket', data?.averageTransaction || 0]);
      sheetData.push([]);

      sheetData.push(['MÉTODO DE PAGO', 'TRANSACCIONES', 'MONTO TOTAL', 'PORCENTAJE']);
      (data?.byPaymentMethod || []).forEach((m: any) => {
        sheetData.push([
          this.getPaymentMethodLabel(m.method),
          m.count,
          m.total,
          `${data?.totalRevenue ? ((m.total / data.totalRevenue) * 100).toFixed(1) : 0}%`,
        ]);
      });
      sheetData.push([]);

      sheetData.push(['PERIODO', 'TICKETS', 'RECAUDACIÓN']);
      (data?.timeline || []).forEach((t: any) => {
        sheetData.push([t.label, t.count, t.amount]);
      });
    } else if (reportType === 'vehicles') {
      sheetData.push(['TIPO VEHÍCULO', 'CANTIDAD']);
      (data?.byType || []).forEach((v: any) => {
        sheetData.push([this.getVehicleTypeLabel(v.type), v.count]);
      });
    } else if (reportType === 'clients') {
      sheetData.push(['NOMBRE CLIENTE', 'CORREO', 'TELÉFONO', 'VISITAS', 'TOTAL GASTADO']);
      (data?.topClients || []).forEach((c: any) => {
        sheetData.push([
          `${c.firstName || ''} ${c.lastName || ''}`.trim(),
          c.email || '',
          c.phone || '',
          c.ticketsCount || 0,
          c.totalSpent || 0,
        ]);
      });
    } else if (reportType === 'operators') {
      sheetData.push(['OPERADOR', 'ROL', 'TICKETS PROCESADOS', 'TOTAL RECAUDADO']);
      (data?.operators || []).forEach((op: any) => {
        sheetData.push([op.name, op.role, op.processedTickets, op.totalCollected]);
      });
    }

    const ws = XLSX.utils.aoa_to_sheet(sheetData);
    XLSX.utils.book_append_sheet(wb, ws, 'Reporte');
    XLSX.writeFile(wb, `reporte_${reportType}_${Date.now()}.xlsx`);
  }

  // ─── HELPERS DE DISEÑO PDF ──────────────────────────────────────

  private drawKpiCard(
    doc: jsPDF,
    x: number,
    y: number,
    w: number,
    h: number,
    label: string,
    value: string,
    rgbColor: [number, number, number]
  ): void {
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(x, y, w, h, 2, 2, 'F');
    doc.setDrawColor(...rgbColor);
    doc.setLineWidth(0.6);
    doc.line(x, y, x, y + h);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text(label, x + 4, y + 5);

    doc.setFontSize(11);
    doc.setTextColor(...rgbColor);
    doc.text(value, x + 4, y + 11);
  }

  private getPaymentMethodLabel(method: string): string {
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

  private getVehicleTypeLabel(type: string): string {
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
