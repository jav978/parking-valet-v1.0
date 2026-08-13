import { Injectable, inject } from '@angular/core';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import * as QRCode from 'qrcode';
import {
  Document,
  Packer,
  Paragraph,
  Table,
  TableRow,
  TableCell,
  TextRun,
  AlignmentType,
  WidthType,
  HeadingLevel,
} from 'docx';
import { SettingService, CompanySettings } from './setting.service';

export interface CompanyHeaderInfo {
  name?: string;
  taxId?: string;
  phone?: string;
  email?: string;
  address?: string;
  currencySymbol?: string;
  taxPercentage?: number;
}

@Injectable({
  providedIn: 'root',
})
export class ReportExportService {
  private settingService = inject(SettingService);

  private defaultCompany: CompanyHeaderInfo = {
    name: 'Parking Valet System C.A.',
    taxId: 'RIF: J-12345678-9',
    phone: '+58 212 555-0199',
    email: 'contacto@parkingvalet.com',
    address: 'Av. Principal de las Mercedes, Torre Empresarial, Piso 1',
    currencySymbol: '$',
    taxPercentage: 16,
  };

  /**
   * Obtiene la información corporativa fusionando la configuración guardada
   * en la base de datos con los valores por defecto.
   */
  public async getCompanySettings(): Promise<CompanyHeaderInfo> {
    try {
      const res = await this.settingService.getSettings().toPromise();
      if (res?.data?.settings) {
        const s: CompanySettings = res.data.settings;
        return {
          name: s.companyName || this.defaultCompany.name,
          taxId: s.taxId || this.defaultCompany.taxId,
          phone: s.phone || this.defaultCompany.phone,
          email: s.email || this.defaultCompany.email,
          address: s.address || this.defaultCompany.address,
          currencySymbol: s.currencySymbol || this.defaultCompany.currencySymbol,
          taxPercentage: s.taxPercentage ?? this.defaultCompany.taxPercentage,
        };
      }
    } catch (e) {
      console.warn('Could not load company settings, using default.', e);
    }
    return this.defaultCompany;
  }

  // ─── 1. EXPORTACIÓN A PDF CON MEMBRETE Y CÓDIGO QR ─────────────────────────

  async exportPdf(
    reportType: 'revenue' | 'vehicles' | 'clients' | 'operators' | 'occupancy',
    data: any,
    filterInfo: { startDate?: string; endDate?: string; lotName?: string; groupBy?: string },
    overrideCompany?: CompanyHeaderInfo
  ): Promise<void> {
    const loadedCompany = await this.getCompanySettings();
    const company = { ...loadedCompany, ...overrideCompany };
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const folioNumber = `RPT-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}${String(new Date().getDate()).padStart(2, '0')}-${Math.floor(1000 + Math.random() * 9000)}`;

    // Generar Código QR Base64 para el Membrete
    const qrPayload = JSON.stringify({
      system: 'ParkingValet',
      report: reportType,
      folio: folioNumber,
      date: new Date().toISOString(),
      company: company.name,
    });
    let qrDataUrl = '';
    try {
      qrDataUrl = await QRCode.toDataURL(qrPayload, { margin: 1, width: 200, errorCorrectionLevel: 'M' });
    } catch (e) {
      console.error('Error generating QR for PDF', e);
    }

    // ─── 1. BANNER Y MEMBRETE CORPORATIVO ─────────────────────────
    // Barra superior decorativa Teal / Emerald
    doc.setFillColor(15, 118, 110);
    doc.rect(0, 0, pageWidth, 6, 'F');

    // Nombre de la empresa
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(15, 23, 42); // slate-900
    doc.text(company.name!, 14, 16);

    // Datos fiscales y contacto
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139); // slate-500
    doc.text(`${company.taxId}  |  Tel: ${company.phone}  |  ${company.email}`, 14, 21);
    doc.text(company.address!, 14, 25.5);

    // Renderizar Código QR en la esquina superior derecha
    if (qrDataUrl) {
      doc.addImage(qrDataUrl, 'PNG', pageWidth - 36, 8, 22, 22);
    }

    // Línea divisoria de membrete
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.5);
    doc.line(14, 32, pageWidth - 14, 32);

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
    doc.setFontSize(11);
    doc.setTextColor(15, 118, 110);
    doc.text(title, 14, 38);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(`Folio: ${folioNumber}`, pageWidth - 14, 38, { align: 'right' });

    // Bloque de metadatos (Filtros)
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(14, 41, pageWidth - 28, 14, 2, 2, 'F');
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.3);
    doc.roundedRect(14, 41, pageWidth - 28, 14, 2, 2, 'D');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(51, 65, 85);

    const startText = filterInfo.startDate ? new Date(filterInfo.startDate).toLocaleDateString('es-ES') : 'Inicio';
    const endText = filterInfo.endDate ? new Date(filterInfo.endDate).toLocaleDateString('es-ES') : 'Actualidad';
    const lotText = filterInfo.lotName || 'Todos los Estacionamientos';
    const nowText = new Date().toLocaleString('es-ES');

    doc.text(`Rango de Fechas: ${startText} - ${endText}`, 18, 46.5);
    doc.text(`Estacionamiento: ${lotText}`, 18, 51.5);
    doc.text(`Emisión: ${nowText}`, pageWidth / 2 + 10, 46.5);
    doc.text(`Agrupación: ${filterInfo.groupBy === 'month' ? 'Mensual' : filterInfo.groupBy === 'week' ? 'Semanal' : 'Diario'}`, pageWidth / 2 + 10, 51.5);

    const startY = 60;

    // ─── 3. SECCIONES DE CONTENIDO ─────────────────────────────────
    if (reportType === 'revenue') {
      this.buildRevenuePdfSection(doc, data, startY, company);
    } else if (reportType === 'vehicles') {
      this.buildVehiclesPdfSection(doc, data, startY);
    } else if (reportType === 'clients') {
      this.buildClientsPdfSection(doc, data, startY, company);
    } else if (reportType === 'operators') {
      this.buildOperatorsPdfSection(doc, data, startY, company);
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
      doc.setTextColor(148, 163, 184);
      doc.text(`${company.name} - Documento confidencial de uso interno`, 14, pageHeight - 7);
      doc.text(`Página ${i} de ${pageCount}`, pageWidth - 14, pageHeight - 7, { align: 'right' });
    }

    doc.save(`reporte_${reportType}_${Date.now()}.pdf`);
  }

  // ─── 2. GENERACIÓN DE FACTURA / COMPROBANTE DE TICKET PDF ─────────────────

  async exportTicketInvoice(ticket: any, overrideCompany?: CompanyHeaderInfo): Promise<void> {
    const loadedCompany = await this.getCompanySettings();
    const company = { ...loadedCompany, ...overrideCompany };
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a5' }); // Formato A5 para comprobantes
    const pageWidth = doc.internal.pageSize.getWidth();
    const invoiceNumber = `FAC-${ticket.ticketNumber || ticket.id?.substring(0, 8).toUpperCase()}`;

    // Payload de Código QR fiscal para el Ticket
    const qrPayload = JSON.stringify({
      invoice: invoiceNumber,
      ticket: ticket.ticketNumber,
      plate: ticket.vehiclePlate,
      total: ticket.totalAmount || ticket.totalPaid,
      currency: company.currencySymbol,
      date: ticket.exitTime || ticket.createdAt,
      company: company.name,
      taxId: company.taxId,
    });

    let qrDataUrl = '';
    try {
      qrDataUrl = await QRCode.toDataURL(qrPayload, { margin: 1, width: 200, errorCorrectionLevel: 'M' });
    } catch (e) {
      console.error('Error generating QR for invoice', e);
    }

    // Encabezado
    doc.setFillColor(15, 118, 110);
    doc.rect(0, 0, pageWidth, 5, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(15, 23, 42);
    doc.text(company.name!, 10, 13);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(`${company.taxId} | Tel: ${company.phone}`, 10, 17.5);
    doc.text(company.address!, 10, 21.5);

    if (qrDataUrl) {
      doc.addImage(qrDataUrl, 'PNG', pageWidth - 30, 7, 20, 20);
    }

    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.4);
    doc.line(10, 25, pageWidth - 10, 25);

    // Título Comprobante
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(15, 118, 110);
    doc.text('COMPROBANTE DE FACTURA / PAGO', 10, 31);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(`N° Comprobante: ${invoiceNumber}`, pageWidth - 10, 31, { align: 'right' });

    // Cuadro de datos del vehículo y permanencia
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(10, 34, pageWidth - 20, 24, 2, 2, 'F');
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.3);
    doc.roundedRect(10, 34, pageWidth - 20, 24, 2, 2, 'D');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(30, 41, 59);

    const plate = ticket.vehiclePlate || 'N/A';
    const client = ticket.clientName || ticket.client?.name || 'Cliente Ocasional';
    const entry = ticket.entryTime ? new Date(ticket.entryTime).toLocaleString('es-ES') : 'N/A';
    const exit = ticket.exitTime ? new Date(ticket.exitTime).toLocaleString('es-ES') : 'En Estacionamiento';
    const spot = ticket.spotNumber || ticket.spot?.spotNumber || 'General';

    doc.text(`Placa: ${plate}`, 14, 40);
    doc.text(`Cliente: ${client}`, 14, 45);
    doc.text(`Entrada: ${entry}`, 14, 50);

    doc.text(`Puesto / Zona: ${spot}`, pageWidth / 2 + 5, 40);
    doc.text(`Estado Ticket: ${ticket.status === 'CLOSED' || ticket.status === 'PAID' ? 'PAGADO' : 'ACTIVO'}`, pageWidth / 2 + 5, 45);
    doc.text(`Salida: ${exit}`, pageWidth / 2 + 5, 50);

    // Tabla de desglose de cobro
    const total = Number(ticket.totalAmount || ticket.totalPaid || 0);
    const subtotal = company.taxPercentage ? total / (1 + company.taxPercentage / 100) : total;
    const tax = total - subtotal;

    const rows = [
      ['Servicio de Estacionamiento / Valet', `$${subtotal.toFixed(2)}`],
      [`Impuesto IVA (${company.taxPercentage || 0}%)`, `$${tax.toFixed(2)}`],
    ];

    autoTable(doc, {
      startY: 61,
      margin: { left: 10, right: 10 },
      head: [['Descripción de Concepto', 'Monto']],
      body: rows,
      theme: 'grid',
      headStyles: { fillColor: [15, 118, 110], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8.5 },
      bodyStyles: { fontSize: 8, textColor: [51, 65, 85] },
      columnStyles: {
        0: { cellWidth: pageWidth - 50 },
        1: { halign: 'right', cellWidth: 30 },
      },
      foot: [['TOTAL PAGADO', `${company.currencySymbol} ${total.toFixed(2)}`]],
      footStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontStyle: 'bold', fontSize: 9 },
    });

    const finalY = (doc as any).lastAutoTable.finalY + 6;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.text('¡Gracias por preferir nuestros servicios! Por favor conserve este comprobante.', pageWidth / 2, finalY + 4, { align: 'center' });

    doc.save(`factura_ticket_${ticket.ticketNumber || 'valet'}.pdf`);
  }

  // ─── 3. EXPORTACIÓN A MICROSOFT WORD (.DOCX) ─────────────────────────────

  async exportDocx(
    reportType: 'revenue' | 'vehicles' | 'clients' | 'operators' | 'occupancy',
    data: any,
    filterInfo: { startDate?: string; endDate?: string; lotName?: string },
    overrideCompany?: CompanyHeaderInfo
  ): Promise<void> {
    const loadedCompany = await this.getCompanySettings();
    const company = { ...loadedCompany, ...overrideCompany };

    const reportTitles: Record<string, string> = {
      revenue: 'REPORTE EJECUTIVO DE INGRESOS Y RECAUDACIÓN',
      vehicles: 'REPORTE DE FLUJO DE VEHÍCULOS Y HORAS PICO',
      clients: 'REPORTE DE CLIENTES Y ABONADOS FRECUENTES',
      operators: 'REPORTE DE RENDIMIENTO DE OPERADORES Y CAJAS',
      occupancy: 'REPORTE DE OCUPACIÓN DE ESTACIONAMIENTO',
    };

    const title = reportTitles[reportType] || 'REPORTE DE SISTEMA';

    // Construcción de Filas de Tabla según el tipo de reporte
    const tableHeaderRows: TableRow[] = [];
    const tableDataRows: TableRow[] = [];

    if (reportType === 'revenue') {
      tableHeaderRows.push(
        new TableRow({
          children: [
            this.createTableCell('Método de Pago', true, '0F766E'),
            this.createTableCell('Transacciones', true, '0F766E'),
            this.createTableCell('Monto Total', true, '0F766E'),
            this.createTableCell('Porcentaje', true, '0F766E'),
          ],
        })
      );
      (data?.byPaymentMethod || []).forEach((item: any) => {
        tableDataRows.push(
          new TableRow({
            children: [
              this.createTableCell(this.getPaymentMethodLabel(item.method)),
              this.createTableCell(item.count.toString(), false, undefined, AlignmentType.CENTER),
              this.createTableCell(`${company.currencySymbol} ${Number(item.total).toFixed(2)}`, false, undefined, AlignmentType.RIGHT),
              this.createTableCell(`${data?.totalRevenue ? ((item.total / data.totalRevenue) * 100).toFixed(1) : 0}%`, false, undefined, AlignmentType.RIGHT),
            ],
          })
        );
      });
    } else if (reportType === 'vehicles') {
      tableHeaderRows.push(
        new TableRow({
          children: [
            this.createTableCell('Tipo de Vehículo', true, '0F766E'),
            this.createTableCell('Cantidad Registrada', true, '0F766E'),
          ],
        })
      );
      (data?.byType || []).forEach((item: any) => {
        tableDataRows.push(
          new TableRow({
            children: [
              this.createTableCell(this.getVehicleTypeLabel(item.type)),
              this.createTableCell(item.count.toString(), false, undefined, AlignmentType.CENTER),
            ],
          })
        );
      });
    } else if (reportType === 'clients') {
      tableHeaderRows.push(
        new TableRow({
          children: [
            this.createTableCell('Cliente', true, '0F766E'),
            this.createTableCell('Correo', true, '0F766E'),
            this.createTableCell('Visitas', true, '0F766E'),
            this.createTableCell('Total Gastado', true, '0F766E'),
          ],
        })
      );
      (data?.topClients || []).forEach((c: any) => {
        tableDataRows.push(
          new TableRow({
            children: [
              this.createTableCell(`${c.firstName || ''} ${c.lastName || ''}`.trim() || 'Cliente'),
              this.createTableCell(c.email || 'N/A'),
              this.createTableCell((c.ticketsCount || 0).toString(), false, undefined, AlignmentType.CENTER),
              this.createTableCell(`${company.currencySymbol} ${Number(c.totalSpent || 0).toFixed(2)}`, false, undefined, AlignmentType.RIGHT),
            ],
          })
        );
      });
    } else if (reportType === 'operators') {
      tableHeaderRows.push(
        new TableRow({
          children: [
            this.createTableCell('Operador / Cajero', true, '0F766E'),
            this.createTableCell('Rol', true, '0F766E'),
            this.createTableCell('Tickets Procesados', true, '0F766E'),
            this.createTableCell('Monto Recaudado', true, '0F766E'),
          ],
        })
      );
      (data?.operators || []).forEach((op: any) => {
        tableDataRows.push(
          new TableRow({
            children: [
              this.createTableCell(op.name || 'Operador'),
              this.createTableCell(op.role || 'Rol'),
              this.createTableCell((op.processedTickets || 0).toString(), false, undefined, AlignmentType.CENTER),
              this.createTableCell(`${company.currencySymbol} ${Number(op.totalCollected || 0).toFixed(2)}`, false, undefined, AlignmentType.RIGHT),
            ],
          })
        );
      });
    }

    const docxDoc = new Document({
      sections: [
        {
          properties: {},
          children: [
            new Paragraph({
              text: company.name,
              heading: HeadingLevel.HEADING_1,
              spacing: { after: 100 },
            }),
            new Paragraph({
              children: [
                new TextRun({ text: `${company.taxId} | Tel: ${company.phone} | ${company.email}`, color: '64748B', size: 18 }),
              ],
              spacing: { after: 200 },
            }),
            new Paragraph({
              text: title,
              heading: HeadingLevel.HEADING_2,
              spacing: { after: 150 },
            }),
            new Paragraph({
              children: [
                new TextRun({ text: `Fechas: ${filterInfo.startDate || 'Inicio'} a ${filterInfo.endDate || 'Actual'}  |  Estacionamiento: ${filterInfo.lotName || 'Todos'}`, bold: true, size: 20 }),
              ],
              spacing: { after: 300 },
            }),
            new Table({
              width: { size: 100, type: WidthType.PERCENTAGE },
              rows: [...tableHeaderRows, ...tableDataRows],
            }),
            new Paragraph({
              children: [
                new TextRun({ text: `Generado el ${new Date().toLocaleString('es-ES')} - Parking Valet System`, italics: true, color: '94A3B8', size: 16 }),
              ],
              spacing: { before: 400 },
            }),
          ],
        },
      ],
    });

    const blob = await Packer.toBlob(docxDoc);
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reporte_${reportType}_${Date.now()}.docx`;
    a.click();
    window.URL.revokeObjectURL(url);
  }

  // Helper para celdas de tabla en docx
  private createTableCell(text: string, isHeader = false, bgColorHex?: string, alignment: any = AlignmentType.LEFT): TableCell {
    return new TableCell({
      shading: bgColorHex ? { fill: bgColorHex } : undefined,
      children: [
        new Paragraph({
          alignment,
          children: [
            new TextRun({
              text,
              bold: isHeader,
              color: isHeader ? 'FFFFFF' : '1E293B',
              size: isHeader ? 19 : 18,
            }),
          ],
        }),
      ],
    });
  }

  // ─── 4. EXPORTACIÓN A EXCEL ENRIQUECIDO (.XLSX) ─────────────────────────

  async exportExcel(
    reportType: 'revenue' | 'vehicles' | 'clients' | 'operators' | 'occupancy',
    data: any,
    filterInfo: { startDate?: string; endDate?: string; lotName?: string },
    overrideCompany?: CompanyHeaderInfo
  ): Promise<void> {
    const loadedCompany = await this.getCompanySettings();
    const company = { ...loadedCompany, ...overrideCompany };

    const wb = XLSX.utils.book_new();
    const sheetData: any[][] = [];

    // Encabezado Fiscal Institucional
    sheetData.push([company.name]);
    sheetData.push([`${company.taxId} | ${company.phone} | ${company.email}`]);
    sheetData.push([company.address]);
    sheetData.push([`REPORTE DE ${reportType.toUpperCase()}`]);
    sheetData.push([`Rango: ${filterInfo.startDate || 'Inicio'} a ${filterInfo.endDate || 'Actual'}`]);
    sheetData.push([`Estacionamiento: ${filterInfo.lotName || 'Todos los Estacionamientos'}`]);
    sheetData.push([`Fecha de Emisión: ${new Date().toLocaleString('es-ES')}`]);
    sheetData.push([]); // Espaciador

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

  // ─── HELPERS Y DIBUJO VECTORIAL EN PDF ──────────────────────────────────

  private buildRevenuePdfSection(doc: jsPDF, data: any, startY: number, company: CompanyHeaderInfo): void {
    const totalRev = data?.totalRevenue ?? 0;
    const totalTrans = data?.totalTransactions ?? 0;
    const avgTrans = data?.averageTransaction ?? 0;

    // Tarjetas KPI
    this.drawKpiCard(doc, 14, startY, 55, 14, 'TOTAL RECAUDADO', `${company.currencySymbol} ${totalRev.toFixed(2)}`, [15, 118, 110]);
    this.drawKpiCard(doc, 75, startY, 55, 14, 'TOTAL TRANSACCIONES', `${totalTrans}`, [59, 130, 246]);
    this.drawKpiCard(doc, 136, startY, 60, 14, 'PROMEDIO POR TICKET', `${company.currencySymbol} ${avgTrans.toFixed(2)}`, [168, 85, 247]);

    startY += 19;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(30, 41, 59);
    doc.text('DESGLOSE POR MÉTODO DE PAGO', 14, startY);
    startY += 3;

    const methodRows = (data?.byPaymentMethod || []).map((item: any) => [
      this.getPaymentMethodLabel(item.method),
      item.count.toString(),
      `${company.currencySymbol} ${Number(item.total).toFixed(2)}`,
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
      foot: [['TOTALES', totalTrans.toString(), `${company.currencySymbol} ${totalRev.toFixed(2)}`, '100%']],
      footStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontStyle: 'bold', fontSize: 8.5 },
    });

    startY = (doc as any).lastAutoTable.finalY + 8;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(30, 41, 59);
    doc.text('CRONOLOGÍA DE INGRESOS POR PERIODO', 14, startY);
    startY += 3;

    const timelineRows = (data?.timeline || []).map((item: any) => [
      item.label,
      item.count.toString(),
      `${company.currencySymbol} ${Number(item.amount).toFixed(2)}`,
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

  private buildClientsPdfSection(doc: jsPDF, data: any, startY: number, company: CompanyHeaderInfo): void {
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
      `${company.currencySymbol} ${Number(c.totalSpent || 0).toFixed(2)}`,
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

  private buildOperatorsPdfSection(doc: jsPDF, data: any, startY: number, company: CompanyHeaderInfo): void {
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
      `${company.currencySymbol} ${Number(op.totalCollected || 0).toFixed(2)}`,
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
