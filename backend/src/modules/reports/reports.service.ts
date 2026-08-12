import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/database/prisma.service';
import { ReportsQueryDto, ReportGroupBy } from './dto/reports-query.dto';

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  private parseDateRange(query: ReportsQueryDto) {
    const now = new Date();
    const endDate = query.endDate ? new Date(query.endDate) : new Date(now.setHours(23, 59, 59, 999));
    
    // Default to last 30 days if start date not provided
    const startDate = query.startDate
      ? new Date(query.startDate)
      : new Date(new Date().setDate(now.getDate() - 30));

    return { startDate, endDate };
  }

  // 1. REVENUE REPORT
  async getRevenueReport(query: ReportsQueryDto) {
    const { startDate, endDate } = this.parseDateRange(query);
    const lotId = query.parkingLotId;

    const wherePayment: any = {
      paidAt: {
        gte: startDate,
        lte: endDate,
      },
      deletedAt: null,
    };

    if (lotId) {
      wherePayment.ticket = {
        lotId: lotId,
      };
    }

    const payments = await this.prisma.payment.findMany({
      where: wherePayment,
      include: {
        ticket: {
          include: {
            rate: true,
            lot: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: {
        paidAt: 'asc',
      },
    });

    const totalRevenue = payments.reduce((sum, p) => sum + Number(p.amount), 0);
    const totalTransactions = payments.length;
    const averageTransaction = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;

    // Breakdown by Payment Method
    const byPaymentMethodMap: Record<string, { count: number; total: number }> = {};
    payments.forEach((p) => {
      const method = p.paymentMethod || 'OTHER';
      if (!byPaymentMethodMap[method]) {
        byPaymentMethodMap[method] = { count: 0, total: 0 };
      }
      byPaymentMethodMap[method].count += 1;
      byPaymentMethodMap[method].total += Number(p.amount);
    });

    const byPaymentMethod = Object.keys(byPaymentMethodMap).map((method) => ({
      method,
      count: byPaymentMethodMap[method].count,
      total: byPaymentMethodMap[method].total,
    }));

    // Breakdown Over Time (Timeline)
    const timelineMap: Record<string, { label: string; amount: number; count: number }> = {};
    payments.forEach((p) => {
      const date = new Date(p.paidAt);
      let key = date.toISOString().split('T')[0]; // Daily default

      if (query.groupBy === ReportGroupBy.MONTH) {
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      }

      if (!timelineMap[key]) {
        timelineMap[key] = { label: key, amount: 0, count: 0 };
      }
      timelineMap[key].amount += Number(p.amount);
      timelineMap[key].count += 1;
    });

    const timeline = Object.values(timelineMap);

    return {
      summary: {
        totalRevenue,
        totalTransactions,
        averageTransaction,
        startDate,
        endDate,
      },
      byPaymentMethod,
      timeline,
    };
  }

  // 2. VEHICLES REPORT
  async getVehiclesReport(query: ReportsQueryDto) {
    const { startDate, endDate } = this.parseDateRange(query);
    const lotId = query.parkingLotId;

    const whereTicket: any = {
      entryTime: {
        gte: startDate,
        lte: endDate,
      },
      deletedAt: null,
    };

    if (lotId) {
      whereTicket.lotId = lotId;
    }

    const tickets = await this.prisma.ticket.findMany({
      where: whereTicket,
      include: {
        vehicle: true,
        lot: true,
      },
      orderBy: {
        entryTime: 'asc',
      },
    });

    const totalEntered = tickets.length;
    const completedTickets = tickets.filter((t) => t.status === 'COMPLETED');
    const activeTickets = tickets.filter((t) => t.status === 'ACTIVE');
    const cancelledTickets = tickets.filter((t) => t.status === 'CANCELLED');

    // Calculate Average Stay Duration
    let totalDurationMinutes = 0;
    let durationCount = 0;
    completedTickets.forEach((t) => {
      if (t.durationMinutes) {
        totalDurationMinutes += t.durationMinutes;
        durationCount++;
      }
    });

    const avgDurationMinutes = durationCount > 0 ? Math.round(totalDurationMinutes / durationCount) : 0;

    // Peak Hours Breakdown (0-23)
    const peakHoursMap = Array.from({ length: 24 }, (_, i) => ({ hour: `${String(i).padStart(2, '0')}:00`, count: 0 }));
    tickets.forEach((t) => {
      const hour = new Date(t.entryTime).getHours();
      peakHoursMap[hour].count += 1;
    });

    // Duration Ranges Distribution
    const durationRanges = [
      { range: '< 1 hora', count: 0 },
      { range: '1 - 3 horas', count: 0 },
      { range: '3 - 6 horas', count: 0 },
      { range: '> 6 horas', count: 0 },
    ];

    completedTickets.forEach((t) => {
      const mins = t.durationMinutes || 0;
      if (mins < 60) durationRanges[0].count++;
      else if (mins <= 180) durationRanges[1].count++;
      else if (mins <= 360) durationRanges[2].count++;
      else durationRanges[3].count++;
    });

    // Breakdown by Vehicle Type
    const byVehicleTypeMap: Record<string, number> = {};
    tickets.forEach((t) => {
      const vType = t.vehicle?.vehicleType || 'OTHER';
      byVehicleTypeMap[vType] = (byVehicleTypeMap[vType] || 0) + 1;
    });

    const byVehicleType = Object.keys(byVehicleTypeMap).map((type) => ({
      type,
      count: byVehicleTypeMap[type],
    }));

    return {
      summary: {
        totalEntered,
        completedCount: completedTickets.length,
        activeCount: activeTickets.length,
        cancelledCount: cancelledTickets.length,
        avgDurationMinutes,
      },
      peakHours: peakHoursMap,
      durationRanges,
      byVehicleType,
    };
  }

  // 3. CLIENTS REPORT
  async getClientsReport(query: ReportsQueryDto) {
    const { startDate, endDate } = this.parseDateRange(query);
    const lotId = query.parkingLotId;

    const whereTicket: any = {
      entryTime: {
        gte: startDate,
        lte: endDate,
      },
      clientId: { not: null },
      deletedAt: null,
    };

    if (lotId) {
      whereTicket.lotId = lotId;
    }

    const tickets = await this.prisma.ticket.findMany({
      where: whereTicket,
      include: {
        client: true,
      },
    });

    const clientStatsMap: Record<
      string,
      {
        client: any;
        visitCount: number;
        totalSpent: number;
        lastVisit: Date;
      }
    > = {};

    tickets.forEach((t) => {
      if (!t.client) return;
      const id = t.client.id;
      if (!clientStatsMap[id]) {
        clientStatsMap[id] = {
          client: {
            id: t.client.id,
            name: `${t.client.firstName} ${t.client.lastName}`,
            document: `${t.client.documentType} ${t.client.documentNumber}`,
            type: t.client.clientType,
            email: t.client.email,
            phone: t.client.phone,
          },
          visitCount: 0,
          totalSpent: 0,
          lastVisit: t.entryTime,
        };
      }

      clientStatsMap[id].visitCount += 1;
      clientStatsMap[id].totalSpent += Number(t.totalAmount || 0);
      if (new Date(t.entryTime) > new Date(clientStatsMap[id].lastVisit)) {
        clientStatsMap[id].lastVisit = t.entryTime;
      }
    });

    const topClients = Object.values(clientStatsMap)
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, 50);

    return {
      totalRegisteredClients: Object.keys(clientStatsMap).length,
      topClients,
    };
  }

  // 4. OCCUPANCY REPORT
  async getOccupancyReport(query: ReportsQueryDto) {
    const lotId = query.parkingLotId;

    const lotWhere: any = { deletedAt: null, isActive: true };
    if (lotId) lotWhere.id = lotId;

    const lots = await this.prisma.parkingLot.findMany({
      where: lotWhere,
      include: {
        parkingSpots: {
          where: { deletedAt: null },
        },
      },
    });

    let totalSpots = 0;
    let occupiedSpots = 0;
    let availableSpots = 0;
    let maintenanceSpots = 0;

    lots.forEach((lot) => {
      totalSpots += lot.totalSpots || lot.parkingSpots.length;
      lot.parkingSpots.forEach((spot) => {
        if (spot.status === 'OCCUPIED') occupiedSpots++;
        else if (spot.status === 'AVAILABLE') availableSpots++;
        else if (spot.status === 'MAINTENANCE') maintenanceSpots++;
      });
    });

    const occupancyRate = totalSpots > 0 ? Number(((occupiedSpots / totalSpots) * 100).toFixed(1)) : 0;

    return {
      summary: {
        totalLots: lots.length,
        totalSpots,
        occupiedSpots,
        availableSpots,
        maintenanceSpots,
        occupancyRate,
      },
      lots: lots.map((l) => ({
        id: l.id,
        name: l.name,
        totalSpots: l.totalSpots,
        availableSpots: l.availableSpots,
        occupancyRate:
          l.totalSpots > 0
            ? Number((((l.totalSpots - l.availableSpots) / l.totalSpots) * 100).toFixed(1))
            : 0,
      })),
    };
  }

  // 5. OPERATORS REPORT
  async getOperatorsReport(query: ReportsQueryDto) {
    const { startDate, endDate } = this.parseDateRange(query);
    const lotId = query.parkingLotId;

    const whereTicket: any = {
      entryTime: {
        gte: startDate,
        lte: endDate,
      },
      deletedAt: null,
    };

    if (lotId) whereTicket.lotId = lotId;

    const tickets = await this.prisma.ticket.findMany({
      where: whereTicket,
      include: {
        entryOperator: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        exitOperator: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });

    const operatorStatsMap: Record<
      string,
      {
        operator: any;
        entriesProcessed: number;
        exitsProcessed: number;
        revenueGenerated: number;
      }
    > = {};

    tickets.forEach((t) => {
      // Entry operator stats
      if (t.entryOperator) {
        const id = t.entryOperator.id;
        if (!operatorStatsMap[id]) {
          operatorStatsMap[id] = {
            operator: {
              id: t.entryOperator.id,
              name: `${t.entryOperator.firstName} ${t.entryOperator.lastName}`,
              email: t.entryOperator.email,
            },
            entriesProcessed: 0,
            exitsProcessed: 0,
            revenueGenerated: 0,
          };
        }
        operatorStatsMap[id].entriesProcessed += 1;
      }

      // Exit operator stats
      if (t.exitOperator) {
        const id = t.exitOperator.id;
        if (!operatorStatsMap[id]) {
          operatorStatsMap[id] = {
            operator: {
              id: t.exitOperator.id,
              name: `${t.exitOperator.firstName} ${t.exitOperator.lastName}`,
              email: t.exitOperator.email,
            },
            entriesProcessed: 0,
            exitsProcessed: 0,
            revenueGenerated: 0,
          };
        }
        operatorStatsMap[id].exitsProcessed += 1;
        operatorStatsMap[id].revenueGenerated += Number(t.totalAmount || 0);
      }
    });

    return {
      operators: Object.values(operatorStatsMap).sort((a, b) => b.revenueGenerated - a.revenueGenerated),
    };
  }

  // 6. CSV EXPORT HELPER
  async exportCsv(query: ReportsQueryDto, reportType: string): Promise<string> {
    if (reportType === 'vehicles') {
      const data = await this.getVehiclesReport(query);
      let csv = 'Tipo de Vehiculo,Cantidad\n';
      data.byVehicleType.forEach((item) => {
        csv += `"${item.type}",${item.count}\n`;
      });
      csv += '\nHora,Entradas\n';
      data.peakHours.forEach((item) => {
        csv += `"${item.hour}",${item.count}\n`;
      });
      return csv;
    }

    if (reportType === 'clients') {
      const data = await this.getClientsReport(query);
      let csv = 'Cliente,Documento,Tipo,Visitas,Total Invertido\n';
      data.topClients.forEach((item) => {
        csv += `"${item.client.name}","${item.client.document}","${item.client.type}",${item.visitCount},${item.totalSpent.toFixed(2)}\n`;
      });
      return csv;
    }

    if (reportType === 'operators') {
      const data = await this.getOperatorsReport(query);
      let csv = 'Operador,Email,Entradas Registradas,Salidas Cobradas,Total Recaudado\n';
      data.operators.forEach((item) => {
        csv += `"${item.operator.name}","${item.operator.email}",${item.entriesProcessed},${item.exitsProcessed},${item.revenueGenerated.toFixed(2)}\n`;
      });
      return csv;
    }

    // Default: Revenue CSV
    const data = await this.getRevenueReport(query);
    let csv = 'Fecha/Periodo,Monto Total,Transacciones\n';
    data.timeline.forEach((item) => {
      csv += `"${item.label}",${item.amount.toFixed(2)},${item.count}\n`;
    });
    csv += '\nMetodo de Pago,Transacciones,Total Recaudado\n';
    data.byPaymentMethod.forEach((item) => {
      csv += `"${item.method}",${item.count},${item.total.toFixed(2)}\n`;
    });
    return csv;
  }
}
