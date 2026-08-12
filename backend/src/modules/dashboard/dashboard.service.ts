import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/database/prisma.service';
import { TicketStatus } from '@prisma/client';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getStats(lotId?: string) {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const [
      ticketsToday,
      vehiclesInside,
      revenueResult,
      parkingLots,
      recentTickets,
      weeklyTickets,
    ] = await Promise.all([
      // 1. Tickets registrados hoy
      this.prisma.ticket.count({
        where: {
          entryTime: { gte: startOfDay, lte: endOfDay },
          deletedAt: null,
          ...(lotId ? { lotId } : {}),
        },
      }),

      // 2. Vehículos actualmente adentro
      this.prisma.ticket.count({
        where: {
          status: TicketStatus.ACTIVE,
          deletedAt: null,
          ...(lotId ? { lotId } : {}),
        },
      }),

      // 3. Ingresos del día
      this.prisma.payment.aggregate({
        where: {
          createdAt: { gte: startOfDay, lte: endOfDay },
          deletedAt: null,
          ...(lotId ? { ticket: { lotId } } : {}),
        },
        _sum: { amount: true },
      }),

      // 4. Estacionamientos y puestos
      this.prisma.parkingLot.findMany({
        where: {
          isActive: true,
          deletedAt: null,
          ...(lotId ? { id: lotId } : {}),
        },
        select: {
          id: true,
          name: true,
          totalSpots: true,
          availableSpots: true,
        },
      }),

      // 5. Actividad reciente (últimos 10 tickets)
      this.prisma.ticket.findMany({
        where: {
          deletedAt: null,
          ...(lotId ? { lotId } : {}),
        },
        take: 10,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          ticketNumber: true,
          plateNumber: true,
          entryTime: true,
          exitTime: true,
          status: true,
          paymentStatus: true,
          totalAmount: true,
          spot: { select: { spotNumber: true, floor: true } },
          lot: { select: { name: true } },
          vehicle: { select: { brand: true, model: true, color: true } },
        },
      }),

      // 6. Entradas de los últimos 7 días
      this.prisma.ticket.findMany({
        where: {
          entryTime: { gte: sevenDaysAgo },
          deletedAt: null,
          ...(lotId ? { lotId } : {}),
        },
        select: { entryTime: true },
      }),
    ]);

    const revenueToday = Number(revenueResult._sum.amount ?? 0);
    const totalSpots = parkingLots.reduce((acc, p) => acc + p.totalSpots, 0);
    const availableSpots = parkingLots.reduce((acc, p) => acc + p.availableSpots, 0);
    const occupiedSpots = Math.max(0, totalSpots - availableSpots);
    const occupancyPercentage = totalSpots > 0 ? Math.round((occupiedSpots / totalSpots) * 100) : 0;

    // Procesar datos de gráfica semanal (últimos 7 días)
    const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    const weeklyEntriesMap = new Map<string, number>();

    for (let i = 0; i < 7; i++) {
      const d = new Date(sevenDaysAgo);
      d.setDate(d.getDate() + i);
      const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      weeklyEntriesMap.set(dateKey, 0);
    }

    weeklyTickets.forEach((t) => {
      const d = new Date(t.entryTime);
      const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      if (weeklyEntriesMap.has(dateKey)) {
        weeklyEntriesMap.set(dateKey, (weeklyEntriesMap.get(dateKey) || 0) + 1);
      }
    });

    const weeklyEntries = Array.from(weeklyEntriesMap.entries()).map(([dateStr, count]) => {
      const d = new Date(dateStr + 'T00:00:00');
      return {
        date: dateStr,
        day: dayNames[d.getDay()],
        count,
      };
    });

    return {
      ticketsToday,
      vehiclesInside,
      revenueToday,
      availableSpots,
      totalSpots,
      occupiedSpots,
      occupancyPercentage,
      recentActivity: recentTickets.map((t) => ({
        ...t,
        totalAmount: t.totalAmount ? Number(t.totalAmount) : 0,
      })),
      weeklyEntries,
      parkingLotsSummary: parkingLots,
    };
  }
}
